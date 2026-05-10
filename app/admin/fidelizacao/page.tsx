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
import { CalendarClock, Car, ChevronLeft, ChevronRight, Pencil, Plus, Save, Search, Wrench } from 'lucide-react'
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
  tipo: string
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

const defaultMaintenanceForm: MaintenanceForm = {
  tipo: 'revisao',
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
  return `${label}${vehicle.placa ? ` • ${vehicle.placa}` : ''}`
}

function getMaintenanceStatus(item?: ManutencaoRow) {
  if (!item?.proxima_data) return { label: 'Sem programação', variant: 'secondary' as const }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const next = new Date(`${item.proxima_data}T00:00:00`)
  if (next < today) return { label: 'Atrasada', variant: 'destructive' as const }
  if (next.getMonth() === today.getMonth() && next.getFullYear() === today.getFullYear()) return { label: 'Este mês', variant: 'default' as const }
  return { label: 'Programada', variant: 'secondary' as const }
}

export default function Page() {
  const [loading, setLoading] = useState(true)
  const [savingMaintenance, setSavingMaintenance] = useState(false)
  const [savingVehicle, setSavingVehicle] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'due-month' | 'overdue' | 'without-schedule'>('all')
  const [sortBy, setSortBy] = useState<'cliente' | 'placa' | 'proxima'>('cliente')
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

    const [clientesRes, veiculosRes, ordensRes, manutencoesRes] = await Promise.all([
      supabase.from('clientes').select('id,nome,telefone,email'),
      supabase.from('veiculos').select('id,cliente_id,placa,marca,modelo,ano,cor,km_atual,observacoes,tem_seguro').order('criado_em', { ascending: false }),
      supabase.from('ordens_de_servico').select('id,numero,cliente_id,veiculo_id,status,valor_final,valor_total,criado_em,observacoes').order('criado_em', { ascending: false }),
      supabase.from('manutencoes_veiculo').select('id,veiculo_id,tipo,descricao,periodicidade_meses,periodicidade_km,ultima_data,ultima_km,proxima_data,proxima_km,status').order('proxima_data', { ascending: true }),
    ])

    if (clientesRes.error || veiculosRes.error || ordensRes.error || manutencoesRes.error) {
      console.error(clientesRes.error || veiculosRes.error || ordensRes.error || manutencoesRes.error)
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
    setManutencoes((manutencoesRes.data || []) as ManutencaoRow[])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const nextPendingByVehicleId = useMemo(() => {
    const map: Record<string, ManutencaoRow | undefined> = {}
    for (const item of manutencoes) {
      if (item.status !== 'pendente' || !item.proxima_data) continue
      const current = map[item.veiculo_id]
      if (!current || String(item.proxima_data) < String(current.proxima_data)) map[item.veiculo_id] = item
    }
    return map
  }, [manutencoes])

  const historyCountByVehicleId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const order of ordens) {
      if (!order.veiculo_id) continue
      map[order.veiculo_id] = (map[order.veiculo_id] || 0) + 1
    }
    return map
  }, [ordens])

  const filteredVehicles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const now = new Date()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const month = now.getMonth()
    const year = now.getFullYear()
    let list = [...veiculos]

    if (term) {
      list = list.filter((vehicle) => {
        const cliente = clientesById[vehicle.cliente_id]
        return [vehicle.placa || '', vehicle.marca || '', vehicle.modelo || '', cliente?.nome || '', cliente?.telefone || '']
          .join(' ')
          .toLowerCase()
          .includes(term)
      })
    }

    if (filterType === 'due-month') {
      list = list.filter((vehicle) => {
        const next = nextPendingByVehicleId[vehicle.id]
        if (!next?.proxima_data) return false
        const d = new Date(`${next.proxima_data}T00:00:00`)
        return d.getMonth() === month && d.getFullYear() === year
      })
    } else if (filterType === 'overdue') {
      list = list.filter((vehicle) => {
        const next = nextPendingByVehicleId[vehicle.id]
        if (!next?.proxima_data) return false
        return new Date(`${next.proxima_data}T00:00:00`) < todayStart
      })
    } else if (filterType === 'without-schedule') {
      list = list.filter((vehicle) => !nextPendingByVehicleId[vehicle.id]?.proxima_data)
    }

    list.sort((a, b) => {
      const customerA = clientesById[a.cliente_id]?.nome || ''
      const customerB = clientesById[b.cliente_id]?.nome || ''
      const nextA = nextPendingByVehicleId[a.id]?.proxima_data || '9999-12-31'
      const nextB = nextPendingByVehicleId[b.id]?.proxima_data || '9999-12-31'
      if (sortBy === 'placa') return (a.placa || '').localeCompare(b.placa || '')
      if (sortBy === 'proxima') return nextA.localeCompare(nextB)
      return customerA.localeCompare(customerB)
    })

    return list
  }, [veiculos, clientesById, searchTerm, filterType, sortBy, nextPendingByVehicleId])

  const dueThisMonth = useMemo(() => {
    const now = new Date()
    return Object.values(nextPendingByVehicleId).filter((item): item is ManutencaoRow => {
      if (!item?.proxima_data) return false
      const d = new Date(`${item.proxima_data}T00:00:00`)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
  }, [nextPendingByVehicleId])

  const overdueCount = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Object.values(nextPendingByVehicleId).filter((item) => item?.proxima_data && new Date(`${item.proxima_data}T00:00:00`) < today).length
  }, [nextPendingByVehicleId])

  const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedVehicles = filteredVehicles.slice(startIndex, endIndex)
  const selectedVehicle = veiculos.find((vehicle) => vehicle.id === selectedVehicleId) || null
  const selectedCustomer = selectedVehicle ? clientesById[selectedVehicle.cliente_id] : null
  const selectedVehicleOrders = selectedVehicle ? ordens.filter((order) => order.veiculo_id === selectedVehicle.id) : []
  const selectedMaintenances = selectedVehicle ? manutencoes.filter((item) => item.veiculo_id === selectedVehicle.id) : []

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
    setMaintenanceForm(defaultMaintenanceForm)
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
      if (!maintenanceForm.proxima_data) throw new Error('Informe a data da próxima manutenção.')
      const { error } = await supabase.from('manutencoes_veiculo').insert({
        veiculo_id: selectedVehicle.id,
        tipo: maintenanceForm.tipo,
        descricao: maintenanceForm.descricao.trim() || null,
        proxima_data: maintenanceForm.proxima_data,
        status: 'pendente',
      })
      if (error) throw error
      setMaintenanceForm(defaultMaintenanceForm)
      setSuccess('Próxima manutenção registrada.')
      await loadData()
    } catch (err: any) {
      console.error(err)
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fidelização</h1>
          <p className="text-muted-foreground">Acompanhe veículos, histórico de OS e próximas manutenções.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard title="Veículos" value={String(veiculos.length)} icon={Car} />
        <SummaryCard title="Com programação" value={String(Object.keys(nextPendingByVehicleId).length)} icon={CalendarClock} />
        <SummaryCard title="Vencidas" value={String(overdueCount)} icon={Wrench} />
        <SummaryCard title="Este mês" value={String(dueThisMonth.length)} icon={CalendarClock} />
      </div>

      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      {success && <p className="rounded-lg border bg-muted/50 p-3 text-sm">{success}</p>}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchTerm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} className="pl-9" placeholder="Buscar por cliente, telefone, placa, marca ou modelo" />
            </div>
            <Select value={filterType} onValueChange={(value: string) => { setFilterType(value as any); setCurrentPage(1) }}>
              <SelectTrigger className="w-full lg:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="due-month">Próximas este mês</SelectItem>
                <SelectItem value="overdue">Atrasadas</SelectItem>
                <SelectItem value="without-schedule">Sem programação</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: string) => setSortBy(value as any)}>
              <SelectTrigger className="w-full lg:w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cliente">Cliente</SelectItem>
                <SelectItem value="placa">Placa</SelectItem>
                <SelectItem value="proxima">Próxima data</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Carregando fidelização...</p>}
          {!loading && paginatedVehicles.length === 0 && <p className="text-sm text-muted-foreground">Nenhum veículo encontrado com os filtros atuais.</p>}

          {paginatedVehicles.map((vehicle) => {
            const customer = clientesById[vehicle.cliente_id]
            const next = nextPendingByVehicleId[vehicle.id]
            const status = getMaintenanceStatus(next)
            return (
              <div key={vehicle.id} className="flex flex-col gap-4 rounded-xl border p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{formatVehicleLabel(vehicle)}</p>
                    <Badge variant={status.variant}>{status.label}</Badge>
                    {vehicle.tem_seguro && <Badge variant="secondary">Com seguro</Badge>}
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                    <p><span className="font-medium text-foreground">Cliente:</span> {customer?.nome || 'Cliente não identificado'}</p>
                    <p><span className="font-medium text-foreground">Telefone:</span> {customer?.telefone || '-'}</p>
                    <p><span className="font-medium text-foreground">Histórico:</span> {historyCountByVehicleId[vehicle.id] || 0} OS</p>
                    <p><span className="font-medium text-foreground">Próxima:</span> {next?.proxima_data ? new Date(`${next.proxima_data}T00:00:00`).toLocaleDateString('pt-BR') : '-'}</p>
                  </div>
                </div>
                <Button variant="outline" className="gap-2" onClick={() => openDetails(vehicle)}>
                  <Pencil className="h-4 w-4" />
                  Detalhes
                </Button>
              </div>
            )
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">Mostrando {startIndex + 1} a {Math.min(endIndex, filteredVehicles.length)} de {filteredVehicles.length} veículos</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
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
                        <Label>Tipo</Label>
                        <Select value={maintenanceForm.tipo} onValueChange={(value: string) => setMaintenanceForm((prev) => ({ ...prev, tipo: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="revisao">Revisão</SelectItem>
                            <SelectItem value="alinhamento">Alinhamento</SelectItem>
                            <SelectItem value="balanceamento">Balanceamento</SelectItem>
                            <SelectItem value="troca_oleo">Troca de óleo</SelectItem>
                            <SelectItem value="freios">Freios</SelectItem>
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
                      <Button type="submit" disabled={savingMaintenance} className="gap-2">
                        <Plus className="h-4 w-4" />
                        {savingMaintenance ? 'Salvando...' : 'Salvar próxima manutenção'}
                      </Button>
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
                          <p className="text-muted-foreground">{new Date(order.criado_em).toLocaleDateString('pt-BR')} • {order.status || 'sem status'}</p>
                        </div>
                      ))}
                      {selectedVehicleOrders.length === 0 && <p className="text-xs text-muted-foreground">Sem histórico de OS.</p>}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Próximas programações</p>
                      {selectedMaintenances.filter((item) => item.status === 'pendente').slice(0, 6).map((item) => (
                        <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border p-2 text-xs">
                          <div>
                            <p className="font-medium">{item.tipo}</p>
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
    </div>
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
