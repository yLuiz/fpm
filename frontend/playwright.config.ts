import { defineConfig, devices } from '@playwright/test'

/**
 * E2E com stack própria: backend em 3101 (banco fpm_e2e, semeado do zero) e frontend em 5180.
 * Não interfere nos containers do docker compose.
 */
const DB = 'postgresql://fpm_user:fpm_password@localhost:5432/fpm_e2e?schema=public'
const API_PORT = 3101
const WEB_PORT = 5180

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    {
      command: 'npx prisma migrate deploy && npx ts-node prisma/seed.ts --reset && npx nest start',
      cwd: '../backend',
      url: `http://localhost:${API_PORT}/health/live`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        DATABASE_URL: DB,
        PORT: String(API_PORT),
        NODE_ENV: 'test',
        TZ: 'America/Sao_Paulo',
        JWT_SECRET: 'e2e-secret',
        JWT_REFRESH_SECRET: 'e2e-refresh-secret',
        JWT_EXPIRES_IN: '1h',
      },
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      timeout: 60_000,
      reuseExistingServer: false,
      env: { VITE_API_URL: `http://localhost:${API_PORT}` },
    },
  ],
})
