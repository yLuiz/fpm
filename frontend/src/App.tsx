import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import EquipmentList from './pages/EquipmentList'
import EquipmentDetail from './pages/EquipmentDetail'
import EquipmentForm from './pages/EquipmentForm'
import MaintenanceRegister from './pages/MaintenanceRegister'
import Settings from './pages/Settings'
import Downtimes from './pages/Downtimes'
import EquipmentScan from './pages/EquipmentScan'
import EquipmentLabels from './pages/EquipmentLabels'
import { currentPath } from './lib/redirect'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-accent-solid" />
      </div>
    )
  }

  if (!isAuthenticated) {
    // Guarda o destino (ex.: link do QR Code) para voltar após o login
    return <Navigate to="/login" replace state={{ from: currentPath(location) }} />
  }

  return <>{children}</>
}

/** Telas de gestão de equipamentos: só ADMIN (decisão D1); o backend também recusa com 403. */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (user?.role !== 'ADMIN') return <Navigate to="/equipment" replace />
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="equipment" element={<EquipmentList />} />
        <Route path="equipment/new" element={<AdminRoute><EquipmentForm /></AdminRoute>} />
        <Route path="equipment/labels" element={<EquipmentLabels />} />
        <Route path="e/:id" element={<EquipmentScan />} />
        <Route path="equipment/:id" element={<EquipmentDetail />} />
        <Route path="equipment/:id/edit" element={<AdminRoute><EquipmentForm /></AdminRoute>} />
        <Route path="maintenance/:id/register" element={<MaintenanceRegister />} />
        <Route path="downtime" element={<Downtimes />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
