// app/admin/servicos/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@prodexy/ui'
import { CircleDollarSign, Search, Plus, Package, Image as ImageIcon, Trash2, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { ServicoDialog } from '@/components/servico-dialog'

export type ServicoRow = {
    id: string
    nome: string
    valor: number
}

export default function Page() {
    const [servicos, setServicos] = useState<ServicoRow[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [sortBy, setSortBy] = useState<'nome' | 'valor_maior' | 'valor_menor'>('nome')
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedServico, setSelectedServico] = useState<ServicoRow | null>(null)

    async function loadServicos() {
        setLoading(true)

        const { data, error } = await supabase
            .from('servicos')
            .select('id, nome, valor')
            .order('nome', { ascending: true })

        if (error) {
            console.error('Erro ao carregar serviços:', error)
            setServicos([])
            setLoading(false)
            return
        }

        const mappedServicos: ServicoRow[] = ((data as any[]) || []).map((servico) => ({
            id: servico.id,
            nome: servico.nome,
            valor: Number(servico.valor || 0),
        }))

        setServicos(mappedServicos)
        setLoading(false)
    }

    useEffect(() => {
        loadServicos()
    }, [])

    const filteredServicos = useMemo(() => {
        const filtered = servicos.filter((servico) =>
            servico.nome.toLowerCase().includes(searchTerm.toLowerCase())
        )

        return [...filtered].sort((a, b) => {
            if (sortBy === 'valor_maior') return b.valor - a.valor
            if (sortBy === 'valor_menor') return a.valor - b.valor
            return a.nome.localeCompare(b.nome)
        })
    }, [servicos, searchTerm, sortBy])

    const totalServicos = servicos.length
    const valorMedio =
        servicos.length > 0
            ? servicos.reduce((sum, servico) => sum + servico.valor, 0) / servicos.length
            : 0
    const servicoMaisCaro =
        servicos.length > 0
            ? Math.max(...servicos.map((servico) => servico.valor))
            : 0

    async function handleDelete(servico: ServicoRow) {
        const confirmed = window.confirm(`Deseja excluir o serviço "${servico.nome}"?`)
        if (!confirmed) return

        const { error } = await supabase
            .from('servicos')
            .delete()
            .eq('id', servico.id)

        if (error) {
            console.error('Erro ao excluir serviço:', error)
            return
        }

        await loadServicos()
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Serviços</h1>
                    <p className="text-muted-foreground">Cadastre e organize seus serviços.</p>
                </div>
                <Button
                    onClick={() => {
                        setSelectedServico(null)
                        setDialogOpen(true)
                    }}
                    className="gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Novo serviço
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <SummaryCard title="Total de serviços" value={totalServicos} icon={Package} />
                <SummaryCard title="Valor médio" value={valorMedio} icon={CircleDollarSign} isCurrency />
                <SummaryCard title="Maior valor" value={servicoMaisCaro} icon={CircleDollarSign} isCurrency />
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
                                placeholder="Buscar serviço por nome"
                            />
                        </div>
                        <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'nome' | 'valor_maior' | 'valor_menor')}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Ordenar por" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="nome">Nome (A-Z)</SelectItem>
                                <SelectItem value="valor_maior">Maior valor</SelectItem>
                                <SelectItem value="valor_menor">Menor valor</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {loading && <p className="text-sm text-muted-foreground">Carregando serviços...</p>}
                    {!loading && filteredServicos.length === 0 && (
                        <p className="text-sm text-muted-foreground">Nenhum serviço encontrado.</p>
                    )}
                    {filteredServicos.map((servico) => (
                        <div
                            key={servico.id}
                            className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                                    <CircleDollarSign className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="font-medium">{servico.nome}</p>
                                    <p className="mt-2 text-sm font-semibold">
                                        R$ {Number(servico.valor || 0).toFixed(2)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => {
                                        setSelectedServico(servico)
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
                                    onClick={() => handleDelete(servico)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Excluir
                                </Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <ServicoDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                servico={selectedServico}
                onSaved={loadServicos}
            />
        </div>
    )
}

function SummaryCard({ title, value, icon: Icon, isCurrency = false, }: {
    title: string
    value: number
    icon: any
    isCurrency?: boolean
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {isCurrency ? `R$ ${value.toFixed(2)}` : value}
                </div>
            </CardContent>
        </Card>
    )
}