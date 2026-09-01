import {
  getProductServiceTotal,
  type Product,
} from '@/features/products/domain/product'

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function formatCurrency(value: number): string {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('pt-BR')
}

function printValue(value: string | null | undefined): string {
  return escapeHtml(value?.trim() || '-')
}

function renderField(label: string, value: string): string {
  return `<div class="field"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`
}

export function buildProductLabelHtml(product: Product): string {
  const fields = [
    ['Nome da peça', printValue(product.nome)],
    ['Código', printValue(product.codigo)],
    ['Setor', printValue(product.setor)],
    ['Data do cadastro', escapeHtml(formatDate(product.criado_em))],
    ['Referência', printValue(product.referencia)],
    ['Marca', printValue(product.marca)],
    ['Função', printValue(product.funcao)],
    ['Aplicação', printValue(product.aplicacao)],
    ['Especificações', printValue(product.especificacoes)],
    ['Observações', printValue(product.observacoes)],
    ['Preço de venda', escapeHtml(formatCurrency(product.valor_unitario))],
    ['Mão de obra', escapeHtml(formatCurrency(product.mao_de_obra))],
    ['Valor total', escapeHtml(formatCurrency(getProductServiceTotal(product)))],
  ]

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Produto ${escapeHtml(product.codigo || product.nome)}</title>
  <style>
    @page { size: auto; margin: 2.5mm; }
    * { box-sizing: border-box; }
    html, body { width: 75mm; margin: 0; padding: 0; }
    body { color: #000; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 1.25; }
    .receipt { width: 75mm; padding: 0 1mm; }
    .field { padding: 1.3mm 0; border-bottom: 1px dotted #000; break-inside: avoid; }
    .field span { display: block; font-size: 7px; text-transform: uppercase; }
    .field strong { display: block; margin-top: .5mm; font-size: 10px; font-weight: 600; white-space: pre-wrap; overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <main class="receipt">${fields.map(([label, value]) => renderField(label, value)).join('')}</main>
</body>
</html>`
}

export function printProductLabel(product: Product): boolean {
  if (typeof window === 'undefined') return false
  const printWindow = window.open('', '_blank', 'width=420,height=760')
  if (!printWindow) return false

  printWindow.document.open()
  printWindow.document.write(buildProductLabelHtml(product))
  printWindow.document.close()
  printWindow.focus()
  printWindow.setTimeout(() => printWindow.print(), 100)
  return true
}
