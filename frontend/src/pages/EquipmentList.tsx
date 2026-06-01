import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { equipmentApi } from '../services/api'
import type { Equipment } from '../types'
import { EQUIPMENT_TYPE_LABELS, CRITICALITY_LABELS, STATUS_LABELS } from '../types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, MoreHorizontal, Eye, Pencil, Power, Wrench } from 'lucide-react'

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-md ml-auto" />
        </div>
      ))}
    </div>
  )
}

export default function EquipmentList() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadEquipment()
  }, [filter])

  const loadEquipment = async () => {
    try {
      const data = await equipmentApi.getAll(filter === 'all' ? undefined : filter)
      setEquipment(data)
    } catch (error) {
      console.error('Error loading equipment:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (id: string) => {
    try {
      await equipmentApi.toggleStatus(id)
      loadEquipment()
    } catch (error) {
      console.error('Error toggling status:', error)
    }
  }

  const getCriticalityVariant = (criticality: string) => {
    switch (criticality) {
      case 'HIGH':
        return 'destructive'
      case 'MEDIUM':
        return 'secondary'
      case 'LOW':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipamentos</h1>
          <p className="text-muted-foreground">Gerencie os equipamentos do sistema</p>
        </div>
        <Button asChild>
          <Link to="/equipment/new">
            <Plus data-icon="inline-start" />
            Novo Equipamento
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="size-5" />
                Lista de Equipamentos
              </CardTitle>
              <CardDescription>
                {equipment.length} equipamento{equipment.length !== 1 ? 's' : ''} encontrado{equipment.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ACTIVE">Ativos</SelectItem>
                <SelectItem value="INACTIVE">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton />
          ) : equipment.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wrench className="size-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhum equipamento encontrado</p>
              <Button variant="outline" className="mt-4" asChild>
                <Link to="/equipment/new">Adicionar Equipamento</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Criticidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link
                        to={`/equipment/${item.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {EQUIPMENT_TYPE_LABELS[item.type]}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.location}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getCriticalityVariant(item.criticality) as "destructive" | "secondary" | "outline"}>
                        {CRITICALITY_LABELS[item.criticality]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {STATUS_LABELS[item.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Acoes</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/equipment/${item.id}`}>
                              <Eye className="mr-2 size-4" />
                              Ver Detalhes
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/equipment/${item.id}/edit`}>
                              <Pencil className="mr-2 size-4" />
                              Editar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(item.id)}
                            className={item.status === 'ACTIVE' ? 'text-destructive focus:text-destructive' : 'text-emerald-600'}
                          >
                            <Power className="mr-2 size-4" />
                            {item.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                          </DropdownMenuItem>
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
    </div>
  )
}
