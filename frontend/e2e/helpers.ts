import { expect, type Page } from '@playwright/test'

export const ADMIN = { email: 'admin@fpm.com', password: 'admin123' }
export const USER = { email: 'user@fpm.com', password: 'user123' }

export async function login(page: Page, who = ADMIN) {
  await page.getByLabel('Email').fill(who.email)
  await page.getByLabel('Senha').fill(who.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

export async function loginAt(page: Page, path = '/', who = ADMIN) {
  await page.goto(path)
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
  await login(page, who)
  await expect(page).not.toHaveURL(/\/login/)
}

/** Abre o detalhe de um equipamento a partir da lista. */
export async function openEquipment(page: Page, name: string) {
  await page.goto('/equipment')
  await page.getByRole('link', { name, exact: true }).click()
  await expect(page.getByRole('heading', { name: new RegExp(name) })).toBeVisible()
}

/** Responde um item do checklist (grupo de rádio com o nome do item). */
export async function answer(page: Page, item: string, result: 'OK' | 'Não OK' | 'N.A.') {
  await page.getByRole('radiogroup', { name: item }).getByRole('radio', { name: result, exact: true }).click()
}
