import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculatePartnerTransfer,
  parseFinancialReportFilters,
  summarizeFinancialOrders,
} from '../features/financial/domain/report.ts'

function product(overrides = {}) {
  return {
    id: 'product-1',
    name: 'Pneu',
    code: 'ZP-100',
    quantity: 2,
    unitPrice: 250,
    unitCost: 100,
    total: 500,
    totalCost: 200,
    profit: 300,
    isPartnerProduct: false,
    ...overrides,
  }
}

function order(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    number: '123',
    createdAt: '2026-08-10T12:00:00.000Z',
    customerId: '11111111-1111-4111-8111-111111111111',
    customerName: 'Cliente A',
    vehicleLabel: 'ABC1D23 Fiat Uno',
    status: 'finalizada',
    responsibleId: null,
    responsibleName: 'Não informado',
    paymentMethod: 'Pix',
    services: [{ id: 'service-1', name: 'Alinhamento', quantity: 1, total: 80 }],
    products: [product()],
    itemsLabel: '1x Alinhamento; 2x Pneu',
    serviceTotal: 80,
    productTotal: 500,
    baseTotal: 580,
    labor: 100,
    additions: 20,
    discount: 10,
    finalTotal: 690,
    ...overrides,
  }
}

test('valida filtros, período e identificadores recebidos pela API', () => {
  const valid = parseFinancialReportFilters(new URLSearchParams({
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    status: 'finalizada',
    customerId: '11111111-1111-4111-8111-111111111111',
  }))
  assert.equal(valid.ok, true)

  const missingEnd = parseFinancialReportFilters(new URLSearchParams({ startDate: '2026-08-01' }))
  assert.deepEqual(missingEnd, {
    ok: false,
    message: 'Informe as datas inicial e final do período.',
  })

  const invalidCustomer = parseFinancialReportFilters(new URLSearchParams({ customerId: 'invalido' }))
  assert.equal(invalidCustomer.ok, false)
})

test('consolida indicadores, mão de obra por cliente e vendas por produto', () => {
  const result = summarizeFinancialOrders([
    order(),
    order({
      id: crypto.randomUUID(),
      number: '124',
      status: 'aberta',
      products: [product({ quantity: 1, unitPrice: 260, total: 260, totalCost: 100, profit: 160 })],
      productTotal: 260,
      baseTotal: 340,
      labor: 50,
      additions: 0,
      discount: 0,
      finalTotal: 390,
    }),
  ])

  assert.equal(result.summary.totalOrders, 2)
  assert.equal(result.summary.finalizedOrders, 1)
  assert.equal(result.summary.openOrders, 1)
  assert.equal(result.summary.laborTotal, 150)
  assert.equal(result.summary.finalTotal, 1080)
  assert.equal(result.summary.averageTicket, 540)
  assert.deepEqual(result.laborByCustomer[0], {
    customerId: '11111111-1111-4111-8111-111111111111',
    customerName: 'Cliente A',
    orderCount: 2,
    laborTotal: 150,
    finalTotal: 1080,
    averageTicket: 540,
  })
  assert.deepEqual(result.laborByResponsible[0], {
    responsibleId: null,
    responsibleName: 'Não informado',
    orderCount: 2,
    laborTotal: 150,
    finalTotal: 1080,
    averageTicket: 540,
  })
  assert.deepEqual(result.productSales[0], {
    productId: 'product-1',
    productName: 'Pneu',
    productCode: 'ZP-100',
    isPartnerProduct: false,
    orderCount: 2,
    quantity: 3,
    revenue: 760,
    cost: 300,
    profit: 460,
    partnerTransfer: 0,
    averageUnitPrice: 760 / 3,
  })
})

test('divide quantidade de OS e mão de obra por responsável', () => {
  const firstResponsibleId = '22222222-2222-4222-8222-222222222222'
  const secondResponsibleId = '33333333-3333-4333-8333-333333333333'
  const result = summarizeFinancialOrders([
    order({ responsibleId: firstResponsibleId, responsibleName: 'Ana', labor: 120 }),
    order({ id: crypto.randomUUID(), responsibleId: firstResponsibleId, responsibleName: 'Ana', labor: 80 }),
    order({ id: crypto.randomUUID(), responsibleId: secondResponsibleId, responsibleName: 'Bruno', labor: 50 }),
  ])

  assert.deepEqual(result.laborByResponsible.map((row) => ({
    name: row.responsibleName,
    orders: row.orderCount,
    labor: row.laborTotal,
  })), [
    { name: 'Ana', orders: 2, labor: 200 },
    { name: 'Bruno', orders: 1, labor: 50 },
  ])
})

test('mantém canceladas fora do total de ordens em aberto', () => {
  const result = summarizeFinancialOrders([
    order({ status: 'cancelada', finalTotal: 0 }),
    order({ id: crypto.randomUUID(), status: 'em_andamento' }),
  ])

  assert.equal(result.summary.cancelledOrders, 1)
  assert.equal(result.summary.openOrders, 1)
})

test('conta uma OS apenas uma vez quando o mesmo produto aparece em mais de uma linha', () => {
  const result = summarizeFinancialOrders([
    order({
      products: [
        product({ quantity: 1, total: 250, totalCost: 100, profit: 150 }),
        product({ quantity: 1, unitPrice: 260, total: 260, totalCost: 100, profit: 160 }),
      ],
      productTotal: 510,
    }),
  ])

  assert.equal(result.productSales[0].orderCount, 1)
  assert.equal(result.productSales[0].quantity, 2)
  assert.equal(result.productSales[0].revenue, 510)
})

test('calcula o repasse PL0826 com 80% do custo e 10% do lucro', () => {
  assert.deepEqual(calculatePartnerTransfer(158.4, 72), {
    revenue: 158.4,
    cost: 72,
    profit: 86.4,
    costShare: 57.6,
    profitShare: 8.64,
    transferTotal: 66.24,
  })

  const result = summarizeFinancialOrders([
    order({
      products: [product({
        name: 'Peça parceira',
        code: 'PL0826-12',
        quantity: 1,
        unitPrice: 158.4,
        unitCost: 72,
        total: 158.4,
        totalCost: 72,
        profit: 86.4,
        isPartnerProduct: true,
      })],
    }),
    order({
      id: crypto.randomUUID(),
      status: 'aberta',
      products: [product({
        code: 'PL0826-12',
        quantity: 1,
        total: 158.4,
        totalCost: 72,
        profit: 86.4,
        isPartnerProduct: true,
      })],
    }),
  ])

  assert.equal(result.partnerTransfer.eligibleOrderCount, 1)
  assert.equal(result.partnerTransfer.quantity, 1)
  assert.equal(result.partnerTransfer.transferTotal, 66.24)
  assert.equal(result.partnerTransfer.products[0].costShare, 57.6)
  assert.equal(result.partnerTransfer.products[0].profitShare, 8.64)
})
