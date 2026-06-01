import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

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
      setError('Email ou senha inválidos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full">
        <div className="card">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary-600">FPM</h1>
            <p className="text-gray-600 mt-2">Factory Preventive Maintenance</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="admin@fpm.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-3">Usuários de teste:</p>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
                <div>
                  <p className="font-medium text-gray-800">Administrador</p>
                  <p className="text-xs">admin@fpm.com / admin123</p>
                </div>
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">ADMIN</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
                <div>
                  <p className="font-medium text-gray-800">Usuário Padrão</p>
                  <p className="text-xs">user@fpm.com / user123</p>
                </div>
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">USER</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
                <div>
                  <p className="font-medium text-gray-800">{"João Silva"}</p>
                  <p className="text-xs">joao@fpm.com / 123456</p>
                </div>
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">USER</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
