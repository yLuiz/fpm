import { test, expect } from '@playwright/test'
import { ADMIN, login } from './helpers'

test.describe('Autenticação', () => {
  test('acesso direto sem sessão volta à página pedida após o login', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/login/)
    await login(page, ADMIN)
    await expect(page).toHaveURL(/\/settings$/)
    await expect(page.getByRole('heading', { name: /Configurações/ })).toBeVisible()
  })

  test('senha errada mostra erro e não sai do login', async ({ page }) => {
    await page.goto('/login')
    await login(page, { email: ADMIN.email, password: 'errada' })
    await expect(page.getByText('Email ou senha inválidos')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })
})
