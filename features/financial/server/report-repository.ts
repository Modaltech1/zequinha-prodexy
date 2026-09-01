import { brand } from '@/branding/brand'
import {
  FINANCIAL_ORDER_STATUSES,
  normalizeSearchText,
  summarizeFinancialOrders,
  UNASSIGNED_FILTER,
  type FinancialFilterOption,
  type FinancialLineItem,
  type FinancialOrder,
  type FinancialOrderStatus,
  type FinancialProductLineItem,
  type FinancialReport,
  type FinancialReportFilters,
} from '@/features/financial/domain/report'
import { isPartnerProductCode } from '@/features/products/domain/product'
import { formatOsNumber } from '@/lib/format-os-number'
import type { createSupabaseServerClient } from '@/lib/supabaseServer'

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

type OrderRow = {
  id: string
  numero: string | null
  cliente_id: string | null
  responsavel_id: string | null
  veiculo_placa: string | null
  veiculo_marca: string | null
  veiculo_modelo: string | null
  valor_total: number | string | null
  valor_final: number | string | null
  mao_de_obra: number | string | null
  acrescimos: number | string | null
  desconto: number | string | null
  forma_pagamento: string | null
  status: string | null
  criado_em: string
}

type CustomerRow = { id: string; nome: string | null }
type ProfileRow = { id: string; nome: string | null }

type ServiceItemRow = {
  os_id: string
  servico_id: string
  valor: number | string | null
  quantidade: number | string | null
}

type ProductItemRow = {
  os_id: string
  produto_id: string
  codigo_produto: string | null
  valor_custo: number | string | null
  valor_unitario: number | string | null
  quantidade: number | string | null
}

type CatalogRow = { id: string; nome: string | null }
type ProductCatalogRow = CatalogRow & {
  codigo: string | null
  valor_custo: number | string | null
}

const QUERY_PAGE_SIZE = 500
const MAX_REPORT_ORDERS = 5_000
const ID_BATCH_SIZE = 150
const PAYMENT_METHODS = [
  'Pix',
  'Dinheiro',
  'Cartão de débito',
  'Cartão de crédito',
  'Transferência',
  'Boleto',
  'Fiado',
  'A definir',
] as const

function toMoney(value: number | string | null | undefined): number {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

function toQuantity(value: number | string | null | undefined): number {
  const number = Number(value ?? 1)
  return Number.isFinite(number) && number > 0 ? number : 1
}

function toStatus(value: string | null): FinancialOrderStatus {
  if (!value) return 'sem_status'
  return FINANCIAL_ORDER_STATUSES.some((status) => status === value)
    ? value as FinancialOrderStatus
    : 'sem_status'
}

function toBrasiliaBoundary(date: string, endExclusive: boolean): string {
  const boundary = new Date(`${date}T00:00:00-03:00`)
  if (endExclusive) boundary.setUTCDate(boundary.getUTCDate() + 1)
  return boundary.toISOString()
}

function chunk<T>(values: T[], size = ID_BATCH_SIZE): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

async function loadOrderRows(
  supabase: SupabaseClient,
  filters: FinancialReportFilters
): Promise<{ rows: OrderRow[]; truncated: boolean }> {
  const rows: OrderRow[] = []

  for (let offset = 0; offset <= MAX_REPORT_ORDERS; offset += QUERY_PAGE_SIZE) {
    let query = supabase
      .from('ordens_de_servico')
      .select(
        'id,numero,cliente_id,responsavel_id,veiculo_placa,veiculo_marca,veiculo_modelo,valor_total,valor_final,mao_de_obra,acrescimos,desconto,forma_pagamento,status,criado_em'
      )
      .order('criado_em', { ascending: true })
      .range(offset, offset + QUERY_PAGE_SIZE - 1)

    if (filters.startDate) {
      query = query
        .gte('criado_em', toBrasiliaBoundary(filters.startDate, false))
        .lt('criado_em', toBrasiliaBoundary(filters.endDate, true))
    }
    if (filters.status === 'sem_status') {
      query = query.is('status', null)
    } else if (filters.status !== 'todos') {
      query = query.eq('status', filters.status)
    }
    if (filters.customerId) query = query.eq('cliente_id', filters.customerId)
    if (filters.responsibleId === UNASSIGNED_FILTER) {
      query = query.is('responsavel_id', null)
    } else if (filters.responsibleId) {
      query = query.eq('responsavel_id', filters.responsibleId)
    }
    if (filters.paymentMethod === UNASSIGNED_FILTER) {
      query = query.is('forma_pagamento', null)
    } else if (filters.paymentMethod) {
      query = query.eq('forma_pagamento', filters.paymentMethod)
    }

    const { data, error } = await query
    if (error) throw error

    const page = (data ?? []) as OrderRow[]
    rows.push(...page)
    if (page.length < QUERY_PAGE_SIZE) break
  }

  return {
    rows: rows.slice(0, MAX_REPORT_ORDERS),
    truncated: rows.length > MAX_REPORT_ORDERS,
  }
}

async function loadCustomerOptions(supabase: SupabaseClient): Promise<FinancialFilterOption[]> {
  const rows: CustomerRow[] = []

  for (let offset = 0; ; offset += QUERY_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('clientes')
      .select('id,nome')
      .order('nome', { ascending: true })
      .range(offset, offset + QUERY_PAGE_SIZE - 1)

    if (error) throw error
    const page = (data ?? []) as CustomerRow[]
    rows.push(...page)
    if (page.length < QUERY_PAGE_SIZE) break
  }

  return rows.map((customer) => ({
    id: customer.id,
    label: customer.nome?.trim() || 'Cliente sem nome',
  }))
}

async function loadResponsibleOptions(supabase: SupabaseClient): Promise<FinancialFilterOption[]> {
  const rows: ProfileRow[] = []

  for (let offset = 0; ; offset += QUERY_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('perfis')
      .select('id,nome')
      .eq('papel', 'colaborador')
      .eq('ativo', true)
      .order('nome', { ascending: true })
      .range(offset, offset + QUERY_PAGE_SIZE - 1)

    if (error) throw error
    const page = (data ?? []) as ProfileRow[]
    rows.push(...page)
    if (page.length < QUERY_PAGE_SIZE) break
  }

  return rows.map((profile) => ({
    id: profile.id,
    label: profile.nome?.trim() || 'Colaborador sem nome',
  }))
}

async function loadItems(
  supabase: SupabaseClient,
  orderIds: string[]
): Promise<{
  servicesByOrder: Map<string, FinancialLineItem[]>
  productsByOrder: Map<string, FinancialProductLineItem[]>
}> {
  const serviceRows: ServiceItemRow[] = []
  const productRows: ProductItemRow[] = []

  for (const ids of chunk(orderIds)) {
    const [services, products] = await Promise.all([
      supabase
        .from('ordem_servicos')
        .select('os_id,servico_id,valor,quantidade')
        .in('os_id', ids),
      supabase
        .from('ordem_produtos')
        .select('os_id,produto_id,codigo_produto,valor_custo,valor_unitario,quantidade')
        .in('os_id', ids),
    ])

    if (services.error) throw services.error
    if (products.error) throw products.error
    serviceRows.push(...(services.data ?? []) as ServiceItemRow[])
    productRows.push(...(products.data ?? []) as ProductItemRow[])
  }

  const serviceIds = Array.from(new Set(serviceRows.map((item) => item.servico_id)))
  const productIds = Array.from(new Set(productRows.map((item) => item.produto_id)))
  const serviceCatalog: CatalogRow[] = []
  const productCatalog: ProductCatalogRow[] = []

  await Promise.all([
    (async () => {
      for (const ids of chunk(serviceIds)) {
        const { data, error } = await supabase
          .from('servicos')
          .select('id,nome')
          .in('id', ids)
        if (error) throw error
        serviceCatalog.push(...(data ?? []) as CatalogRow[])
      }
    })(),
    (async () => {
      for (const ids of chunk(productIds)) {
        const { data, error } = await supabase
          .from('produtos')
          .select('id,nome,codigo,valor_custo')
          .in('id', ids)
        if (error) throw error
        productCatalog.push(...(data ?? []) as ProductCatalogRow[])
      }
    })(),
  ])

  const serviceNames = new Map(serviceCatalog.map((item) => [
    item.id,
    item.nome?.trim() || 'Serviço não identificado',
  ]))
  const productsCatalog = new Map(productCatalog.map((item) => [item.id, item]))
  const servicesByOrder = new Map<string, FinancialLineItem[]>()
  const productsByOrder = new Map<string, FinancialProductLineItem[]>()

  for (const item of serviceRows) {
    const quantity = toQuantity(item.quantidade)
    const values = servicesByOrder.get(item.os_id) || []
    values.push({
      id: item.servico_id,
      name: serviceNames.get(item.servico_id) || 'Serviço não identificado',
      quantity,
      total: toMoney(item.valor) * quantity,
    })
    servicesByOrder.set(item.os_id, values)
  }

  for (const item of productRows) {
    const quantity = toQuantity(item.quantidade)
    const catalogProduct = productsCatalog.get(item.produto_id)
    const code = item.codigo_produto?.trim() || catalogProduct?.codigo?.trim() || null
    const unitPrice = toMoney(item.valor_unitario)
    const unitCost = toMoney(item.valor_custo ?? catalogProduct?.valor_custo)
    const total = unitPrice * quantity
    const totalCost = unitCost * quantity
    const values = productsByOrder.get(item.os_id) || []
    values.push({
      id: item.produto_id,
      name: catalogProduct?.nome?.trim() || 'Produto não identificado',
      code,
      quantity,
      unitPrice,
      unitCost,
      total,
      totalCost,
      profit: total - totalCost,
      isPartnerProduct: isPartnerProductCode(code),
    })
    productsByOrder.set(item.os_id, values)
  }

  return { servicesByOrder, productsByOrder }
}

function buildVehicleLabel(order: OrderRow): string {
  return [order.veiculo_placa, order.veiculo_marca, order.veiculo_modelo]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(' ') || 'Veículo não informado'
}

function buildItemsLabel(services: FinancialLineItem[], products: FinancialProductLineItem[]): string {
  const labels = [
    ...services.map((item) => `${item.quantity}x ${item.name}`),
    ...products.map((item) => `${item.quantity}x ${item.code ? `${item.code} · ` : ''}${item.name}`),
  ]
  return labels.length > 0 ? labels.join('; ') : 'Sem itens vinculados'
}

function matchesSearch(order: FinancialOrder, search: string): boolean {
  if (!search) return true
  const searchable = normalizeSearchText([
    order.number,
    order.customerName,
    order.vehicleLabel,
    order.itemsLabel,
    order.responsibleName,
    order.paymentMethod,
  ].join(' '))
  return searchable.includes(normalizeSearchText(search))
}

export async function loadFinancialReport(input: {
  supabase: SupabaseClient
  filters: FinancialReportFilters
}): Promise<FinancialReport> {
  const { supabase, filters } = input
  const [orderResult, customers, responsibles] = await Promise.all([
    loadOrderRows(supabase, filters),
    loadCustomerOptions(supabase),
    loadResponsibleOptions(supabase),
  ])

  const { servicesByOrder, productsByOrder } = orderResult.rows.length > 0
    ? await loadItems(supabase, orderResult.rows.map((order) => order.id))
    : {
        servicesByOrder: new Map<string, FinancialLineItem[]>(),
        productsByOrder: new Map<string, FinancialProductLineItem[]>(),
      }
  const customerNames = new Map(customers.map((customer) => [customer.id, customer.label]))
  const responsibleNames = new Map(responsibles.map((responsible) => [responsible.id, responsible.label]))

  const orders = orderResult.rows.map<FinancialOrder>((row) => {
    const services = servicesByOrder.get(row.id) || []
    const products = productsByOrder.get(row.id) || []
    return {
      id: row.id,
      number: formatOsNumber(row.numero, row.id),
      createdAt: row.criado_em,
      customerId: row.cliente_id,
      customerName: row.cliente_id
        ? customerNames.get(row.cliente_id) || 'Cliente não identificado'
        : 'Cliente não identificado',
      vehicleLabel: buildVehicleLabel(row),
      status: toStatus(row.status),
      responsibleId: row.responsavel_id,
      responsibleName: row.responsavel_id
        ? responsibleNames.get(row.responsavel_id) || 'Responsável não identificado'
        : 'Não informado',
      paymentMethod: row.forma_pagamento?.trim() || 'Não informado',
      services,
      products,
      itemsLabel: buildItemsLabel(services, products),
      serviceTotal: services.reduce((total, item) => total + item.total, 0),
      productTotal: products.reduce((total, item) => total + item.total, 0),
      baseTotal: toMoney(row.valor_total),
      labor: toMoney(row.mao_de_obra),
      additions: toMoney(row.acrescimos),
      discount: toMoney(row.desconto),
      finalTotal: toMoney(row.valor_final ?? row.valor_total),
    }
  }).filter((order) => matchesSearch(order, filters.search))

  return {
    generatedAt: new Date().toISOString(),
    truncated: orderResult.truncated,
    company: {
      displayName: brand.appName,
      logoUrl: brand.logoUrl,
    },
    filters,
    filterOptions: {
      customers,
      responsibles,
      paymentMethods: [...PAYMENT_METHODS],
    },
    ...summarizeFinancialOrders(orders),
    orders,
  }
}
