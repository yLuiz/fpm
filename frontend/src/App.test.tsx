import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp, adminUser } from './test/render'
import { authApi, equipmentApi } from './services/api'

vi.mock('./services/api', () => ({
  authApi: { login: vi.fn(), me: vi.fn(), logout: vi.fn() },
  equipmentApi: { getAll: vi.fn() },
  maintenanceApi: {},
  settingsApi: {},
}))

describe('Rotas protegidas', () => {
  beforeEach(() => {
    vi.mocked(equipmentApi.getAll).mockResolvedValue([])
  })

  it('redireciona para o login e volta à página pedida após autenticar', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ access_token: 't', refresh_token: 'r', expires_in: 900, user: adminUser })
    renderApp('/equipment')

    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Email'), 'admin@fpm.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'admin123')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('heading', { name: /Equipamentos/ })).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBe('t')
  })

  it('permanece no login quando a senha está errada', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('401'))
    renderApp('/equipment')

    await userEvent.type(await screen.findByLabelText('Email'), 'admin@fpm.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'errada')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Email ou senha inválidos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })
})
