'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button, Card, CardContent, CardHeader, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@prodexy/ui'
import { Search, Plus, Package, Trash2, Pencil, Wrench } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { ServicoDialog, type ServicoRow } from '@/components/servico-dialog'

export default function Page() {
  const [servicos, setServicos] = useState<ServicoRow[]>([])
  const [usageByService, setUsageByService] = useState<Record<string, number>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'nome' | 'mais_usados' | 'menos_usados'>('nome')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedServico, setSelectedServico] = useState<ServicoRow | null>(null)

  async function loadServicos() {
    setLoading(true)

    const [servicosRes, ordemServicosRes] = await Promise.all([
      supabase.from('servicos').select('id, nome').order('nome', { ascending: true }),
      supabase.from('ordem_servicos').select('servico_id'),
    ])

    if (servicosRes.error) {
      console.error('Erro ao carregar serviços:', servicosRes.error)
      setServicos([])
      setLoading(false)
      return
    }

    if (ordemServicosRes.error) console.error('Erro ao carregar uso de serviços:', ordemServicosRes.error)

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
    const filtered = servicos.filter((servico) => servico.nome.toLowerCase().includes(searchTerm.toLowerCase()))

    return [...filtered].sort((a, b) => {
      if (sortBy === 'mais_usados') return (usageByService[b.id] || 0) - (usageByService[a.id] || 0)
      if (sortBy === 'menos_usados') return (usageByService[a.id] || 0) - (usageByService[b.id] || 0)
      return a.nome.localeCompare(b.nome)
    })
  }, [servicos, searchTerm, sortBy, usageByService])

  const totalServicos = servicos.length
  const servicosUsados = Object.keys(usageByService).filter((id) => usageByService[id] > 0).length
  const totalVinculos = Object.values(usageByService).reduce((sum, count) => sum + count, 0)

  async function handleDelete(servico: ServicoRow) {
    const confirmed = window.confirm(`Deseja excluir o serviço "${servico.nome}"?`)
    if (!confirmed) return

    const { error } = await supabase.from('servicos').delete().eq('id', servico.id)
    if (error) {
      console.error('Erro ao excluir serviço:', error)
      alert('Erro ao excluir serviço. Ele pode estar vinculado a uma OS.')
      return
    }

    await loadServicos()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Serviços</h1>
          <p className="text-muted-foreground">Cadastre o catálogo de serviços por nome. Valores são definidos na OS.</p>
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
        <SummaryCard title="Total de serviços" value={String(totalServicos)} icon={Package} />
        <SummaryCard title="Serviços usados em OS" value={String(servicosUsados)} icon={Wrench} />
        <SummaryCard title="Vínculos em ordens" value={String(totalVinculos)} icon={Wrench} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchTerm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} className="pl-9" placeholder="Buscar serviço por nome" />
            </div>
            <Select value={sortBy} onValueChange={(value: string) => setSortBy(value as any)}>
              <SelectTrigger className="w-full sm:w-[190px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nome">Nome (A-Z)</SelectItem>
                <SelectItem value="mais_usados">Mais usados</SelectItem>
                <SelectItem value="menos_usados">Menos usados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Carregando serviços...</p>}
          {!loading && filteredServicos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum serviço encontrado.</p>}
          {filteredServicos.map((servico) => (
            <div key={servico.id} className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <Wrench className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{servico.nome}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{usageByService[servico.id] || 0} vínculo(s) em ordens de serviço</p>
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
        </CardContent>
      </Card>

      <ServicoDialog open={dialogOpen} onOpenChange={setDialogOpen} servico={selectedServico} onSaved={loadServicos} />
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
