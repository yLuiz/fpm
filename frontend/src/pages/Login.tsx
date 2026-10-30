import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { safeRedirect } from '@/lib/redirect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const from = safeRedirect(
    (location.state as { from?: string } | null)?.from ?? searchParams.get('from')
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login({ email, password })
      toast.success('Bem-vindo de volta!')
      navigate(from, { replace: true })
    } catch {
      toast.error('Email ou senha inválidos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandMark className="size-16" />
          <div>
            <h1 className="text-2xl font-bold">FPM</h1>
            <p className="flex items-center justify-center gap-1.5 text-sm text-label">
              Factory Preventive Maintenance
              <span className="size-1.5 rounded-full bg-accent-solid" />
            </p>
          </div>
        </div>

        <Card className="bg-surface hover:border-border">
          <CardHeader>
            <CardTitle className="text-xl">Entrar</CardTitle>
            <CardDescription>Acesse o painel de manutenção preventiva</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@fpm.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-4 border-none bg-transparent pt-2">
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
              <div className="w-full rounded-lg border border-surface-strong bg-background px-4 py-3 text-center text-xs font-normal text-label">
                <p className="font-semibold text-foreground">Usuário de teste</p>
                <p>admin@fpm.com · admin123</p>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
