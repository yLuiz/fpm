import { test, expect } from '@playwright/test'
import { loginAt, openEquipment } from './helpers'

const FROM_DETAIL = 'Compressor Industrial 01'
const FROM_PAGE = 'Bomba de Refrigeração'

test('parada: registrar, ver equipamento parado em todas as telas e encerrar', async ({ page }) => {
  await loginAt(page, '/equipment')

  // 1. Registrar pelo detalhe do equipamento, abrindo corretiva
  await openEquipment(page, FROM_DETAIL)
  await page.getByRole('button', { name: 'Registrar parada' }).click()
  const dialog = page.getByRole('dialog', { name: 'Registrar parada' })
  await dialog.getByRole('combobox', { name: 'Causa *' }).click()
  await page.getByRole('option', { name: 'Elétrica' }).click()
  await dialog.getByLabel('O que aconteceu *').fill('Disjuntor do compressor desarmou')
  await dialog.getByRole('button', { name: 'Registrar parada' }).click()

  await expect(page.getByText('Parada registrada e corretiva aberta')).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Equipamento parado há')
  await expect(page.getByText('Corretivas abertas (1)')).toBeVisible()
  await expect(page.getByText(/Parada \(elétrica\): Disjuntor do compressor desarmou/)).toBeVisible()

  // 2. Lista e dashboard mostram o equipamento parado
  await page.goto('/equipment')
  const row = page.getByRole('row').filter({ hasText: FROM_DETAIL })
  await expect(row.getByText('Parado')).toBeVisible()
  await page.goto('/')
  await expect(page.getByText('1 equipamento(s) parado(s)')).toBeVisible()

  // 3. Registrar outra pela página de Paradas, sem corretiva
  await page.getByRole('link', { name: 'Paradas' }).click()
  await expect(page.getByRole('heading', { name: /Paradas/ })).toBeVisible()
  await page.getByRole('button', { name: 'Registrar parada' }).click()
  const dialog2 = page.getByRole('dialog', { name: 'Registrar parada' })
  await dialog2.getByRole('combobox', { name: 'Equipamento *' }).click()
  // Equipamento já parado não aparece na lista
  await expect(page.getByRole('option', { name: FROM_DETAIL })).toHaveCount(0)
  await page.getByRole('option', { name: FROM_PAGE }).click()
  await dialog2.getByRole('combobox', { name: 'Causa *' }).click()
  await page.getByRole('option', { name: 'Mecânica' }).click()
  await dialog2.getByLabel('O que aconteceu *').fill('Correia da bomba rompeu')
  await dialog2.getByText('Abrir ordem corretiva para o reparo').click()
  await dialog2.getByRole('button', { name: 'Registrar parada' }).click()
  await expect(page.getByText('Parada registrada', { exact: true })).toBeVisible()
  await expect(page.getByText('2 em andamento')).toBeVisible()

  // 4. Encerrar as duas
  for (const name of [FROM_PAGE, FROM_DETAIL]) {
    const r = page.getByRole('row').filter({ hasText: name })
    await r.getByRole('button', { name: 'Encerrar' }).click()
    await page.getByRole('dialog', { name: 'Encerrar parada' }).getByRole('button', { name: 'Encerrar parada' }).click()
    await expect(page.getByText('Parada encerrada; equipamento voltou a operar').first()).toBeVisible()
    await expect(r.getByText('Parado')).toHaveCount(0)
  }

  await page.getByRole('radio', { name: 'Em andamento' }).click()
  await expect(page.getByText('Nenhuma parada registrada')).toBeVisible()

  await page.goto('/')
  await expect(page.getByText(/equipamento\(s\) parado\(s\)/)).toHaveCount(0)
})
