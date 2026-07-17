'use client'

import { useEffect, useState } from 'react'
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
} from '@prodexy/ui'
import { supabase } from '@/lib/supabaseClient'

export type ProdutoRow = {
  id: string
  nome: string
  marca_modelo: string | null
  codigo: string | null
  quantidade_estoque: number
  valor_unitario: number
  atualizado_em?: string | null
}

type ProductDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  produto: ProdutoRow | null
  onSaved?: () => void
}

function parseMoney(value: string) {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  return Number(normalized) || 0
}

function formatMoneyInput(value: number | null | undefined) {
  if (!value) return ''
  return Number(value).toFixed(2).replace('.', ',')
}

export function ProductDialog({ open, onOpenChange, produto, onSaved }: ProductDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [marcaModelo, setMarcaModelo] = useState('')
  const [codigo, setCodigo] = useState('')
  const [quantidadeEstoque, setQuantidadeEstoque] = useState('')
  const [valorUnitario, setValorUnitario] = useState('')

  useEffect(() => {
    setNome(produto?.nome || '')
    setMarcaModelo(produto?.marca_modelo || '')
    setCodigo(produto?.codigo || '')
    setQuantidadeEstoque(produto ? String(produto.quantidade_estoque ?? 0) : '')
    setValorUnitario(produto ? formatMoneyInput(produto.valor_unitario) : '')
    setError(null)
  }, [produto, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const nomeProduto = nome.trim()
      if (!nomeProduto) throw new Error('Informe o nome do produto.')

      const estoque = Number.parseInt(quantidadeEstoque.replace(/\D/g, ''), 10)
      const payload = {
        nome: nomeProduto,
        marca_modelo: marcaModelo.trim() || null,
        codigo: codigo.trim() || null,
        quantidade_estoque: Number.isFinite(estoque) ? estoque : 0,
        valor_unitario: parseMoney(valorUnitario),
        atualizado_em: new Date().toISOString(),
      }

      if (produto) {
        const { error } = await supabase.from('produtos').update(payload).eq('id', produto.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('produtos').insert(payload)
        if (error) throw error
      }

      onSaved?.()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao salvar produto', err)
      setError(err?.message || 'Erro ao salvar produto. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader className="space-y-1">
          <DialogTitle>{produto ? 'Editar produto' : 'Novo produto'}</DialogTitle>
          <DialogDescription>
            Cadastre os dados básicos de estoque. Estes produtos ainda não ficam vinculados a ordens de serviço.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4 [&_input]:border-[#d8c9b6] [&_input]:bg-white/80 [&_input]:shadow-sm [&_[role=combobox]]:border-[#d8c9b6] [&_[role=combobox]]:bg-white/80 [&_[role=combobox]]:shadow-sm" onSubmit={handleSubmit}>
          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

          <div className="space-y-2">
            <Label htmlFor="produto-nome">Nome do produto</Label>
            <Input
              id="produto-nome"
              value={nome}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNome(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="produto-marca-modelo">Marca / modelo</Label>
              <Input
                id="produto-marca-modelo"
                value={marcaModelo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMarcaModelo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="produto-codigo">Código</Label>
              <Input
                id="produto-codigo"
                value={codigo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCodigo(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="produto-estoque">Estoque atual</Label>
              <Input
                id="produto-estoque"
                inputMode="numeric"
                value={quantidadeEstoque}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantidadeEstoque(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="produto-valor">Valor unitário</Label>
              <Input
                id="produto-valor"
                inputMode="decimal"
                placeholder="Ex.: 12,00"
                value={valorUnitario}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValorUnitario(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 border-t pt-4 sm:justify-end [&>button]:w-full [&>button]:sm:w-auto">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar produto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
