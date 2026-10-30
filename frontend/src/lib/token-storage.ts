import type { AuthTokens } from '../types'

export const REFRESH_TOKEN_KEY = 'refreshToken'

/** Tokens da sessão no localStorage (access token de 15 min + refresh token de 7 dias). */
export const tokenStorage = {
  save(tokens: AuthTokens) {
    localStorage.setItem('token', tokens.access_token)
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
  },
  clear() {
    localStorage.removeItem('token')
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem('user')
  },
}
