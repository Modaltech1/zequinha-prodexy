import assert from 'node:assert/strict'
import test from 'node:test'

import { buildOrderPrintHtml } from '../components/order-print.ts'

test('a impressão usa a data de criação da OS, não a data da última atualização', () => {
  const html = buildOrderPrintHtml({
    id: 'order-date',
    numero: 'b9277174',
    status: 'aberta',
    valor_total: 120,
    valor_final: 120,
    reclame: null,
    relatorio_tecnico: null,
    observacoes: null,
    criado_em: '2026-08-31T12:00:00.000Z',
    atualizado_em: '2026-10-02T21:35:58.000Z',
    cliente_nome: 'Cliente Teste',
    cliente_telefone: '',
    cliente_cpf_cnpj: null,
    veiculo_placa: 'SGG5A29',
    veiculo_marca: 'FIAT',
    veiculo_modelo: 'STRADA',
    veiculo_ano: null,
    veiculo_cor: null,
    km_entrada: 73499,
    veiculo_tem_seguro: false,
    servicos: [],
    produtos: [],
    diagnosticos: [],
    fotos: [],
  }, '/icon.jpg')

  assert.match(html, /Emitida em:<\/strong> 31\/08\/2026/)
  assert.doesNotMatch(html, /02\/10\/2026/)
})
