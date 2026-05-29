'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
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
import { Boxes, DollarSign, Filter, Minus, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { ListPagination } from '@/components/list-pagination'
import { ProductDialog, type ProdutoRow } from '@/components/product-dialog'
import { supabase } from '@/lib/supabaseClient'

type SortOption = 'nome' | 'estoque-maior' | 'estoque-menor' | 'valor-maior' | 'valor-menor'

type ProdutoDbRow = Omit<ProdutoRow, 'quantidade_estoque' | 'valor_unitario'> & {
  quantidade_estoque: number | string | null
  valor_unitario: number | string | null
}

function normalizeProduct(row: ProdutoDbRow): ProdutoRow {
  return {
    ...row,
    quantidade_estoque: Number(row.quantidade_estoque || 0),
    valor_unitario: Number(row.valor_unitario || 0),
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0))
}

export default function Page() {
  const [produtos, setProdutos] = useState<ProdutoRow[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('nome')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProduto, setSelectedProduto] = useState<ProdutoRow | null>(null)
  const [stockUpdatingId, setStockUpdatingId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  async function loadProdutos() {
    setLoading(true)

    const { data, error } = await supabase
      .from('produtos')
      .select('id,nome,marca_modelo,codigo,quantidade_estoque,valor_unitario,atualizado_em')
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao carregar produtos:', error)
      setProdutos([])
      setLoading(false)
      return
    }

    setProdutos(((data as ProdutoDbRow[]) || []).map(normalizeProduct))
    setLoading(false)
  }

  useEffect(() => {
    loadProdutos()
  }, [])

  const filteredProdutos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const filtered = produtos.filter((produto) => {
      if (!term) return true

      return [
        produto.nome,
        produto.marca_modelo || '',
        produto.codigo || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'estoque-maior') return b.quantidade_estoque - a.quantidade_estoque
      if (sortBy === 'estoque-menor') return a.quantidade_estoque - b.quantidade_estoque
      if (sortBy === 'valor-maior') return b.valor_unitario - a.valor_unitario
      if (sortBy === 'valor-menor') return a.valor_unitario - b.valor_unitario
      return a.nome.localeCompare(b.nome)
    })
  }, [produtos, searchTerm, sortBy])

  const totalProdutos = produtos.length
  const totalEstoque = produtos.reduce((sum, produto) => sum + produto.quantidade_estoque, 0)
  const valorEmEstoque = produtos.reduce(
    (sum, produto) => sum + produto.quantidade_estoque * produto.valor_unitario,
    0
  )
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProdutos = filteredProdutos.slice(startIndex, endIndex)

  useEffect(() => {
    const nextTotalPages = Math.ceil(filteredProdutos.length / itemsPerPage) || 1
    if (currentPage > nextTotalPages) setCurrentPage(nextTotalPages)
  }, [currentPage, filteredProdutos.length])

  async function updateStock(produto: ProdutoRow, delta: number) {
    const nextStock = Math.max(0, produto.quantidade_estoque + delta)
    if (nextStock === produto.quantidade_estoque) return

    setStockUpdatingId(produto.id)

    const { error } = await supabase
      .from('produtos')
      .update({
        quantidade_estoque: nextStock,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', produto.id)

    if (error) {
      console.error('Erro ao atualizar estoque:', error)
      alert('Erro ao atualizar estoque do produto.')
      setStockUpdatingId(null)
      return
    }

    setProdutos((current) =>
      current.map((item) =>
        item.id === produto.id ? { ...item, quantidade_estoque: nextStock } : item
      )
    )
    setStockUpdatingId(null)
  }

  async function handleDelete(produto: ProdutoRow) {
    const confirmed = window.confirm(`Deseja excluir o produto "${produto.nome}"?`)
    if (!confirmed) return

    const { error } = await supabase.from('produtos').delete().eq('id', produto.id)
    if (error) {
      console.error('Erro ao excluir produto:', error)
      alert('Erro ao excluir produto.')
      return
    }

    await loadProdutos()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground">Controle o catálogo de produtos e ajuste o estoque da loja.</p>
        </div>
        <Button
          onClick={() => {
            setSelectedProduto(null)
            setDialogOpen(true)
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo produto
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Total de produtos" value={String(totalProdutos)} icon={Package} />
        <SummaryCard title="Unidades em estoque" value={String(totalEstoque)} icon={Boxes} />
        <SummaryCard title="Valor em estoque" value={formatCurrency(valorEmEstoque)} icon={DollarSign} />
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-9"
                placeholder="Buscar produto por nome, marca/modelo ou código..."
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={sortBy}
                onValueChange={(value: string) => {
                  setSortBy(value as SortOption)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-[240px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Ordenar por..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nome">Nome (A-Z)</SelectItem>
                  <SelectItem value="estoque-maior">Maior estoque</SelectItem>
                  <SelectItem value="estoque-menor">Menor estoque</SelectItem>
                  <SelectItem value="valor-maior">Maior valor</SelectItem>
                  <SelectItem value="valor-menor">Menor valor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Carregando produtos...</p>}
          {!loading && filteredProdutos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>}

          {paginatedProdutos.map((produto) => {
            const rowUpdating = stockUpdatingId === produto.id
            const itemTotal = produto.quantidade_estoque * produto.valor_unitario

            return (
              <div key={produto.id} className="flex flex-col gap-4 rounded-xl border p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{produto.nome}</p>
                      {produto.marca_modelo && <Badge variant="secondary">{produto.marca_modelo}</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>Código: {produto.codigo || '-'}</span>
                      <span>Unitário: {formatCurrency(produto.valor_unitario)}</span>
                      <span>Total: {formatCurrency(itemTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex h-10 items-center overflow-hidden rounded-md border">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-none"
                      aria-label={`Diminuir estoque de ${produto.nome}`}
                      disabled={rowUpdating || produto.quantidade_estoque <= 0}
                      onClick={() => updateStock(produto, -1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="flex h-10 min-w-14 items-center justify-center border-x px-4 text-sm font-semibold">
                      {produto.quantidade_estoque}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-none"
                      aria-label={`Aumentar estoque de ${produto.nome}`}
                      disabled={rowUpdating}
                      onClick={() => updateStock(produto, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setSelectedProduto(produto)
                        setDialogOpen(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={() => handleDelete(produto)}>
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}

          <ListPagination
            currentPage={currentPage}
            totalItems={filteredProdutos.length}
            itemsPerPage={itemsPerPage}
            itemLabel="produtos"
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      <ProductDialog open={dialogOpen} onOpenChange={setDialogOpen} produto={selectedProduto} onSaved={loadProdutos} />
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
