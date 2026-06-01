import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Factory, AlertCircle, Loader2, User, Shield } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login({ email, password })
      navigate('/')
    } catch {
      setError('Email ou senha invalidos')
    } finally {
      setLoading(false)
    }
  }

  const testUsers = [
    { name: 'Administrador', email: 'admin@fpm.com', password: 'admin123', role: 'ADMIN' },
    { name: 'Usuario Padrao', email: 'user@fpm.com', password: 'user123', role: 'USER' },
    { name: 'Joao Silva', email: 'joao@fpm.com', password: '123456', role: 'USER' },
  ]

  const handleQuickLogin = (userEmail: string, userPassword: string) => {
    setEmail(userEmail)
    setPassword(userPassword)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex items-center justify-center size-12 rounded-xl bg-primary text-primary-foreground">
            <Factory className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">FPM</h1>
            <p className="text-muted-foreground">Factory Preventive Maintenance</p>
          </div>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Entrar</CardTitle>
            <CardDescription>
              Digite suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium leading-none">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium leading-none">
                  Senha
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Test Users Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Usuarios de teste</CardTitle>
            <CardDescription className="text-xs">
              Clique para preencher automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {testUsers.map((user, index) => (
              <div key={user.email}>
                {index > 0 && <Separator className="my-2" />}
                <button
                  type="button"
                  onClick={() => handleQuickLogin(user.email, user.password)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-8 rounded-full bg-muted">
                      {user.role === 'ADMIN' ? (
                        <Shield className="size-4 text-primary" />
                      ) : (
                        <User className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.email} / {user.password}
                      </p>
                    </div>
                  </div>
                  <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                    {user.role === 'ADMIN' ? 'Admin' : 'User'}
                  </Badge>
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
