export const FINANCIAL_ORDER_STATUSES = [
  'agendada',
  'aberta',
  'em_andamento',
  'sem_status',
  'finalizada',
  'cancelada',
] as const

export type FinancialOrderStatus = (typeof FINANCIAL_ORDER_STATUSES)[number]
export type FinancialStatusFilter = FinancialOrderStatus | 'todos'

export const UNASSIGNED_FILTER = '__none'

export type FinancialReportFilters = {
  startDate: string
  endDate: string
  status: FinancialStatusFilter
  customerId: string
  responsibleId: string
  paymentMethod: string
  search: string
}

export type FinancialFilterOption = { id: string; label: string }

export type FinancialLineItem = {
  id: string
  name: string
  quantity: number
  total: number
}

export type FinancialProductLineItem = FinancialLineItem & {
  code: string | null
  unitPrice: number
  unitCost: number
  totalCost: number
  profit: number
  isPartnerProduct: boolean
}

export type FinancialOrder = {
  id: string
  number: string
  createdAt: string
  customerId: string | null
  customerName: string
  vehicleLabel: string
  status: FinancialOrderStatus
  responsibleId: string | null
  responsibleName: string
  paymentMethod: string
  services: FinancialLineItem[]
  products: FinancialProductLineItem[]
  itemsLabel: string
  serviceTotal: number
  productTotal: number
  baseTotal: number
  labor: number
  additions: number
  discount: number
  finalTotal: number
}

export type FinancialSummary = {
  totalOrders: number
  finalizedOrders: number
  openOrders: number
  cancelledOrders: number
  uniqueCustomers: number
  serviceTotal: number
  productTotal: number
  baseTotal: number
  laborTotal: number
  additionsTotal: number
  discountTotal: number
  finalTotal: number
  averageTicket: number
}

export type FinancialStatusSummary = {
  status: FinancialOrderStatus
  label: string
  count: number
  percentage: number
  finalTotal: number
}

export type CustomerLaborSummary = {
  customerId: string | null
  customerName: string
  orderCount: number
  laborTotal: number
  finalTotal: number
  averageTicket: number
}

export type ResponsibleLaborSummary = {
  responsibleId: string | null
  responsibleName: string
  orderCount: number
  laborTotal: number
  finalTotal: number
  averageTicket: number
}

export type ProductSalesSummary = {
  productId: string
  productName: string
  productCode: string | null
  isPartnerProduct: boolean
  orderCount: number
  quantity: number
  revenue: number
  cost: number
  profit: number
  partnerTransfer: number
  averageUnitPrice: number
}

export type PartnerProductTransferSummary = {
  productId: string
  productName: string
  productCode: string
  orderCount: number
  quantity: number
  revenue: number
  cost: number
  profit: number
  costShare: number
  profitShare: number
  transferTotal: number
}

export type PartnerTransferSummary = {
  eligibleOrderCount: number
  productCount: number
  quantity: number
  revenue: number
  cost: number
  profit: number
  costShare: number
  profitShare: number
  transferTotal: number
  products: PartnerProductTransferSummary[]
}

export type FinancialReport = {
  generatedAt: string
  truncated: boolean
  company: { displayName: string; logoUrl: string }
  filters: FinancialReportFilters
  filterOptions: {
    customers: FinancialFilterOption[]
    responsibles: FinancialFilterOption[]
    paymentMethods: string[]
  }
  summary: FinancialSummary
  statusSummary: FinancialStatusSummary[]
  laborByCustomer: CustomerLaborSummary[]
  laborByResponsible: ResponsibleLaborSummary[]
  productSales: ProductSalesSummary[]
  partnerTransfer: PartnerTransferSummary
  orders: FinancialOrder[]
}

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ACTIVE_STATUSES = new Set<FinancialOrderStatus>([
  'agendada',
  'aberta',
  'em_andamento',
  'sem_status',
])

export const PARTNER_COST_SHARE_RATE = 0.8
export const PARTNER_PROFIT_SHARE_RATE = 0.1

export const FINANCIAL_STATUS_LABELS: Record<FinancialOrderStatus, string> = {
  agendada: 'Agendada',
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  sem_status: 'Sem status',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

function readParam(params: URLSearchParams, name: string, maxLength: number): string {
  return (params.get(name) || '').trim().slice(0, maxLength)
}

export function parseFinancialReportFilters(
  params: URLSearchParams
): ValidationResult<FinancialReportFilters> {
  const startDate = readParam(params, 'startDate', 10)
  const endDate = readParam(params, 'endDate', 10)
  const status = readParam(params, 'status', 30) || 'todos'
  const customerId = readParam(params, 'customerId', 50)
  const responsibleId = readParam(params, 'responsibleId', 50)
  const paymentMethod = readParam(params, 'paymentMethod', 80)
  const search = readParam(params, 'search', 120)

  if (Boolean(startDate) !== Boolean(endDate)) {
    return { ok: false, message: 'Informe as datas inicial e final do período.' }
  }
  if (startDate && (!isValidDate(startDate) || !isValidDate(endDate))) {
    return { ok: false, message: 'Informe um período válido.' }
  }
  if (startDate && startDate > endDate) {
    return { ok: false, message: 'A data inicial não pode ser posterior à data final.' }
  }
  if (status !== 'todos' && !FINANCIAL_ORDER_STATUSES.some((item) => item === status)) {
    return { ok: false, message: 'O status selecionado é inválido.' }
  }
  if (customerId && !UUID_PATTERN.test(customerId)) {
    return { ok: false, message: 'O cliente selecionado é inválido.' }
  }
  if (responsibleId && responsibleId !== UNASSIGNED_FILTER && !UUID_PATTERN.test(responsibleId)) {
    return { ok: false, message: 'O responsável selecionado é inválido.' }
  }

  return {
    ok: true,
    value: {
      startDate,
      endDate,
      status: status as FinancialStatusFilter,
      customerId,
      responsibleId,
      paymentMethod,
      search,
    },
  }
}

function sum(orders: FinancialOrder[], field: keyof Pick<
  FinancialOrder,
  | 'serviceTotal'
  | 'productTotal'
  | 'baseTotal'
  | 'labor'
  | 'additions'
  | 'discount'
  | 'finalTotal'
>): number {
  return orders.reduce((total, order) => total + order[field], 0)
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculatePartnerTransfer(revenue: number, cost: number): {
  revenue: number
  cost: number
  profit: number
  costShare: number
  profitShare: number
  transferTotal: number
} {
  const normalizedRevenue = roundMoney(revenue)
  const normalizedCost = roundMoney(cost)
  const profit = roundMoney(normalizedRevenue - normalizedCost)
  const costShare = roundMoney(normalizedCost * PARTNER_COST_SHARE_RATE)
  const profitShare = roundMoney(profit * PARTNER_PROFIT_SHARE_RATE)

  return {
    revenue: normalizedRevenue,
    cost: normalizedCost,
    profit,
    costShare,
    profitShare,
    transferTotal: roundMoney(costShare + profitShare),
  }
}

export function summarizeFinancialOrders(orders: FinancialOrder[]): {
  summary: FinancialSummary
  statusSummary: FinancialStatusSummary[]
  laborByCustomer: CustomerLaborSummary[]
  laborByResponsible: ResponsibleLaborSummary[]
  productSales: ProductSalesSummary[]
  partnerTransfer: PartnerTransferSummary
} {
  const totalOrders = orders.length
  const finalTotal = sum(orders, 'finalTotal')
  const uniqueCustomers = new Set(
    orders.map((order) => order.customerId || `name:${order.customerName}`)
  ).size

  const summary: FinancialSummary = {
    totalOrders,
    finalizedOrders: orders.filter((order) => order.status === 'finalizada').length,
    openOrders: orders.filter((order) => ACTIVE_STATUSES.has(order.status)).length,
    cancelledOrders: orders.filter((order) => order.status === 'cancelada').length,
    uniqueCustomers,
    serviceTotal: sum(orders, 'serviceTotal'),
    productTotal: sum(orders, 'productTotal'),
    baseTotal: sum(orders, 'baseTotal'),
    laborTotal: sum(orders, 'labor'),
    additionsTotal: sum(orders, 'additions'),
    discountTotal: sum(orders, 'discount'),
    finalTotal,
    averageTicket: totalOrders > 0 ? finalTotal / totalOrders : 0,
  }

  const statusSummary = FINANCIAL_ORDER_STATUSES.map((status) => {
    const matching = orders.filter((order) => order.status === status)
    return {
      status,
      label: FINANCIAL_STATUS_LABELS[status],
      count: matching.length,
      percentage: totalOrders > 0 ? (matching.length / totalOrders) * 100 : 0,
      finalTotal: matching.reduce((total, order) => total + order.finalTotal, 0),
    }
  })

  const customerMap = new Map<string, CustomerLaborSummary>()
  const responsibleMap = new Map<string, ResponsibleLaborSummary>()
  const productMap = new Map<string, ProductSalesSummary>()
  const partnerProductMap = new Map<string, PartnerProductTransferSummary>()
  const partnerOrderIds = new Set<string>()

  for (const order of orders) {
    const customerKey = order.customerId || `name:${order.customerName}`
    const customer = customerMap.get(customerKey) || {
      customerId: order.customerId,
      customerName: order.customerName,
      orderCount: 0,
      laborTotal: 0,
      finalTotal: 0,
      averageTicket: 0,
    }
    customer.orderCount += 1
    customer.laborTotal += order.labor
    customer.finalTotal += order.finalTotal
    customer.averageTicket = customer.finalTotal / customer.orderCount
    customerMap.set(customerKey, customer)

    const responsibleKey = order.responsibleId || `name:${order.responsibleName}`
    const responsible = responsibleMap.get(responsibleKey) || {
      responsibleId: order.responsibleId,
      responsibleName: order.responsibleName,
      orderCount: 0,
      laborTotal: 0,
      finalTotal: 0,
      averageTicket: 0,
    }
    responsible.orderCount += 1
    responsible.laborTotal += order.labor
    responsible.finalTotal += order.finalTotal
    responsible.averageTicket = responsible.finalTotal / responsible.orderCount
    responsibleMap.set(responsibleKey, responsible)

    const productsSeenInOrder = new Set<string>()
    for (const product of order.products) {
      const productKey = `${product.id}:${product.code || ''}`
      const current = productMap.get(productKey) || {
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        isPartnerProduct: product.isPartnerProduct,
        orderCount: 0,
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        partnerTransfer: 0,
        averageUnitPrice: 0,
      }
      if (!productsSeenInOrder.has(productKey)) {
        current.orderCount += 1
        productsSeenInOrder.add(productKey)
      }
      current.quantity += product.quantity
      current.revenue += product.total
      current.cost += product.totalCost
      current.profit += product.profit
      if (order.status === 'finalizada' && product.isPartnerProduct) {
        current.partnerTransfer += calculatePartnerTransfer(product.total, product.totalCost).transferTotal
      }
      current.averageUnitPrice = current.quantity > 0 ? current.revenue / current.quantity : 0
      productMap.set(productKey, current)

      if (order.status !== 'finalizada' || !product.isPartnerProduct || !product.code) continue

      partnerOrderIds.add(order.id)
      const calculation = calculatePartnerTransfer(product.total, product.totalCost)
      const partner = partnerProductMap.get(productKey) || {
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        orderCount: 0,
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        costShare: 0,
        profitShare: 0,
        transferTotal: 0,
      }
      if (partner.orderCount === 0 || !productsSeenInOrder.has(`partner:${productKey}`)) {
        partner.orderCount += 1
        productsSeenInOrder.add(`partner:${productKey}`)
      }
      partner.quantity += product.quantity
      partner.revenue += calculation.revenue
      partner.cost += calculation.cost
      partner.profit += calculation.profit
      partner.costShare += calculation.costShare
      partner.profitShare += calculation.profitShare
      partner.transferTotal += calculation.transferTotal
      partnerProductMap.set(productKey, partner)
    }
  }

  const laborByCustomer = Array.from(customerMap.values()).sort((left, right) =>
    right.laborTotal - left.laborTotal
    || right.finalTotal - left.finalTotal
    || left.customerName.localeCompare(right.customerName, 'pt-BR')
  )
  const laborByResponsible = Array.from(responsibleMap.values()).sort((left, right) =>
    right.laborTotal - left.laborTotal
    || right.finalTotal - left.finalTotal
    || left.responsibleName.localeCompare(right.responsibleName, 'pt-BR')
  )
  const productSales = Array.from(productMap.values()).sort((left, right) =>
    right.revenue - left.revenue
    || right.quantity - left.quantity
    || left.productName.localeCompare(right.productName, 'pt-BR')
  )

  const partnerProducts = Array.from(partnerProductMap.values()).sort((left, right) =>
    right.transferTotal - left.transferTotal
    || right.revenue - left.revenue
    || left.productCode.localeCompare(right.productCode, 'pt-BR', { numeric: true })
  )
  const partnerTransfer = partnerProducts.reduce<PartnerTransferSummary>((total, product) => ({
    ...total,
    quantity: total.quantity + product.quantity,
    revenue: total.revenue + product.revenue,
    cost: total.cost + product.cost,
    profit: total.profit + product.profit,
    costShare: total.costShare + product.costShare,
    profitShare: total.profitShare + product.profitShare,
    transferTotal: total.transferTotal + product.transferTotal,
  }), {
    eligibleOrderCount: partnerOrderIds.size,
    productCount: partnerProducts.length,
    quantity: 0,
    revenue: 0,
    cost: 0,
    profit: 0,
    costShare: 0,
    profitShare: 0,
    transferTotal: 0,
    products: partnerProducts,
  })

  return {
    summary,
    statusSummary,
    laborByCustomer,
    laborByResponsible,
    productSales,
    partnerTransfer,
  }
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}
