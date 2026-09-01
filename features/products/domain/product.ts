export const PRODUCT_SELECT = [
  'id',
  'nome',
  'marca_modelo',
  'codigo',
  'setor',
  'referencia',
  'marca',
  'funcao',
  'aplicacao',
  'especificacoes',
  'observacoes',
  'quantidade_estoque',
  'valor_custo',
  'valor_unitario',
  'mao_de_obra',
  'foto_url',
  'foto_chave',
  'criado_em',
  'atualizado_em',
].join(',')

export const PARTNER_PRODUCT_CODE_PREFIX = 'PL0826-'

export type Product = {
  id: string
  nome: string
  marca_modelo: string | null
  codigo: string | null
  setor: string | null
  referencia: string | null
  marca: string | null
  funcao: string | null
  aplicacao: string | null
  especificacoes: string | null
  observacoes: string | null
  quantidade_estoque: number
  valor_custo: number
  valor_unitario: number
  mao_de_obra: number
  foto_url: string | null
  foto_chave: string | null
  criado_em: string | null
  atualizado_em: string | null
}

export type ProductDatabaseRow = Omit<
  Product,
  'quantidade_estoque' | 'valor_custo' | 'valor_unitario' | 'mao_de_obra'
> & {
  quantidade_estoque: number | string | null
  valor_custo: number | string | null
  valor_unitario: number | string | null
  mao_de_obra: number | string | null
}

function toNumber(value: number | string | null | undefined): number {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

export function normalizeProduct(row: ProductDatabaseRow): Product {
  return {
    ...row,
    marca: row.marca?.trim() || row.marca_modelo?.trim() || null,
    quantidade_estoque: Math.max(0, toNumber(row.quantidade_estoque)),
    valor_custo: Math.max(0, toNumber(row.valor_custo)),
    valor_unitario: Math.max(0, toNumber(row.valor_unitario)),
    mao_de_obra: Math.max(0, toNumber(row.mao_de_obra)),
  }
}

export function getProductMargin(product: Product): number {
  return product.valor_unitario - product.valor_custo
}

export function getProductMarginPercentage(product: Product): number {
  if (product.valor_unitario <= 0) return 0
  return (getProductMargin(product) / product.valor_unitario) * 100
}

export function getProductServiceTotal(product: Product): number {
  return product.valor_unitario + product.mao_de_obra
}

export function normalizeProductSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

export function normalizeProductCode(value: string): string {
  return value.trim().toLocaleUpperCase('pt-BR')
}

export function isPartnerProductCode(value: string | null | undefined): boolean {
  return normalizeProductCode(value || '').startsWith(PARTNER_PRODUCT_CODE_PREFIX)
}

export function matchesProductSearch(product: Product, search: string): boolean {
  const normalizedSearch = normalizeProductSearch(search)
  if (!normalizedSearch) return true

  const content = normalizeProductSearch([
    product.codigo,
    product.setor,
    product.nome,
    product.referencia,
    product.marca,
    product.marca_modelo,
    product.funcao,
    product.aplicacao,
    product.especificacoes,
    product.observacoes,
  ].filter(Boolean).join(' '))

  return normalizedSearch.split(/\s+/).every((term) => content.includes(term))
}
