export type PrintableOrder = {
  id: string
  numero: string
  status: string
  valor_total: number
  valor_final: number
  observacoes: string | null
  criado_em: string
  atualizado_em: string | null
  cliente_nome: string
  cliente_telefone: string
  cliente_cpf_cnpj?: string | null
  veiculo_placa: string | null
  veiculo_marca: string | null
  veiculo_modelo: string | null
  veiculo_ano: string | null
  veiculo_cor: string | null
  km_entrada?: number | null
  veiculo_tem_seguro?: boolean | null
  responsavel_nome?: string | null
  mao_de_obra?: number | null
  acrescimos?: number | null
  forma_pagamento?: string | null
  servicos: { id: string; nome: string; valor?: number; quantidade?: number | null; codigo_peca?: string | null; observacao?: string | null }[]
  diagnosticos: { id: string; descricao: string }[]
  fotos?: { id: string; foto_url: string }[]
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function formatMoney(value: number | null | undefined) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('pt-BR')
}

function getWorkshopData(order: PrintableOrder) {
  return {
    nome: process.env.NEXT_PUBLIC_OFICINA_NOME || 'Zequinha Pneus',
    cnpj: process.env.NEXT_PUBLIC_OFICINA_CNPJ || 'CNPJ não configurado',
    endereco: process.env.NEXT_PUBLIC_OFICINA_ENDERECO || 'Endereço não configurado',
    telefone: process.env.NEXT_PUBLIC_OFICINA_TELEFONE || order.cliente_telefone || 'Telefone não configurado',
  }
}

const LOGO_PATH = '/icon.jpg'

export function getOrderPrintLogoUrl(origin?: string) {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}${LOGO_PATH}`
}

export function buildOrderPrintHtml(order: PrintableOrder, logoUrl?: string) {
  const oficina = getWorkshopData(order)
  const logoSrc = logoUrl ?? getOrderPrintLogoUrl()
  const vehicle = [order.veiculo_marca, order.veiculo_modelo, order.veiculo_ano].filter(Boolean).join(' ')
  const servicesHtml = order.servicos.length
    ? order.servicos.map((item) => {
      const quantidade = Math.max(1, Number(item.quantidade || 1))
      const valorUnitario = Number(item.valor || 0)
      const valorLinha = valorUnitario * quantidade
      const parts = [
        `<strong>${escapeHtml(item.nome)} x${quantidade}</strong>`,
        item.codigo_peca ? `Código peça: ${escapeHtml(item.codigo_peca)}` : '',
        item.observacao ? `Obs: ${escapeHtml(item.observacao)}` : '',
        valorLinha > 0 ? `Valor: ${escapeHtml(formatMoney(valorLinha))}` : '',
      ].filter(Boolean)
      return `<li>${parts.join(' • ')}</li>`
    }).join('')
    : '<li>Nenhum serviço registrado.</li>'
  const diagnosticsHtml = order.diagnosticos.length
    ? order.diagnosticos.map((item) => `<li>${escapeHtml(item.descricao)}</li>`).join('')
    : '<li>Nenhum diagnóstico não autorizado registrado.</li>'
  const photosHtml = (order.fotos?.length ?? 0) > 0
    ? order.fotos!
      .map(
        (foto) =>
          `<figure class="photo-item"><img src="${escapeHtml(foto.foto_url)}" alt="Foto da OS" loading="eager" /></figure>`
      )
      .join('')
    : '<p class="muted">Nenhuma foto registrada.</p>'

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>OS ${escapeHtml(order.numero)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 0; font-size: 12px; line-height: 1.45; }
    .sheet { width: 100%; }
    .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 16px; }
    .brand-row { display: flex; align-items: center; gap: 12px; }
    .brand-logo { width: 72px; height: 72px; object-fit: contain; flex-shrink: 0; }
    .brand h1 { margin: 0 0 4px; font-size: 20px; }
    .muted { color: #4b5563; }
    .os-title { text-align: right; }
    .os-title h2 { margin: 0 0 6px; font-size: 18px; }
    .section { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; break-inside: avoid; }
    .section h3 { margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: .04em; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
    .label { color: #4b5563; font-size: 11px; display: block; }
    .value { font-weight: 700; }
    ul { margin: 6px 0 0 18px; padding: 0; }
    li { margin-bottom: 4px; }
    .total { display: flex; justify-content: space-between; align-items: center; font-size: 15px; font-weight: 700; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 34px; }
    .signature { border-top: 1px solid #111827; padding-top: 8px; text-align: center; }
    .terms { font-size: 11px; color: #374151; }
    .warranty-note { margin-top: 8px; font-weight: 600; }
    .photos-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 8px; }
    .photo-item { margin: 0; break-inside: avoid; page-break-inside: avoid; }
    .photo-item img { width: 100%; max-height: 200px; object-fit: cover; border: 1px solid #d1d5db; border-radius: 4px; display: block; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <main class="sheet">
    <div class="header">
      <div class="brand">
        <div class="brand-row">
          <img class="brand-logo" src="${escapeHtml(logoSrc)}" alt="${escapeHtml(oficina.nome)}" loading="eager" />
          <div>
            <h1>${escapeHtml(oficina.nome)}</h1>
            <div class="muted">${escapeHtml(oficina.cnpj)}</div>
            <div class="muted">${escapeHtml(oficina.endereco)}</div>
            <div class="muted">${escapeHtml(oficina.telefone)}</div>
          </div>
        </div>
      </div>
      <div class="os-title">
        <h2>Ordem de Serviço</h2>
        <div><strong>Nº:</strong> ${escapeHtml(order.numero)}</div>
        <div><strong>Status:</strong> ${escapeHtml(order.status)}</div>
        <div><strong>Responsável:</strong> ${escapeHtml(order.responsavel_nome || '-')}</div>
        <div><strong>Emitida em:</strong> ${escapeHtml(formatDate(order.atualizado_em || order.criado_em))}</div>
      </div>
    </div>

    <section class="section">
      <h3>Cliente</h3>
      <div class="grid">
        <div><span class="label">Nome</span><span class="value">${escapeHtml(order.cliente_nome)}</span></div>
        <div><span class="label">CPF/CNPJ</span><span class="value">${escapeHtml(order.cliente_cpf_cnpj || '-')}</span></div>
        <div><span class="label">Telefone</span><span class="value">${escapeHtml(order.cliente_telefone || '-')}</span></div>
      </div>
    </section>

    <section class="section">
      <h3>Veículo</h3>
      <div class="grid">
        <div><span class="label">Veículo</span><span class="value">${escapeHtml(vehicle || '-')}</span></div>
        <div><span class="label">Placa</span><span class="value">${escapeHtml(order.veiculo_placa || '-')}</span></div>
        <div><span class="label">Cor</span><span class="value">${escapeHtml(order.veiculo_cor || '-')}</span></div>
        <div><span class="label">KM entrada</span><span class="value">${escapeHtml(order.km_entrada ?? '-')}</span></div>
        <div><span class="label">Tem seguro?</span><span class="value">${order.veiculo_tem_seguro ? 'Sim' : 'Não'}</span></div>
      </div>
    </section>

    <section class="section">
      <h3>Serviços autorizados na OS</h3>
      <ul>${servicesHtml}</ul>
    </section>

    <section class="section">
      <h3>Diagnóstico / itens identificados não autorizados</h3>
      <p class="terms">Os itens abaixo foram identificados durante a avaliação, mas não foram autorizados pelo responsável no momento desta OS.</p>
      <p class="terms warranty-note">* A garantia dos serviços efetuados, só é validada mediante a execução do diagnóstico apresentado</p>
      <ul>${diagnosticsHtml}</ul>
    </section>

    <section class="section">
      <h3>Observações</h3>
      <p>${escapeHtml(order.observacoes || 'Sem observações.')}</p>
    </section>

    <section class="section">
      <h3>Fotos da OS</h3>
      <div class="photos-grid">${photosHtml}</div>
    </section>

    <section class="section">
      <h3>Pagamento</h3>
      <div class="grid">
        <div><span class="label">Forma de pagamento</span><span class="value">${escapeHtml(order.forma_pagamento || 'Não informado')}</span></div>
      </div>
    </section>

    <section class="section total">
      <span>Valor total da OS</span>
      <span>${formatMoney(order.valor_final || order.valor_total || 0)}</span>
    </section>

    <p class="terms">
      Declaro estar ciente dos serviços executados/autorizados, dos diagnósticos registrados e das condições descritas nesta ordem de serviço.
    </p>

    <div class="signatures">
      <div class="signature">Responsável pelo veículo</div>
      <div class="signature">Responsável pela oficina</div>
    </div>
  </main>
</body>
</html>`
}

function printWhenImagesReady(printWindow: Window) {
  const images = Array.from(printWindow.document.images)
  if (images.length === 0) {
    printWindow.print()
    return
  }

  let pending = images.length
  const tryPrint = () => {
    pending -= 1
    if (pending <= 0) printWindow.print()
  }

  for (const image of images) {
    if (image.complete) tryPrint()
    else {
      image.onload = tryPrint
      image.onerror = tryPrint
    }
  }
}

export function printOrder(order: PrintableOrder) {
  if (typeof window === 'undefined') return
  const printWindow = window.open('', '_blank', 'width=900,height=1200')
  if (!printWindow) return
  printWindow.document.open()
  printWindow.document.write(buildOrderPrintHtml(order, getOrderPrintLogoUrl(window.location.origin)))
  printWindow.document.close()
  printWindow.focus()
  printWhenImagesReady(printWindow)
}
