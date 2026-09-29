import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { buildOrderPrintHtml } from '../components/order-print.ts'

const migrationPath = new URL('../script/migration_relatorio_tecnico_ordem_servico.sql', import.meta.url)
const schemaPath = new URL('../script/schema.sql', import.meta.url)

const order = {
  id: 'order-report',
  numero: 'REPORT01',
  status: 'finalizada',
  valor_total: 200,
  valor_final: 200,
  reclame: 'Ruído na dianteira ao frear.',
  relatorio_tecnico: 'Pastilhas verificadas e substituídas após teste.',
  observacoes: 'Cliente avisado da conclusão.',
  criado_em: '2026-09-29T12:00:00.000Z',
  atualizado_em: null,
  cliente_nome: 'Cliente Teste',
  cliente_telefone: '27999999999',
  cliente_cpf_cnpj: null,
  veiculo_placa: 'ABC1D23',
  veiculo_marca: 'Marca',
  veiculo_modelo: 'Modelo',
  veiculo_ano: null,
  veiculo_cor: null,
  km_entrada: null,
  veiculo_tem_seguro: false,
  servicos: [{ id: 'service-1', nome: 'Revisão', valor: 200, quantidade: 1 }],
  produtos: [],
  diagnosticos: [],
  fotos: [],
}

test('a impressão pareia reclame e relatório técnico e separa observações', () => {
  const html = buildOrderPrintHtml(order, '/icon.jpg')

  assert.match(html, /<div class="notes-grid"><section class="section note-section"><h3>Reclame<\/h3>[\s\S]*?<h3>Relatório técnico<\/h3>/)
  assert.match(html, /Pastilhas verificadas e substituídas após teste\./)
  assert.match(html, /<\/div>\s*<section class="section note-section"><h3>Observações<\/h3>/)
})

test('a migration e o schema geral incluem relatório técnico', async () => {
  const [migration, schema] = await Promise.all([
    readFile(migrationPath, 'utf8'),
    readFile(schemaPath, 'utf8'),
  ])

  assert.match(migration, /add column if not exists relatorio_tecnico text null/)
  assert.doesNotMatch(migration, /drop\s+(table|column)/i)
  assert.match(schema, /relatorio_tecnico text null/)
})
