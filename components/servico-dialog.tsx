'use client'

import { useEffect, useState } from 'react'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label } from '@prodexy/ui'
import { supabase } from '@/lib/supabaseClient'

export type ServicoRow = {
  id: string
  nome: string
}

interface ServicoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  servico: ServicoRow | null
  onSaved?: () => void
}

export function ServicoDialog({ open, onOpenChange, servico, onSaved }: ServicoDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nome, setNome] = useState('')

  useEffect(() => {
    setNome(servico?.nome || '')
    setError(null)
  }, [servico, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const payload = { nome: nome.trim(), valor: 0 }
      if (!payload.nome) throw new Error('Informe o nome do serviço.')

      if (servico) {
        const { error } = await supabase.from('servicos').update(payload).eq('id', servico.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('servicos').insert(payload)
        if (error) throw error
      }

      onSaved?.()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao salvar serviço', err)
      setError(err?.message || 'Erro ao salvar serviço. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{servico ? 'Editar serviço' : 'Novo serviço'}</DialogTitle>
          <DialogDescription>Cadastre apenas o nome do serviço. O valor fica na ordem de serviço.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do serviço</Label>
            <Input id="nome" value={nome} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNome(e.target.value)} required />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar serviço'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
