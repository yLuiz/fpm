import { test, expect, type Page } from '@playwright/test'
import { answer, loginAt, login, USER } from './helpers'

/**
 * Bateria final: o ciclo completo do produto, de ponta a ponta, num só cenário.
 * Cadastro → agenda automática → parada → corretiva → preventiva com achado →
 * correção → indicadores → configuração → etiqueta QR → desativação → perfis.
 */

const NAME = 'Esteira E2E Linha C'

async function downtimeCount(page: Page) {
  await page.goto('/?tab=indicadores')
  const hint = await page.getByTestId('kpi-MTTR').locator('p').last().textContent()
  return Number(hint?.match(/(\d+) parada/)?.[1] ?? 'NaN')
}

test('fluxo completo da aplicação', async ({ page }) => {
  test.setTimeout(120_000)
  await loginAt(page, '/')

  // 1. Dashboard abre com alertas do cenário de demonstração
  await expect(page.getByRole('heading', { name: /Dashboard/ })).toBeVisible()
  await expect(page.getByText('Manutenções vencidas')).toBeVisible()
  const downtimesBefore = await downtimeCount(page)
  expect(downtimesBefore).toBeGreaterThanOrEqual(0)

  // 2. Cadastro de equipamento gera a primeira preventiva automaticamente
  await page.goto('/equipment')
  await page.getByRole('link', { name: /Novo equipamento/ }).click()
  await page.getByLabel('Nome do equipamento *').fill(NAME)
  await page.getByRole('combobox', { name: 'Tipo *' }).click()
  await page.getByRole('option', { name: 'Esteira Transportadora' }).click()
  await page.getByLabel('Localização *').fill('Galpão C')
  await page.getByRole('combobox', { name: 'Criticidade *' }).click()
  await page.getByRole('option', { name: 'Alta' }).click()
  await page.getByRole('button', { name: 'Criar equipamento' }).click()
  await expect(page.getByText('Equipamento criado')).toBeVisible()

  await page.getByRole('link', { name: NAME, exact: true }).click()
  await expect(page.getByRole('heading', { name: new RegExp(NAME) })).toBeVisible()
  await expect(page.getByText('Próxima preventiva')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Preventiva' })).toHaveCount(1)

  // 3. Parada não planejada com corretiva
  await page.getByRole('button', { name: 'Registrar parada' }).click()
  const dialog = page.getByRole('dialog', { name: 'Registrar parada' })
  await dialog.getByRole('combobox', { name: 'Causa *' }).click()
  await page.getByRole('option', { name: 'Mecânica' }).click()
  await dialog.getByLabel('O que aconteceu *').fill('Rolo de retorno travou')
  await dialog.getByRole('button', { name: 'Registrar parada' }).click()
  await expect(page.getByRole('alert')).toContainText('Equipamento parado há')
  await expect(page.getByText('Corretivas abertas (1)')).toBeVisible()

  // 4. Preventiva com item Não OK abre mais uma corretiva
  await page.getByRole('link', { name: 'Registrar preventiva' }).click()
  await answer(page, 'Alinhamento ok', 'OK')
  await answer(page, 'Tensão ok', 'Não OK')
  await page.getByLabel('Problema encontrado em Tensão ok').fill('Correia com folga excessiva')
  await answer(page, 'Motor ok', 'N.A.')
  await page.getByRole('button', { name: 'Registrar preventiva' }).click()
  await expect(page.getByText('Ordem corretiva aberta')).toBeVisible()
  await expect(page.getByText('Corretivas abertas (2)')).toBeVisible()
  // Próxima preventiva reagendada automaticamente
  await expect(page.getByRole('cell', { name: 'Preventiva' })).toHaveCount(2)

  // 5. Conclui as duas corretivas e encerra a parada
  for (let i = 0; i < 2; i++) {
    await page.getByRole('link', { name: 'Registrar correção' }).first().click()
    await page.getByLabel('Solução aplicada *').fill(`Correção ${i + 1} aplicada`)
    await page.getByRole('button', { name: 'Concluir corretiva' }).click()
    await expect(page.getByText('Manutenção registrada com sucesso').first()).toBeVisible()
  }
  await expect(page.getByText(/Corretivas abertas \(/)).toHaveCount(0)
  await page.getByRole('button', { name: 'Encerrar parada' }).click()
  await page.getByRole('dialog', { name: 'Encerrar parada' }).getByRole('button', { name: 'Encerrar parada' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)

  // 6. Indicadores contam a nova parada
  expect(await downtimeCount(page)).toBe(downtimesBefore + 1)

  // 7. Configuração da frequência (admin)
  await page.getByRole('link', { name: 'Configurações' }).click()
  const row = page.getByRole('row').filter({ hasText: 'Esteira Transportadora' })
  await row.getByRole('spinbutton').fill('20')
  await row.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Frequência atualizada')).toBeVisible()
  await row.getByRole('spinbutton').fill('15')
  await row.getByRole('button', { name: 'Salvar' }).click()

  // 8. Etiqueta QR do equipamento novo
  await page.goto('/equipment')
  await page.getByRole('link', { name: NAME, exact: true }).click()
  await page.getByRole('link', { name: 'Etiqueta QR' }).click()
  await expect(page.getByTestId('qr-label')).toHaveCount(1)
  await expect(page.getByTestId('qr-label')).toContainText(NAME)

  // 9. Desativação
  await page.goto('/equipment')
  const eqRow = page.getByRole('row').filter({ hasText: NAME })
  await eqRow.getByRole('button', { name: 'Ações' }).click()
  await page.getByRole('menuitem', { name: 'Desativar' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText('Equipamento desativado')).toBeVisible()
  await expect(eqRow.getByText('Inativo')).toBeVisible()

  // 10. Sair e entrar como usuário comum: configurações só leitura
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/login/)
  await login(page, USER)
  await expect(page).not.toHaveURL(/\/login/)
  await page.getByRole('link', { name: 'Configurações' }).click()
  await expect(page.getByText('Somente administradores podem alterar as configurações.')).toBeVisible()
  await expect(page.getByRole('spinbutton')).toHaveCount(0)
})
