/**
 * Destino seguro após o login: aceita só caminhos internos (evita open redirect)
 * e nunca volta para a própria tela de login.
 */
export function safeRedirect(target: string | null | undefined, fallback = '/'): string {
  if (!target || !target.startsWith('/') || target.startsWith('//')) return fallback
  if (target === '/login' || target.startsWith('/login?')) return fallback
  return target
}

/** Caminho atual completo (rota + query) para guardar como destino. */
export function currentPath(location: { pathname: string; search?: string; hash?: string }) {
  return `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`
}
