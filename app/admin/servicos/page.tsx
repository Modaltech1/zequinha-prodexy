'use client'

import { useEffect, useMemo, useState } from 'react'
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
} from '@prodexy/ui'
import { Plus, Package, Trash2, Pencil, Wrench, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { AdminPage, AdminPageHeader } from '@/components/admin-page'
import { ListPagination } from '@/components/list-pagination'
import { ListFilterGroup, ListSearch, ListState, ListToolbar } from '@/components/list-toolbar'
import { ServicoDialog, type ServicoRow } from '@/components/servico-dialog'

export default function Page() {
  const [servicos, setServicos] = useState<ServicoRow[]>([])
  const [usageByService, setUsageByService] = useState<Record<string, number>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'periodic' | 'not-periodic'>('all')
  const [sortBy, setSortBy] = useState<'nome' | 'mais_usados' | 'menos_usados'>('nome')
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedServico, setSelectedServico] = useState<ServicoRow | null>(null)

  async function loadServicos() {
    setLoading(true)

    const [servicosRes, ordemServicosRes] = await Promise.all([
      supabase.from('servicos').select('id, nome, is_periodico, periodicidade_meses').order('nome', { ascending: true }),
      supabase.from('ordem_servicos').select('servico_id'),
    ])

    if (servicosRes.error) {
      console.error('Erro ao carregar serviÃ§os:', servicosRes.error)
      setServicos([])
      setLoading(false)
      return
    }

    if (ordemServicosRes.error) console.error('Erro ao carregar uso de serviÃ§os:', ordemServicosRes.error)

    const usage = ((ordemServicosRes.data || []) as { servico_id: string }[]).reduce<Record<string, number>>((acc, item) => {
      acc[item.servico_id] = (acc[item.servico_id] || 0) + 1
      return acc
    }, {})

    setServicos(((servicosRes.data as ServicoRow[]) || []))
    setUsageByService(usage)
    setLoading(false)
  }

  useEffect(() => {
    loadServicos()
  }, [])

  const filteredServicos = useMemo(() => {
    const filtered = servicos.filter((servico) => {
      const matchesSearch = servico.nome.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter =
        filterType === 'all'
          ? true
          : filterType === 'periodic'
            ? Boolean(servico.is_periodico)
            : !servico.is_periodico

      return matchesSearch && matchesFilter
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'mais_usados') return (usageByService[b.id] || 0) - (usageByService[a.id] || 0)
      if (sortBy === 'menos_usados') return (usageByService[a.id] || 0) - (usageByService[b.id] || 0)
      return a.nome.localeCompare(b.nome)
    })
  }, [servicos, searchTerm, filterType, sortBy, usageByService])

  const paginatedServicos = filteredServicos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const totalServicos = servicos.length
  const servicosPeriodicos = servicos.filter((servico) => servico.is_periodico).length
  const totalVinculos = Object.values(usageByService).reduce((sum: number, count) => sum + Number(count), 0)

  async function handleDelete(servico: ServicoRow) {
    const confirmed = window.confirm(`Deseja excluir o serviÃ§o "${servico.nome}"?`)
    if (!confirmed) return

    const { error } = await supabase.from('servicos').delete().eq('id', servico.id)
    if (error) {
      console.error('Erro ao excluir serviÃ§o:', error)
      alert('Erro ao excluir serviÃ§o. Ele pode estar vinculado a uma OS.')
      return
    }

    await loadServicos()
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="ServiÃ§os"
        description="Cadastre o catÃ¡logo de serviÃ§os e configure quais geram manutenÃ§Ã£o periÃ³dica."
        actions={
          <Button
            onClick={() => {
              setSelectedServico(null)
              setDialogOpen(true)
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo serviÃ§o
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Total de serviÃ§os" value={String(totalServicos)} icon={Package} />
        <SummaryCard title="ServiÃ§os periÃ³dicos" value={String(servicosPeriodicos)} icon={Wrench} />
        <SummaryCard title="VÃ­nculos em ordens" value={String(totalVinculos)} icon={Wrench} />
      </div>

      <Card>
        <CardHeader>
          <ListToolbar>
            <ListSearch
              value={searchTerm}
              onChange={(value) => {
                setSearchTerm(value)
                setCurrentPage(1)
              }}
              placeholder="Buscar serviÃ§o por nome..."
            />

            <ListFilterGroup>
              <Select value={filterType} onValueChange={(value: string) => { setFilterType(value as any); setCurrentPage(1) }}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filtrar por..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os serviÃ§os</SelectItem>
                  <SelectItem value="periodic">PeriÃ³dicos</SelectItem>
                  <SelectItem value="not-periodic">NÃ£o periÃ³dicos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: string) => { setSortBy(value as any); setCurrentPage(1) }}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Ordenar por..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nome">Nome (A-Z)</SelectItem>
                  <SelectItem value="mais_usados">Mais usados</SelectItem>
                  <SelectItem value="menos_usados">Menos usados</SelectItem>
                </SelectContent>
              </Select>
            </ListFilterGroup>
          </ListToolbar>
        </CardHeader>
        <CardContent className="space-y-3">
          <ListState
            loading={loading}
            loadingText="Carregando serviÃ§os..."
            empty={!loading && filteredServicos.length === 0}
            emptyText="Nenhum serviÃ§o encontrado."
          />

          {paginatedServicos.map((servico) => (
            <div key={servico.id} className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <Wrench className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{servico.nome}</p>
                    {servico.is_periodico ? (
                      <Badge variant="secondary">PeriÃ³dico â€¢ {servico.periodicidade_meses || 0} mÃªs(es)</Badge>
                    ) : (
                      <Badge variant="secondary">NÃ£o periÃ³dico</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{usageByService[servico.id] || 0} vÃ­nculo(s) em ordens de serviÃ§o</p>
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
                <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={() => handleDelete(servico)}>
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              </div>
            </div>
          ))}
          <ListPagination
            currentPage={currentPage}
            totalItems={filteredServicos.length}
            itemsPerPage={itemsPerPage}
            itemLabel="serviços"
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      <ServicoDialog open={dialogOpen} onOpenChange={setDialogOpen} servico={selectedServico} onSaved={loadServicos} />
    </AdminPage>
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