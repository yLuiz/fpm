import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/**
 * Configuração HTTP compartilhada entre o bootstrap (main.ts) e os testes e2e.
 */
export function configureApp(app: INestApplication) {
  // Security headers with Helmet
  app.use(helmet());

  // CORS: lista por CORS_ORIGINS (separada por vírgula); sem ela, aceita qualquer origem
  // (necessário para abrir pelo IP da rede no celular, ex.: leitura do QR Code)
  const origins = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin: origins && origins.length > 0 ? origins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());
}
