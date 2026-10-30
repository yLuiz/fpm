import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp, signIn, adminUser } from '@/test/render'
import { authApi, equipmentApi, maintenanceApi } from '@/services/api'
import type { Maintenance } from '@/types'

vi.mock('@/services/api', () => ({
  authApi: { me: vi.fn(), login: vi.fn(), logout: vi.fn() },
  equipmentApi: { getById: vi.fn() },
  maintenanceApi: { getById: vi.fn(), getChecklist: vi.fn(), complete: vi.fn() },
  settingsApi: {},
}))

const equipment = {
  id: 'e1',
  name: 'Motor Linha 1',
  type: 'MOTOR' as const,
  location: 'Galpão A',
  criticality: 'HIGH' as const,
  status: 'ACTIVE' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
}

function maintenance(overrides: Partial<Maintenance> = {}): Maintenance {
  return {
    id: 'm1',
    equipmentId: 'e1',
    dueDate: '2026-10-20T12:00:00.000Z',
    status: 'SCHEDULED',
    kind: 'PREVENTIVE',
    createdAt: '2026-10-01T00:00:00.000Z',
    equipment,
    ...overrides,
  }
}

const ITEMS = ['Temperatura ok', 'Ruído ok', 'Lubrificação realizada']

async function choose(item: string, label: 'OK' | 'Não OK' | 'N.A.') {
  const group = await screen.findByRole('radiogroup', { name: item })
  await userEvent.click(within(group).getByRole('radio', { name: label }))
}

describe('Registro de manutenção', () => {
  beforeEach(() => {
    signIn()
    vi.mocked(authApi.me).mockResolvedValue(adminUser)
    vi.mocked(maintenanceApi.getChecklist).mockResolvedValue({ type: 'MOTOR', items: ITEMS })
    vi.mocked(equipmentApi.getById).mockResolvedValue({ ...equipment, maintenances: [] })
    vi.mocked(maintenanceApi.complete).mockReset()
  })

  describe('preventiva', () => {
    beforeEach(() => {
      vi.mocked(maintenanceApi.getById).mockResolvedValue(maintenance())
    })

    it('não envia com itens sem resposta', async () => {
      renderApp('/maintenance/m1/register')
      await choose('Temperatura ok', 'OK')
      await userEvent.click(screen.getByRole('button', { name: 'Registrar preventiva' }))

      expect(await screen.findByText('Responda todos os itens (2 pendente(s))')).toBeInTheDocument()
      expect(maintenanceApi.complete).not.toHaveBeenCalled()
    })

    it('Não OK pede descrição, avisa a corretiva e envia o resultado de cada item', async () => {
      vi.mocked(maintenanceApi.complete).mockResolvedValue({
        maintenance: maintenance({ status: 'DONE' }),
        next: maintenance({ id: 'm2' }),
        corrective: maintenance({ id: 'c1', kind: 'CORRECTIVE', dueDate: '2026-10-25T12:00:00.000Z' }),
      })
      renderApp('/maintenance/m1/register')

      await choose('Temperatura ok', 'OK')
      await choose('Ruído ok', 'Não OK')
      await choose('Lubrificação realizada', 'N.A.')

      expect(screen.getByRole('status')).toHaveTextContent('Será aberta uma ordem corretiva com prazo de 1 dia(s)')

      await userEvent.click(screen.getByRole('button', { name: 'Registrar preventiva' }))
      expect(await screen.findByText('Descreva o problema em "Ruído ok"')).toBeInTheDocument()
      expect(maintenanceApi.complete).not.toHaveBeenCalled()

      await userEvent.type(screen.getByLabelText('Problema encontrado em Ruído ok'), 'Rolamento ruidoso')
      await userEvent.click(screen.getByRole('button', { name: 'Registrar preventiva' }))

      expect(maintenanceApi.complete).toHaveBeenCalledWith(
        'm1',
        expect.objectContaining({
          checklist: [
            { item: 'Temperatura ok', result: 'OK' },
            { item: 'Ruído ok', result: 'NOK', note: 'Rolamento ruidoso' },
            { item: 'Lubrificação realizada', result: 'NA' },
          ],
        })
      )
      expect(await screen.findByText('Ordem corretiva aberta')).toBeInTheDocument()
      expect(await screen.findByRole('heading', { name: /Motor Linha 1/ })).toBeInTheDocument()
    })

    it('"Pendentes como OK" preenche os itens sem resposta', async () => {
      vi.mocked(maintenanceApi.complete).mockResolvedValue({
        maintenance: maintenance({ status: 'DONE' }),
        next: null,
        corrective: null,
      })
      renderApp('/maintenance/m1/register')
      await choose('Ruído ok', 'N.A.')
      await userEvent.click(screen.getByRole('button', { name: /Pendentes como OK/ }))
      await userEvent.click(screen.getByRole('button', { name: 'Registrar preventiva' }))

      const dto = vi.mocked(maintenanceApi.complete).mock.calls[0][1]
      expect(dto.checklist?.map((c) => c.result)).toEqual(['OK', 'NA', 'OK'])
      expect(await screen.findByText('Manutenção registrada com sucesso')).toBeInTheDocument()
    })
  })

  describe('corretiva', () => {
    beforeEach(() => {
      vi.mocked(maintenanceApi.getById).mockResolvedValue(
        maintenance({
          id: 'c1',
          kind: 'CORRECTIVE',
          originId: 'm1',
          description: 'Itens não conformes na preventiva:\n- Ruído ok: Rolamento ruidoso',
        })
      )
    })

    it('mostra os achados e exige a solução aplicada', async () => {
      vi.mocked(maintenanceApi.complete).mockResolvedValue({
        maintenance: maintenance({ id: 'c1', kind: 'CORRECTIVE', status: 'DONE' }),
        next: null,
        corrective: null,
      })
      renderApp('/maintenance/c1/register')

      expect(await screen.findByText(/Ruído ok: Rolamento ruidoso/)).toBeInTheDocument()
      expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Concluir corretiva' }))
      expect(await screen.findByText('Descreva a solução aplicada')).toBeInTheDocument()

      await userEvent.type(screen.getByLabelText('Solução aplicada *'), 'Rolamento substituído')
      await userEvent.click(screen.getByRole('button', { name: 'Concluir corretiva' }))

      expect(maintenanceApi.complete).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({ observations: 'Rolamento substituído' })
      )
      expect(vi.mocked(maintenanceApi.complete).mock.calls[0][1].checklist).toBeUndefined()
    })
  })
})
