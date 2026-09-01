import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationPath = new URL('../script/migration_produtos_catalogo_completo.sql', import.meta.url)
const codesMigrationPath = new URL('../script/migration_codigos_repasses_parceria.sql', import.meta.url)
const pagePath = new URL('../app/admin/produtos/page.tsx', import.meta.url)
const dialogPath = new URL('../components/product-dialog.tsx', import.meta.url)
const labelPath = new URL('../features/products/print/product-label.ts', import.meta.url)

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

test('a página usa tabela completa e concentra as operações no menu de ações', async () => {
  const page = await readFile(pagePath, 'utf8')

  assert.match(page, /<table/)
  assert.match(page, /MoreHorizontal/)
  assert.match(page, /Ver informações/)
  assert.match(page, /Imprimir etiqueta/)
  assert.match(page, /Adicionar 1 ao estoque/)
  assert.match(page, /Preço de venda/)
  assert.match(page, /Margem/)
})

test('a etiqueta usa largura térmica e os campos definidos no anexo', async () => {
  const label = await readFile(labelPath, 'utf8')

  assert.match(label, /html, body \{ width: 75mm/)
  assert.match(label, /@page \{ size: auto/)
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
  assert.doesNotMatch(label, /Controle interno: custo/)
})
