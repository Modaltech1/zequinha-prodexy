'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@prodexy/ui'
import { Users, ClipboardList, Clock, CheckCircle2, DollarSign, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

type SummaryStats = {
    osHoje: number
    osMes: number
    concluidasPeriodo: number
    faturamento: number
    clientes_list: number
}

type OrdemServicoRow = {
    id: string
    numero: string | number | null
    cliente_id: string | number | null
    veiculo_placa: string | null
    veiculo_marca: string | null
    veiculo_modelo: string | null
    veiculo_ano: string | number | null
    veiculo_cor: string | null
    valor_total: number | null
    valor_final: number | null
    status: string | null
    observacoes: string | null
    criado_por: string | null
    criado_em: string
    atualizado_em: string | null
}

type ClienteRow = {
    id: string
    nome: string | null
}

type OsEmAndamento = {
    id: string
    numero: string
    customerName: string
    amount: number
    createdAt: string
    vehicleLabel: string
    statusLabel: string
}

type OsFinalizada = {
    id: string
    numero: string
    customerName: string
    amount: number
    finishedAt: string
    vehicleLabel: string
}

type DateFilter =
    | 'current-month'
    | 'next-month'
    | 'last-month'
    | 'current-quarter'
    | 'current-year'
    | 'all-time'
    | 'custom'

function formatDate(dateStr: string) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('pt-BR')
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value || 0)
}

function getDateRange(filter: DateFilter) {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    let start = new Date()
    let end = new Date()

    switch (filter) {
        case 'current-month': {
            start = new Date(year, month, 1)
            end = new Date(year, month + 1, 1)
            break
        }
        case 'last-month': {
            start = new Date(year, month - 1, 1)
            end = new Date(year, month, 1)
            break
        }
        case 'next-month': {
            start = new Date(year, month + 1, 1)
            end = new Date(year, month + 2, 1)
            break
        }
        case 'current-quarter': {
            const quarterStartMonth = Math.floor(month / 3) * 3
            start = new Date(year, quarterStartMonth, 1)
            end = new Date(year, quarterStartMonth + 3, 1)
            break
        }
        case 'current-year': {
            start = new Date(year, 0, 1)
            end = new Date(year + 1, 0, 1)
            break
        }
        case 'all-time':
        default: {
            start = new Date(2000, 0, 1)
            end = new Date(2100, 0, 1)
            break
        }
    }

    return {
        start,
        end,
        startIso: start.toISOString(),
        endIso: end.toISOString(),
    }
}

function getCustomDateRange(startStr: string, endStr: string) {
    const start = new Date(startStr + 'T00:00:00')
    const end = new Date(endStr + 'T00:00:00')
    end.setDate(end.getDate() + 1)

    return {
        start,
        end,
        startIso: start.toISOString(),
        endIso: end.toISOString(),
    }
}

function normalizeStatus(status?: string | null) {
    return (status || '').trim().toLowerCase()
}

function isFinishedStatus(status?: string | null) {
    const s = normalizeStatus(status)
    return ['finalizada', 'concluida', 'concluído', 'entregue', 'fechada'].includes(s)
}

function isInProgressStatus(status?: string | null) {
    const s = normalizeStatus(status)
    return !isFinishedStatus(s) && !['cancelada', 'cancelado'].includes(s)
}

function buildVehicleLabel(os: OrdemServicoRow) {
    return [
        os.veiculo_marca,
        os.veiculo_modelo,
        os.veiculo_placa ? `- ${os.veiculo_placa}` : null,
    ]
        .filter(Boolean)
        .join(' ')
}

export default function Page() {
    const [dateFilter, setDateFilter] = useState<DateFilter>('current-month')
    const [customStartDate, setCustomStartDate] = useState<string | null>(null)
    const [customEndDate, setCustomEndDate] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [summary, setSummary] = useState<SummaryStats | null>(null)
    const [recentOs, setRecentOs] = useState<OsEmAndamento[]>([])
    const [finishedOs, setFinishedOs] = useState<OsFinalizada[]>([])

    useEffect(() => {
        let cancelled = false

        async function loadDashboard() {
            setLoading(true)
            setError(null)

            try {
                let range: {
                    startIso: string
                    endIso: string
                }

                if (dateFilter === 'custom') {
                    if (!customStartDate || !customEndDate) {
                        setSummary(null)
                        setRecentOs([])
                        setFinishedOs([])
                        setLoading(false)
                        return
                    }

                    range = getCustomDateRange(customStartDate, customEndDate)
                } else {
                    range = getDateRange(dateFilter)
                }

                const { startIso, endIso } = range

                const [osRes, clientesRes, ordemServicosRes] = await Promise.all([
                    supabase
                        .from('ordens_de_servico')
                        .select(`
                            id,
                            numero,
                            cliente_id,
                            veiculo_placa,
                            veiculo_marca,
                            veiculo_modelo,
                            veiculo_ano,
                            veiculo_cor,
                            valor_total,
                            valor_final,
                            status,
                            observacoes,
                            criado_por,
                            criado_em,
                            atualizado_em
                        `)
                        .gte('criado_em', startIso)
                        .lt('criado_em', endIso)
                        .order('criado_em', { ascending: false }),

                    supabase
                        .from('clientes')
                        .select('id, nome'),

                    supabase
                        .from('ordem_servicos')
                        .select('os_id, valor'),
                ])

                if (cancelled) return

                if (osRes.error) throw osRes.error
                if (clientesRes.error) throw clientesRes.error
                if (ordemServicosRes.error) throw ordemServicosRes.error

                const ordens = (osRes.data ?? []) as OrdemServicoRow[]
                const clientes = (clientesRes.data ?? []) as ClienteRow[]
                const ordemServicos = (ordemServicosRes.data ?? []) as {
                    os_id: string
                    valor: number | null
                }[]

                const clienteMap = clientes.reduce<Record<string, string>>((acc, cliente) => {
                    acc[String(cliente.id)] = cliente.nome || `Cliente #${cliente.id}`
                    return acc
                }, {})

                const hoje = new Date()
                const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
                const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1)

                const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
                const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)

                const osHoje = ordens.filter((os) => {
                    const d = new Date(os.criado_em)
                    return d >= inicioHoje && d < fimHoje
                }).length

                const osMes = ordens.filter((os) => {
                    const d = new Date(os.criado_em)
                    return d >= inicioMes && d < fimMes
                }).length

                const concluidasPeriodo = ordens.filter((os) => isFinishedStatus(os.status)).length
                const ordensConcluidas = ordens.filter((os) => isFinishedStatus(os.status))
                const ordensConcluidasIds = new Set(ordensConcluidas.map((os) => String(os.id)))

                const faturamento = ordemServicos
                    .filter((item) => ordensConcluidasIds.has(String(item.os_id)))
                    .reduce((sum, item) => sum + Number(item.valor ?? 0), 0)

                const clientes_list = new Set(
                    ordens
                        .map((os) => os.cliente_id)
                        .filter((id): id is string | number => id !== null && id !== undefined)
                        .map(String)
                ).size

                const emAndamento = ordens
                    .filter((os) => isInProgressStatus(os.status))
                    .slice(0, 5)
                    .map((os) => ({
                        id: String(os.id),
                        numero: String(os.numero ?? os.id),
                        customerName:
                            os.cliente_id != null
                                ? clienteMap[String(os.cliente_id)] || `Cliente #${os.cliente_id}`
                                : 'Cliente não identificado',
                        amount: Number(os.valor_final ?? os.valor_total ?? 0),
                        createdAt: os.criado_em,
                        vehicleLabel: buildVehicleLabel(os),
                        statusLabel: os.status || 'Sem status',
                    }))

                const finalizadas = ordens
                    .filter((os) => isFinishedStatus(os.status))
                    .slice(0, 5)
                    .map((os) => ({
                        id: String(os.id),
                        numero: String(os.numero ?? os.id),
                        customerName:
                            os.cliente_id != null
                                ? clienteMap[String(os.cliente_id)] || `Cliente #${os.cliente_id}`
                                : 'Cliente não identificado',
                        amount: Number(os.valor_final ?? os.valor_total ?? 0),
                        finishedAt: os.atualizado_em || os.criado_em,
                        vehicleLabel: buildVehicleLabel(os),
                    }))

                if (cancelled) return

                setSummary({
                    osHoje,
                    osMes,
                    concluidasPeriodo,
                    faturamento,
                    clientes_list,
                })

                setRecentOs(emAndamento)
                setFinishedOs(finalizadas)
            } catch (err) {
                console.error('[Dashboard] erro ao carregar:', err)
                if (!cancelled) {
                    setError('Erro ao carregar dados do dashboard. Tente novamente.')
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        loadDashboard()

        return () => {
            cancelled = true
        }
    }, [dateFilter, customStartDate, customEndDate])

    const stats = summary
        ? [
            {
                title: 'OS Hoje',
                value: String(summary.osHoje),
                icon: ClipboardList,
                description: 'Ordens criadas hoje',
            },
            {
                title: 'OS no Mês',
                value: String(summary.osMes),
                icon: Clock,
                description: 'Ordens criadas no mês atual',
            },
            {
                title: 'Concluídas',
                value: String(summary.concluidasPeriodo),
                icon: CheckCircle2,
                description: 'Ordens finalizadas no período',
            },
            {
                title: 'Faturamento',
                value: formatCurrency(summary.faturamento),
                icon: DollarSign,
                description: 'Soma dos serviços de OS concluídas',
            },
            {
                title: 'Clientes',
                value: String(summary.clientes_list),
                icon: Users,
                description: 'Clientes únicos no período',
            },
        ]
        : []

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">Visão geral do seu negócio</p>
                </div>

                <Select
                    value={dateFilter}
                    onValueChange={(val) => setDateFilter(val as DateFilter)}
                >
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="current-month">Mês Atual</SelectItem>
                        <SelectItem value="next-month">Próximo Mês</SelectItem>
                        <SelectItem value="last-month">Mês Anterior</SelectItem>
                        <SelectItem value="current-quarter">Trimestre Atual</SelectItem>
                        <SelectItem value="current-year">Ano Atual</SelectItem>
                        <SelectItem value="all-time">Todo Período</SelectItem>
                        <SelectItem value="custom">Período Personalizado</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {dateFilter === 'custom' && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">De</span>
                        <Input
                            type="date"
                            value={customStartDate ?? ''}
                            onChange={(e) => setCustomStartDate(e.target.value || null)}
                            className="w-[180px]"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Até</span>
                        <Input
                            type="date"
                            value={customEndDate ?? ''}
                            onChange={(e) => setCustomEndDate(e.target.value || null)}
                            className="w-[180px]"
                        />
                    </div>
                </div>
            )}

            {loading && (
                <p className="text-sm text-muted-foreground">
                    Carregando dados do dashboard...
                </p>
            )}

            {error && !loading && (
                <Card className="border-destructive/30">
                    <CardHeader>
                        <CardTitle className="text-destructive">Erro</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-destructive">{error}</p>
                    </CardContent>
                </Card>
            )}

            {!loading && !error && (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                        {stats.map((stat) => {
                            const Icon = stat.icon
                            return (
                                <Card key={stat.title}>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            {stat.title}
                                        </CardTitle>
                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-base sm:text-2xl font-bold leading-tight break-words">
                                            {stat.value}
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {stat.description}
                                        </p>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Em andamento</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {recentOs.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        Nenhuma OS em andamento no período selecionado.
                                    </p>
                                ) : (
                                    <div className="space-y-4">
                                        {recentOs.map((os) => (
                                            <div
                                                key={os.id}
                                                className="flex items-center justify-between border-b pb-4 last:border-0"
                                            >
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium">
                                                        {os.customerName} • OS #{os.numero}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {os.vehicleLabel || 'Veículo não informado'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDate(os.createdAt)} • {os.statusLabel}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium">
                                                        {formatCurrency(os.amount)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Finalizadas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {finishedOs.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        Nenhuma OS finalizada no período selecionado.
                                    </p>
                                ) : (
                                    <div className="space-y-4">
                                        {finishedOs.map((os) => (
                                            <div
                                                key={os.id}
                                                className="flex items-center justify-between border-b pb-4 last:border-0"
                                            >
                                                <div className="space-y-1">
                                                    <p className="text-sm font-medium">
                                                        {os.customerName} • OS #{os.numero}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {os.vehicleLabel || 'Veículo não informado'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Finalizada em {formatDate(os.finishedAt)}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium">
                                                        {formatCurrency(os.amount)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    )
}