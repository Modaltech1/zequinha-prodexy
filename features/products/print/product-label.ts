import { brand } from '@/branding/brand'
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

function printValue(value: string | null): string {
  return escapeHtml(value?.trim() || '-')
}

export function buildProductLabelHtml(product: Product, origin = ''): string {
  const logoUrl = `${origin}${brand.logoUrl}`
  const photo = product.foto_url
    ? `<img class="product-photo" src="${escapeHtml(product.foto_url)}" alt="Foto do produto" />`
    : '<div class="photo-placeholder">SEM FOTO</div>'

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
    .label { width: 75mm; padding: 1mm; }
    .header { display: flex; align-items: center; gap: 2.5mm; border-bottom: 1.5px solid #000; padding-bottom: 2mm; }
    .logo { width: 12mm; height: 12mm; object-fit: contain; }
    .brand { flex: 1; }
    .brand strong { display: block; font-size: 13px; }
    .brand span { display: block; font-size: 8px; text-transform: uppercase; letter-spacing: .06em; }
    .title { margin: 2mm 0; text-align: center; font-size: 12px; font-weight: 800; text-transform: uppercase; }
    .photo-wrap { display: flex; justify-content: center; margin-bottom: 2mm; }
    .product-photo, .photo-placeholder { width: 34mm; height: 28mm; border: 1px solid #000; object-fit: contain; }
    .photo-placeholder { display: flex; align-items: center; justify-content: center; color: #555; font-size: 8px; }
    .primary { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #000; }
    .primary > div { padding: 1.4mm; border-right: 1px solid #000; }
    .primary > div:last-child { border-right: 0; }
    .field { padding: 1.2mm 0; border-bottom: 1px dashed #777; }
    .field:last-child { border-bottom: 0; }
    .field span, .primary span { display: block; font-size: 7px; font-weight: 700; text-transform: uppercase; }
    .field strong, .primary strong { display: block; margin-top: .5mm; font-size: 9px; overflow-wrap: anywhere; }
    .piece-name { font-size: 12px !important; }
    .financial { margin-top: 2mm; border: 1.5px solid #000; }
    .money-row { display: flex; justify-content: space-between; gap: 2mm; padding: 1.4mm; border-bottom: 1px solid #000; }
    .money-row:last-child { border-bottom: 0; }
    .money-row.total { font-size: 12px; font-weight: 800; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <main class="label">
    <header class="header">
      <img class="logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(brand.appName)}" />
      <div class="brand"><strong>${escapeHtml(brand.appName)}</strong><span>Discriminação do produto</span></div>
    </header>

    <h1 class="title">${escapeHtml(product.nome)}</h1>
    <div class="photo-wrap">${photo}</div>

    <section class="primary">
      <div><span>Código</span><strong>${printValue(product.codigo)}</strong></div>
      <div><span>Setor</span><strong>${printValue(product.setor)}</strong></div>
    </section>
    <div class="field"><span>Data do cadastro</span><strong>${escapeHtml(formatDate(product.criado_em))}</strong></div>
    <div class="field"><span>Nome da peça</span><strong class="piece-name">${printValue(product.nome)}</strong></div>
    <div class="field"><span>Referência</span><strong>${printValue(product.referencia)}</strong></div>
    <div class="field"><span>Marca</span><strong>${printValue(product.marca)}</strong></div>
    <div class="field"><span>Função</span><strong>${printValue(product.funcao)}</strong></div>
    <div class="field"><span>Aplicação</span><strong>${printValue(product.aplicacao)}</strong></div>
    <div class="field"><span>Especificações</span><strong>${printValue(product.especificacoes)}</strong></div>
    <div class="field"><span>Observações</span><strong>${printValue(product.observacoes)}</strong></div>

    <section class="financial">
      <div class="money-row"><span>Preço de venda</span><strong>${escapeHtml(formatCurrency(product.valor_unitario))}</strong></div>
      <div class="money-row"><span>Mão de obra</span><strong>${escapeHtml(formatCurrency(product.mao_de_obra))}</strong></div>
      <div class="money-row total"><span>Valor total</span><strong>${escapeHtml(formatCurrency(getProductServiceTotal(product)))}</strong></div>
    </section>

  </main>
</body>
</html>`
}

function printWhenImagesReady(printWindow: Window): void {
  const images = Array.from(printWindow.document.images)
  if (images.length === 0) {
    printWindow.print()
    return
  }

  let pending = images.length
  const finish = () => {
    pending -= 1
    if (pending <= 0) printWindow.print()
  }

  for (const image of images) {
    if (image.complete) finish()
    else {
      image.onload = finish
      image.onerror = finish
    }
  }
}

export function printProductLabel(product: Product): boolean {
  if (typeof window === 'undefined') return false
  const printWindow = window.open('', '_blank', 'width=420,height=760')
  if (!printWindow) return false

  printWindow.document.open()
  printWindow.document.write(buildProductLabelHtml(product, window.location.origin))
  printWindow.document.close()
  printWindow.focus()
  printWhenImagesReady(printWindow)
  return true
}
