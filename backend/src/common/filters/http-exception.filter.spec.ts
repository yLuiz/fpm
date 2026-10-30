import { ArgumentsHost, BadRequestException, Logger } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function host() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const ctx = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url: '/x', method: 'GET' }),
    }),
  } as unknown as ArgumentsHost;
  return { ctx, status, json };
}

describe('HttpExceptionFilter', () => {
  beforeAll(() => jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined));

  it('não expõe a mensagem de erros não-HTTP (ex.: Prisma)', () => {
    const { ctx, status, json } = host();
    new HttpExceptionFilter().catch(
      new Error('Invalid `prisma.equipment.findMany()` invocation in /app/dist/equipment.service.js'),
      ctx,
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(json.mock.calls[0][0].message).toBe('Erro interno do servidor');
  });

  it('mantém a mensagem de exceções HTTP', () => {
    const { ctx, status, json } = host();
    new HttpExceptionFilter().catch(new BadRequestException('days inválido'), ctx);

    expect(status).toHaveBeenCalledWith(400);
    expect(json.mock.calls[0][0].message).toBe('days inválido');
  });
});
