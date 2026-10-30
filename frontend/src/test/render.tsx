import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { AuthProvider } from '@/contexts/AuthContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import type { User } from '@/types'

export const adminUser: User = { id: 'u1', email: 'admin@fpm.com', name: 'Admin Teste', role: 'ADMIN' }

/** Simula sessão já autenticada (o AuthProvider confirma com authApi.me, que deve estar mockado). */
export function signIn(user: User = adminUser) {
  localStorage.setItem('token', 'test-token')
  localStorage.setItem('user', JSON.stringify(user))
}

/** Renderiza a aplicação inteira numa rota. */
export function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <TooltipProvider delayDuration={0}>
          <App />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}
