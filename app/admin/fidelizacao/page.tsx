'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@prodexy/ui'
import { CalendarClock, Car, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Save, Wrench } from 'lucide-react'
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

const defaultMaintenanceForm: MaintenanceForm = {
  tipo: 'revisao',
  descricao: '',
  proxima_data: '',
}

function formatVehicleLabel(vehicle: VeiculoRow) {
  const label = [vehicle.marca, vehicle.modelo].filter(Boolean).join(' ')
  if (!label && !vehicle.placa) return 'Veículo sem identificação'
  if (!label) return vehicle.placa || 'Sem placa'
  return `${label}${vehicle.placa ? ` - ${vehicle.placa}` : ''}`
}

type VehicleDetailsForm = {
  placa: string
  marca: string
  modelo: string
  ano: string
  cor: string
  km_atual: string
  observacoes: string
}

const defaultVehicleForm: VehicleDetailsForm = {
  placa: '',
  marca: '',
  modelo: '',
  ano: '',
  cor: '',
  km_atual: '',
  observacoes: '',
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

  const [expandedVehicleId, setExpandedVehicleId] = useState<string>('')
  const [editingVehicleId, setEditingVehicleId] = useState<string>('')
  const [vehicleForm, setVehicleForm] = useState<VehicleDetailsForm>(defaultVehicleForm)
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceForm>(defaultMaintenanceForm)

  async function loadData() {
    setLoading(true)
    setError(null)

    const [clientesRes, veiculosRes, ordensRes, manutencoesRes] = await Promise.all([
      supabase.from('clientes').select('id,nome,telefone,email'),
      supabase.from('veiculos').select('id,cliente_id,placa,marca,modelo,ano,cor,km_atual,observacoes').order('criado_em', { ascending: false }),
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
    const vehicles = (veiculosRes.data || []) as VeiculoRow[]

    setClientesById(
      clientesList.reduce<Record<string, ClienteRow>>((acc, item) => {
        acc[item.id] = item
        return acc
      }, {})
    )
    setVeiculos(vehicles)
    setOrdens((ordensRes.data || []) as OrdemRow[])
    setManutencoes((manutencoesRes.data || []) as ManutencaoRow[])

    setExpandedVehicleId((prev) => {
      if (prev && vehicles.some((vehicle) => vehicle.id === prev)) return prev
      return vehicles[0]?.id || ''
    })

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
      if (!current || String(item.proxima_data) < String(current.proxima_data)) {
        map[item.veiculo_id] = item
      }
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

  const overdueCount = useMemo(() => {
    const today = new Date()
    return Object.values(nextPendingByVehicleId).filter((item) => {
      if (!item?.proxima_data) return false
      return new Date(`${item.proxima_data}T00:00:00`) < today
    }).length
  }, [nextPendingByVehicleId])

  const filteredVehicles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()

    let list = [...veiculos]

    if (term) {
      list = list.filter((vehicle) => {
        const cliente = clientesById[vehicle.cliente_id]
        return [
          vehicle.placa || '',
          vehicle.marca || '',
          vehicle.modelo || '',
          cliente?.nome || '',
          cliente?.telefone || '',
        ]
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
        return new Date(`${next.proxima_data}T00:00:00`) < now
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

  const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedVehicles = filteredVehicles.slice(startIndex, endIndex)

  const dueThisMonth = useMemo(() => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()

    return Object.values(nextPendingByVehicleId).filter(
      (item): item is ManutencaoRow => {
        if (!item) return false
        if (item.status !== 'pendente' || !item.proxima_data) return false
        const date = new Date(`${item.proxima_data}T00:00:00`)
        return date.getMonth() === month && date.getFullYear() === year
      }
    )
  }, [nextPendingByVehicleId])

  function startVehicleEditing(vehicle: VeiculoRow) {
    setExpandedVehicleId(vehicle.id)
    setEditingVehicleId(vehicle.id)
    setVehicleForm({
      placa: vehicle.placa || '',
      marca: vehicle.marca || '',
      modelo: vehicle.modelo || '',
      ano: vehicle.ano || '',
      cor: vehicle.cor || '',
      km_atual: vehicle.km_atual != null ? String(vehicle.km_atual) : '',
      observacoes: vehicle.observacoes || '',
    })
  }

  async function handleSaveVehicle() {
    if (!editingVehicleId) return
    if (!vehicleForm.placa.trim()) {
      setError('A placa do veículo é obrigatória.')
      return
    }

    setSavingVehicle(true)
    setError(null)
    setSuccess(null)

    const { error: updateError } = await supabase
      .from('veiculos')
      .update({
        placa: vehicleForm.placa.trim(),
        marca: vehicleForm.marca.trim() || null,
        modelo: vehicleForm.modelo.trim() || null,
        ano: vehicleForm.ano.trim() || null,
        cor: vehicleForm.cor.trim() || null,
        km_atual: vehicleForm.km_atual ? Number(vehicleForm.km_atual) : null,
        observacoes: vehicleForm.observacoes.trim() || null,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', editingVehicleId)

    if (updateError) {
      console.error(updateError)
      setError('Erro ao salvar dados do veículo.')
      setSavingVehicle(false)
      return
    }

    setSuccess('Veículo atualizado com sucesso.')
    setSavingVehicle(false)
    setEditingVehicleId('')
    setVehicleForm(defaultVehicleForm)
    await loadData()
  }

  async function handleCreateMaintenance(e: React.FormEvent) {
    e.preventDefault()
    if (!expandedVehicleId) return
    if (!maintenanceForm.proxima_data) {
      setError('Informe a data da próxima manutenção.')
      return
    }

    setSavingMaintenance(true)
    setError(null)
    setSuccess(null)

    const { error: insertError } = await supabase.from('manutencoes_veiculo').insert({
      veiculo_id: expandedVehicleId,
      tipo: maintenanceForm.tipo,
      descricao: maintenanceForm.descricao.trim() || null,
      periodicidade_meses: null,
      periodicidade_km: null,
      ultima_data: null,
      ultima_km: null,
      proxima_data: maintenanceForm.proxima_data,
      proxima_km: null,
      status: 'pendente',
      atualizado_em: new Date().toISOString(),
    })

    if (insertError) {
      console.error(insertError)
      setError('Erro ao salvar manutenção programada.')
      setSavingMaintenance(false)
      return
    }

    setSuccess('Próxima manutenção registrada.')
    setMaintenanceForm(defaultMaintenanceForm)
    setSavingMaintenance(false)
    await loadData()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fidelização</h1>
          <p className="text-muted-foreground">Controle por veículo com histórico e próximas revisões.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <p className="text-sm font-medium text-muted-foreground">Veículos cadastrados</p>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{veiculos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <p className="text-sm font-medium text-muted-foreground">Próximas do mês</p>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dueThisMonth.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <p className="text-sm font-medium text-muted-foreground">Pendências totais</p>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.values(nextPendingByVehicleId).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <p className="text-sm font-medium text-muted-foreground">Atrasadas</p>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{overdueCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}
          {loading && <p className="text-sm text-muted-foreground">Carregando fidelização...</p>}
          <div className="grid gap-2 lg:grid-cols-[1fr_220px_220px]">
            <Input
              placeholder="Buscar por placa, marca, modelo ou cliente"
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
            />
            <Select
              value={filterType}
              onValueChange={(value: 'all' | 'due-month' | 'overdue' | 'without-schedule') => {
                setFilterType(value)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os veículos</SelectItem>
                <SelectItem value="due-month">Próximas do mês</SelectItem>
                <SelectItem value="overdue">Atrasadas</SelectItem>
                <SelectItem value="without-schedule">Sem agenda</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: 'cliente' | 'placa' | 'proxima') => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar por..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cliente">Cliente (A-Z)</SelectItem>
                <SelectItem value="placa">Placa (A-Z)</SelectItem>
                <SelectItem value="proxima">Próxima revisão</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="hidden rounded-lg border bg-muted/20 p-3 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[120px_1.2fr_1fr_130px_90px_120px_120px] md:gap-3">
            <span>Placa</span>
            <span>Veículo</span>
            <span>Cliente</span>
            <span>Próxima revisão</span>
            <span>Histórico</span>
            <span>Status</span>
            <span>Ações</span>
          </div>

          {paginatedVehicles.map((vehicle) => {
            const customer = clientesById[vehicle.cliente_id]
            const nextMaintenance = nextPendingByVehicleId[vehicle.id]
            const historyOrders = ordens.filter((order) => order.veiculo_id === vehicle.id)
            const vehicleMaintenances = manutencoes.filter((item) => item.veiculo_id === vehicle.id)
            const isExpanded = expandedVehicleId === vehicle.id
            const isEditing = editingVehicleId === vehicle.id

            let statusLabel = 'Sem agenda'
            if (nextMaintenance?.proxima_data) {
              const nextDate = new Date(`${nextMaintenance.proxima_data}T00:00:00`)
              statusLabel = nextDate < new Date() ? 'Atrasada' : 'No prazo'
            }

            return (
              <div key={vehicle.id} className="rounded-lg border">
                <div className="grid gap-2 p-3 md:grid-cols-[120px_1.2fr_1fr_130px_90px_120px_120px] md:items-center md:gap-3">
                  <p className="text-sm font-semibold">{vehicle.placa || '-'}</p>
                  <p className="text-sm">{[vehicle.marca, vehicle.modelo].filter(Boolean).join(' ') || 'Sem modelo'}</p>
                  <p className="text-sm">{customer?.nome || 'Cliente não identificado'}</p>
                  <p className="text-sm">
                    {nextMaintenance?.proxima_data
                      ? new Date(`${nextMaintenance.proxima_data}T00:00:00`).toLocaleDateString('pt-BR')
                      : '-'}
                  </p>
                  <p className="text-sm">{historyCountByVehicleId[vehicle.id] || 0} OS</p>
                  <p className={`text-sm font-medium ${statusLabel === 'Atrasada' ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    {statusLabel}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedVehicleId('')
                          setEditingVehicleId('')
                        } else {
                          setExpandedVehicleId(vehicle.id)
                        }
                      }}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    {!isEditing && (
                      <Button size="sm" variant="outline" onClick={() => startVehicleEditing(vehicle)}>
                        Editar
                      </Button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="grid gap-4 border-t p-4 lg:grid-cols-3">
                    <Card>
                      <CardHeader>
                        <p className="font-semibold">Dados do cliente e veículo</p>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {!isEditing ? (
                          <>
                            <p><span className="font-medium">Cliente:</span> {customer?.nome || '-'}</p>
                            <p><span className="font-medium">Telefone:</span> {customer?.telefone || '-'}</p>
                            <p><span className="font-medium">Veículo:</span> {formatVehicleLabel(vehicle)}</p>
                            <p><span className="font-medium">Ano:</span> {vehicle.ano || '-'}</p>
                            <p><span className="font-medium">Cor:</span> {vehicle.cor || '-'}</p>
                            <p><span className="font-medium">KM:</span> {vehicle.km_atual ?? '-'}</p>
                            <p><span className="font-medium">Observações:</span> {vehicle.observacoes || '-'}</p>
                          </>
                        ) : (
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <Label htmlFor={`placa-${vehicle.id}`}>Placa</Label>
                              <Input
                                id={`placa-${vehicle.id}`}
                                value={vehicleForm.placa}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVehicleForm((prev) => ({ ...prev, placa: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`marca-${vehicle.id}`}>Marca</Label>
                              <Input
                                id={`marca-${vehicle.id}`}
                                value={vehicleForm.marca}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVehicleForm((prev) => ({ ...prev, marca: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`modelo-${vehicle.id}`}>Modelo</Label>
                              <Input
                                id={`modelo-${vehicle.id}`}
                                value={vehicleForm.modelo}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVehicleForm((prev) => ({ ...prev, modelo: e.target.value }))}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label htmlFor={`ano-${vehicle.id}`}>Ano</Label>
                                <Input
                                  id={`ano-${vehicle.id}`}
                                  value={vehicleForm.ano}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVehicleForm((prev) => ({ ...prev, ano: e.target.value }))}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`cor-${vehicle.id}`}>Cor</Label>
                                <Input
                                  id={`cor-${vehicle.id}`}
                                  value={vehicleForm.cor}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVehicleForm((prev) => ({ ...prev, cor: e.target.value }))}
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`km-${vehicle.id}`}>KM atual</Label>
                              <Input
                                id={`km-${vehicle.id}`}
                                type="number"
                                value={vehicleForm.km_atual}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVehicleForm((prev) => ({ ...prev, km_atual: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`obs-${vehicle.id}`}>Observações</Label>
                              <Textarea
                                id={`obs-${vehicle.id}`}
                                value={vehicleForm.observacoes}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setVehicleForm((prev) => ({ ...prev, observacoes: e.target.value }))}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleSaveVehicle} disabled={savingVehicle}>
                                <Save className="mr-2 h-4 w-4" />
                                {savingVehicle ? 'Salvando...' : 'Salvar veículo'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingVehicleId('')
                                  setVehicleForm(defaultVehicleForm)
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <p className="font-semibold">Registrar próxima manutenção (data)</p>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleCreateMaintenance} className="space-y-2">
                          <div className="space-y-1">
                            <Label>Tipo</Label>
                            <Select
                              value={maintenanceForm.tipo}
                              onValueChange={(value: string) => setMaintenanceForm((prev) => ({ ...prev, tipo: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="revisao">Revisão</SelectItem>
                                <SelectItem value="alinhamento">Alinhamento</SelectItem>
                                <SelectItem value="balanceamento">Balanceamento</SelectItem>
                                <SelectItem value="troca_oleo">Troca de óleo</SelectItem>
                                <SelectItem value="freios">Freios</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`proxima-data-${vehicle.id}`}>Próxima data</Label>
                            <Input
                              id={`proxima-data-${vehicle.id}`}
                              type="date"
                              value={maintenanceForm.proxima_data}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaintenanceForm((prev) => ({ ...prev, proxima_data: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`descricao-manutencao-${vehicle.id}`}>Descrição</Label>
                            <Textarea
                              id={`descricao-manutencao-${vehicle.id}`}
                              value={maintenanceForm.descricao}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMaintenanceForm((prev) => ({ ...prev, descricao: e.target.value }))}
                            />
                          </div>
                          <Button type="submit" disabled={savingMaintenance}>
                            {savingMaintenance ? 'Salvando...' : 'Salvar próxima manutenção'}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <p className="font-semibold">Histórico e agenda</p>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Últimas OS</p>
                        {historyOrders.slice(0, 5).map((order) => (
                          <div key={order.id} className="rounded-lg border p-2 text-xs">
                            <p className="font-medium">OS #{order.numero || order.id.slice(0, 8)}</p>
                            <p className="text-muted-foreground">{new Date(order.criado_em).toLocaleDateString('pt-BR')} • {order.status || 'sem status'}</p>
                          </div>
                        ))}
                        {historyOrders.length === 0 && (
                          <p className="text-xs text-muted-foreground">Sem histórico de OS.</p>
                        )}

                        <p className="pt-2 text-xs font-medium text-muted-foreground">Próximas programações</p>
                        {vehicleMaintenances.filter((item) => item.status === 'pendente').slice(0, 5).map((item) => (
                          <div key={item.id} className="rounded-lg border p-2 text-xs">
                            <p className="font-medium">{item.tipo}</p>
                            <p className="text-muted-foreground">
                              {item.proxima_data ? new Date(`${item.proxima_data}T00:00:00`).toLocaleDateString('pt-BR') : '-'}
                            </p>
                          </div>
                        ))}
                        {vehicleMaintenances.filter((item) => item.status === 'pendente').length === 0 && (
                          <p className="text-xs text-muted-foreground">Sem agenda de manutenção.</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )
          })}

          {!loading && paginatedVehicles.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum veículo encontrado com os filtros atuais.</p>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredVehicles.length)} de {filteredVehicles.length} veículos
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-lg font-semibold">Próximas revisões do mês</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {dueThisMonth.map((item) => {
            const vehicle = veiculos.find((v) => v.id === item.veiculo_id)
            const customer = vehicle ? clientesById[vehicle.cliente_id] : null
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => setExpandedVehicleId(item.veiculo_id)}
                className="w-full rounded-lg border p-3 text-left hover:bg-muted/30"
              >
                <p className="font-medium">{item.tipo}</p>
                <p className="text-sm text-muted-foreground">{vehicle ? formatVehicleLabel(vehicle) : 'Veículo não identificado'}</p>
                <p className="text-sm text-muted-foreground">{customer?.nome || 'Cliente não identificado'}</p>
                <p className="text-sm text-muted-foreground">
                  Data prevista: {item.proxima_data ? new Date(`${item.proxima_data}T00:00:00`).toLocaleDateString('pt-BR') : '-'}
                </p>
              </button>
            )
          })}
          {dueThisMonth.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma revisão pendente para este mês.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
