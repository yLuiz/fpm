import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp, signIn, adminUser } from '@/test/render'
import { authApi, downtimeApi, equipmentApi } from '@/services/api'
import type { Downtime, Equipment } from '@/types'

vi.mock('@/services/api', () => ({
  authApi: { me: vi.fn(), login: vi.fn(), logout: vi.fn() },
  equipmentApi: { getAll: vi.fn(), getById: vi.fn() },
  maintenanceApi: {},
  settingsApi: {},
  downtimeApi: { list: vi.fn(), create: vi.fn(), close: vi.fn() },
}))

const equipment: Equipment = {
  id: 'e1',
  name: 'Bomba Principal',
  type: 'PUMP',
  location: 'Casa de Bombas',
  criticality: 'HIGH',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
  maintenances: [],
  downtimes: [],
}

const openDowntime: Downtime = {
  id: 'd1',
  equipmentId: 'e1',
  startedAt: new Date(Date.now() - 90 * 60000).toISOString(),
  endedAt: null,
  cause: 'MECHANICAL',
  description: 'Selo vazando',
  preventiveOverdue: true,
  correctiveId: 'c1',
  equipment: { id: 'e1', name: 'Bomba Principal', type: 'PUMP', location: 'x', criticality: 'HIGH' },
  corrective: { id: 'c1', status: 'SCHEDULED', dueDate: '2026-10-25T00:00:00.000Z' },
}

const closedDowntime: Downtime = {
  ...openDowntime,
  id: 'd2',
  startedAt: '2026-10-01T08:00:00.000Z',
  endedAt: '2026-10-01T10:30:00.000Z',
  preventiveOverdue: false,
  correctiveId: null,
  corrective: null,
  description: 'Correia rompeu',
}

describe('Paradas', () => {
  beforeEach(() => {
    signIn()
    vi.mocked(authApi.me).mockResolvedValue(adminUser)
    vi.mocked(downtimeApi.list).mockReset()
    vi.mocked(downtimeApi.create).mockReset()
    vi.mocked(downtimeApi.close).mockReset()
  })

  it('lista paradas com duração, snapshot de preventiva e filtro', async () => {
    vi.mocked(downtimeApi.list).mockResolvedValue([openDowntime, closedDowntime])
    renderApp('/downtime')

    const rows = await screen.findAllByRole('row')
    expect(rows).toHaveLength(3) // cabeçalho + 2
    expect(within(rows[1]).getByText('Parado')).toBeInTheDocument()
    expect(within(rows[1]).getByText('1h 30min')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Sim')).toBeInTheDocument()
    expect(within(rows[2]).getByText('2h 30min')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Não')).toBeInTheDocument()
    expect(downtimeApi.list).toHaveBeenLastCalledWith({ open: undefined })

    await userEvent.click(screen.getByRole('radio', { name: 'Em andamento' }))
    expect(downtimeApi.list).toHaveBeenLastCalledWith({ open: true })
  })

  it('encerra a parada pelo dialog', async () => {
    vi.mocked(downtimeApi.list).mockResolvedValue([openDowntime])
    vi.mocked(downtimeApi.close).mockResolvedValue({ ...openDowntime, endedAt: new Date().toISOString() })
    renderApp('/downtime')

    await userEvent.click(await screen.findByRole('button', { name: /Encerrar/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Encerrar parada' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Encerrar parada' }))

    expect(downtimeApi.close).toHaveBeenCalledWith('d1', expect.any(String))
    expect(await screen.findByText('Parada encerrada; equipamento voltou a operar')).toBeInTheDocument()
  })

  it('registra parada no detalhe do equipamento, com corretiva', async () => {
    vi.mocked(equipmentApi.getById).mockResolvedValue(equipment)
    vi.mocked(downtimeApi.create).mockResolvedValue(openDowntime)
    renderApp('/equipment/e1')

    await userEvent.click(await screen.findByRole('button', { name: /Registrar parada/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Registrar parada' })

    // Sem causa e descrição não envia
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar parada' }))
    expect(await screen.findByText('Preencha equipamento, causa e descrição')).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Causa *' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Mecânica' }))
    await userEvent.type(within(dialog).getByLabelText('O que aconteceu *'), 'Selo vazando')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar parada' }))

    expect(downtimeApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        equipmentId: 'e1',
        cause: 'MECHANICAL',
        description: 'Selo vazando',
        openCorrective: true,
      })
    )
    expect(await screen.findByText('Parada registrada e corretiva aberta')).toBeInTheDocument()
  })

  it('equipamento parado mostra alerta e ação de encerrar', async () => {
    vi.mocked(equipmentApi.getById).mockResolvedValue({
      ...equipment,
      downtimes: [{ id: 'd1', startedAt: openDowntime.startedAt, cause: 'MECHANICAL', description: 'Selo vazando' }],
    })
    renderApp('/equipment/e1')

    expect(await screen.findByRole('alert')).toHaveTextContent('Equipamento parado há 1h 30min')
    expect(screen.getByRole('button', { name: /Encerrar parada/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Registrar parada/ })).not.toBeInTheDocument()
  })
})
