import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp, signIn, adminUser } from '@/test/render'
import { authApi, equipmentApi, maintenanceApi } from '@/services/api'
import type { Equipment } from '@/types'

vi.mock('@/services/api', () => ({
  authApi: { me: vi.fn(), login: vi.fn(), logout: vi.fn() },
  equipmentApi: { getById: vi.fn(), getAll: vi.fn() },
  maintenanceApi: { getById: vi.fn(), getChecklist: vi.fn() },
  downtimeApi: {},
  settingsApi: {},
}))

const base: Equipment = {
  id: 'e1',
  name: 'Motor Auxiliar',
  type: 'MOTOR',
  location: 'Galpão A',
  criticality: 'MEDIUM',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
  maintenances: [],
  downtimes: [],
}

const overduePreventive = {
  id: 'p1',
  equipmentId: 'e1',
  kind: 'PREVENTIVE' as const,
  status: 'SCHEDULED' as const,
  dueDate: '2020-01-01T08:00:00.000Z',
  createdAt: '2020-01-01T00:00:00.000Z',
}

describe('QR Code', () => {
  beforeEach(() => {
    vi.mocked(authApi.me).mockResolvedValue(adminUser)
  })

  it('leitura do QR sem sessão: login e depois o registro da preventiva vencida', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ access_token: 't', refresh_token: 'r', expires_in: 900, user: adminUser })
    vi.mocked(equipmentApi.getById).mockResolvedValue({ ...base, maintenances: [overduePreventive] })
    vi.mocked(maintenanceApi.getById).mockResolvedValue({ ...overduePreventive, equipment: base })
    vi.mocked(maintenanceApi.getChecklist).mockResolvedValue({ type: 'MOTOR', items: ['Ruído ok'] })

    renderApp('/e/e1')
    await userEvent.type(await screen.findByLabelText('Email'), 'admin@fpm.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'admin123')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('heading', { name: /Registrar preventiva/ })).toBeInTheDocument()
    expect(maintenanceApi.getById).toHaveBeenCalledWith('p1')
  })

  it('sem pendência próxima abre o detalhe do equipamento', async () => {
    signIn()
    vi.mocked(equipmentApi.getById).mockResolvedValue(base)
    renderApp('/e/e1')
    expect(await screen.findByRole('heading', { name: /Motor Auxiliar/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Etiqueta QR/ })).toHaveAttribute('href', '/equipment/labels?ids=e1')
  })

  it('etiqueta inexistente mostra aviso', async () => {
    signIn()
    vi.mocked(equipmentApi.getById).mockRejectedValue(new Error('404'))
    renderApp('/e/nao-existe')
    expect(await screen.findByText('Equipamento não encontrado')).toBeInTheDocument()
  })

  it('etiquetas: QR aponta para /e/:id e a seleção filtra o que será impresso', async () => {
    signIn()
    vi.mocked(equipmentApi.getAll).mockResolvedValue([base, { ...base, id: 'e2', name: 'Bomba 2' }])
    renderApp('/equipment/labels?ids=e2')

    const labels = await screen.findAllByTestId('qr-label')
    expect(labels).toHaveLength(1)
    expect(labels[0]).toHaveAttribute('data-url', `${window.location.origin}/e/e2`)
    expect(labels[0]).toHaveTextContent('Bomba 2')
    // jsdom roda em localhost: avisa que o QR não abre no celular
    expect(screen.getByRole('note')).toHaveTextContent('não abre no celular')

    await userEvent.click(screen.getByRole('button', { name: 'Todos' }))
    expect(screen.getAllByTestId('qr-label')).toHaveLength(2)
    await userEvent.click(screen.getByRole('button', { name: 'Nenhum' }))
    expect(screen.queryAllByTestId('qr-label')).toHaveLength(0)
    expect(screen.getByRole('button', { name: /Imprimir/ })).toBeDisabled()
  })
})
