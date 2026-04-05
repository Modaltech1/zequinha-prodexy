// app/admin/clientes/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Button, Card, CardContent, CardHeader, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@prodexy/ui'
import { Plus, Search, Pencil, Trash2, Phone, DollarSign, UserCheck, Filter, ChevronLeft, ChevronRight, } from 'lucide-react'
import { CustomerDialog } from '@/components/customer-dialog'
import { supabase } from '@/lib/supabaseClient'

interface Customer {
    id: string
    nome: string
    telefone: string
    cpf_cnpj: string
    totalPurchases: number
    pendingAmount: number
}

export default function Page() {
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState('all')
    const [sortBy, setSortBy] = useState('name')
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
            const [customersRes, salesRes] =
                await Promise.all([
                    supabase
                        .from('clientes')
                        .select('id, nome, telefone, cpf_cnpj'),
                    supabase
                        .from('ordens_de_servico')
                        .select('id, cliente_id, valor_final, status')
                ])

            if (customersRes.error) throw customersRes.error
            if (salesRes.error) throw salesRes.error

            const customersData = (customersRes.data ?? []) as {
                id: string
                nome: string
                telefone: string
                cpf_cnpj: string
            }[]

            const salesData = (salesRes.data ?? []) as {
                id: string
                cliente_id: string | null
                valor_final: number | string | null
                status: string
            }[]


            // total de compras por cliente (somando vendas não canceladas)
            const totalPurchasesByCustomer: Record<string, number> = {}
            // pendência por cliente com base em receivables abertos/parciais
            const pendingByCustomer: Record<string, number> = {}
            for (const s of salesData) {
                if (!s.cliente_id) continue
                if (s.status === 'cancelada' || s.status === 'concluida') continue
                const amount = Number(s.valor_final ?? 0)
                totalPurchasesByCustomer[s.cliente_id] = (totalPurchasesByCustomer[s.cliente_id] ?? 0) + amount
                pendingByCustomer[s.cliente_id] = (pendingByCustomer[s.cliente_id] ?? 0) + amount
            }

            const mapped = customersData.map((customer) => ({
                id: customer.id,
                nome: customer.nome,
                telefone: customer.telefone,
                cpf_cnpj: customer.cpf_cnpj,
                totalPurchases: totalPurchasesByCustomer[customer.id] ?? 0,
                pendingAmount: pendingByCustomer[customer.id] ?? 0,
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

    let filteredCustomers = customers.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.telefone.includes(searchTerm) ||
        c.cpf_cnpj.includes(searchTerm)
    )

    // Apply filter
    if (filterType === 'with-debt') {
        filteredCustomers = filteredCustomers.filter(c => c.pendingAmount > 0)
    } else if (filterType === 'no-debt') {
        filteredCustomers = filteredCustomers.filter(c => c.pendingAmount === 0)
    }

    // Apply sort
    filteredCustomers = [...filteredCustomers].sort((a, b) => {
        if (sortBy === 'name') {
            return a.nome.localeCompare(b.nome)
        } else if (sortBy === 'purchases-high') {
            return b.totalPurchases - a.totalPurchases
        } else if (sortBy === 'purchases-low') {
            return a.totalPurchases - b.totalPurchases
        } else if (sortBy === 'pending-high') {
            return b.pendingAmount - a.pendingAmount
        } else if (sortBy === 'pending-low') {
            return a.pendingAmount - b.pendingAmount
        }
        return 0
    })

    const totalToReceive = customers.reduce((sum, c) => sum + c.pendingAmount, 0)
    const customersWithDebt = customers.filter(c => c.pendingAmount > 0).length

    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex)

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer)
        setIsDialogOpen(true)
    }

    const handleNew = () => {
        setEditingCustomer(null)
        setIsDialogOpen(true)
    }

    const handleDelete = async (customer: Customer) => {
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
                'Erro ao excluir cliente. Ele pode ter vendas vinculadas. Se preferir, mantenha o cadastro e apenas pare de utilizá-lo.',
            )
        }
    }

    function formatCpfCnpj(value: string) {
        const digits = value.replace(/\D/g, '')

        if (digits.length === 11) {
            return `CPF: ${digits.replace(
                /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
                '$1.$2.$3-$4'
            )}`
        }

        if (digits.length === 14) {
            return `CNPJ: ${digits.replace(
                /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
                '$1.$2.$3/$4-$5'
            )}`
        }

        return value
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
                    <p className="text-muted-foreground">Gerencie seus clientes</p>
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
                        <p className="text-sm font-medium text-muted-foreground">A Receber</p>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">R$ {totalToReceive.toFixed(2)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <p className="text-sm font-medium text-muted-foreground">Clientes com Pendências</p>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{customersWithDebt}</div>
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
                                placeholder="Buscar por nome, telefone ou CPF..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value)
                                    setCurrentPage(1)
                                }}
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Select value={filterType} onValueChange={(value) => { setFilterType(value); setCurrentPage(1); }}>
                                <SelectTrigger className="w-full sm:w-[200px]">
                                    <Filter className="mr-2 h-4 w-4" />
                                    <SelectValue placeholder="Filtrar por..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os clientes</SelectItem>
                                    <SelectItem value="with-debt">Com pendências</SelectItem>
                                    <SelectItem value="no-debt">Sem pendências</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={sortBy} onValueChange={(value) => { setSortBy(value); setCurrentPage(1); }}>
                                <SelectTrigger className="w-full sm:w-[200px]">
                                    <SelectValue placeholder="Ordenar por..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name">Nome (A-Z)</SelectItem>
                                    <SelectItem value="purchases-high">Maior compra total</SelectItem>
                                    <SelectItem value="purchases-low">Menor compra total</SelectItem>
                                    <SelectItem value="pending-high">Maior pendência</SelectItem>
                                    <SelectItem value="pending-low">Menor pendência</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {paginatedCustomers.map((customer) => (
                            <div
                                key={customer.id}
                                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex flex-1 items-center gap-4">
                                    <div className="flex-1 space-y-1">
                                        <h3 className="font-semibold">{customer.nome}</h3>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <Phone className="h-3.5 w-3.5" />
                                                {customer.telefone && customer.telefone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')}
                                            </div>
                                            {customer.cpf_cnpj && (
                                                <div>
                                                    {formatCpfCnpj(customer.cpf_cnpj)}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-6">
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground">Total Compras</p>
                                            <p className="text-sm font-semibold">R$ {customer.totalPurchases.toFixed(2)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground">Pendente</p>
                                            <p className={`text-sm font-semibold ${customer.pendingAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                R$ {customer.pendingAmount.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="ml-4 flex gap-2">
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
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t mt-4">
                            <p className="text-sm text-muted-foreground">
                                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredCustomers.length)} de {filteredCustomers.length} clientes
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                        let page
                                        if (totalPages <= 5) {
                                            page = i + 1
                                        } else if (currentPage <= 3) {
                                            page = i + 1
                                        } else if (currentPage >= totalPages - 2) {
                                            page = totalPages - 4 + i
                                        } else {
                                            page = currentPage - 2 + i
                                        }
                                        return (
                                            <Button
                                                key={page}
                                                variant={currentPage === page ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setCurrentPage(page)}
                                                className="w-8 h-8 p-0"
                                            >
                                                {page}
                                            </Button>
                                        )
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
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
