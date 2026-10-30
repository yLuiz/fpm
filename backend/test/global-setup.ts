import { execSync } from 'child_process';

/** Aplica as migrations no banco de teste antes da suíte. */
export default async function globalSetup() {
  require('./setup-env');
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env },
  });
}
