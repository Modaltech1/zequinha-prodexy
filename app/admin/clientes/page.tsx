// app/admin/clientes/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import {
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
} from '@prodexy/ui'
import {
    Plus,
    Search,
    Pencil,
    Trash2,
    Phone,
    MapPin,
    UserCheck,
    Filter,
    Cake,
    ClipboardCheck,
} from 'lucide-react'
import { CustomerDialog } from '@/components/customer-dialog'
import { ListPagination } from '@/components/list-pagination'
import { supabase } from '@/lib/supabaseClient'

type BirthdayFilter =
    | 'all'
    | 'birthday-today'
    | 'birthday-current-month'
    | 'birthday-next-month'
    | 'birthday-next-30-days'
    | 'without-birthday'

type SortOption =
    | 'name'
    | 'purchases-high'
    | 'purchases-low'
    | 'birthday-next'
    | 'birthday-date'

interface Customer {
    id: string
    nome: string
    telefone: string | null
    cpf_cnpj: string | null
    cidade: string | null
    bairro: string | null
    nascimento: string | null
    whatsapp_opt_in: boolean
    totalPurchases: number
    totalOrders: number
}

type CustomerRow = {
    id: string
    nome: string
    telefone: string | null
    cpf_cnpj: string | null
    cidade: string | null
    bairro: string | null
    nascimento: string | null
    whatsapp_opt_in: boolean
}

type OrdemServicoRow = {
    id: string
    cliente_id: string | null
    valor_total: number | string | null
    valor_final: number | string | null
    status: string | null
}

export default function Page() {
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState<BirthdayFilter>('all')
    const [sortBy, setSortBy] = useState<SortOption>('name')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const loadCustomers = async () => {
        setLoading(true)
        setError(null)

        try {
            const [customersRes, ordersRes] = await Promise.all([
                supabase
                    .from('clientes')
                    .select('id, nome, telefone, cpf_cnpj, cidade, bairro, nascimento, whatsapp_opt_in')
                    .order('nome', { ascending: true }),

                supabase
                    .from('ordens_de_servico')
                    .select('id, cliente_id, valor_total, valor_final, status'),
            ])

            if (customersRes.error) throw customersRes.error
            if (ordersRes.error) throw ordersRes.error

            const customersData = (customersRes.data ?? []) as CustomerRow[]
            const ordersData = (ordersRes.data ?? []) as OrdemServicoRow[]

            const financialByCustomer: Record<string, { totalPurchases: number; totalOrders: number }> = {}

            for (const order of ordersData) {
                if (!order.cliente_id) continue
                if (order.status === 'cancelada') continue

                const amount = Number(order.valor_final ?? order.valor_total ?? 0)

                if (!financialByCustomer[order.cliente_id]) {
                    financialByCustomer[order.cliente_id] = {
                        totalPurchases: 0,
                        totalOrders: 0,
                    }
                }

                financialByCustomer[order.cliente_id].totalPurchases += amount
                financialByCustomer[order.cliente_id].totalOrders += 1
            }

            const mapped = customersData.map((customer) => ({
                id: customer.id,
                nome: customer.nome,
                telefone: customer.telefone,
                cpf_cnpj: customer.cpf_cnpj,
                cidade: customer.cidade,
                bairro: customer.bairro,
                nascimento: customer.nascimento,
                whatsapp_opt_in: Boolean(customer.whatsapp_opt_in),
                totalPurchases: financialByCustomer[customer.id]?.totalPurchases ?? 0,
                totalOrders: financialByCustomer[customer.id]?.totalOrders ?? 0,
            }))

            setCustomers(mapped)
        } catch (err: any) {
            console.error('Erro ao carregar clientes', err)
            setError('Erro ao carregar clientes. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadCustomers()
    }, [])

    const filteredCustomers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase()
        const digits = normalizeDigits(searchTerm)

        return customers
            .filter((customer) => {
                if (!term && !digits) return true

                const searchable = [
                    customer.nome || '',
                    customer.telefone || '',
                    customer.cpf_cnpj || '',
                    customer.cidade || '',
                    customer.bairro || '',
                    formatBirthDate(customer.nascimento),
                ]
                    .join(' ')
                    .toLowerCase()

                const documentDigits = normalizeDigits(customer.cpf_cnpj || '')
                const phoneDigits = normalizeDigits(customer.telefone || '')

                return (
                    searchable.includes(term) ||
                    Boolean(digits && documentDigits.includes(digits)) ||
                    Boolean(digits && phoneDigits.includes(digits))
                )
            })
            .filter((customer) => {
                if (filterType === 'all') return true
                if (filterType === 'birthday-today') return isBirthdayToday(customer.nascimento)
                if (filterType === 'birthday-current-month') return isBirthdayInMonth(customer.nascimento, 0)
                if (filterType === 'birthday-next-month') return isBirthdayInMonth(customer.nascimento, 1)
                if (filterType === 'birthday-next-30-days') return isBirthdayInNextDays(customer.nascimento, 30)
                if (filterType === 'without-birthday') return !customer.nascimento

                return true
            })
            .sort((a, b) => {
                if (sortBy === 'purchases-high') {
                    return b.totalPurchases - a.totalPurchases
                }

                if (sortBy === 'purchases-low') {
                    return a.totalPurchases - b.totalPurchases
                }

                if (sortBy === 'birthday-next') {
                    const nextA = getNextBirthday(a.nascimento)
                    const nextB = getNextBirthday(b.nascimento)

                    if (!nextA && !nextB) return a.nome.localeCompare(b.nome)
                    if (!nextA) return 1
                    if (!nextB) return -1

                    return nextA.daysUntil - nextB.daysUntil
                }

                if (sortBy === 'birthday-date') {
                    const aParts = getBirthDateParts(a.nascimento)
                    const bParts = getBirthDateParts(b.nascimento)

                    if (!aParts && !bParts) return a.nome.localeCompare(b.nome)
                    if (!aParts) return 1
                    if (!bParts) return -1

                    if (aParts.month !== bParts.month) return aParts.month - bParts.month
                    return aParts.day - bParts.day
                }

                return a.nome.localeCompare(b.nome)
            })
    }, [customers, searchTerm, filterType, sortBy])

    const birthdaysInSelectedFilter = useMemo(() => {
        return filteredCustomers.filter((customer) => Boolean(customer.nascimento)).length
    }, [filteredCustomers])

    const attendedCustomersInSelectedFilter = useMemo(() => {
        return filteredCustomers.filter((customer) => customer.totalOrders > 0).length
    }, [filteredCustomers])

    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex)

    useEffect(() => {
        const nextTotalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1
        if (currentPage > nextTotalPages) setCurrentPage(nextTotalPages)
    }, [currentPage, filteredCustomers.length])

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer)
        setIsDialogOpen(true)
    }

    const handleNew = () => {
        setEditingCustomer(null)
        setIsDialogOpen(true)
    }

    const handleDelete = async (customer: Customer) => {
        const confirmed = window.confirm(`Deseja excluir o cliente "${customer.nome}"?`)
        if (!confirmed) return

        try {
            const { error } = await supabase
                .from('clientes')
                .delete()
                .eq('id', customer.id)

            if (error) throw error

            await loadCustomers()
        } catch (err: any) {
            console.error('Erro ao excluir cliente', err)
            alert(
                'Erro ao excluir cliente. Ele pode ter ordens de serviço vinculadas. Se preferir, mantenha o cadastro e apenas pare de utilizá-lo.',
            )
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
                    <p className="text-muted-foreground">
                        Gerencie clientes, aniversários e histórico de compras.
                    </p>
                </div>

                <Button onClick={handleNew} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Cliente
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <p className="text-sm font-medium text-muted-foreground">Total de Clientes</p>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{customers.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <p className="text-sm font-medium text-muted-foreground">Aniversários</p>
                        <Cake className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{birthdaysInSelectedFilter}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <p className="text-sm font-medium text-muted-foreground">Clientes atendidos</p>
                        <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{attendedCustomersInSelectedFilter}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="space-y-3">
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}

                        {loading && (
                            <p className="text-sm text-muted-foreground">
                                Carregando clientes...
                            </p>
                        )}

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome, telefone, CPF ou aniversário..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value)
                                    setCurrentPage(1)
                                }}
                            />
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Select
                                value={filterType}
                                onValueChange={(value) => {
                                    setFilterType(value as BirthdayFilter)
                                    setCurrentPage(1)
                                }}
                            >
                                <SelectTrigger className="w-full sm:w-[260px]">
                                    <Filter className="mr-2 h-4 w-4" />
                                    <SelectValue placeholder="Filtrar aniversário..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os clientes</SelectItem>
                                    <SelectItem value="birthday-today">Aniversariantes de hoje</SelectItem>
                                    <SelectItem value="birthday-current-month">Aniversariantes deste mês</SelectItem>
                                    <SelectItem value="birthday-next-month">Aniversariantes do próximo mês</SelectItem>
                                    <SelectItem value="birthday-next-30-days">Próximos 30 dias</SelectItem>
                                    <SelectItem value="without-birthday">Sem aniversário cadastrado</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={sortBy}
                                onValueChange={(value) => {
                                    setSortBy(value as SortOption)
                                    setCurrentPage(1)
                                }}
                            >
                                <SelectTrigger className="w-full sm:w-[230px]">
                                    <SelectValue placeholder="Ordenar por..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name">Nome (A-Z)</SelectItem>
                                    <SelectItem value="purchases-high">Maior total de compras</SelectItem>
                                    <SelectItem value="purchases-low">Menor total de compras</SelectItem>
                                    <SelectItem value="birthday-next">Aniversário mais próximo</SelectItem>
                                    <SelectItem value="birthday-date">Data de aniversário</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="space-y-3">
                        {!loading && paginatedCustomers.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                Nenhum cliente encontrado com os filtros atuais.
                            </p>
                        )}

                        {paginatedCustomers.map((customer) => {
                            const nextBirthday = getNextBirthday(customer.nascimento)

                            return (
                                <div
                                    key={customer.id}
                                    className="flex flex-col gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 lg:flex-row lg:items-center lg:justify-between"
                                >
                                    <div className="flex flex-1 items-start gap-4">
                                        <div className="flex-1 space-y-1">
                                            <h3 className="font-semibold">{customer.nome}</h3>

                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                {customer.telefone && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Phone className="h-3.5 w-3.5" />
                                                        {formatPhone(customer.telefone)}
                                                    </div>
                                                )}

                                                {customer.cpf_cnpj && (
                                                    <div>
                                                        {formatCpfCnpj(customer.cpf_cnpj)}
                                                    </div>
                                                )}

                                                {(customer.cidade || customer.bairro) && (
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="h-3.5 w-3.5" />
                                                        {formatAddress(customer)}
                                                    </div>
                                                )}

                                                <div className="text-xs">
                                                    {customer.whatsapp_opt_in
                                                        ? 'WhatsApp autorizado'
                                                        : 'WhatsApp não autorizado'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-6 lg:justify-end">
                                        <div className="text-left lg:text-right">
                                            <p className="text-xs text-muted-foreground">Total Compras</p>
                                            <p className="text-sm font-semibold">
                                                {formatCurrency(customer.totalPurchases)}
                                            </p>
                                        </div>

                                        <div className="text-left lg:text-right">
                                            <p className="text-xs text-muted-foreground">Aniversário</p>
                                            <p className="text-sm font-semibold">
                                                {formatBirthDate(customer.nascimento)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 lg:ml-4">
                                        <Button variant="outline" size="sm" onClick={() => handleEdit(customer)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDelete(customer)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <ListPagination
                        currentPage={currentPage}
                        totalItems={filteredCustomers.length}
                        itemsPerPage={itemsPerPage}
                        itemLabel="clientes"
                        onPageChange={setCurrentPage}
                    />
                </CardContent>
            </Card>

            <CustomerDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                customer={editingCustomer}
                onSaved={loadCustomers}
            />
        </div>
    )
}

function normalizeDigits(value: string) {
    return value.replace(/\D/g, '')
}

function formatPhone(value: string | null) {
    if (!value) return '-'

    const digits = normalizeDigits(value)

    if (digits.length === 11) {
        return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
    }

    if (digits.length === 10) {
        return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
    }

    return value
}

function formatCpfCnpj(value: string | null) {
    if (!value) return '-'

    const digits = normalizeDigits(value)

    if (digits.length === 11) {
        return `CPF: ${digits.replace(
            /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
            '$1.$2.$3-$4',
        )}`
    }

    if (digits.length === 14) {
        return `CNPJ: ${digits.replace(
            /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
            '$1.$2.$3/$4-$5',
        )}`
    }

    return value
}

function formatAddress(customer: { cidade: string | null; bairro: string | null }) {
    return [customer.bairro, customer.cidade].filter(Boolean).join(' - ')
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(Number(value || 0))
}

function getBirthDateParts(value: string | null) {
    if (!value) return null

    const [year, month, day] = value.split('-').map(Number)

    if (!year || !month || !day) return null

    return { month, day }
}

function formatBirthDate(value: string | null) {
    const parts = getBirthDateParts(value)
    if (!parts) return 'Não informado'

    return `${String(parts.day).padStart(2, '0')}/${String(parts.month).padStart(2, '0')}`
}

function getToday() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
}

function getBirthdayDateForYear(value: string | null, year: number) {
    const parts = getBirthDateParts(value)
    if (!parts) return null

    const date = new Date(year, parts.month - 1, parts.day)
    date.setHours(0, 0, 0, 0)

    return date
}

function getNextBirthday(value: string | null) {
    const today = getToday()
    const currentYear = today.getFullYear()

    let nextBirthday = getBirthdayDateForYear(value, currentYear)
    if (!nextBirthday) return null

    if (nextBirthday < today) {
        nextBirthday = getBirthdayDateForYear(value, currentYear + 1)
    }

    if (!nextBirthday) return null

    const daysUntil = Math.ceil((nextBirthday.getTime() - today.getTime()) / 86400000)

    return {
        date: nextBirthday,
        daysUntil,
    }
}

function isBirthdayToday(value: string | null) {
    const parts = getBirthDateParts(value)
    if (!parts) return false

    const today = getToday()

    return parts.month === today.getMonth() + 1 && parts.day === today.getDate()
}

function isBirthdayInMonth(value: string | null, monthOffset: number) {
    const parts = getBirthDateParts(value)
    if (!parts) return false

    const target = new Date()
    target.setMonth(target.getMonth() + monthOffset)

    return parts.month === target.getMonth() + 1
}

function isBirthdayInNextDays(value: string | null, days: number) {
    const nextBirthday = getNextBirthday(value)
    if (!nextBirthday) return false

    return nextBirthday.daysUntil >= 0 && nextBirthday.daysUntil <= days
}
