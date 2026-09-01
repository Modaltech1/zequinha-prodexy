'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
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
import { Wrench, Car, Plus, Pencil, Trash2, Camera, FileText, Printer, Filter, MoreHorizontal, Eye, Package, CalendarDays } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { AdminPage, AdminPageHeader } from '@/components/admin-page'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ListPagination } from '@/components/list-pagination'
import { ListFilterGroup, ListSearch, ListState, ListToolbar } from '@/components/list-toolbar'
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
  desconto?: number | null
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

type OrdemProdutoItemRow = {
  id: string
  os_id: string
  produto_id: string
  quantidade?: number | null
  valor_unitario?: number | null
  valor_custo?: number | null
  codigo_produto?: string | null
  observacao?: string | null
}

type Servico = {
  id: string
  nome: string
  is_periodico?: boolean | null
  periodicidade_meses?: number | null
}

type Produto = {
  id: string
  nome: string
  marca_modelo?: string | null
  codigo?: string | null
  quantidade_estoque?: number | null
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

type StatusFilter = 'ativas' | 'todos' | 'agendada' | 'aberta' | 'em_andamento' | 'finalizada' | 'cancelada'
type PeriodFilter = 'todos' | 'hoje' | 'semana' | 'mes'
type Feedback = { type: 'success' | 'error'; message: string }

const ACTIVE_ORDER_STATUSES = ['agendada', 'aberta', 'em_andamento']
const ORDER_SELECT =
  'id,numero,cliente_id,veiculo_id,veiculo_placa,veiculo_marca,veiculo_modelo,veiculo_ano,veiculo_cor,veiculo_tem_seguro,valor_total,valor_final,status,observacoes,criado_em,atualizado_em,km_entrada,mao_de_obra,acrescimos,desconto,responsavel_id,forma_pagamento' as const

function getPeriodRange(filter: PeriodFilter) {
  if (filter === 'todos') return null

  const now = new Date()
  let start: Date
  let end: Date

  if (filter === 'hoje') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  } else if (filter === 'semana') {
    const daysSinceMonday = (now.getDay() + 6) % 7
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday)
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1)
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
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
  const [productRowsByOrder, setProductRowsByOrder] = useState<Record<string, OrdemProdutoItemRow[]>>({})
  const [products, setProducts] = useState<Record<string, Produto>>({})
  const [photosByOrder, setPhotosByOrder] = useState<Record<string, OrdemFoto[]>>({})
  const [diagnosticsByOrder, setDiagnosticsByOrder] = useState<Record<string, OrdemDiagnostico[]>>({})
  const [collaborators, setCollaborators] = useState<Record<string, Collaborator>>({})

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ativas')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('todos')
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrdemServicoDetails | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [orderToDelete, setOrderToDelete] = useState<OrdemRow | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const basePath = collaboratorMode ? '/colaborador/ordens' : '/admin/ordens'

  async function loadOrders(
    filter: StatusFilter = statusFilter,
    period: PeriodFilter = periodFilter
  ) {
    setLoading(true)

    let ordensQuery = supabase.from('ordens_de_servico').select(ORDER_SELECT).order('criado_em', { ascending: false })

    if (filter === 'ativas') {
      ordensQuery = ordensQuery.in('status', ACTIVE_ORDER_STATUSES)
    } else if (filter !== 'todos') {
      ordensQuery = ordensQuery.eq('status', filter)
    }

    const periodRange = getPeriodRange(period)
    if (periodRange) {
      ordensQuery = ordensQuery
        .gte('criado_em', periodRange.start)
        .lt('criado_em', periodRange.end)
    }

    const [ordensRes, colaboradoresRes] = await Promise.all([
      ordensQuery,
      supabase.from('perfis').select('id,nome').eq('papel', 'colaborador'),
    ])

    if (ordensRes.error) console.error(ordensRes.error)
    if (colaboradoresRes.error) console.error(colaboradoresRes.error)

    const ordens = ((ordensRes.data as OrdemRow[]) || []).map((row) => ({
      ...row,
      valor_total: Number(row.valor_total || 0),
      valor_final: Number(row.valor_final || 0),
    }))

    setOrders(ordens)

    const orderIds = ordens.map((order) => order.id)
    const customerIds = Array.from(new Set(ordens.map((order) => order.cliente_id).filter(Boolean))) as string[]
    const vehicleIds = Array.from(new Set(ordens.map((order) => order.veiculo_id).filter(Boolean))) as string[]

    if (orderIds.length === 0) {
      setCustomers({})
      setVehicles({})
      setServiceRowsByOrder({})
      setServices({})
      setProductRowsByOrder({})
      setProducts({})
      setPhotosByOrder({})
      setDiagnosticsByOrder({})
      setCollaborators(
        (((colaboradoresRes.data as Collaborator[]) || []).reduce<Record<string, Collaborator>>((acc, item) => {
          acc[item.id] = item
          return acc
        }, {}))
      )
      setLoading(false)
      return
    }

    const [clientesRes, veiculosRes, ordemServicosRes, ordemProdutosRes, fotosRes, diagnosticosRes] = await Promise.all([
      customerIds.length > 0
        ? supabase.from('clientes').select('id,nome,telefone,cpf_cnpj').in('id', customerIds)
        : Promise.resolve({ data: [], error: null }),
      vehicleIds.length > 0
        ? supabase.from('veiculos').select('id,cliente_id,placa,marca,modelo,ano,cor,tem_seguro').in('id', vehicleIds)
        : Promise.resolve({ data: [], error: null }),
      supabase.from('ordem_servicos').select('id,os_id,servico_id,valor,quantidade,codigo_peca,observacao').in('os_id', orderIds),
      supabase.from('ordem_produtos').select('id,os_id,produto_id,quantidade,valor_unitario,valor_custo,codigo_produto,observacao').in('os_id', orderIds),
      supabase.from('ordem_fotos').select('id,os_id,foto_url,criado_em').in('os_id', orderIds).order('criado_em', { ascending: true }),
      supabase.from('ordem_diagnosticos').select('id,os_id,descricao,criado_em').in('os_id', orderIds).order('criado_em', { ascending: true }),
    ])

    if (clientesRes.error) console.error(clientesRes.error)
    if (veiculosRes.error) console.error(veiculosRes.error)
    if (ordemServicosRes.error) console.error(ordemServicosRes.error)
    if (ordemProdutosRes.error) console.error(ordemProdutosRes.error)
    if (fotosRes.error) console.error(fotosRes.error)
    if (diagnosticosRes.error) console.error(diagnosticosRes.error)

    const ordemServicos = (ordemServicosRes.data as OrdemServicoItemRow[]) || []
    const ordemProdutos = (ordemProdutosRes.data as OrdemProdutoItemRow[]) || []
    const serviceIds = Array.from(new Set(ordemServicos.map((item) => item.servico_id).filter(Boolean)))
    const productIds = Array.from(new Set(ordemProdutos.map((item) => item.produto_id).filter(Boolean)))
    const servicosRes = serviceIds.length > 0
      ? await supabase.from('servicos').select('id,nome,is_periodico,periodicidade_meses').in('id', serviceIds)
      : { data: [], error: null }
    const produtosRes = productIds.length > 0
      ? await supabase.from('produtos').select('id,nome,marca_modelo,codigo,quantidade_estoque').in('id', productIds)
      : { data: [], error: null }

    if (servicosRes.error) console.error(servicosRes.error)
    if (produtosRes.error) console.error(produtosRes.error)

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
      (ordemServicos.reduce<Record<string, OrdemServicoItemRow[]>>((acc, item) => {
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

    setProductRowsByOrder(
      (ordemProdutos.reduce<Record<string, OrdemProdutoItemRow[]>>((acc, item) => {
        if (!acc[item.os_id]) acc[item.os_id] = []
        acc[item.os_id].push({
          ...item,
          valor_unitario: Number(item.valor_unitario || 0),
          quantidade: item.quantidade == null ? 1 : Number(item.quantidade),
        })
        return acc
      }, {}))
    )

    setProducts(
      (((produtosRes.data as Produto[]) || []).reduce<Record<string, Produto>>((acc, item) => {
        acc[item.id] = {
          ...item,
          quantidade_estoque: item.quantidade_estoque == null ? 0 : Number(item.quantidade_estoque),
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
    loadOrders(statusFilter, periodFilter)
  }, [statusFilter, periodFilter])

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
      const matchesStatus =
        statusFilter === 'todos'
          ? true
          : statusFilter === 'ativas'
            ? ACTIVE_ORDER_STATUSES.includes(order.status || '')
            : (order.status || '') === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [orders, customers, vehicles, searchTerm, statusFilter])

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

  useEffect(() => {
    const nextTotalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1
    if (currentPage > nextTotalPages) setCurrentPage(nextTotalPages)
  }, [currentPage, filteredOrders.length])

  const stats = useMemo(() => {
    const total = orders.length
    const open = orders.filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status || '')).length
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
    const produtosDaOs = (productRowsByOrder[order.id] || []).map((item) => ({
      id: item.id,
      nome: products[item.produto_id]?.nome || 'Produto não identificado',
      marca_modelo: products[item.produto_id]?.marca_modelo || null,
      codigo: item.codigo_produto || products[item.produto_id]?.codigo || null,
      valor_custo: Number(item.valor_custo || 0),
      valor_unitario: Number(item.valor_unitario || 0),
      quantidade: item.quantidade == null ? 1 : Number(item.quantidade),
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
      desconto: Number(order.desconto || 0),
      forma_pagamento: order.forma_pagamento || null,
      servicos: itens,
      produtos: produtosDaOs,
      diagnosticos: (diagnosticsByOrder[order.id] || []).map((item) => ({ id: item.id, descricao: item.descricao })),
      fotos: (photosByOrder[order.id] || []).map((foto) => ({ id: foto.id, foto_url: foto.foto_url })),
    }
  }

  function handleDelete(order: OrdemRow) {
    setOrderToDelete(order)
  }

  function handlePrint(details: OrdemServicoDetails) {
    printOrder(details)
    setFeedback({ type: 'success', message: `Impressão da OS #${details.numero} aberta em uma nova janela.` })
  }

  async function confirmDeleteOrder() {
    if (!orderToDelete) return

    setDeleteLoading(true)
    setFeedback(null)

    const order = orderToDelete
    const fotos = photosByOrder[order.id] || []
    const produtosDaOs = productRowsByOrder[order.id] || []

    if (produtosDaOs.length > 0) {
      const restoreByProductId = produtosDaOs.reduce<Record<string, number>>((acc, item) => {
        acc[item.produto_id] = (acc[item.produto_id] || 0) + Math.max(1, Number(item.quantidade || 1))
        return acc
      }, {})
      const productIds = Object.keys(restoreByProductId)
      const { data: productStocks, error: productStocksError } = await supabase
        .from('produtos')
        .select('id,quantidade_estoque')
        .in('id', productIds)

      if (productStocksError) {
        console.error('Erro ao buscar estoque para restaurar produtos da OS:', productStocksError)
        setFeedback({ type: 'error', message: 'Erro ao conferir o estoque antes de excluir a OS.' })
        setDeleteLoading(false)
        return
      }

      for (const produto of (productStocks as { id: string; quantidade_estoque: number | null }[]) || []) {
        const { error: restoreError } = await supabase
          .from('produtos')
          .update({
            quantidade_estoque: Number(produto.quantidade_estoque || 0) + (restoreByProductId[produto.id] || 0),
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', produto.id)

        if (restoreError) {
          console.error('Erro ao restaurar estoque ao excluir OS:', restoreError)
          setFeedback({ type: 'error', message: 'Erro ao restaurar estoque ao excluir a OS.' })
          setDeleteLoading(false)
          return
        }
      }
    }

    const { error } = await supabase.from('ordens_de_servico').delete().eq('id', order.id)
    if (error) {
      console.error('Erro ao excluir OS:', error)
      setFeedback({ type: 'error', message: 'Erro ao excluir OS. Tente novamente.' })
      setDeleteLoading(false)
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

    setFeedback({ type: 'success', message: `OS #${formatOsNumber(order.numero, order.id)} excluída com sucesso.` })
    setOrderToDelete(null)
    setDeleteLoading(false)
    await loadOrders()
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title={title}
        description={description}
        actions={
          <Button
            className="gap-2"
            onClick={() => router.push(`${basePath}/nova`)}
          >
            <Plus className="h-4 w-4" />
            Nova OS
          </Button>
        }
      />

      {!collaboratorMode && (
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard title="OS no filtro" value={String(stats.total)} />
          <SummaryCard title="Ativas" value={String(stats.open)} />
          <SummaryCard title="Finalizadas" value={String(stats.done)} />
          <SummaryCard title="Faturamento finalizado" value={`R$ ${stats.value.toFixed(2)}`} />
        </div>
      )}

      <Card>
        <CardHeader>
          <ListToolbar>
            {feedback && (
              <p
                className={`rounded-lg border p-3 text-sm ${feedback.type === 'error'
                  ? 'border-destructive/30 bg-destructive/5 text-destructive'
                  : 'border-primary/20 bg-primary/5 text-foreground'
                }`}
              >
                {feedback.message}
              </p>
            )}

            <ListSearch
              value={searchTerm}
              onChange={(value) => {
                setSearchTerm(value)
                setCurrentPage(1)
              }}
              placeholder="Buscar por número, CPF, cliente, placa, marca ou modelo..."
            />

            <ListFilterGroup>
              <Select
                value={statusFilter}
                onValueChange={(value: string) => {
                  setStatusFilter(value as StatusFilter)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-[280px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filtrar por status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativas">Agendadas, abertas e em andamento</SelectItem>
                  <SelectItem value="agendada">Agendadas</SelectItem>
                  <SelectItem value="aberta">Abertas</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="finalizada">Finalizadas</SelectItem>
                  <SelectItem value="cancelada">Canceladas</SelectItem>
                  <SelectItem value="todos">Todos os status</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={periodFilter}
                onValueChange={(value: string) => {
                  setPeriodFilter(value as PeriodFilter)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-[220px]">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filtrar por período..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os períodos</SelectItem>
                  <SelectItem value="hoje">Dia atual</SelectItem>
                  <SelectItem value="semana">Semana atual</SelectItem>
                  <SelectItem value="mes">Mês atual</SelectItem>
                </SelectContent>
              </Select>
            </ListFilterGroup>
          </ListToolbar>
        </CardHeader>

        <CardContent className="min-w-0 flex-1 space-y-3">
          <ListState
            loading={loading}
            loadingText="Carregando ordens de serviço..."
            empty={!loading && filteredOrders.length === 0}
            emptyText="Nenhuma ordem de serviço encontrada."
          />

          {paginatedOrders.map((order) => {
            const customer = order.cliente_id ? customers[order.cliente_id] : undefined
            const vehicle = order.veiculo_id ? vehicles[order.veiculo_id] : undefined
            const vehicleLabel = `${vehicle?.marca || order.veiculo_marca || '-'} ${vehicle?.modelo || order.veiculo_modelo || ''} ${(vehicle?.placa || order.veiculo_placa) ? `• ${vehicle?.placa || order.veiculo_placa}` : ''}`
            const itemCount = (serviceRowsByOrder[order.id] || []).length
            const productsCount = (productRowsByOrder[order.id] || []).length
            const photosCount = (photosByOrder[order.id] || []).length
            const diagnosticsCount = (diagnosticsByOrder[order.id] || []).length
            const details = buildOrderDetails(order)

            return (
              <div key={order.id} className="group rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/20">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold leading-tight text-foreground">OS #{formatOsNumber(order.numero, order.id)}</p>
                      <Badge variant={order.status === 'finalizada' ? 'default' : 'secondary'}>
                        {formatStatus(order.status)}
                      </Badge>
                    </div>

                    <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                      <InfoLine icon={Car} text={vehicleLabel} />
                      <InfoLine icon={Wrench} text={`${itemCount} serviço(s)`} />
                      <InfoLine icon={Package} text={`${productsCount} produto(s)`} />
                      <InfoLine icon={FileText} text={`${diagnosticsCount} diagnóstico(s)`} />
                      <InfoLine icon={Camera} text={`${photosCount} foto(s)`} />
                      <p><span className="font-medium text-foreground">Cliente:</span> {customer?.nome || 'Cliente não identificado'}</p>
                      <p className="rounded-lg bg-muted/30 px-3 py-2"><span className="font-medium text-foreground">Valor:</span> R$ {Number(order.valor_final || order.valor_total || 0).toFixed(2)}</p>
                      <p><span className="font-medium text-foreground">KM entrada:</span> {order.km_entrada ?? '-'}</p>
                      <p><span className="font-medium text-foreground">Criado em:</span> {new Date(order.criado_em).toLocaleDateString('pt-BR')}</p>
                      <p><span className="font-medium text-foreground">Seguro:</span> {(vehicle?.tem_seguro || order.veiculo_tem_seguro) ? 'Sim' : 'Não'}</p>
                    </div>
                  </div>

                  <div className="flex justify-end lg:pl-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 w-9 p-0" aria-label="Ações da OS">
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

                        <DropdownMenuItem onClick={() => handlePrint(details)}>
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

          <ListPagination
            currentPage={currentPage}
            totalItems={filteredOrders.length}
            itemsPerPage={itemsPerPage}
            itemLabel="ordens"
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      <OrderDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} order={selectedOrder} />

      <ConfirmDialog
        open={Boolean(orderToDelete)}
        onOpenChange={(open) => {
          if (!open && !deleteLoading) setOrderToDelete(null)
        }}
        title="Excluir ordem de serviço"
        description={orderToDelete ? `Deseja excluir a OS #${formatOsNumber(orderToDelete.numero, orderToDelete.id)}? Os produtos vendidos serão devolvidos ao estoque e essa ação não poderá ser desfeita.` : ''}
        confirmLabel="Excluir OS"
        loading={deleteLoading}
        onConfirm={confirmDeleteOrder}
      />
    </AdminPage>
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

function formatStatus(status: string | null) {
  const labels: Record<string, string> = {
    agendada: 'Agendada',
    aberta: 'Aberta',
    em_andamento: 'Em andamento',
    finalizada: 'Finalizada',
    cancelada: 'Cancelada',
  }

  return status ? labels[status] || status : 'Sem status'
}
