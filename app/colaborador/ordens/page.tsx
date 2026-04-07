// app/colaborador/ordens/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@prodexy/ui'
import { Button } from '@prodexy/ui'
import { Input } from '@prodexy/ui'
import { Badge } from '@prodexy/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@prodexy/ui'
import { Search, Wrench, Car, CheckCircle2, Plus, Pencil, Trash2, Camera } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { OrderDetailsDialog, type OrdemServicoDetails } from '@/components/order-details-dialog'
import { OrderDialog, type OrdemServicoEdit } from '@/components/order-dialog'
import { OrdersView } from '@/components/orders-view'

type OrdemRow = {
  id: string
  numero: string | null
  cliente_id: string | null
  veiculo_placa: string | null
  veiculo_marca: string | null
  veiculo_modelo: string | null
  veiculo_ano: string | null
  veiculo_cor: string | null
  valor_total: number | null
  valor_final: number | null
  status: string | null
  observacoes: string | null
  criado_em: string
  atualizado_em: string | null
}

type Cliente = {
  id: string
  nome: string | null
  telefone: string | null
}

type OrdemServicoItemRow = {
  id: string
  os_id: string
  servico_id: string
  valor: number
}

type Servico = {
  id: string
  nome: string
  valor: number
}

type OrdemFoto = {
  id: string
  os_id: string
  foto_url: string
  criado_em: string
}

export default function Page() {
  const [orders, setOrders] = useState<OrdemRow[]>([])
  const [customers, setCustomers] = useState<Record<string, Cliente>>({})
  const [serviceRowsByOrder, setServiceRowsByOrder] = useState<Record<string, OrdemServicoItemRow[]>>({})
  const [services, setServices] = useState<Record<string, Servico>>({})
  const [photosByOrder, setPhotosByOrder] = useState<Record<string, OrdemFoto[]>>({})

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'aberta' | 'em_andamento' | 'finalizada' | 'cancelada'>('todos')
  const [loading, setLoading] = useState(true)

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrdemServicoDetails | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedEditOrder, setSelectedEditOrder] = useState<OrdemServicoEdit | null>(null)

  async function loadOrders() {
    setLoading(true)

    const [ordensRes, clientesRes, ordemServicosRes, servicosRes, fotosRes] = await Promise.all([
      supabase.from('ordens_de_servico').select('*').order('criado_em', { ascending: false }),
      supabase.from('clientes').select('id,nome,telefone'),
      supabase.from('ordem_servicos').select('id,os_id,servico_id,valor'),
      supabase.from('servicos').select('id,nome,valor'),
      supabase.from('ordem_fotos').select('id,os_id,foto_url,criado_em').order('criado_em', { ascending: true }),
    ])

    if (ordensRes.error) console.error(ordensRes.error)
    if (clientesRes.error) console.error(clientesRes.error)
    if (ordemServicosRes.error) console.error(ordemServicosRes.error)
    if (servicosRes.error) console.error(servicosRes.error)
    if (fotosRes.error) console.error(fotosRes.error)

    const ordens = ((ordensRes.data as OrdemRow[]) || []).map((row) => ({
      ...row,
      valor_total: Number(row.valor_total || 0),
      valor_final: Number(row.valor_final || 0),
    }))

    setOrders(ordens)

    setCustomers(
      (((clientesRes.data as Cliente[]) || []).reduce<Record<string, Cliente>>((acc, item) => {
        acc[item.id] = item
        return acc
      }, {}))
    )

    setServiceRowsByOrder(
      (((ordemServicosRes.data as OrdemServicoItemRow[]) || []).reduce<Record<string, OrdemServicoItemRow[]>>((acc, item) => {
        if (!acc[item.os_id]) acc[item.os_id] = []
        acc[item.os_id].push({
          ...item,
          valor: Number(item.valor || 0),
        })
        return acc
      }, {}))
    )

    setServices(
      (((servicosRes.data as Servico[]) || []).reduce<Record<string, Servico>>((acc, item) => {
        acc[item.id] = {
          ...item,
          valor: Number(item.valor || 0),
        }
        return acc
      }, {}))
    )

    setPhotosByOrder(
      (((fotosRes.data as OrdemFoto[]) || []).reduce<Record<string, OrdemFoto[]>>((acc, item) => {
        if (!acc[item.os_id]) acc[item.os_id] = []
        acc[item.os_id].push(item)
        return acc
      }, {}))
    )

    setLoading(false)
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const customer = order.cliente_id ? customers[order.cliente_id] : undefined

      const searchable = [
        order.numero || '',
        customer?.nome || '',
        order.veiculo_placa || '',
        order.veiculo_marca || '',
        order.veiculo_modelo || '',
      ]
        .join(' ')
        .toLowerCase()

      const matchesSearch = searchable.includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'todos' ? true : (order.status || '') === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [orders, customers, searchTerm, statusFilter])

  function buildOrderDetails(order: OrdemRow): OrdemServicoDetails {
    const customer = order.cliente_id ? customers[order.cliente_id] : undefined
    const itens = (serviceRowsByOrder[order.id] || []).map((item) => ({
      id: item.id,
      nome: services[item.servico_id]?.nome || 'Serviço não identificado',
      valor: Number(item.valor || 0),
    }))

    return {
      id: order.id,
      numero: order.numero || order.id.slice(0, 8),
      status: order.status || 'sem_status',
      valor_total: Number(order.valor_total || 0),
      valor_final: Number(order.valor_final || 0),
      observacoes: order.observacoes,
      criado_em: order.criado_em,
      atualizado_em: order.atualizado_em,
      cliente_nome: customer?.nome || 'Cliente não identificado',
      cliente_telefone: customer?.telefone || '',
      veiculo_placa: order.veiculo_placa,
      veiculo_marca: order.veiculo_marca,
      veiculo_modelo: order.veiculo_modelo,
      veiculo_ano: order.veiculo_ano,
      veiculo_cor: order.veiculo_cor,
      servicos: itens,
      fotos: (photosByOrder[order.id] || []).map((foto) => ({
        id: foto.id,
        foto_url: foto.foto_url,
      })),
    }
  }

  function buildEditOrder(order: OrdemRow): OrdemServicoEdit {
    const itens = (serviceRowsByOrder[order.id] || []).map((item) => ({
      id: item.id,
      servico_id: item.servico_id,
      nome: services[item.servico_id]?.nome || 'Serviço não identificado',
      valor: Number(item.valor || 0),
    }))

    return {
      id: order.id,
      numero: order.numero,
      cliente_id: order.cliente_id,
      veiculo_placa: order.veiculo_placa,
      veiculo_marca: order.veiculo_marca,
      veiculo_modelo: order.veiculo_modelo,
      veiculo_ano: order.veiculo_ano,
      veiculo_cor: order.veiculo_cor,
      valor_total: order.valor_total,
      valor_final: order.valor_final,
      status: order.status,
      observacoes: order.observacoes,
      criado_em: order.criado_em,
      atualizado_em: order.atualizado_em,
      servicos: itens,
      fotos: (photosByOrder[order.id] || []).map((foto) => ({
        id: foto.id,
        foto_url: foto.foto_url,
      })),
    }
  }

  async function handleDelete(order: OrdemRow) {
    const confirmed = window.confirm(`Deseja excluir a OS "${order.numero || order.id.slice(0, 8)}"?`)
    if (!confirmed) return

    const fotos = photosByOrder[order.id] || []

    const { error } = await supabase
      .from('ordens_de_servico')
      .delete()
      .eq('id', order.id)

    if (error) {
      console.error('Erro ao excluir OS:', error)
      return
    }

    for (const foto of fotos) {
      const key = (() => {
        try {
          const url = new URL(foto.foto_url)
          return url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname
        } catch {
          return ''
        }
      })()

      if (key) {
        await fetch('/api/delete-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key }),
        }).catch(() => { })
      }
    }

    await loadOrders()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ordens de Serviço</h1>
          <p className="text-muted-foreground">
            Cadastre, acompanhe e consulte as ordens de serviço da operação.
          </p>
        </div>

        <Button
          className="gap-2"
          onClick={() => {
            setSelectedEditOrder(null)
            setDialogOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Nova OS
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                placeholder="Buscar por número, cliente, placa, marca ou modelo"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aberta">Abertas</SelectItem>
                <SelectItem value="em_andamento">Em andamento</SelectItem>
                <SelectItem value="finalizada">Finalizadas</SelectItem>
                <SelectItem value="cancelada">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Carregando ordens de serviço...</p>}
          {!loading && filteredOrders.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma ordem de serviço encontrada.</p>
          )}

          {filteredOrders.map((order) => {
            const customer = order.cliente_id ? customers[order.cliente_id] : undefined
            const itemCount = (serviceRowsByOrder[order.id] || []).length
            const photosCount = (photosByOrder[order.id] || []).length

            return (
              <div key={order.id} className="rounded-xl border p-4 transition-colors">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">OS #{order.numero || order.id.slice(0, 8)}</p>
                      <Badge variant={order.status === 'finalizada' ? 'default' : 'secondary'}>
                        {order.status || 'Sem status'}
                      </Badge>
                    </div>

                    <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-3">
                      <InfoLine icon={Car} text={`${order.veiculo_marca || '-'} ${order.veiculo_modelo || ''} ${order.veiculo_placa ? `• ${order.veiculo_placa}` : ''}`} />
                      <InfoLine icon={Wrench} text={`${itemCount} serviço(s)`} />
                      <InfoLine icon={Camera} text={`${photosCount} foto(s)`} />
                      <p><span className="font-medium text-foreground">Cliente:</span> {customer?.nome || 'Cliente não identificado'}</p>
                      <p><span className="font-medium text-foreground">Valor:</span> R$ {Number(order.valor_final || order.valor_total || 0).toFixed(2)}</p>
                      <p><span className="font-medium text-foreground">Criado em:</span> {new Date(order.criado_em).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(buildOrderDetails(order))
                        setDetailsOpen(true)
                      }}
                    >
                      Ver detalhes
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setSelectedEditOrder(buildEditOrder(order))
                        setDialogOpen(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-destructive"
                      onClick={() => handleDelete(order)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <OrderDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        order={selectedOrder}
      />

      <OrderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        order={selectedEditOrder}
        onSaved={loadOrders}
      />
    </div>
  )
}

function InfoLine({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4" />
      <span>{text}</span>
    </div>
  )
}