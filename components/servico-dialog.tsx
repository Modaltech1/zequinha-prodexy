'use client'

import { useEffect, useState } from 'react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, Textarea } from '@prodexy/ui'
import { supabase } from '@/lib/supabaseClient'

export type ServicoRow = {
    id: string
    nome: string
    valor: number
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
    const [formData, setFormData] = useState({
        nome: '',
        valor: '',
    })

    useEffect(() => {
        if (servico) {
            setFormData({
                nome: servico.nome,
                valor: String(servico.valor ?? ''),
            })
        } else {
            setFormData({
                nome: '',
                valor: '',
            })
        }

        setError(null)
    }, [servico, open])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const payload = {
                nome: formData.nome.trim(),
                valor: Number(String(formData.valor).replace(',', '.')) || 0,
            }

            if (servico) {
                const { error } = await supabase
                    .from('servicos')
                    .update(payload)
                    .eq('id', servico.id)

                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('servicos')
                    .insert(payload)

                if (error) throw error
            }

            onSaved?.()
            onOpenChange(false)
        } catch (err: any) {
            console.error('Erro ao salvar serviço', err)
            setError('Erro ao salvar serviço. Verifique os dados e tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[640px]">
                <DialogHeader>
                    <DialogTitle>{servico ? 'Editar serviço' : 'Novo serviço'}</DialogTitle>
                </DialogHeader>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="nome">Nome</Label>
                            <Input
                                id="nome"
                                value={formData.nome}
                                onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="valor">Valor</Label>
                            <Input
                                id="valor"
                                value={formData.valor}
                                onChange={(e) => setFormData((prev) => ({ ...prev, valor: e.target.value }))}
                                placeholder="0,00"
                                required
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
