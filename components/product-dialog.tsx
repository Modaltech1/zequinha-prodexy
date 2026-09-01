'use client'

import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@prodexy/ui'
import {
  PARTNER_PRODUCT_CODE_PREFIX,
  normalizeProductCode,
  type Product,
} from '@/features/products/domain/product'
import { supabase } from '@/lib/supabaseClient'

export type ProdutoRow = Product

type ProductDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  produto: Product | null
  onSaved?: () => void
}

const MAX_PHOTO_SIZE = 5 * 1024 * 1024

function parseMoney(value: string): number {
  const cleaned = value.trim().replace(/[^\d,.-]/g, '')
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : /^-?\d{1,3}(\.\d{3})+$/.test(cleaned)
      ? cleaned.replace(/\./g, '')
      : cleaned
  const number = Number(normalized)
  return Number.isFinite(number) ? Math.max(0, number) : 0
}

function formatMoneyInput(value: number | null | undefined): string {
  if (value == null) return ''
  return Number(value).toFixed(2).replace('.', ',')
}

function getImageKey(url: string | null, explicitKey: string | null): string {
  if (explicitKey) return explicitKey
  if (!url) return ''
  try {
    const parsed = new URL(url)
    return parsed.pathname.startsWith('/') ? parsed.pathname.slice(1) : parsed.pathname
  } catch {
    return ''
  }
}

async function deleteUploadedImage(key: string): Promise<void> {
  if (!key) return
  await fetch('/api/delete-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  }).catch(() => undefined)
}

async function uploadProductPhoto(file: File, productId: string): Promise<{ key: string; url: string }> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('itemId', productId)
  formData.append('folder', 'produtos')

  const response = await fetch('/api/upload-image', { method: 'POST', body: formData })
  const result = await response.json()
  if (!response.ok) throw new Error(result?.error || 'Não foi possível enviar a foto do produto.')

  return { key: String(result.key), url: String(result.url) }
}

async function getNextPartnerProductCode(): Promise<string> {
  const { data, error } = await supabase.rpc('proximo_codigo_produto_parceiro')
  if (error || typeof data !== 'string' || !data.trim()) {
    throw new Error('Não foi possível gerar o próximo código da parceria. Confirme a migration no Supabase.')
  }
  return normalizeProductCode(data)
}

async function isProductCodeAvailable(code: string, productId: string | null): Promise<boolean> {
  const { data, error } = await supabase.rpc('codigo_produto_disponivel', {
    p_codigo: code,
    p_produto_id: productId,
  })
  if (error) {
    throw new Error('Não foi possível validar o código. Confirme a migration de códigos no Supabase.')
  }
  return data === true
}

function errorMessage(cause: unknown): string {
  if (cause instanceof Error) return cause.message
  if (typeof cause === 'object' && cause !== null && 'message' in cause) {
    return String((cause as { message?: unknown }).message || '')
  }
  return ''
}

function FormSection({ title, description, children }: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="space-y-4 rounded-xl border bg-muted/10 p-4">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

export function ProductDialog({ open, onOpenChange, produto, onSaved }: ProductDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [codigo, setCodigo] = useState('')
  const [setor, setSetor] = useState('')
  const [referencia, setReferencia] = useState('')
  const [marca, setMarca] = useState('')
  const [funcao, setFuncao] = useState('')
  const [aplicacao, setAplicacao] = useState('')
  const [especificacoes, setEspecificacoes] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [quantidadeEstoque, setQuantidadeEstoque] = useState('')
  const [valorCusto, setValorCusto] = useState('')
  const [valorVenda, setValorVenda] = useState('')
  const [maoDeObra, setMaoDeObra] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoKey, setPhotoKey] = useState<string | null>(null)
  const [newPhoto, setNewPhoto] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [generatingCode, setGeneratingCode] = useState(false)

  useEffect(() => {
    setNome(produto?.nome || '')
    setCodigo(produto?.codigo || '')
    setSetor(produto?.setor || '')
    setReferencia(produto?.referencia || '')
    setMarca(produto?.marca || produto?.marca_modelo || '')
    setFuncao(produto?.funcao || '')
    setAplicacao(produto?.aplicacao || '')
    setEspecificacoes(produto?.especificacoes || '')
    setObservacoes(produto?.observacoes || '')
    setQuantidadeEstoque(produto ? String(produto.quantidade_estoque ?? 0) : '0')
    setValorCusto(formatMoneyInput(produto?.valor_custo))
    setValorVenda(formatMoneyInput(produto?.valor_unitario))
    setMaoDeObra(formatMoneyInput(produto?.mao_de_obra))
    setPhotoUrl(produto?.foto_url || null)
    setPhotoKey(produto?.foto_chave || null)
    setNewPhoto(null)
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
    setError(null)
  }, [produto, open])

  useEffect(() => {
    if (!open || produto) return

    let active = true
    setGeneratingCode(true)
    getNextPartnerProductCode()
      .then((nextCode) => {
        if (active) setCodigo((current) => current.trim() ? current : nextCode)
      })
      .catch((cause: unknown) => {
        if (active) setError(errorMessage(cause) || 'Não foi possível sugerir o próximo código.')
      })
      .finally(() => {
        if (active) setGeneratingCode(false)
      })

    return () => { active = false }
  }, [open, produto])

  async function generatePartnerCode() {
    setGeneratingCode(true)
    setError(null)
    try {
      setCodigo(await getNextPartnerProductCode())
    } catch (cause: unknown) {
      setError(errorMessage(cause) || 'Não foi possível gerar o próximo código.')
    } finally {
      setGeneratingCode(false)
    }
  }

  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem válido.')
      return
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setError('A foto deve ter no máximo 5 MB.')
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setNewPhoto(file)
    setPreviewUrl(URL.createObjectURL(file))
    setError(null)
  }

  function removePhoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setNewPhoto(null)
    setPreviewUrl(null)
    setPhotoUrl(null)
    setPhotoKey(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    let uploadedKey = ''
    try {
      const productName = nome.trim()
      if (!productName) throw new Error('Informe o nome da peça.')

      const productCode = normalizeProductCode(codigo)
      if (!productCode) throw new Error('Informe o código do produto.')
      if (!await isProductCodeAvailable(productCode, produto?.id || null)) {
        throw new Error(`O código ${productCode} já está cadastrado em outro produto.`)
      }

      const stock = Number.parseInt(quantidadeEstoque, 10)
      if (!Number.isFinite(stock) || stock < 0) throw new Error('Informe um estoque válido.')

      let finalPhotoUrl = photoUrl
      let finalPhotoKey = photoKey
      if (newPhoto) {
        const uploaded = await uploadProductPhoto(newPhoto, produto?.id || crypto.randomUUID())
        uploadedKey = uploaded.key
        finalPhotoUrl = uploaded.url
        finalPhotoKey = uploaded.key
      }

      const normalizedBrand = marca.trim() || null
      const payload = {
        nome: productName,
        codigo: productCode,
        setor: setor.trim() || null,
        referencia: referencia.trim() || null,
        marca: normalizedBrand,
        marca_modelo: normalizedBrand,
        funcao: funcao.trim() || null,
        aplicacao: aplicacao.trim() || null,
        especificacoes: especificacoes.trim() || null,
        observacoes: observacoes.trim() || null,
        quantidade_estoque: stock,
        valor_custo: parseMoney(valorCusto),
        valor_unitario: parseMoney(valorVenda),
        mao_de_obra: parseMoney(maoDeObra),
        foto_url: finalPhotoUrl,
        foto_chave: finalPhotoKey,
        atualizado_em: new Date().toISOString(),
      }

      if (produto) {
        const { error: updateError } = await supabase.from('produtos').update(payload).eq('id', produto.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('produtos').insert(payload)
        if (insertError) throw insertError
      }

      const oldImageKey = getImageKey(produto?.foto_url || null, produto?.foto_chave || null)
      const imageChanged = (produto?.foto_url || null) !== finalPhotoUrl
      if (oldImageKey && imageChanged) await deleteUploadedImage(oldImageKey)

      if (previewUrl) URL.revokeObjectURL(previewUrl)
      onSaved?.()
      onOpenChange(false)
    } catch (cause: unknown) {
      if (uploadedKey) await deleteUploadedImage(uploadedKey)
      console.error('Erro ao salvar produto', cause)
      const message = errorMessage(cause)
      setError(
        /produtos_codigo_normalizado_uidx|duplicate key|código de produto repetido/i.test(message)
          ? 'Esse código já está cadastrado em outro produto. Informe outro código ou gere o próximo PL0826.'
          : message || 'Erro ao salvar produto. Verifique os dados e tente novamente.'
      )
    } finally {
      setLoading(false)
    }
  }

  const displayedPhoto = previewUrl || photoUrl

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader className="space-y-1">
          <DialogTitle>{produto ? 'Editar produto' : 'Novo produto'}</DialogTitle>
          <DialogDescription>
            Registre identificação, informações técnicas, estoque e composição do preço da peça.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

          <FormSection title="Identificação" description="Dados usados para localizar e reconhecer a peça no estoque.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="produto-nome">Nome da peça *</Label>
                <Input id="produto-nome" value={nome} onChange={(event: ChangeEvent<HTMLInputElement>) => setNome(event.target.value)} required />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-2">
                <Label htmlFor="produto-codigo">Código *</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="produto-codigo"
                    value={codigo}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setCodigo(event.target.value)}
                    onBlur={() => setCodigo((current) => normalizeProductCode(current))}
                    placeholder="Ex.: PL0826-12 ou ZP-100"
                    required
                  />
                  <Button type="button" variant="outline" onClick={generatePartnerCode} disabled={generatingCode} className="shrink-0">
                    {generatingCode ? 'Gerando...' : `Próximo ${PARTNER_PRODUCT_CODE_PREFIX}`}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">O código é único. O padrão da parceria é sugerido automaticamente, mas códigos próprios continuam permitidos.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="produto-setor">Setor</Label>
                <Input id="produto-setor" value={setor} onChange={(event: ChangeEvent<HTMLInputElement>) => setSetor(event.target.value)} placeholder="Ex.: 1" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="produto-referencia">Referência</Label>
                <Input id="produto-referencia" value={referencia} onChange={(event: ChangeEvent<HTMLInputElement>) => setReferencia(event.target.value)} placeholder="Referência do fabricante / OEM" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="produto-marca">Marca</Label>
                <Input id="produto-marca" value={marca} onChange={(event: ChangeEvent<HTMLInputElement>) => setMarca(event.target.value)} />
              </div>
            </div>
          </FormSection>

          <FormSection title="Informações técnicas" description="Descreva o uso, a compatibilidade e os detalhes importantes da peça.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="produto-funcao">Função</Label>
                <Textarea id="produto-funcao" value={funcao} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setFuncao(event.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="produto-aplicacao">Aplicação</Label>
                <Textarea id="produto-aplicacao" value={aplicacao} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setAplicacao(event.target.value)} rows={4} placeholder="Veículos, motores ou sistemas compatíveis" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="produto-especificacoes">Especificações</Label>
                <Textarea id="produto-especificacoes" value={especificacoes} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setEspecificacoes(event.target.value)} rows={4} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="produto-observacoes">Observações</Label>
                <Textarea id="produto-observacoes" value={observacoes} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setObservacoes(event.target.value)} rows={3} />
              </div>
            </div>
          </FormSection>

          <FormSection title="Estoque e valores" description="O preço de venda continua compatível com as ordens de serviço já existentes.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="produto-estoque">Estoque atual *</Label>
                <Input id="produto-estoque" type="number" min={0} step={1} value={quantidadeEstoque} onChange={(event: ChangeEvent<HTMLInputElement>) => setQuantidadeEstoque(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="produto-custo">Custo</Label>
                <Input id="produto-custo" inputMode="decimal" value={valorCusto} onChange={(event: ChangeEvent<HTMLInputElement>) => setValorCusto(event.target.value)} placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="produto-venda">Preço de venda</Label>
                <Input id="produto-venda" inputMode="decimal" value={valorVenda} onChange={(event: ChangeEvent<HTMLInputElement>) => setValorVenda(event.target.value)} placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="produto-mao-de-obra">Mão de obra</Label>
                <Input id="produto-mao-de-obra" inputMode="decimal" value={maoDeObra} onChange={(event: ChangeEvent<HTMLInputElement>) => setMaoDeObra(event.target.value)} placeholder="0,00" />
              </div>
            </div>
          </FormSection>

          <FormSection title="Foto" description="A foto é exibida nos detalhes e na etiqueta térmica do produto.">
            <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start">
              {displayedPhoto ? (
                <img src={displayedPhoto} alt="Prévia do produto" className="aspect-square w-full rounded-xl border bg-white object-contain" />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed bg-muted/20 px-5 text-center text-sm text-muted-foreground">Sem foto</div>
              )}
              <div className="space-y-3">
                <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={selectPhoto} />
                <p className="text-xs text-muted-foreground">PNG, JPG ou WebP, com até 5 MB.</p>
                {displayedPhoto && <Button type="button" variant="outline" onClick={removePhoto}>Remover foto</Button>}
              </div>
            </div>
          </FormSection>

          <DialogFooter className="gap-2 border-t pt-4 sm:justify-end [&>button]:w-full [&>button]:sm:w-auto">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar produto'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
