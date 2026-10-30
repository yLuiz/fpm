import { test, expect } from '@playwright/test'
import { answer, loginAt, openEquipment } from './helpers'

const EQUIPMENT = 'Motor Principal Linha 1' // MOTOR, criticidade alta (seed)

test('preventiva com item Não OK abre corretiva, que é concluída com a solução', async ({ page }) => {
  await loginAt(page, '/equipment')
  await openEquipment(page, EQUIPMENT)
  await expect(page.getByText(/Corretivas abertas/)).toHaveCount(0)

  await page.getByRole('link', { name: 'Registrar preventiva' }).click()
  await expect(page.getByRole('heading', { name: /Registrar preventiva/ })).toBeVisible()

  // Checklist incompleto não é enviado
  await answer(page, 'Temperatura ok', 'OK')
  await page.getByRole('button', { name: 'Registrar preventiva' }).click()
  await expect(page.getByText('Responda todos os itens (2 pendente(s))')).toBeVisible()

  await answer(page, 'Ruído ok', 'Não OK')
  await page.getByLabel('Problema encontrado em Ruído ok').fill('Ruído anormal no rolamento traseiro')
  await answer(page, 'Lubrificação realizada', 'OK')
  await expect(page.getByRole('status')).toContainText('Será aberta uma ordem corretiva')
  await page.getByRole('button', { name: 'Registrar preventiva' }).click()

  // Volta ao equipamento com a corretiva aberta e o resultado no histórico
  await expect(page.getByText('Ordem corretiva aberta')).toBeVisible()
  await expect(page.getByText('Corretivas abertas (1)')).toBeVisible()
  await expect(page.getByText(/Ruído ok: Ruído anormal no rolamento traseiro/)).toBeVisible()
  // O histórico do seed pode ter outros "Não OK"; o registro novo é a primeira linha com resultado
  await expect(page.getByRole('cell', { name: /Não OK|OK/ }).first()).toHaveText('1 Não OK')

  // Dashboard mostra a corretiva
  await page.goto('/')
  await expect(page.getByText('Corretivas abertas').first()).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Corretiva' }).first()).toBeVisible()

  // Conclui a corretiva
  await openEquipment(page, EQUIPMENT)
  await page.getByRole('link', { name: 'Registrar correção' }).click()
  await expect(page.getByRole('heading', { name: /Registrar corretiva/ })).toBeVisible()
  await page.getByRole('button', { name: 'Concluir corretiva' }).click()
  await expect(page.getByText('Descreva a solução aplicada')).toBeVisible()
  await page.getByLabel('Solução aplicada *').fill('Rolamento traseiro substituído')
  await page.getByRole('button', { name: 'Concluir corretiva' }).click()

  await expect(page.getByText('Manutenção registrada com sucesso')).toBeVisible()
  await expect(page.getByText(/Corretivas abertas \(/)).toHaveCount(0)
  await expect(page.getByRole('cell', { name: 'Rolamento traseiro substituído' })).toBeVisible()
})
