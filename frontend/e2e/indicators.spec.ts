import { test, expect } from '@playwright/test'
import { loginAt } from './helpers'

test('indicadores: KPIs, gráfico das paradas e aba pela URL', async ({ page }) => {
  await loginAt(page, '/')

  await page.getByRole('tab', { name: /Indicadores/ }).click()
  await expect(page).toHaveURL(/\?tab=indicadores/)

  for (const kpi of ['Cumprimento do plano', 'Atraso médio', 'MTBF', 'MTTR', 'Disponibilidade']) {
    await expect(page.getByTestId(`kpi-${kpi}`)).toBeVisible()
  }
  // Histórico do seed tem preventivas e paradas: os KPIs não ficam vazios
  await expect(page.getByTestId('kpi-Cumprimento do plano')).toContainText('%')
  await expect(page.getByTestId('kpi-Disponibilidade')).toContainText('%')

  // A mensagem do pitch: parcela das paradas com preventiva vencida
  await expect(page.getByTestId('overdue-share')).toContainText('das paradas aconteceram com a preventiva vencida')

  // Gráficos renderizados (6 meses no eixo)
  await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible()

  // Legenda clicável desliga a série
  const legend = page.getByRole('button', { name: /Com preventiva vencida/ })
  await legend.click()
  await expect(legend).toHaveAttribute('aria-pressed', 'false')

  // Acesso direto pela URL abre a aba certa; voltar para Operação limpa o parâmetro
  await page.reload()
  await expect(page.getByRole('tab', { name: /Indicadores/ })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('tab', { name: /Operação/ }).click()
  await expect(page).not.toHaveURL(/tab=/)
  await expect(page.getByText('Corretivas abertas')).toBeVisible()
})
