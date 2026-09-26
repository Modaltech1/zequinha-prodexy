import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { buildOrderPrintHtml } from '../components/order-print.ts'

const migrationPath = new URL('../script/migration_reclame_ordem_servico.sql', import.meta.url)
const schemaPath = new URL('../script/schema.sql', import.meta.url)

const baseOrder = {
  id: 'order-1',
  numero: '25d740f2',
  status: 'aberta',
  valor_total: 120,
  valor_final: 120,
  reclame: null,
  observacoes: null,
  criado_em: '2026-09-22T17:52:07.000Z',
  atualizado_em: null,
  cliente_nome: 'Cliente Teste',
  cliente_telefone: '',
  cliente_cpf_cnpj: null,
  veiculo_placa: 'ABC1D23',
  veiculo_marca: null,
  veiculo_modelo: null,
  veiculo_ano: null,
  veiculo_cor: null,
  km_entrada: null,
  veiculo_tem_seguro: false,
  servicos: [{ id: 'service-1', nome: 'Balanceamento', valor: 60, quantidade: 2 }],
  produtos: [],
  diagnosticos: [],
  fotos: [],
}

test('a impressão compacta omite seções opcionais vazias e ajusta o conteúdo a uma A4', () => {
  const html = buildOrderPrintHtml(baseOrder, '/icon.jpg')

  assert.match(html, /@page \{ size: A4; margin: 7mm; \}/)
  assert.match(html, /fitOrderToSinglePage/)
  assert.doesNotMatch(html, /<h3>Produtos vendidos<\/h3>/)
  assert.doesNotMatch(html, /<h3>Diagnóstico \/ itens não autorizados<\/h3>/)
  assert.doesNotMatch(html, /<h3>Fotos da OS<\/h3>/)
  assert.doesNotMatch(html, /<h3>Reclame<\/h3>/)
  assert.doesNotMatch(html, /<h3>Observações<\/h3>/)
})

test('a impressão mostra reclame e demais seções quando há conteúdo', () => {
  const html = buildOrderPrintHtml({
    ...baseOrder,
    reclame: 'Ruído na dianteira ao frear.',
    observacoes: 'Cliente aguardou na recepção.',
    produtos: [{ id: 'product-1', nome: 'Pneu', quantidade: 1, valor_unitario: 350 }],
    diagnosticos: [{ id: 'diagnostic-1', descricao: 'Disco com desgaste.' }],
    fotos: [{ id: 'photo-1', foto_url: 'https://example.com/photo.jpg' }],
  }, '/icon.jpg')

  assert.match(html, /<h3>Reclame<\/h3>/)
  assert.match(html, /Ruído na dianteira ao frear\./)
  assert.match(html, /<h3>Observações<\/h3>/)
  assert.match(html, /<h3>Produtos vendidos<\/h3>/)
  assert.match(html, /<h3>Diagnóstico \/ itens não autorizados<\/h3>/)
  assert.match(html, /<h3>Fotos da OS<\/h3>/)
})

test('a migration e o schema geral incluem o campo reclame', async () => {
  const [migration, schema] = await Promise.all([
    readFile(migrationPath, 'utf8'),
    readFile(schemaPath, 'utf8'),
  ])

  assert.match(migration, /add column if not exists reclame text null/)
  assert.doesNotMatch(migration, /drop\s+(table|column)/i)
  assert.match(schema, /reclame text null/)
})
