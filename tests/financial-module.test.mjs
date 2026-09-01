import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const routePath = new URL('../app/api/admin/financeiro/route.ts', import.meta.url)
const navigationPath = new URL('../components/navigation/config.ts', import.meta.url)
const repositoryPath = new URL('../features/financial/server/report-repository.ts', import.meta.url)
const reportPagePath = new URL('../features/financial/components/financial-report-page.tsx', import.meta.url)

test('a API financeira expõe somente leitura e exige perfil administrador', async () => {
  const route = await readFile(routePath, 'utf8')

  assert.match(route, /export async function GET/)
  assert.match(route, /profile\.papel !== 'admin'/)
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/)
  assert.doesNotMatch(route, /\.insert\(|\.update\(|\.delete\(|\.upsert\(/)
})

test('a navegação administrativa disponibiliza o módulo financeiro', async () => {
  const navigation = await readFile(navigationPath, 'utf8')
  assert.match(navigation, /href: '\/admin\/financeiro'/)
  assert.match(navigation, /label: 'Financeiro'/)
})

test('o repositório financeiro consulta apenas tabelas operacionais conhecidas', async () => {
  const repository = await readFile(repositoryPath, 'utf8')
  for (const table of [
    'ordens_de_servico',
    'ordem_servicos',
    'ordem_produtos',
    'clientes',
    'perfis',
    'servicos',
    'produtos',
  ]) {
    assert.match(repository, new RegExp(`from\\('${table}'\\)`))
  }
  assert.doesNotMatch(repository, /\.insert\(|\.update\(|\.delete\(|\.upsert\(/)
})

test('o relatório usa o snapshot e exibe a memória de cálculo da parceria', async () => {
  const [repository, page] = await Promise.all([
    readFile(repositoryPath, 'utf8'),
    readFile(reportPagePath, 'utf8'),
  ])

  assert.match(repository, /codigo_produto,valor_custo,valor_unitario/)
  assert.match(repository, /isPartnerProductCode/)
  assert.match(page, /Repasse da parceria PL0826/)
  assert.match(page, /80% custo/)
  assert.match(page, /10% lucro/)
  assert.match(page, /Somente produtos com código iniciado por PL0826- em OS finalizadas/)
})

test('o relatório exibe mão de obra agrupada por responsável na tela e no PDF', async () => {
  const page = await readFile(reportPagePath, 'utf8')

  assert.match(page, /Mão de obra por responsável/)
  assert.match(page, /report\.laborByResponsible/)
  assert.match(page, /Divisão das OS e dos valores de mão de obra/)
})

test('Produtos e Financeiro reutilizam o mesmo padrão visual de tabela', async () => {
  const [financialPage, productPage] = await Promise.all([
    readFile(reportPagePath, 'utf8'),
    readFile(new URL('../app/admin/produtos/page.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(financialPage, /admin-data-table\.module\.css/)
  assert.match(productPage, /admin-data-table\.module\.css/)
})
