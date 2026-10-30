import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use Winston logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  configureApp(app);

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('FPM - Factory Preventive Maintenance')
    .setDescription('API para Sistema de Manutenção Preventiva de Chão de Fábrica')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticação')
    .addTag('equipment', 'Equipamentos')
    .addTag('maintenance', 'Manutenções')
    .addTag('settings', 'Configurações')
    .addTag('downtime', 'Paradas')
    .addTag('metrics', 'Indicadores')
    .addTag('health', 'Health Check')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation: http://localhost:${port}/api`);
  logger.log(`Health check: http://localhost:${port}/health`);
}
bootstrap();
