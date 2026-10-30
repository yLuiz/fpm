import { isAxiosError } from 'axios'

/** Mensagem de erro vinda da API (string ou lista de validação), com fallback. */
export function apiErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    const message = (error.response?.data as { message?: string | string[] } | undefined)?.message
    if (Array.isArray(message) && message.length > 0) return message.join(' · ')
    if (typeof message === 'string' && message) return message
  }
  return fallback
}
