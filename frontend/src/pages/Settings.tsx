import { useEffect, useState } from 'react'
import { Loader2, Info } from 'lucide-react'
import { toast } from 'sonner'
import { settingsApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import type { FrequencySetting, EquipmentType } from '../types'
import { EQUIPMENT_TYPE_LABELS } from '../types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/page-header'

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
      setEditValues(Object.fromEntries(data.map((f) => [f.equipmentType, f.frequencyDays])))
    } catch (error) {
      console.error('Error loading frequencies:', error)
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (type: EquipmentType) => {
    const newValue = editValues[type]
    if (newValue < 1 || newValue > 365) {
      toast.error('A frequência deve estar entre 1 e 365 dias')
      return
    }
    setSaving(type)
    try {
      await settingsApi.updateFrequency(type, newValue)
      toast.success('Frequência atualizada')
      await loadFrequencies()
    } catch (error) {
      console.error('Error updating frequency:', error)
      toast.error('Erro ao atualizar frequência')
    } finally {
      setSaving(null)
    }
  }

  const hasChanged = (type: string) => {
    const original = frequencies.find((f) => f.equipmentType === type)
    return original && editValues[type] !== original.frequencyDays
  }

  return (
    // Conteúdo estreito centralizado: título e card alinhados na mesma coluna
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <PageHeader title="Configurações" context="Frequência de manutenção preventiva" />

      <Card>
        <CardHeader>
          <CardTitle>Frequência de manutenção</CardTitle>
          <CardDescription>
            Configure em dias. As novas frequências valem para as próximas manutenções criadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAdmin && (
            <div className="flex items-center gap-2 rounded-lg border border-warning/60 bg-warning/10 px-4 py-3 text-sm text-warning-text">
              <Info className="h-4 w-4 shrink-0" />
              Somente administradores podem alterar as configurações.
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de equipamento</TableHead>
                  <TableHead>Frequência (dias)</TableHead>
                  {isAdmin && <TableHead>Ação</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {frequencies.map((freq) => (
                  <TableRow key={freq.equipmentType}>
                    <TableCell className="font-semibold">
                      {EQUIPMENT_TYPE_LABELS[freq.equipmentType]}
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={editValues[freq.equipmentType] ?? freq.frequencyDays}
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev,
                              [freq.equipmentType]: parseInt(e.target.value) || 1,
                            }))
                          }
                          className="mx-auto w-24 text-center"
                        />
                      ) : (
                        <span>{freq.frequencyDays} dias</span>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleSave(freq.equipmentType)}
                          disabled={!hasChanged(freq.equipmentType) || saving === freq.equipmentType}
                        >
                          {saving === freq.equipmentType && (
                            <Loader2 className="animate-spin" />
                          )}
                          Salvar
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
