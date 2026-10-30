import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderApp, signIn, adminUser } from '@/test/render'
import { authApi, equipmentApi } from '@/services/api'
import type { User } from '@/types'

vi.mock('@/services/api', () => ({
  authApi: { me: vi.fn(), login: vi.fn(), logout: vi.fn() },
  equipmentApi: { getAll: vi.fn() },
  maintenanceApi: {},
  settingsApi: {},
}))

const technician: User = { id: 'u2', email: 'tecnico@fpm.com', name: 'Técnico', role: 'USER' }

describe('Gestão de equipamentos só para ADMIN (decisão D1)', () => {
  beforeEach(() => {
    vi.mocked(equipmentApi.getAll).mockResolvedValue([])
  })

  it('técnico não vê "Novo equipamento"', async () => {
    signIn(technician)
    vi.mocked(authApi.me).mockResolvedValue(technician)
    renderApp('/equipment')

    expect(await screen.findByRole('link', { name: /Etiquetas QR/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Novo equipamento/ })).not.toBeInTheDocument()
  })

  it('técnico que abre o formulário pela URL volta para a lista', async () => {
    signIn(technician)
    vi.mocked(authApi.me).mockResolvedValue(technician)
    renderApp('/equipment/new')

    expect(await screen.findByRole('link', { name: /Etiquetas QR/ })).toBeInTheDocument()
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument()
  })

  it('administrador vê "Novo equipamento"', async () => {
    signIn(adminUser)
    vi.mocked(authApi.me).mockResolvedValue(adminUser)
    renderApp('/equipment')

    expect(await screen.findByRole('link', { name: /Novo equipamento/ })).toBeInTheDocument()
  })
})
