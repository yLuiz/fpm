// Ambiente dos testes de integração e e2e: banco isolado (fpm_test) e sem rate limit
process.env.NODE_ENV = 'test';
process.env.TZ = 'America/Sao_Paulo';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://fpm_user:fpm_password@localhost:5432/fpm_test?schema=public';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_EXPIRES_IN = '15m';
