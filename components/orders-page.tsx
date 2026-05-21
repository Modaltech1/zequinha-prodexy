'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@prodexy/ui'
import { Search, Wrench, Car, Plus, Pencil, Trash2, Camera, FileText, Printer, Filter, MoreHorizontal, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { OrderDetailsDialog, type OrdemServicoDetails } from '@/components/order-details-dialog'
import { printOrder } from '@/components/order-print'
import { formatOsNumber } from '@/lib/format-os-number'

type OrdemRow = {
  id: string
  numero: string | null
  cliente_id: string | null
  veiculo_id: string | null
  veiculo_placa: string | null
  veiculo_marca: string | null
  veiculo_modelo: string | null
  veiculo_ano: string | null
  veiculo_cor: string | null
  veiculo_tem_seguro?: boolean | null
  valor_total: number | null
  valor_final: number | null
  status: string | null
  observacoes: string | null
  criado_em: string
  atualizado_em: string | null
  km_entrada?: number | null
  mao_de_obra?: number | null
  acrescimos?: number | null
  responsavel_id?: string | null
  forma_pagamento?: string | null
}

type Cliente = {
  id: string
  nome: string | null
  telefone: string | null
  cpf_cnpj?: string | null
}

type OrdemServicoItemRow = {
  id: string
  os_id: string
  servico_id: string
  valor: number
  quantidade?: number | null
  codigo_peca?: string | null
  observacao?: string | null
}

type Servico = {
  id: string
  nome: string
  is_periodico?: boolean | null
  periodicidade_meses?: number | null
}

type OrdemFoto = {
  id: string
  os_id: string
  foto_url: string
  criado_em: string
}

type OrdemDiagnostico = {
  id: string
  os_id: string
  descricao: string
  criado_em: string
}

type VeiculoRow = {
  id: string
  cliente_id: string
  placa: string | null
  marca: string | null
  modelo: string | null
  ano: string | null
  cor: string | null
  tem_seguro?: boolean | null
}

type Collaborator = {
  id: string
  nome: string | null
}

type OrdersPageProps = {
  title?: string
  description?: string
  collaboratorMode?: boolean
}

export function OrdersPage({
  title = 'Ordens de Serviço',
  description = 'Cadastre, acompanhe e consulte as ordens de serviço da operação.',
  collaboratorMode = false,
}: OrdersPageProps) {
  const router = useRouter()
  const [orders, setOrders] = useState<OrdemRow[]>([])
  const [customers, setCustomers] = useState<Record<string, Cliente>>({})
  const [vehicles, setVehicles] = useState<Record<string, VeiculoRow>>({})
  const [serviceRowsByOrder, setServiceRowsByOrder] = useState<Record<string, OrdemServicoItemRow[]>>({})
  const [services, setServices] = useState<Record<string, Servico>>({})
  const [photosByOrder, setPhotosByOrder] = useState<Record<string, OrdemFoto[]>>({})
  const [diagnosticsByOrder, setDiagnosticsByOrder] = useState<Record<string, OrdemDiagnostico[]>>({})
  const [collaborators, setCollaborators] = useState<Record<string, Collaborator>>({})

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'aberta' | 'em_andamento' | 'finalizada' | 'cancelada'>('todos')
  const [loading, setLoading] = useState(true)

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrdemServicoDetails | null>(null)

  const basePath = collaboratorMode ? '/colaborador/ordens' : '/admin/ordens'

  async function loadOrders() {
    setLoading(true)

    const [ordensRes, clientesRes, veiculosRes, ordemServicosRes, servicosRes, fotosRes, diagnosticosRes, colaboradoresRes] = await Promise.all([
      supabase.from('ordens_de_servico').select('*').order('criado_em', { ascending: false }),
      supabase.from('clientes').select('id,nome,telefone,cpf_cnpj'),
      supabase.from('veiculos').select('id,cliente_id,placa,marca,modelo,ano,cor,tem_seguro'),
      supabase.from('ordem_servicos').select('id,os_id,servico_id,valor,quantidade,codigo_peca,observacao'),
      supabase.from('servicos').select('id,nome,is_periodico,periodicidade_meses'),
      supabase.from('ordem_fotos').select('id,os_id,foto_url,criado_em').order('criado_em', { ascending: true }),
      supabase.from('ordem_diagnosticos').select('id,os_id,descricao,criado_em').order('criado_em', { ascending: true }),
      supabase.from('perfis').select('id,nome').eq('papel', 'colaborador'),
    ])

    if (ordensRes.error) console.error(ordensRes.error)
    if (clientesRes.error) console.error(clientesRes.error)
    if (veiculosRes.error) console.error(veiculosRes.error)
    if (ordemServicosRes.error) console.error(ordemServicosRes.error)
    if (servicosRes.error) console.error(servicosRes.error)
    if (fotosRes.error) console.error(fotosRes.error)
    if (diagnosticosRes.error) console.error(diagnosticosRes.error)
    if (colaboradoresRes.error) console.error(colaboradoresRes.error)

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

    setVehicles(
      (((veiculosRes.data as VeiculoRow[]) || []).reduce<Record<string, VeiculoRow>>((acc, item) => {
        acc[item.id] = item
        return acc
      }, {}))
    )

    setServiceRowsByOrder(
      (((ordemServicosRes.data as OrdemServicoItemRow[]) || []).reduce<Record<string, OrdemServicoItemRow[]>>((acc, item) => {
        if (!acc[item.os_id]) acc[item.os_id] = []
        acc[item.os_id].push({ ...item, valor: Number(item.valor || 0) })
        return acc
      }, {}))
    )

    setServices(
      (((servicosRes.data as Servico[]) || []).reduce<Record<string, Servico>>((acc, item) => {
        acc[item.id] = item
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

    setDiagnosticsByOrder(
      (((diagnosticosRes.data as OrdemDiagnostico[]) || []).reduce<Record<string, OrdemDiagnostico[]>>((acc, item) => {
        if (!acc[item.os_id]) acc[item.os_id] = []
        acc[item.os_id].push(item)
        return acc
      }, {}))
    )

    setCollaborators(
      (((colaboradoresRes.data as Collaborator[]) || []).reduce<Record<string, Collaborator>>((acc, item) => {
        acc[item.id] = item
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
      const vehicle = order.veiculo_id ? vehicles[order.veiculo_id] : undefined

      const searchable = [
        order.numero || '',
        customer?.nome || '',
        customer?.telefone || '',
        customer?.cpf_cnpj || '',
        vehicle?.placa || order.veiculo_placa || '',
        vehicle?.marca || order.veiculo_marca || '',
        vehicle?.modelo || order.veiculo_modelo || '',
      ].join(' ').toLowerCase()

      const matchesSearch = searchable.includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'todos' ? true : (order.status || '') === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [orders, customers, vehicles, searchTerm, statusFilter])

  const stats = useMemo(() => {
    const total = orders.length
    const open = orders.filter((order) => ['aberta', 'em_andamento'].includes(order.status || '')).length
    const done = orders.filter((order) => order.status === 'finalizada').length
    const value = orders
      .filter((order) => order.status === 'finalizada')
      .reduce((sum, order) => sum + Number(order.valor_final || order.valor_total || 0), 0)
    return { total, open, done, value }
  }, [orders])

  function buildOrderDetails(order: OrdemRow): OrdemServicoDetails {
    const customer = order.cliente_id ? customers[order.cliente_id] : undefined
    const vehicle = order.veiculo_id ? vehicles[order.veiculo_id] : undefined
    const responsavel = order.responsavel_id ? collaborators[order.responsavel_id] : undefined
    const itens = (serviceRowsByOrder[order.id] || []).map((item) => ({
      id: item.id,
      nome: services[item.servico_id]?.nome || 'Serviço não identificado',
      is_periodico: services[item.servico_id]?.is_periodico,
      periodicidade_meses: services[item.servico_id]?.periodicidade_meses,
      valor: Number(item.valor || 0),
      quantidade: item.quantidade == null ? 1 : Number(item.quantidade),
      codigo_peca: item.codigo_peca || null,
      observacao: item.observacao || null,
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
      cliente_cpf_cnpj: customer?.cpf_cnpj || '',
      veiculo_placa: vehicle?.placa || order.veiculo_placa,
      veiculo_marca: vehicle?.marca || order.veiculo_marca,
      veiculo_modelo: vehicle?.modelo || order.veiculo_modelo,
      veiculo_ano: vehicle?.ano || order.veiculo_ano,
      veiculo_cor: vehicle?.cor || order.veiculo_cor,
      veiculo_tem_seguro: typeof vehicle?.tem_seguro === 'boolean' ? vehicle.tem_seguro : Boolean(order.veiculo_tem_seguro),
      km_entrada: order.km_entrada == null ? null : Number(order.km_entrada),
      responsavel_nome: responsavel?.nome || '',
      mao_de_obra: Number(order.mao_de_obra || 0),
      acrescimos: Number(order.acrescimos || 0),
      forma_pagamento: order.forma_pagamento || null,
      servicos: itens,
      diagnosticos: (diagnosticsByOrder[order.id] || []).map((item) => ({ id: item.id, descricao: item.descricao })),
      fotos: (photosByOrder[order.id] || []).map((foto) => ({ id: foto.id, foto_url: foto.foto_url })),
    }
  }

  async function handleDelete(order: OrdemRow) {
    const confirmed = window.confirm(`Deseja excluir a OS "${formatOsNumber(order.numero, order.id)}"?`)
    if (!confirmed) return

    const fotos = photosByOrder[order.id] || []

    const { error } = await supabase.from('ordens_de_servico').delete().eq('id', order.id)
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
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>

        <Button
          className="gap-2"
          onClick={() => router.push(`${basePath}/nova`)}
        >
          <Plus className="h-4 w-4" />
          Nova OS
        </Button>
      </div>

      {!collaboratorMode && (
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard title="Total de OS" value={String(stats.total)} />
          <SummaryCard title="Em andamento" value={String(stats.open)} />
          <SummaryCard title="Finalizadas" value={String(stats.done)} />
          <SummaryCard title="Faturamento finalizado" value={`R$ ${stats.value.toFixed(2)}`} />
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-9"
                placeholder="Buscar por número, CPF, cliente, placa, marca ou modelo..."
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(value as any)}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filtrar por status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="aberta">Abertas</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="finalizada">Finalizadas</SelectItem>
                  <SelectItem value="cancelada">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Carregando ordens de serviço...</p>}
          {!loading && filteredOrders.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma ordem de serviço encontrada.</p>}

          {filteredOrders.map((order) => {
            const customer = order.cliente_id ? customers[order.cliente_id] : undefined
            const vehicle = order.veiculo_id ? vehicles[order.veiculo_id] : undefined
            const vehicleLabel = `${vehicle?.marca || order.veiculo_marca || '-'} ${vehicle?.modelo || order.veiculo_modelo || ''} ${(vehicle?.placa || order.veiculo_placa) ? `• ${vehicle?.placa || order.veiculo_placa}` : ''}`
            const itemCount = (serviceRowsByOrder[order.id] || []).length
            const photosCount = (photosByOrder[order.id] || []).length
            const diagnosticsCount = (diagnosticsByOrder[order.id] || []).length
            const details = buildOrderDetails(order)

            return (
              <div key={order.id} className="rounded-xl border p-4 transition-colors">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">OS #{formatOsNumber(order.numero, order.id)}</p>
                      <Badge variant={order.status === 'finalizada' ? 'default' : 'secondary'}>
                        {order.status || 'Sem status'}
                      </Badge>
                    </div>

                    <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-3">
                      <InfoLine icon={Car} text={vehicleLabel} />
                      <InfoLine icon={Wrench} text={`${itemCount} serviço(s)`} />
                      <InfoLine icon={FileText} text={`${diagnosticsCount} diagnóstico(s)`} />
                      <InfoLine icon={Camera} text={`${photosCount} foto(s)`} />
                      <p><span className="font-medium text-foreground">Cliente:</span> {customer?.nome || 'Cliente não identificado'}</p>
                      <p><span className="font-medium text-foreground">Valor:</span> R$ {Number(order.valor_final || order.valor_total || 0).toFixed(2)}</p>
                      <p><span className="font-medium text-foreground">KM entrada:</span> {order.km_entrada ?? '-'}</p>
                      <p><span className="font-medium text-foreground">Criado em:</span> {new Date(order.criado_em).toLocaleDateString('pt-BR')}</p>
                      <p><span className="font-medium text-foreground">Seguro:</span> {(vehicle?.tem_seguro || order.veiculo_tem_seguro) ? 'Sim' : 'Não'}</p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <MoreHorizontal className="h-4 w-4" />

                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>OS #{formatOsNumber(order.numero, order.id)}</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedOrder(details)
                            setDetailsOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          Ver detalhes
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => printOrder(details)}>
                          <Printer className="h-4 w-4" />
                          Imprimir
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => router.push(`${basePath}/${order.id}/editar`)}
                        >
                          <Pencil className="h-4 w-4" />
                          Editar
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleDelete(order)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <OrderDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} order={selectedOrder} />
    </div>
  )
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
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
