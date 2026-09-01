import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getProductMargin,
  getProductMarginPercentage,
  getProductServiceTotal,
  isPartnerProductCode,
  matchesProductSearch,
  normalizeProductCode,
  normalizeProduct,
} from '../features/products/domain/product.ts'

function databaseProduct(overrides = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    nome: 'Módulo de Injeção Eletrônica',
    marca_modelo: 'Bosch',
    codigo: 'PL0826-22',
    setor: '22',
    referencia: '0 261 207 626',
    marca: null,
    funcao: 'Gerencia a injeção',
    aplicacao: 'Fiat Palio Fire',
    especificacoes: '12V, 55 pinos',
    observacoes: 'Confirmar código',
    quantidade_estoque: '2',
    valor_custo: '280.00',
    valor_unitario: '616.00',
    mao_de_obra: '492.80',
    foto_url: null,
    foto_chave: null,
    criado_em: '2026-08-01T12:00:00.000Z',
    atualizado_em: null,
    ...overrides,
  }
}

test('normaliza números e reaproveita a marca legada dos produtos existentes', () => {
  const product = normalizeProduct(databaseProduct())

  assert.equal(product.marca, 'Bosch')
  assert.equal(product.quantidade_estoque, 2)
  assert.equal(product.valor_custo, 280)
  assert.equal(product.valor_unitario, 616)
  assert.equal(product.mao_de_obra, 492.8)
})

test('calcula margem e valor total da etiqueta sem persistir valores derivados', () => {
  const product = normalizeProduct(databaseProduct())

  assert.equal(getProductMargin(product), 336)
  assert.equal(getProductMarginPercentage(product), (336 / 616) * 100)
  assert.equal(getProductServiceTotal(product), 1108.8)
})

test('busca em todos os campos técnicos ignorando acentos e caixa', () => {
  const product = normalizeProduct(databaseProduct())

  assert.equal(matchesProductSearch(product, 'modulo injecao'), true)
  assert.equal(matchesProductSearch(product, '55 PINOS'), true)
  assert.equal(matchesProductSearch(product, 'PL0826'), true)
  assert.equal(matchesProductSearch(product, 'produto inexistente'), false)
})

test('normaliza códigos livres e identifica apenas o prefixo da parceria', () => {
  assert.equal(normalizeProductCode('  zp-100  '), 'ZP-100')
  assert.equal(isPartnerProductCode(' pl0826-12 '), true)
  assert.equal(isPartnerProductCode('ZP-PL0826-12'), false)
})
