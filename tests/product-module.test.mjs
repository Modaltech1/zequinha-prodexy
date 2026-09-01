import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationPath = new URL('../script/migration_produtos_catalogo_completo.sql', import.meta.url)
const codesMigrationPath = new URL('../script/migration_codigos_repasses_parceria.sql', import.meta.url)
const pagePath = new URL('../app/admin/produtos/page.tsx', import.meta.url)
const dialogPath = new URL('../components/product-dialog.tsx', import.meta.url)
const labelPath = new URL('../features/products/print/product-label.ts', import.meta.url)
const sharedTableStylesPath = new URL('../components/admin-data-table.module.css', import.meta.url)

test('a migration é aditiva e preserva o cadastro existente', async () => {
  const migration = await readFile(migrationPath, 'utf8')
  const expectedColumns = [
    'setor',
    'referencia',
    'marca',
    'funcao',
    'aplicacao',
    'especificacoes',
    'observacoes',
    'valor_custo',
    'mao_de_obra',
    'foto_url',
    'foto_chave',
  ]

  for (const column of expectedColumns) {
    assert.match(migration, new RegExp(`add column if not exists ${column}`))
  }
  assert.match(migration, /set marca = nullif\(trim\(marca_modelo\), ''\)/)
  assert.doesNotMatch(migration, /drop\s+(table|column)/i)
})

test('o banco bloqueia códigos repetidos e fornece o próximo código PL0826', async () => {
  const [migration, dialog] = await Promise.all([
    readFile(codesMigrationPath, 'utf8'),
    readFile(dialogPath, 'utf8'),
  ])

  assert.match(migration, /create unique index if not exists produtos_codigo_normalizado_uidx/)
  assert.match(migration, /upper\(trim\(codigo\)\)/)
  assert.match(migration, /proximo_codigo_produto_parceiro/)
  assert.match(migration, /codigo_produto_disponivel/)
  assert.match(dialog, /Próximo \$\{PARTNER_PRODUCT_CODE_PREFIX\}/)
  assert.match(dialog, /já está cadastrado em outro produto/)
})

test('a venda preserva código e custo do produto para o relatório histórico', async () => {
  const migration = await readFile(codesMigrationPath, 'utf8')

  assert.match(migration, /add column if not exists valor_custo numeric/)
  assert.match(migration, /preencher_snapshot_produto_ordem/)
  assert.match(migration, /ordem_produtos_snapshot_produto_trigger/)
  assert.doesNotMatch(migration, /drop\s+(table|column)/i)
})

test('a página usa tabela compacta, responsiva e concentra as operações no menu de ações', async () => {
  const [page, sharedStyles] = await Promise.all([
    readFile(pagePath, 'utf8'),
    readFile(sharedTableStylesPath, 'utf8'),
  ])
  const table = page.match(/<table[\s\S]*?<\/table>/)?.[0] || ''

  assert.match(table, /<table/)
  for (const header of [
    'Código',
    'Setor',
    'Nome da peça',
    'Marca',
    'Estoque',
    'Custo',
    'Preço de venda',
    'Mão de obra',
    'Valor total',
    'Margem',
    'Ações',
  ]) {
    assert.match(table, new RegExp(`>${header}<`))
  }
  for (const detailOnlyHeader of [
    'Referência',
    'Função',
    'Aplicação',
    'Especificações',
    'Observações',
  ]) {
    assert.doesNotMatch(table, new RegExp(`>${detailOnlyHeader}<`))
  }
  assert.match(page, /admin-data-table\.module\.css/)
  assert.match(sharedStyles, /max-width: 100%/)
  assert.match(sharedStyles, /overflow-x: auto/)
  assert.doesNotMatch(sharedStyles, /2460px/)
  assert.match(page, /MoreHorizontal/)
  assert.match(page, /Ver informações/)
  assert.match(page, /Imprimir etiqueta/)
  assert.match(page, /Adicionar 1 ao estoque/)
  assert.match(page, /Preço de venda/)
  assert.match(page, /Margem/)
})

test('a impressão do produto é uma ficha térmica simples, sem elementos decorativos', async () => {
  const label = await readFile(labelPath, 'utf8')

  assert.match(label, /html, body \{ width: 75mm/)
  assert.match(label, /@page \{ size: auto/)
  assert.match(label, /border-bottom: 1px dotted #000/)
  for (const field of [
    'Código',
    'Setor',
    'Data do cadastro',
    'Nome da peça',
    'Referência',
    'Marca',
    'Função',
    'Aplicação',
    'Especificações',
    'Observações',
    'Preço de venda',
    'Mão de obra',
    'Valor total',
  ]) {
    assert.match(label, new RegExp(field))
  }
  for (const removedElement of [
    /branding\/brand/,
    /logoUrl/,
    /product-photo/,
    /photo-placeholder/,
    /class="header"/,
    /class="primary"/,
    /class="financial"/,
    /class="money-row"/,
  ]) {
    assert.doesNotMatch(label, removedElement)
  }
  assert.doesNotMatch(label, /Controle interno: custo/)
})
