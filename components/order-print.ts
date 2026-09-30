export type PrintableOrder = {
  id: string
  numero: string
  status: string
  valor_total: number
  valor_final: number
  reclame?: string | null
  relatorio_tecnico?: string | null
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
  desconto?: number | null
  forma_pagamento?: string | null
  servicos: { id: string; nome: string; valor?: number; quantidade?: number | null; codigo_peca?: string | null; observacao?: string | null }[]
  produtos?: { id: string; nome: string; marca_modelo?: string | null; valor_unitario?: number; quantidade?: number | null; codigo?: string | null; observacao?: string | null }[]
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

function formatStatus(status: string | null | undefined) {
  const labels: Record<string, string> = {
    agendada: 'Agendada',
    aberta: 'Aberta',
    em_andamento: 'Em andamento',
    finalizada: 'Finalizada',
    cancelada: 'Cancelada',
  }

  return status ? labels[status] || status : '-'
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
      const details = [
        item.codigo_peca ? `Código: ${escapeHtml(item.codigo_peca)}` : '',
        item.observacao ? escapeHtml(item.observacao) : '',
      ].filter(Boolean).join(' | ')
      const detailHtml = details ? `<span class="item-detail">${details}</span>` : ''
      const priceHtml = valorLinha > 0 ? escapeHtml(formatMoney(valorLinha)) : '-'
      return `<tr><td><strong>${escapeHtml(item.nome)}</strong> <span class="quantity">x${quantidade}</span>${detailHtml}</td><td class="money">${priceHtml}</td></tr>`
    }).join('')
    : '<tr><td colspan="2" class="empty-row">Nenhum serviço registrado.</td></tr>'
  const productsHtml = (order.produtos?.length ?? 0) > 0
    ? order.produtos!.map((item) => {
      const quantidade = Math.max(1, Number(item.quantidade || 1))
      const valorUnitario = Number(item.valor_unitario || 0)
      const valorLinha = valorUnitario * quantidade
      const details = [
        item.marca_modelo ? escapeHtml(item.marca_modelo) : '',
        item.codigo ? `Código: ${escapeHtml(item.codigo)}` : '',
        item.observacao ? escapeHtml(item.observacao) : '',
      ].filter(Boolean).join(' | ')
      const detailHtml = details ? `<span class="item-detail">${details}</span>` : ''
      const priceHtml = valorLinha > 0 ? escapeHtml(formatMoney(valorLinha)) : '-'
      return `<tr><td><strong>${escapeHtml(item.nome)}</strong> <span class="quantity">x${quantidade}</span>${detailHtml}</td><td class="money">${priceHtml}</td></tr>`
    }).join('')
    : ''
  const diagnosticsHtml = order.diagnosticos
    .map((item) => `<li>${escapeHtml(item.descricao)}</li>`)
    .join('')
  const photosHtml = (order.fotos?.length ?? 0) > 0
    ? order.fotos!
      .map(
        (foto) =>
          `<figure class="photo-item"><img src="${escapeHtml(foto.foto_url)}" alt="Foto da OS" loading="eager" /></figure>`
      )
      .join('')
    : ''

  const serviceNarrativeSections = [
    order.reclame
      ? `<section class="section note-section"><h3>Reclame</h3><p>${escapeHtml(order.reclame)}</p></section>`
      : '',
    order.relatorio_tecnico
      ? `<section class="section note-section"><h3>Relatório técnico</h3><p>${escapeHtml(order.relatorio_tecnico)}</p></section>`
      : '',
  ].filter(Boolean).join('')
  const observationsSection = order.observacoes
    ? `<section class="section note-section"><h3>Observações</h3><p>${escapeHtml(order.observacoes)}</p></section>`
    : ''

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>OS ${escapeHtml(order.numero)}</title>
  <style>
    @page { size: A4; margin: 7mm; }
    * { box-sizing: border-box; }
    html, body { width: 100%; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 11px; line-height: 1.3; }
    .sheet { width: 196mm; margin: 0 auto; transform-origin: top left; }
    .header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #111827; padding-bottom: 7px; margin-bottom: 7px; }
    .brand-row { display: flex; align-items: center; gap: 10px; }
    .brand-logo { width: 50px; height: 50px; object-fit: contain; flex-shrink: 0; }
    .brand h1 { margin: 0 0 2px; font-size: 18px; letter-spacing: -.02em; }
    .muted { color: #4b5563; }
    .os-title { text-align: right; }
    .os-title h2 { margin: 0 0 3px; font-size: 17px; letter-spacing: -.01em; }
    .summary-grid, .items-grid, .notes-grid, .closing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start; }
    .items-grid > .section:only-child, .notes-grid > .section:only-child { grid-column: 1 / -1; }
    .section { padding: 0; margin-bottom: 8px; break-inside: avoid; page-break-inside: avoid; }
    .section h3 { margin: 0 0 5px; padding-bottom: 3px; border-bottom: 1px solid #9ca3af; font-size: 10.5px; text-transform: uppercase; letter-spacing: .055em; }
    .section p { margin: 0; white-space: pre-wrap; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; }
    .label { color: #4b5563; font-size: 9px; display: block; }
    .value { font-weight: 700; }
    ul { margin: 3px 0 0 16px; padding: 0; }
    li { margin-bottom: 3px; }
    li:last-child { margin-bottom: 0; }
    .items-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .items-table td { padding: 3px 0; vertical-align: top; border-bottom: 1px solid #e5e7eb; }
    .items-table tr:last-child td { border-bottom: 0; }
    .items-table .money { width: 86px; padding-left: 10px; text-align: right; white-space: nowrap; font-weight: 700; }
    .quantity { color: #4b5563; font-weight: 700; }
    .item-detail { display: block; margin-top: 1px; color: #4b5563; font-size: 9.5px; }
    .empty-row { color: #4b5563; }
    .financial-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; }
    .financial-row:last-child { margin-bottom: 0; }
    .financial-row.discount { color: #b91c1c; }
    .financial-row.final { border-top: 1px solid #9ca3af; margin-top: 4px; padding-top: 4px; font-size: 12px; font-weight: 700; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; margin-top: 20px; }
    .signature { border-top: 1px solid #111827; padding-top: 5px; text-align: center; }
    .terms { font-size: 9px; line-height: 1.25; color: #374151; }
    .legal-section { margin-top: 2px; }
    .legal-copy { width: 100%; }
    .legal-section .terms { margin: 0 0 3px; text-align: justify; break-inside: avoid; }
    .legal-section .terms:last-child { margin-bottom: 0; }
    .warranty-note { margin-top: 4px !important; font-weight: 600; }
    .photos-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; margin-top: 4px; }
    .photo-item { margin: 0; break-inside: avoid; page-break-inside: avoid; }
    .photo-item img { width: 100%; height: 60px; object-fit: cover; border: 1px solid #d1d5db; display: block; }
    .declaration { margin: 1px 0 7px; }
    @media print {
      .no-print { display: none; }
      html, body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
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
        <div><strong>Status:</strong> ${escapeHtml(formatStatus(order.status))}</div>
        <div><strong>Responsável:</strong> ${escapeHtml(order.responsavel_nome || '-')}</div>
        <div><strong>Emitida em:</strong> ${escapeHtml(formatDate(order.atualizado_em || order.criado_em))}</div>
      </div>
    </div>

    <div class="summary-grid">
      <section class="section">
        <h3>Cliente</h3>
        <div class="grid">
          <div><span class="label">Nome</span><span class="value">${escapeHtml(order.cliente_nome)}</span></div>
          ${order.cliente_cpf_cnpj ? `<div><span class="label">CPF/CNPJ</span><span class="value">${escapeHtml(order.cliente_cpf_cnpj)}</span></div>` : ''}
          ${order.cliente_telefone ? `<div><span class="label">Telefone</span><span class="value">${escapeHtml(order.cliente_telefone)}</span></div>` : ''}
        </div>
      </section>

      <section class="section">
        <h3>Veículo</h3>
        <div class="grid">
          ${vehicle ? `<div><span class="label">Veículo</span><span class="value">${escapeHtml(vehicle)}</span></div>` : ''}
          ${order.veiculo_placa ? `<div><span class="label">Placa</span><span class="value">${escapeHtml(order.veiculo_placa)}</span></div>` : ''}
          ${order.veiculo_cor ? `<div><span class="label">Cor</span><span class="value">${escapeHtml(order.veiculo_cor)}</span></div>` : ''}
          ${order.km_entrada != null ? `<div><span class="label">KM entrada</span><span class="value">${escapeHtml(order.km_entrada)}</span></div>` : ''}
          <div><span class="label">Tem seguro?</span><span class="value">${order.veiculo_tem_seguro ? 'Sim' : 'Não'}</span></div>
        </div>
      </section>
    </div>

    <div class="items-grid">
      <section class="section">
        <h3>Serviços autorizados</h3>
        <table class="items-table"><tbody>${servicesHtml}</tbody></table>
      </section>
      ${(order.produtos?.length ?? 0) > 0 ? `<section class="section"><h3>Produtos vendidos</h3><table class="items-table"><tbody>${productsHtml}</tbody></table></section>` : ''}
    </div>

    ${order.diagnosticos.length > 0 ? `<section class="section"><h3>Diagnóstico / itens não autorizados</h3><p class="terms">Itens identificados na avaliação e não autorizados pelo responsável nesta OS.</p><p class="terms warranty-note">* A garantia dos serviços efetuados só é validada mediante a execução do diagnóstico apresentado.</p><ul>${diagnosticsHtml}</ul></section>` : ''}

    ${serviceNarrativeSections ? `<div class="notes-grid">${serviceNarrativeSections}</div>` : ''}

    ${observationsSection}

    ${photosHtml ? `<section class="section"><h3>Fotos da OS</h3><div class="photos-grid">${photosHtml}</div></section>` : ''}

    <div class="closing-grid">
    <section class="section">
      <h3>Pagamento</h3>
      <div class="grid">
        <div><span class="label">Forma de pagamento</span><span class="value">${escapeHtml(order.forma_pagamento || 'Não informado')}</span></div>
        <div><span class="label">Desconto</span><span class="value">- ${formatMoney(order.desconto || 0)}</span></div>
      </div>
    </section>

    <section class="section">
      <h3>Resumo financeiro</h3>
      <div class="financial-row">
        <span>Mão de obra</span>
        <strong>${formatMoney(Number(order.mao_de_obra || 0))}</strong>
      </div>
      <div class="financial-row">
        <span>Valor antes do desconto</span>
        <strong>${formatMoney(Number(order.valor_final || 0) + Number(order.desconto || 0))}</strong>
      </div>
      <div class="financial-row discount">
        <span>Desconto aplicado</span>
        <strong>- ${formatMoney(order.desconto || 0)}</strong>
      </div>
      <div class="financial-row final">
        <span>Valor final da OS</span>
        <span>${formatMoney(order.valor_final || order.valor_total || 0)}</span>
      </div>
    </section>
    </div>

    <p class="terms declaration">
      Declaro estar ciente dos serviços executados/autorizados, dos diagnósticos registrados e das condições descritas nesta ordem de serviço.
    </p>

    <section class="section legal-section">
      <h3>Informa&ccedil;&otilde;es sobre pe&ccedil;as, nota fiscal e garantia</h3>
      <div class="legal-copy">
      <p class="terms">
        As pe&ccedil;as aplicadas nesta ordem de servi&ccedil;o s&atilde;o adquiridas por esta empresa diretamente junto a seus fornecedores, conforme crit&eacute;rio t&eacute;cnico e necessidade do servi&ccedil;o. A nota fiscal de compra emitida pelo fornecedor integra os controles internos da empresa e n&atilde;o &eacute; fornecida ao cliente.
      </p>
      <p class="terms">
        O cliente receber&aacute;, como documento fiscal v&aacute;lido e &uacute;nico desta contrata&ccedil;&atilde;o, a Nota Fiscal de Servi&ccedil;os e Produtos vinculada a esta ordem de servi&ccedil;o.
      </p>
      <p class="terms">
        Em cumprimento ao C&oacute;digo de Defesa do Consumidor, esta empresa assume integral responsabilidade pela escolha, qualidade, instala&ccedil;&atilde;o e garantia das pe&ccedil;as aplicadas, bem como pela execu&ccedil;&atilde;o dos servi&ccedil;os realizados, preservados todos os direitos do cliente, inclusive a garantia legal de 90 dias sobre m&atilde;o de obra e pe&ccedil;as instaladas.
      </p>
      </div>
    </section>

    <div class="signatures">
      <div class="signature">Responsável pelo veículo</div>
      <div class="signature">Responsável pela oficina</div>
    </div>
  </main>
  <script>
    function fitOrderToSinglePage() {
      var sheet = document.querySelector('.sheet');
      if (!sheet) return;
      var pageWidthMm = 196;
      var pageHeightMm = 281;
      sheet.style.zoom = '1';
      sheet.style.width = pageWidthMm + 'mm';

      var probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:' + pageHeightMm + 'mm;';
      document.body.appendChild(probe);
      var printableHeight = probe.getBoundingClientRect().height;
      probe.remove();

      var contentHeight = sheet.getBoundingClientRect().height;
      if (contentHeight <= printableHeight) return;

      var scale = printableHeight / contentHeight;
      for (var attempt = 0; attempt < 4; attempt += 1) {
        sheet.style.zoom = String(scale);
        sheet.style.width = (pageWidthMm / scale) + 'mm';
        contentHeight = sheet.getBoundingClientRect().height;
        if (contentHeight <= printableHeight) break;
        scale = scale * (printableHeight / contentHeight) * 0.995;
      }
    }
    window.addEventListener('beforeprint', fitOrderToSinglePage);
    window.addEventListener('load', fitOrderToSinglePage);
  </script>
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
