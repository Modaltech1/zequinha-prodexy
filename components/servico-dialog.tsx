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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@prodexy/ui'
import { supabase } from '@/lib/supabaseClient'

export type ServicoRow = {
  id: string
  nome: string
  is_periodico?: boolean | null
  periodicidade_meses?: number | null
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
  const [isPeriodico, setIsPeriodico] = useState(false)
  const [periodicidadeMeses, setPeriodicidadeMeses] = useState('')

  useEffect(() => {
    setNome(servico?.nome || '')
    setIsPeriodico(Boolean(servico?.is_periodico))
    setPeriodicidadeMeses(servico?.periodicidade_meses ? String(servico.periodicidade_meses) : '')
    setError(null)
  }, [servico, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const nomeServico = nome.trim()
      if (!nomeServico) throw new Error('Informe o nome do serviço.')

      const meses = isPeriodico ? Number(periodicidadeMeses) : null
      if (isPeriodico && (!meses || meses < 1)) {
        throw new Error('Informe a periodicidade em meses para serviços periódicos.')
      }

      const payload = {
        nome: nomeServico,
        valor: 0,
        is_periodico: isPeriodico,
        periodicidade_meses: isPeriodico ? meses : null,
      }

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
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{servico ? 'Editar serviço' : 'Novo serviço'}</DialogTitle>
          <DialogDescription>
            Cadastre o serviço e, quando ele exigir retorno periódico, informe o intervalo em meses.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-2">
            <Label htmlFor="nome">Nome do serviço</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNome(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Serviço periódico?</Label>
              <Select value={isPeriodico ? 'sim' : 'nao'} onValueChange={(value: string) => setIsPeriodico(value === 'sim')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao">Não</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="periodicidade_meses">Periodicidade em meses</Label>
              <Input
                id="periodicidade_meses"
                type="number"
                min={1}
                step={1}
                value={periodicidadeMeses}
                disabled={!isPeriodico}
                placeholder="Ex.: 6"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPeriodicidadeMeses(e.target.value)}
              />
            </div>
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