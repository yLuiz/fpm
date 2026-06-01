import { useEffect, useState } from 'react'
import { settingsApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import type { FrequencySetting, EquipmentType } from '../types'
import { EQUIPMENT_TYPE_LABELS } from '../types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Settings as SettingsIcon, AlertTriangle, Save, Loader2, Clock } from 'lucide-react'

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-8 w-16 ml-auto" />
        </div>
      ))}
    </div>
  )
}

export default function Settings() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [frequencies, setFrequencies] = useState<FrequencySetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, number>>({})

  useEffect(() => {
    loadFrequencies()
  }, [])

  const loadFrequencies = async () => {
    try {
      const data = await settingsApi.getFrequencies()
      setFrequencies(data)
      const values: Record<string, number> = {}
      data.forEach((f) => {
        values[f.equipmentType] = f.frequencyDays
      })
      setEditValues(values)
    } catch (error) {
      console.error('Error loading frequencies:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (type: string, value: number) => {
    setEditValues((prev) => ({ ...prev, [type]: value }))
  }

  const handleSave = async (type: EquipmentType) => {
    const newValue = editValues[type]
    if (newValue < 1 || newValue > 365) {
      return
    }

    setSaving(type)
    try {
      await settingsApi.updateFrequency(type, newValue)
      await loadFrequencies()
    } catch (error) {
      console.error('Error updating frequency:', error)
    } finally {
      setSaving(null)
    }
  }

  const hasChanged = (type: string) => {
    const original = frequencies.find((f) => f.equipmentType === type)
    return original && editValues[type] !== original.frequencyDays
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuracoes</h1>
        <p className="text-muted-foreground">Gerencie as configuracoes do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-full p-2 bg-primary/10">
              <Clock className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle>Frequencia de Manutencao por Tipo</CardTitle>
              <CardDescription>
                Configure a frequencia em dias para cada tipo de equipamento
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAdmin && (
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertDescription>
                Somente administradores podem alterar as configuracoes.
              </AlertDescription>
            </Alert>
          )}

          {loading ? (
            <TableSkeleton />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Equipamento</TableHead>
                  <TableHead className="w-[150px]">Frequencia (dias)</TableHead>
                  {isAdmin && <TableHead className="w-[100px] text-right">Acao</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {frequencies.map((freq) => (
                  <TableRow key={freq.equipmentType}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="rounded-full p-2 bg-muted">
                          <SettingsIcon className="size-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium">
                          {EQUIPMENT_TYPE_LABELS[freq.equipmentType]}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          value={editValues[freq.equipmentType] || freq.frequencyDays}
                          onChange={(e) =>
                            handleChange(freq.equipmentType, parseInt(e.target.value) || 1)
                          }
                          className="w-24"
                        />
                      ) : (
                        <span className="text-muted-foreground">{freq.frequencyDays} dias</span>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Button
                          variant={hasChanged(freq.equipmentType) ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => handleSave(freq.equipmentType)}
                          disabled={!hasChanged(freq.equipmentType) || saving === freq.equipmentType}
                        >
                          {saving === freq.equipmentType ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <>
                              <Save data-icon="inline-start" />
                              Salvar
                            </>
                          )}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <p className="text-xs text-muted-foreground">
            As novas frequencias serao aplicadas as proximas manutencoes criadas.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
