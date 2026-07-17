'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@prodexy/ui'
import { CalendarClock, Car, Filter, Pencil, Plus, Save, Wrench } from 'lucide-react'
import { AdminPage, AdminPageHeader } from '@/components/admin-page'
import { ListPagination } from '@/components/list-pagination'
import { ListFilterGroup, ListSearch, ListState, ListToolbar } from '@/components/list-toolbar'
import { supabase } from '@/lib/supabaseClient'

type ClienteRow = {
  id: string
  nome: string | null
  telefone: string | null
  email: string | null
}

type VeiculoRow = {
  id: string
  cliente_id: string
  placa: string | null
  marca: string | null
  modelo: string | null
  ano: string | null
  cor: string | null
  km_atual: number | null
  observacoes: string | null
  tem_seguro?: boolean | null
}

type ServicoRow = {
  id: string
  nome: string
  is_periodico?: boolean | null
  periodicidade_meses?: number | null
}

type OrdemRow = {
  id: string
  numero: string | null
  cliente_id: string | null
  veiculo_id: string | null
  status: string | null
  valor_final: number | null
  valor_total: number | null
  criado_em: string
  observacoes: string | null
}

type ManutencaoRow = {
  id: string
  veiculo_id: string
  servico_id?: string | null
  tipo: string
  descricao: string | null
  periodicidade_meses: number | null
  periodicidade_km: number | null
  ultima_data: string | null
  ultima_km: number | null
  proxima_data: string | null
  proxima_km: number | null
  status: string
}

type MaintenanceForm = {
  servico_id?: string | null
  descricao: string
  proxima_data: string
}

type VehicleDetailsForm = {
  placa: string
  marca: string
  modelo: string
  ano: string
  cor: string
  km_atual: string
  observacoes: string
  tem_seguro: string
}

type PeriodFilter = 'all' | 'overdue' | 'current-month' | 'next-month' | 'next-3-months' | 'next-6-months'

type MaintenanceListItem = {
  maintenance: ManutencaoRow
  vehicle: VeiculoRow
  customer?: ClienteRow
  service?: ServicoRow
}

const defaultMaintenanceForm: MaintenanceForm = {
  servico_id: '',
  descricao: '',
  proxima_data: '',
}

const defaultVehicleForm: VehicleDetailsForm = {
  placa: '',
  marca: '',
  modelo: '',
  ano: '',
  cor: '',
  km_atual: '',
  observacoes: '',
  tem_seguro: 'nao',
}

function formatVehicleLabel(vehicle: VeiculoRow) {
  const label = [vehicle.marca, vehicle.modelo].filter(Boolean).join(' ')
  if (!label && !vehicle.placa) return 'Veículo sem identificação'
  if (!label) return vehicle.placa || 'Sem placa'
  return `${label}${vehicle.placa ? ` ⬢ ${vehicle.placa}` : ''}`
}

function getMonthRange(offset: number) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function isWithinPeriod(dateValue: string | null, filter: PeriodFilter) {
  if (!dateValue) return false

  const date = new Date(`${dateValue}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (filter === 'all') return true
  if (filter === 'overdue') return date < today

  if (filter === 'current-month') {
    const { start, end } = getMonthRange(0)
    return date >= start && date <= end
  }

  if (filter === 'next-month') {
    const { start, end } = getMonthRange(1)
    return date >= start && date <= end
  }

  if (filter === 'next-3-months') {
    const end = new Date(today)
    end.setMonth(end.getMonth() + 3)
    return date >= today && date <= end
  }

  if (filter === 'next-6-months') {
    const end = new Date(today)
    end.setMonth(end.getMonth() + 6)
    return date >= today && date <= end
  }

  return true
}

function getMaintenanceStatus(item?: ManutencaoRow) {
  if (!item?.proxima_data) return { label: 'Sem programação', variant: 'secondary' as const }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const next = new Date(`${item.proxima_data}T00:00:00`)
  if (next < today) return { label: 'Atrasada', variant: 'destructive' as const }
  const currentMonth = getMonthRange(0)
  if (next >= currentMonth.start && next <= currentMonth.end) return { label: 'Este mês', variant: 'default' as const }
  return { label: 'Programada', variant: 'secondary' as const }
}

export default function Page() {
  const [loading, setLoading] = useState(true)
  const [savingMaintenance, setSavingMaintenance] = useState(false)
  const [savingVehicle, setSavingVehicle] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('current-month')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [servicos, setServicos] = useState<ServicoRow[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [clientesById, setClientesById] = useState<Record<string, ClienteRow>>({})
  const [veiculos, setVeiculos] = useState<VeiculoRow[]>([])
  const [ordens, setOrdens] = useState<OrdemRow[]>([])
  const [manutencoes, setManutencoes] = useState<ManutencaoRow[]>([])

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
  const [vehicleForm, setVehicleForm] = useState<VehicleDetailsForm>(defaultVehicleForm)
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceForm>(defaultMaintenanceForm)

  async function loadData() {
    setLoading(true)
    setError(null)

    const [clientesRes, veiculosRes, ordensRes, servicosRes, manutencoesRes] = await Promise.all([
      supabase.from('clientes').select('id,nome,telefone,email'),
      supabase.from('veiculos').select('id,cliente_id,placa,marca,modelo,ano,cor,km_atual,observacoes,tem_seguro').order('criado_em', { ascending: false }),
      supabase.from('ordens_de_servico').select('id,numero,cliente_id,veiculo_id,status,valor_final,valor_total,criado_em,observacoes').order('criado_em', { ascending: false }),
      supabase.from('servicos').select('id,nome,is_periodico,periodicidade_meses').order('nome', { ascending: true }),
      supabase.from('manutencoes_veiculo').select('id,veiculo_id,servico_id,tipo,descricao,periodicidade_meses,periodicidade_km,ultima_data,ultima_km,proxima_data,proxima_km,status').order('proxima_data', { ascending: true }),
    ])

    if (clientesRes.error || veiculosRes.error || ordensRes.error || servicosRes.error || manutencoesRes.error) {
      console.error(clientesRes.error || veiculosRes.error || ordensRes.error || servicosRes.error || manutencoesRes.error)
      setError('Erro ao carregar dados de fidelização.')
      setLoading(false)
      return
    }

    const clientesList = (clientesRes.data || []) as ClienteRow[]
    setClientesById(clientesList.reduce<Record<string, ClienteRow>>((acc, item) => {
      acc[item.id] = item
      return acc
    }, {}))
    setVeiculos((veiculosRes.data || []) as VeiculoRow[])
    setOrdens((ordensRes.data || []) as OrdemRow[])
    setServicos((servicosRes.data || []) as ServicoRow[])
    setManutencoes((manutencoesRes.data || []) as ManutencaoRow[])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const historyCountByVehicleId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const order of ordens) {
      if (!order.veiculo_id) continue
      map[order.veiculo_id] = (map[order.veiculo_id] || 0) + 1
    }
    return map
  }, [ordens])

  const servicesById = useMemo(() => {
    return servicos.reduce<Record<string, ServicoRow>>((acc, item) => {
      acc[item.id] = item
      return acc
    }, {})
  }, [servicos])

  const periodicServices = useMemo(() => {
    return servicos.filter((servico) => servico.is_periodico)
  }, [servicos])

  const vehiclesById = useMemo(() => {
    return veiculos.reduce<Record<string, VeiculoRow>>((acc, item) => {
      acc[item.id] = item
      return acc
    }, {})
  }, [veiculos])

  const maintenanceList = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return manutencoes
      .filter((maintenance) => maintenance.status === 'pendente' && maintenance.proxima_data)
      .map((maintenance) => {
        const vehicle = vehiclesById[maintenance.veiculo_id]
        if (!vehicle) return null

        return {
          maintenance,
          vehicle,
          customer: clientesById[vehicle.cliente_id],
          service: maintenance.servico_id ? servicesById[maintenance.servico_id] : undefined,
        }
      })
      .filter((item): item is MaintenanceListItem => Boolean(item))
      .filter((item) => {
        if (serviceFilter !== 'all' && item.maintenance.servico_id !== serviceFilter) return false
        if (!isWithinPeriod(item.maintenance.proxima_data, periodFilter)) return false
        if (!term) return true

        const searchable = [
          item.vehicle.placa || '',
          item.vehicle.marca || '',
          item.vehicle.modelo || '',
          item.customer?.nome || '',
          item.customer?.telefone || '',
          item.service?.nome || item.maintenance.tipo || '',
        ].join(' ').toLowerCase()

        return searchable.includes(term)
      })
      .sort((a, b) => String(a.maintenance.proxima_data || '9999-12-31').localeCompare(String(b.maintenance.proxima_data || '9999-12-31')))
  }, [manutencoes, vehiclesById, clientesById, servicesById, serviceFilter, periodFilter, searchTerm])

  const dueThisMonth = useMemo(() => {
    return manutencoes.filter((item) => item.status === 'pendente' && isWithinPeriod(item.proxima_data, 'current-month'))
  }, [manutencoes])

  const overdueCount = useMemo(() => {
    return manutencoes.filter((item) => item.status === 'pendente' && isWithinPeriod(item.proxima_data, 'overdue')).length
  }, [manutencoes])

  const pendingMaintenances = manutencoes.filter((item) => item.status === 'pendente' && item.proxima_data)
  const monitoredVehicles = new Set(pendingMaintenances.map((item) => item.veiculo_id)).size

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = maintenanceList.slice(startIndex, endIndex)
  const selectedVehicle = veiculos.find((vehicle) => vehicle.id === selectedVehicleId) || null
  const selectedCustomer = selectedVehicle ? clientesById[selectedVehicle.cliente_id] : null
  const selectedVehicleOrders = selectedVehicle ? ordens.filter((order) => order.veiculo_id === selectedVehicle.id) : []
  const selectedMaintenances = selectedVehicle
    ? manutencoes
      .filter((item) => item.veiculo_id === selectedVehicle.id)
      .sort((a, b) => String(a.proxima_data || '9999-12-31').localeCompare(String(b.proxima_data || '9999-12-31')))
    : []

  function openDetails(vehicle: VeiculoRow) {
    setSelectedVehicleId(vehicle.id)
    setVehicleForm({
      placa: vehicle.placa || '',
      marca: vehicle.marca || '',
      modelo: vehicle.modelo || '',
      ano: vehicle.ano || '',
      cor: vehicle.cor || '',
      km_atual: vehicle.km_atual ? String(vehicle.km_atual) : '',
      observacoes: vehicle.observacoes || '',
      tem_seguro: vehicle.tem_seguro ? 'sim' : 'nao',
    })
    setMaintenanceForm({
      ...defaultMaintenanceForm,
      servico_id: periodicServices[0]?.id || '',
    })
    setDetailsOpen(true)
    setSuccess(null)
    setError(null)
  }

  async function handleSaveVehicle() {
    if (!selectedVehicle) return
    setSavingVehicle(true)
    setError(null)
    setSuccess(null)

    const { error } = await supabase
      .from('veiculos')
      .update({
        placa: vehicleForm.placa.trim() || null,
        marca: vehicleForm.marca.trim() || null,
        modelo: vehicleForm.modelo.trim() || null,
        ano: vehicleForm.ano.trim() || null,
        cor: vehicleForm.cor.trim() || null,
        km_atual: vehicleForm.km_atual ? Number(vehicleForm.km_atual) : null,
        observacoes: vehicleForm.observacoes.trim() || null,
        tem_seguro: vehicleForm.tem_seguro === 'sim',
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', selectedVehicle.id)

    if (error) {
      console.error(error)
      setError('Erro ao salvar veículo.')
    } else {
      setSuccess('Veículo atualizado.')
      await loadData()
    }
    setSavingVehicle(false)
  }

  async function handleCreateMaintenance(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedVehicle) return
    setSavingMaintenance(true)
    setError(null)
    setSuccess(null)

    try {
      if (!maintenanceForm.servico_id) throw new Error('Selecione um serviço periódico.')
      if (!maintenanceForm.proxima_data) throw new Error('Informe a data da próxima manutenção.')

      const service = servicesById[maintenanceForm.servico_id]
      if (!service?.is_periodico) throw new Error('O serviço selecionado não está marcado como periódico.')

      const { error } = await supabase.from('manutencoes_veiculo').upsert({
        veiculo_id: selectedVehicle.id,
        servico_id: service.id,
        tipo: service.nome,
        descricao: maintenanceForm.descricao.trim() || null,
        periodicidade_meses: service.periodicidade_meses || null,
        proxima_data: maintenanceForm.proxima_data,
        status: 'pendente',
        atualizado_em: new Date().toISOString(),
      }, { onConflict: 'veiculo_id,servico_id' })

      if (error) throw error

      setMaintenanceForm({ ...defaultMaintenanceForm, servico_id: periodicServices[0]?.id || '' })
      setSuccess('Próxima manutenção registrada.')
      await loadData()
    } catch (err: any) {
      console.error('Erro ao registrar manutenção:', err)
      setError(err?.message || 'Erro ao registrar manutenção.')
    } finally {
      setSavingMaintenance(false)
    }
  }

  async function concludeMaintenance(item: ManutencaoRow) {
    const { error } = await supabase.from('manutencoes_veiculo').update({ status: 'concluida', atualizado_em: new Date().toISOString() }).eq('id', item.id)
    if (error) {
      console.error(error)
      setError('Erro ao concluir manutenção.')
      return
    }
    await loadData()
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Fidelização"
        description="Acompanhe veículos, histórico de OS e próximas manutenções."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard title="Veículos monitorados" value={String(monitoredVehicles)} icon={Car} />
        <SummaryCard title="Manutenções pendentes" value={String(pendingMaintenances.length)} icon={CalendarClock} />
        <SummaryCard title="Vencidas" value={String(overdueCount)} icon={Wrench} />
        <SummaryCard title="Este mês" value={String(dueThisMonth.length)} icon={CalendarClock} />
      </div>

      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      {success && <p className="rounded-lg border bg-muted/50 p-3 text-sm">{success}</p>}

      <Card>
        <CardHeader>
          <ListToolbar>
            <ListSearch
              value={searchTerm}
              onChange={(value) => {
                setSearchTerm(value)
                setCurrentPage(1)
              }}
              placeholder="Buscar por cliente, telefone, placa, marca, modelo ou serviço..."
            />

            <ListFilterGroup>
              <Select value={periodFilter} onValueChange={(value: string) => { setPeriodFilter(value as PeriodFilter); setCurrentPage(1) }}>
                <SelectTrigger className="w-full sm:w-[230px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filtrar período..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-month">Manutenções deste mês</SelectItem>
                  <SelectItem value="next-month">Manutenções do próximo mês</SelectItem>
                  <SelectItem value="next-3-months">Próximos 3 meses</SelectItem>
                  <SelectItem value="next-6-months">Próximos 6 meses</SelectItem>
                  <SelectItem value="overdue">Manutenções vencidas</SelectItem>
                  <SelectItem value="all">Todas as manutenções</SelectItem>
                </SelectContent>
              </Select>

              <Select value={serviceFilter} onValueChange={(value: string) => { setServiceFilter(value); setCurrentPage(1) }}>
                <SelectTrigger className="w-full sm:w-[260px]">
                  <Wrench className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filtrar serviço periódico..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os serviços periódicos</SelectItem>
                  {periodicServices.map((servico) => (
                    <SelectItem key={servico.id} value={servico.id}>
                      {servico.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ListFilterGroup>
          </ListToolbar>
        </CardHeader>

        <CardContent className="space-y-3">
          <ListState
            loading={loading}
            loadingText="Carregando fidelização..."
            empty={!loading && paginatedItems.length === 0}
            emptyText="Nenhuma manutenção periódica encontrada com os filtros atuais."
          />

          {paginatedItems.map(({ maintenance, vehicle, customer, service }) => {
            const status = getMaintenanceStatus(maintenance)
            return (
              <div key={maintenance.id} className="flex flex-col gap-4 rounded-xl border p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{formatVehicleLabel(vehicle)}</p>
                    <Badge variant={status.variant}>{status.label}</Badge>
                    {vehicle.tem_seguro && <Badge variant="secondary">Com seguro</Badge>}
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-5">
                    <p><span className="font-medium text-foreground">Cliente:</span> {customer?.nome || 'Cliente não identificado'}</p>
                    <p><span className="font-medium text-foreground">Telefone:</span> {customer?.telefone || '-'}</p>
                    <p><span className="font-medium text-foreground">Serviço:</span> {service?.nome || maintenance.tipo}</p>
                    <p><span className="font-medium text-foreground">Próxima:</span> {maintenance.proxima_data ? new Date(`${maintenance.proxima_data}T00:00:00`).toLocaleDateString('pt-BR') : '-'}</p>
                    <p><span className="font-medium text-foreground">Histórico:</span> {historyCountByVehicleId[vehicle.id] || 0} OS</p>
                  </div>
                </div>
                <Button variant="outline" className="gap-2" onClick={() => openDetails(vehicle)}>
                  <Pencil className="h-4 w-4" />
                  Detalhes
                </Button>
              </div>
            )
          })}

          <ListPagination
            currentPage={currentPage}
            totalItems={maintenanceList.length}
            itemsPerPage={itemsPerPage}
            itemLabel="manutenções"
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedVehicle ? formatVehicleLabel(selectedVehicle) : 'Detalhes do veículo'}</DialogTitle>
            <DialogDescription>Consulte histórico, edite o veículo e registre próximas manutenções.</DialogDescription>
          </DialogHeader>

          {selectedVehicle && (
            <div className="space-y-5">
              <div className="rounded-xl border p-4">
                <p className="mb-3 text-sm font-semibold">Cliente</p>
                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  <p><span className="text-muted-foreground">Nome:</span> {selectedCustomer?.nome || '-'}</p>
                  <p><span className="text-muted-foreground">Telefone:</span> {selectedCustomer?.telefone || '-'}</p>
                  <p><span className="text-muted-foreground">Email:</span> {selectedCustomer?.email || '-'}</p>
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <p className="mb-3 text-sm font-semibold">Dados do veículo</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Placa" value={vehicleForm.placa} onChange={(value) => setVehicleForm((prev) => ({ ...prev, placa: value }))} />
                  <Field label="Marca" value={vehicleForm.marca} onChange={(value) => setVehicleForm((prev) => ({ ...prev, marca: value }))} />
                  <Field label="Modelo" value={vehicleForm.modelo} onChange={(value) => setVehicleForm((prev) => ({ ...prev, modelo: value }))} />
                  <Field label="Ano" value={vehicleForm.ano} onChange={(value) => setVehicleForm((prev) => ({ ...prev, ano: value }))} />
                  <Field label="Cor" value={vehicleForm.cor} onChange={(value) => setVehicleForm((prev) => ({ ...prev, cor: value }))} />
                  <Field label="KM atual" value={vehicleForm.km_atual} onChange={(value) => setVehicleForm((prev) => ({ ...prev, km_atual: value }))} />
                  <div className="space-y-2">
                    <Label>Tem seguro?</Label>
                    <Select value={vehicleForm.tem_seguro} onValueChange={(value: string) => setVehicleForm((prev) => ({ ...prev, tem_seguro: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nao">Não</SelectItem>
                        <SelectItem value="sim">Sim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 lg:col-span-3">
                    <Label>Observações</Label>
                    <Textarea value={vehicleForm.observacoes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setVehicleForm((prev) => ({ ...prev, observacoes: e.target.value }))} />
                  </div>
                </div>
                <Button className="mt-4 gap-2" onClick={handleSaveVehicle} disabled={savingVehicle}>
                  <Save className="h-4 w-4" />
                  {savingVehicle ? 'Salvando...' : 'Salvar veículo'}
                </Button>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <p className="font-semibold">Registrar próxima manutenção</p>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateMaintenance} className="space-y-3">
                      <div className="space-y-2">
                        <Label>Serviço periódico</Label>
                        <Select value={maintenanceForm.servico_id} onValueChange={(value: string) => setMaintenanceForm((prev) => ({ ...prev, servico_id: value }))}>
                          <SelectTrigger><SelectValue placeholder="Selecione um serviço periódico" /></SelectTrigger>
                          <SelectContent>
                            {periodicServices.map((servico) => (
                              <SelectItem key={servico.id} value={servico.id}>
                                {servico.nome} ⬢ {servico.periodicidade_meses || 0} mês(es)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Próxima data</Label>
                        <Input type="date" value={maintenanceForm.proxima_data} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaintenanceForm((prev) => ({ ...prev, proxima_data: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Textarea value={maintenanceForm.descricao} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMaintenanceForm((prev) => ({ ...prev, descricao: e.target.value }))} />
                      </div>
                      <Button type="submit" disabled={savingMaintenance || periodicServices.length === 0} className="gap-2">
                        <Plus className="h-4 w-4" />
                        {savingMaintenance ? 'Salvando...' : 'Salvar próxima manutenção'}
                      </Button>

                      {periodicServices.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Cadastre pelo menos um serviço periódico na página de Serviços.
                        </p>
                      )}
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <p className="font-semibold">Histórico e agenda</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Últimas OS</p>
                      {selectedVehicleOrders.slice(0, 5).map((order) => (
                        <div key={order.id} className="rounded-lg border p-2 text-xs">
                          <p className="font-medium">OS #{order.numero || order.id.slice(0, 8)}</p>
                          <p className="text-muted-foreground">{new Date(order.criado_em).toLocaleDateString('pt-BR')} ⬢ {order.status || 'sem status'}</p>
                        </div>
                      ))}
                      {selectedVehicleOrders.length === 0 && <p className="text-xs text-muted-foreground">Sem histórico de OS.</p>}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Próximas programações</p>
                      {selectedMaintenances.filter((item) => item.status === 'pendente').slice(0, 6).map((item) => (
                        <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border p-2 text-xs">
                          <div>
                            <p className="font-medium">{item.servico_id ? servicesById[item.servico_id]?.nome || item.tipo : item.tipo}</p>
                            <p className="text-muted-foreground">{item.proxima_data ? new Date(`${item.proxima_data}T00:00:00`).toLocaleDateString('pt-BR') : '-'}</p>
                            {item.descricao && <p className="text-muted-foreground">{item.descricao}</p>}
                          </div>
                          <Button size="sm" variant="outline" onClick={() => concludeMaintenance(item)}>Concluir</Button>
                        </div>
                      ))}
                      {selectedMaintenances.filter((item) => item.status === 'pendente').length === 0 && <p className="text-xs text-muted-foreground">Sem agenda de manutenção.</p>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} />
    </div>
  )
}

function SummaryCard({ title, value, icon: Icon }: { title: string; value: string; icon: any }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}
