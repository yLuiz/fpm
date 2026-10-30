import { useAuth } from '../contexts/AuthContext'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, MoreHorizontal, Eye, Pencil, Power, Cog, QrCode } from 'lucide-react'
import { toast } from 'sonner'
import { equipmentApi } from '../services/api'
import type { Equipment } from '../types'
import { EQUIPMENT_TYPE_LABELS, CRITICALITY_LABELS, STATUS_LABELS } from '../types'
import { criticalityVariant, equipmentStatusVariant } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function EquipmentList() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('ALL')
  const [confirmTarget, setConfirmTarget] = useState<Equipment | null>(null)

  useEffect(() => {
    loadEquipment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const loadEquipment = async () => {
    try {
      const data = await equipmentApi.getAll(filter === 'ALL' ? undefined : filter)
      setEquipment(data)
    } catch (error) {
      console.error('Error loading equipment:', error)
      toast.error('Erro ao carregar equipamentos')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async () => {
    if (!confirmTarget) return
    try {
      await equipmentApi.toggleStatus(confirmTarget.id)
      toast.success(
        confirmTarget.status === 'ACTIVE' ? 'Equipamento desativado' : 'Equipamento ativado'
      )
      loadEquipment()
    } catch (error) {
      console.error('Error toggling status:', error)
      toast.error('Erro ao alterar status')
    } finally {
      setConfirmTarget(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Equipamentos"
        context="Gerencie os equipamentos da fábrica"
        actions={
          <>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="ACTIVE">Ativos</SelectItem>
                <SelectItem value="INACTIVE">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Button asChild variant="outline">
              <Link to="/equipment/labels">
                <QrCode />
                Etiquetas QR
              </Link>
            </Button>
            {isAdmin && (
              <Button asChild>
                <Link to="/equipment/new">
                  <Plus />
                  Novo equipamento
                </Link>
              </Button>
            )}
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Lista de equipamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : equipment.length === 0 ? (
            <EmptyState
              icon={Cog}
              title="Sem dados"
              description="Nenhum equipamento encontrado para o filtro atual"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Criticidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link
                        to={`/equipment/${item.id}`}
                        className="font-semibold text-accent-solid transition-colors duration-300 hover:text-accent-hover"
                      >
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell>{EQUIPMENT_TYPE_LABELS[item.type]}</TableCell>
                    <TableCell>{item.location}</TableCell>
                    <TableCell>
                      <Badge variant={criticalityVariant[item.criticality]}>
                        {CRITICALITY_LABELS[item.criticality]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.downtimes?.length ? (
                        <Badge variant="destructive">
                          <span className="size-2 animate-blink rounded-full bg-danger-text" />
                          Parado
                        </Badge>
                      ) : (
                        <Badge variant={equipmentStatusVariant[item.status]}>
                          {STATUS_LABELS[item.status]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon-sm">
                            <MoreHorizontal />
                            <span className="sr-only">Ações</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/equipment/${item.id}`}>
                              <Eye />
                              Ver detalhes
                            </Link>
                          </DropdownMenuItem>
                          {isAdmin && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link to={`/equipment/${item.id}/edit`}>
                                  <Pencil />
                                  Editar
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setConfirmTarget(item)}>
                                <Power />
                                {item.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmTarget?.status === 'ACTIVE' ? 'Desativar' : 'Ativar'} equipamento?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget?.status === 'ACTIVE'
                ? `"${confirmTarget?.name}" deixará de aparecer nas listas de ativos.`
                : `"${confirmTarget?.name}" voltará a ficar ativo.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant={confirmTarget?.status === 'ACTIVE' ? 'destructive' : 'default'}
              onClick={handleToggle}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
