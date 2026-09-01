'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@prodexy/ui'
import {
  Boxes,
  CircleDollarSign,
  Filter,
  MoreHorizontal,
  Package,
  Plus,
  TrendingUp,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { AdminPage, AdminPageHeader } from '@/components/admin-page'
import tableStyles from '@/components/admin-data-table.module.css'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ListPagination } from '@/components/list-pagination'
import { ListFilterGroup, ListSearch, ListState, ListToolbar } from '@/components/list-toolbar'
import { ProductDialog } from '@/components/product-dialog'
import { ProductDetailsDialog } from '@/features/products/components/product-details-dialog'
import {
  PRODUCT_SELECT,
  getProductMargin,
  getProductMarginPercentage,
  getProductServiceTotal,
  isPartnerProductCode,
  matchesProductSearch,
  normalizeProduct,
  type Product,
  type ProductDatabaseRow,
} from '@/features/products/domain/product'
import { printProductLabel } from '@/features/products/print/product-label'
import { supabase } from '@/lib/supabaseClient'

type SortOption =
  | 'codigo'
  | 'nome'
  | 'setor'
  | 'estoque-maior'
  | 'estoque-menor'
  | 'venda-maior'
  | 'margem-maior'

type StockFilter = 'todos' | 'disponivel' | 'baixo' | 'zerado'
type Feedback = { type: 'success' | 'error'; message: string }

const ALL_SECTORS = '__all'
const ITEMS_PER_PAGE = 15

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0))
}

function getPhotoKey(product: Product): string {
  if (product.foto_chave) return product.foto_chave
  if (!product.foto_url) return ''
  try {
    const url = new URL(product.foto_url)
    return url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname
  } catch {
    return ''
  }
}

function StockBadge({ quantity }: { quantity: number }) {
  if (quantity <= 0) {
    return <Badge variant="destructive">Sem estoque</Badge>
  }
  if (quantity <= 2) {
    return <Badge variant="secondary" className="bg-amber-100 text-amber-900">Baixo · {quantity}</Badge>
  }
  return <Badge variant="secondary">{quantity} unidades</Badge>
}

function TableText({ value }: { value: string | null }) {
  const display = value?.trim() || '-'
  return <span className={tableStyles.cellText} title={display}>{display}</span>
}

function SummaryCard({ title, value, description, icon: Icon }: {
  title: string
  value: string
  description: string
  icon: LucideIcon
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></span>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold leading-tight">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export default function Page() {
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('codigo')
  const [sectorFilter, setSectorFilter] = useState(ALL_SECTORS)
  const [stockFilter, setStockFilter] = useState<StockFilter>('todos')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [stockUpdatingId, setStockUpdatingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setLoadError('')

    const { data, error } = await supabase
      .from('produtos')
      .select(PRODUCT_SELECT)
      .order('nome', { ascending: true })

    if (error) {
      console.error('Erro ao carregar produtos:', error)
      setProducts([])
      setLoadError('Não foi possível carregar o catálogo completo. Confirme a execução da migration de produtos no Supabase.')
      setLoading(false)
      return
    }

    setProducts(((data as unknown as ProductDatabaseRow[]) || []).map(normalizeProduct))
    setLoading(false)
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const sectors = useMemo(() => Array.from(new Set(
    products.map((product) => product.setor?.trim()).filter((sector): sector is string => Boolean(sector))
  )).sort((left, right) => left.localeCompare(right, 'pt-BR', { numeric: true })), [products])

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      if (!matchesProductSearch(product, searchTerm)) return false
      if (sectorFilter !== ALL_SECTORS && product.setor !== sectorFilter) return false
      if (stockFilter === 'zerado' && product.quantidade_estoque !== 0) return false
      if (stockFilter === 'baixo' && (product.quantidade_estoque <= 0 || product.quantidade_estoque > 2)) return false
      if (stockFilter === 'disponivel' && product.quantidade_estoque <= 0) return false
      return true
    })

    return [...filtered].sort((left, right) => {
      if (sortBy === 'estoque-maior') return right.quantidade_estoque - left.quantidade_estoque
      if (sortBy === 'estoque-menor') return left.quantidade_estoque - right.quantidade_estoque
      if (sortBy === 'venda-maior') return right.valor_unitario - left.valor_unitario
      if (sortBy === 'margem-maior') return getProductMargin(right) - getProductMargin(left)
      if (sortBy === 'setor') return (left.setor || '').localeCompare(right.setor || '', 'pt-BR', { numeric: true })
      if (sortBy === 'nome') return left.nome.localeCompare(right.nome, 'pt-BR')
      return (left.codigo || '').localeCompare(right.codigo || '', 'pt-BR', { numeric: true })
        || left.nome.localeCompare(right.nome, 'pt-BR')
    })
  }, [products, searchTerm, sectorFilter, stockFilter, sortBy])

  useEffect(() => {
    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, filteredProducts.length])

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const totals = useMemo(() => products.reduce((summary, product) => ({
    units: summary.units + product.quantidade_estoque,
    stockCost: summary.stockCost + product.quantidade_estoque * product.valor_custo,
    stockSale: summary.stockSale + product.quantidade_estoque * product.valor_unitario,
    stockMargin: summary.stockMargin + product.quantidade_estoque * getProductMargin(product),
  }), { units: 0, stockCost: 0, stockSale: 0, stockMargin: 0 }), [products])

  async function updateStock(product: Product, delta: number) {
    const nextStock = Math.max(0, product.quantidade_estoque + delta)
    if (nextStock === product.quantidade_estoque) return

    setStockUpdatingId(product.id)
    setFeedback(null)
    const { error } = await supabase
      .from('produtos')
      .update({ quantidade_estoque: nextStock, atualizado_em: new Date().toISOString() })
      .eq('id', product.id)

    if (error) {
      console.error('Erro ao atualizar estoque:', error)
      setFeedback({ type: 'error', message: 'Não foi possível atualizar o estoque.' })
    } else {
      setProducts((current) => current.map((item) => item.id === product.id
        ? { ...item, quantidade_estoque: nextStock }
        : item))
      setFeedback({ type: 'success', message: `Estoque de “${product.nome}” atualizado para ${nextStock}.` })
    }
    setStockUpdatingId(null)
  }

  function openDetails(product: Product) {
    setSelectedProduct(product)
    setDetailsOpen(true)
  }

  function openEdit(product: Product) {
    setDetailsOpen(false)
    setSelectedProduct(product)
    setDialogOpen(true)
  }

  function handlePrint(product: Product) {
    if (!printProductLabel(product)) {
      setFeedback({ type: 'error', message: 'O navegador bloqueou a janela de impressão. Permita pop-ups e tente novamente.' })
    }
  }

  async function confirmDeleteProduct() {
    if (!productToDelete) return
    setDeleteLoading(true)
    setFeedback(null)

    const deletedProduct = productToDelete
    const { error } = await supabase.from('produtos').delete().eq('id', deletedProduct.id)
    if (error) {
      console.error('Erro ao excluir produto:', error)
      setFeedback({ type: 'error', message: 'Não foi possível excluir o produto. Ele pode estar vinculado a uma OS.' })
      setDeleteLoading(false)
      return
    }

    const photoKey = getPhotoKey(deletedProduct)
    if (photoKey) {
      await fetch('/api/delete-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: photoKey }),
      }).catch(() => undefined)
    }

    setProducts((current) => current.filter((item) => item.id !== deletedProduct.id))
    setFeedback({ type: 'success', message: `Produto “${deletedProduct.nome}” excluído.` })
    setProductToDelete(null)
    setDeleteLoading(false)
  }

  function resetFilters() {
    setSearchTerm('')
    setSectorFilter(ALL_SECTORS)
    setStockFilter('todos')
    setSortBy('codigo')
    setCurrentPage(1)
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Produtos"
        description="Catálogo técnico e financeiro das peças, com controle de estoque e impressão térmica individual."
        actions={
          <Button onClick={() => { setSelectedProduct(null); setDialogOpen(true) }} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo produto
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title="Produtos cadastrados" value={String(products.length)} description="Itens distintos no catálogo" icon={Package} />
        <SummaryCard title="Unidades em estoque" value={String(totals.units)} description="Soma das quantidades atuais" icon={Boxes} />
        <SummaryCard title="Custo do estoque" value={formatCurrency(totals.stockCost)} description="Quantidade multiplicada pelo custo" icon={WalletCards} />
        <SummaryCard title="Venda potencial" value={formatCurrency(totals.stockSale)} description="Quantidade multiplicada pelo preço de venda" icon={CircleDollarSign} />
        <SummaryCard title="Margem potencial" value={formatCurrency(totals.stockMargin)} description="Venda potencial menos custo" icon={TrendingUp} />
      </div>

      <Card>
        <CardHeader>
          <ListToolbar>
            {feedback && (
              <p role="status" className={`rounded-lg border p-3 text-sm ${feedback.type === 'error'
                ? 'border-destructive/30 bg-destructive/5 text-destructive'
                : 'border-primary/20 bg-primary/5 text-foreground'}`}>
                {feedback.message}
              </p>
            )}
            {loadError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{loadError}</p>}

            <ListSearch
              value={searchTerm}
              onChange={(value) => { setSearchTerm(value); setCurrentPage(1) }}
              placeholder="Buscar por código, setor, peça, referência, marca ou aplicação..."
            />

            <ListFilterGroup>
              <Select value={sectorFilter} onValueChange={(value: string) => { setSectorFilter(value); setCurrentPage(1) }}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Setor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SECTORS}>Todos os setores</SelectItem>
                  {sectors.map((sector) => <SelectItem key={sector} value={sector}>Setor {sector}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={stockFilter} onValueChange={(value: string) => { setStockFilter(value as StockFilter); setCurrentPage(1) }}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Estoque" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todo o estoque</SelectItem>
                  <SelectItem value="disponivel">Com estoque</SelectItem>
                  <SelectItem value="baixo">Estoque baixo (1–2)</SelectItem>
                  <SelectItem value="zerado">Sem estoque</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: string) => { setSortBy(value as SortOption); setCurrentPage(1) }}>
                <SelectTrigger className="w-full sm:w-[210px]"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="codigo">Código</SelectItem>
                  <SelectItem value="nome">Nome da peça</SelectItem>
                  <SelectItem value="setor">Setor</SelectItem>
                  <SelectItem value="estoque-maior">Maior estoque</SelectItem>
                  <SelectItem value="estoque-menor">Menor estoque</SelectItem>
                  <SelectItem value="venda-maior">Maior preço de venda</SelectItem>
                  <SelectItem value="margem-maior">Maior margem</SelectItem>
                </SelectContent>
              </Select>

              <Button type="button" variant="outline" onClick={resetFilters}>Limpar filtros</Button>
            </ListFilterGroup>
          </ListToolbar>
        </CardHeader>

        <CardContent className="min-w-0 space-y-4">
          <p className="text-xs text-muted-foreground xl:hidden">Em telas menores, deslize somente a tabela para consultar as colunas financeiras.</p>
          <ListState loading={loading} loadingText="Carregando produtos..." empty={!loading && filteredProducts.length === 0} emptyText="Nenhum produto encontrado." />

          {!loading && filteredProducts.length > 0 && (
            <div className={tableStyles.tableScroller}>
              <table className={`${tableStyles.dataTable} ${tableStyles.productTable}`}>
                <thead>
                  <tr>
                    <th className={tableStyles.codeColumn}>Código</th>
                    <th className={tableStyles.sectorColumn}>Setor</th>
                    <th className={tableStyles.nameColumn}>Nome da peça</th>
                    <th className={tableStyles.brandColumn}>Marca</th>
                    <th className={tableStyles.stockColumn}>Estoque</th>
                    <th className={`${tableStyles.numeric} ${tableStyles.moneyColumn}`}>Custo</th>
                    <th className={`${tableStyles.numeric} ${tableStyles.moneyColumn}`}>Preço de venda</th>
                    <th className={`${tableStyles.numeric} ${tableStyles.moneyColumn}`}>Mão de obra</th>
                    <th className={`${tableStyles.numeric} ${tableStyles.moneyColumn}`}>Valor total</th>
                    <th className={`${tableStyles.numeric} ${tableStyles.marginColumn}`}>Margem</th>
                    <th className={tableStyles.actionsColumn}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((product) => {
                    const margin = getProductMargin(product)
                    const marginPercentage = getProductMarginPercentage(product)
                    const updatingStock = stockUpdatingId === product.id

                    return (
                      <tr key={product.id}>
                        <td className={`${tableStyles.codeColumn} font-semibold`}>
                          <span>{product.codigo || '-'}</span>
                          {isPartnerProductCode(product.codigo) && <Badge variant="secondary" className="mt-1 block w-fit text-[10px]">Parceria</Badge>}
                        </td>
                        <td className={tableStyles.sectorColumn}>{product.setor || '-'}</td>
                        <td className={tableStyles.nameColumn}><TableText value={product.nome} /></td>
                        <td className={tableStyles.brandColumn}><TableText value={product.marca || product.marca_modelo} /></td>
                        <td className={tableStyles.stockColumn}><StockBadge quantity={product.quantidade_estoque} /></td>
                        <td className={`${tableStyles.numeric} ${tableStyles.moneyColumn}`}>{formatCurrency(product.valor_custo)}</td>
                        <td className={`${tableStyles.numeric} ${tableStyles.moneyColumn} font-semibold`}>{formatCurrency(product.valor_unitario)}</td>
                        <td className={`${tableStyles.numeric} ${tableStyles.moneyColumn}`}>{formatCurrency(product.mao_de_obra)}</td>
                        <td className={`${tableStyles.numeric} ${tableStyles.moneyColumn} font-semibold`}>{formatCurrency(getProductServiceTotal(product))}</td>
                        <td className={`${tableStyles.numeric} ${tableStyles.marginColumn} ${margin < 0 ? 'text-destructive' : 'text-emerald-700'}`}>{formatCurrency(margin)}<br /><span className="text-xs">{marginPercentage.toFixed(1)}%</span></td>
                        <td className={tableStyles.actionsColumn}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Ações de ${product.nome}`} disabled={updatingStock}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuLabel>{product.codigo || product.nome}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openDetails(product)}>Ver informações</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrint(product)}>Imprimir etiqueta</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(product)}>Editar</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => updateStock(product, 1)}>Adicionar 1 ao estoque</DropdownMenuItem>
                              <DropdownMenuItem disabled={product.quantidade_estoque <= 0} onClick={() => updateStock(product, -1)}>Retirar 1 do estoque</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => setProductToDelete(product)}>Excluir</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <ListPagination currentPage={currentPage} totalItems={filteredProducts.length} itemsPerPage={ITEMS_PER_PAGE} itemLabel="produtos" onPageChange={setCurrentPage} />
        </CardContent>
      </Card>

      <ProductDialog open={dialogOpen} onOpenChange={setDialogOpen} produto={selectedProduct} onSaved={loadProducts} />
      <ProductDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} product={selectedProduct} onEdit={openEdit} onPrint={handlePrint} />

      <ConfirmDialog
        open={Boolean(productToDelete)}
        onOpenChange={(open) => { if (!open && !deleteLoading) setProductToDelete(null) }}
        title="Excluir produto"
        description={productToDelete ? `Deseja excluir “${productToDelete.nome}”? A exclusão será bloqueada se o produto estiver vinculado a uma ordem de serviço.` : ''}
        confirmLabel="Excluir produto"
        loading={deleteLoading}
        onConfirm={confirmDeleteProduct}
      />
    </AdminPage>
  )
}
