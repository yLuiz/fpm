import { test, expect, devices } from '@playwright/test'
import { answer, login, loginAt } from './helpers'

const OVERDUE = 'Motor Auxiliar Linha 2' // preventiva vencida no cenário do seed
const NOTHING_DUE = 'Bomba Hidráulica Principal' // próxima preventiva distante

test('QR Code: etiquetas e leitura no celular levam direto à pendência', async ({ page, browser }) => {
  // Desktop: gerar as etiquetas
  await loginAt(page, '/equipment')
  await page.getByRole('link', { name: 'Etiquetas QR' }).click()
  await expect(page.getByRole('heading', { name: /Etiquetas QR/ })).toBeVisible()
  await expect(page.getByTestId('qr-label')).toHaveCount(10)
  await expect(page.getByRole('note')).toContainText('não abre no celular') // rodando em localhost

  const urlOf = async (name: string) => {
    const url = await page.getByTestId('qr-label').filter({ hasText: name }).getAttribute('data-url')
    expect(url).toMatch(/\/e\/[0-9a-f-]{36}$/)
    return new URL(url!).pathname
  }
  const overduePath = await urlOf(OVERDUE)
  const nothingDuePath = await urlOf(NOTHING_DUE)

  // Celular sem sessão: escaneia, faz login e cai no registro da preventiva vencida
  const phone = await browser.newContext({ ...devices['Pixel 7'], baseURL: test.info().project.use.baseURL })
  const mobile = await phone.newPage()
  await mobile.goto(overduePath)
  await expect(mobile).toHaveURL(/\/login/)
  await login(mobile)
  await expect(mobile.getByRole('heading', { name: /Registrar preventiva/ })).toBeVisible()
  await expect(mobile.getByText(OVERDUE).first()).toBeVisible()

  // Registro completo no celular
  for (const item of ['Temperatura ok', 'Ruído ok', 'Lubrificação realizada']) {
    await answer(mobile, item, 'OK')
  }
  const noHorizontalScroll = await mobile.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
  )
  expect(noHorizontalScroll).toBe(true)
  await mobile.getByRole('button', { name: 'Registrar preventiva' }).click()
  await expect(mobile.getByText('Manutenção registrada com sucesso')).toBeVisible()
  await expect(mobile.getByRole('heading', { name: new RegExp(OVERDUE) })).toBeVisible()

  // Equipamento sem pendência próxima: abre o detalhe
  await mobile.goto(nothingDuePath)
  await expect(mobile.getByRole('heading', { name: new RegExp(NOTHING_DUE) })).toBeVisible()
  await expect(mobile).toHaveURL(/\/equipment\//)

  await phone.close()
})
