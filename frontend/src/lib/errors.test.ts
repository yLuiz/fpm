import { describe, expect, it } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { apiErrorMessage } from './errors'

function axiosError(message: unknown) {
  return new AxiosError('fail', '400', undefined, undefined, {
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { message },
  })
}

describe('apiErrorMessage', () => {
  it('usa a mensagem da API (texto ou lista)', () => {
    expect(apiErrorMessage(axiosError('Já concluída'), 'x')).toBe('Já concluída')
    expect(apiErrorMessage(axiosError(['a', 'b']), 'x')).toBe('a · b')
  })

  it('cai no fallback para erros sem mensagem', () => {
    expect(apiErrorMessage(new Error('boom'), 'Falhou')).toBe('Falhou')
    expect(apiErrorMessage(axiosError(undefined), 'Falhou')).toBe('Falhou')
  })
})
