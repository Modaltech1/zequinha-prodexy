'use client'

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@prodexy/ui'
import {
  getProductMargin,
  getProductMarginPercentage,
  getProductServiceTotal,
  isPartnerProductCode,
  type Product,
} from '@/features/products/domain/product'

type ProductDetailsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  onEdit: (product: Product) => void
  onPrint: (product: Product) => void
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('pt-BR')
}

function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-lg border bg-muted/20 p-3 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm font-medium text-foreground">{value || '-'}</dd>
    </div>
  )
}

export function ProductDetailsDialog({
  open,
  onOpenChange,
  product,
  onEdit,
  onPrint,
}: ProductDetailsDialogProps) {
  if (!product) return null

  const margin = getProductMargin(product)
  const marginPercentage = getProductMarginPercentage(product)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{product.nome}</DialogTitle>
          <DialogDescription>
            Código {product.codigo || 'não informado'}{isPartnerProductCode(product.codigo) ? ' · produto da parceria' : ''} · cadastrado em {formatDate(product.criado_em)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            {product.foto_url ? (
              <img
                src={product.foto_url}
                alt={`Foto de ${product.nome}`}
                className="aspect-square w-full rounded-xl border bg-white object-contain"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                Produto sem foto cadastrada
              </div>
            )}
            <div className="mt-3 rounded-xl border bg-muted/20 p-4 text-sm">
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Estoque</span><strong>{product.quantidade_estoque}</strong></div>
              <div className="mt-2 flex justify-between gap-3"><span className="text-muted-foreground">Setor</span><strong>{product.setor || '-'}</strong></div>
            </div>
          </div>

          <div className="space-y-5">
            <section>
              <h3 className="mb-3 text-sm font-semibold">Identificação e aplicação</h3>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Detail label="Referência" value={product.referencia || '-'} />
                <Detail label="Marca" value={product.marca || product.marca_modelo || '-'} />
                <Detail label="Função" value={product.funcao || '-'} wide />
                <Detail label="Aplicação" value={product.aplicacao || '-'} wide />
                <Detail label="Especificações" value={product.especificacoes || '-'} wide />
                <Detail label="Observações" value={product.observacoes || '-'} wide />
              </dl>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold">Valores</h3>
              <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <Detail label="Custo" value={formatCurrency(product.valor_custo)} />
                <Detail label="Preço de venda" value={formatCurrency(product.valor_unitario)} />
                <Detail label="Mão de obra" value={formatCurrency(product.mao_de_obra)} />
                <Detail label="Margem bruta" value={formatCurrency(margin)} />
                <Detail label="Margem percentual" value={`${marginPercentage.toFixed(1)}%`} />
                <Detail label="Produto + mão de obra" value={formatCurrency(getProductServiceTotal(product))} />
              </dl>
            </section>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t pt-4 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button type="button" variant="outline" onClick={() => onPrint(product)}>Imprimir etiqueta</Button>
          <Button type="button" onClick={() => onEdit(product)}>Editar produto</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
