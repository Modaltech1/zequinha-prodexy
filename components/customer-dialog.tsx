// components/customer-dialog.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, Input, Label } from '@prodexy/ui'
import { supabase } from '@/lib/supabaseClient'

interface Customer {
    id: string
    nome: string
    telefone: string
    cpf_cnpj: string
    totalPurchases: number
    pendingAmount: number
}

interface CustomerDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    customer: Customer | null
    onSaved?: () => void
}

export function CustomerDialog({ open, onOpenChange, customer, onSaved, }: CustomerDialogProps) {
    const [formData, setFormData] = useState({
        nome: '',
        telefone: '',
        cpf_cnpj: '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (customer) {
            setFormData({
                nome: customer.nome,
                telefone: customer.telefone ?? '',
                cpf_cnpj: customer.cpf_cnpj ?? '',
            })
        } else {
            setFormData({
                nome: '',
                telefone: '',
                cpf_cnpj: '',
            })
        }
        setError(null)
    }, [customer, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            const payload: any = {
                nome: formData.nome.trim(),
                telefone: formData.telefone.trim(),
                cpf_cnpj: formData.cpf_cnpj.trim() || null,
            }

            if (customer) {
                // update
                const { error } = await supabase
                    .from('clientes')
                    .update({
                        ...payload,
                    })
                    .eq('id', customer.id)

                if (error) throw error
            } else {
                // insert
                const { error } = await supabase.from('clientes').insert(payload)
                if (error) throw error
            }

            onSaved?.()
            onOpenChange(false)
        } catch (err: any) {
            console.error('Erro ao salvar cliente', err)
            setError('Erro ao salvar cliente. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {customer ? 'Editar Cliente' : 'Novo Cliente'}
                    </DialogTitle>
                    <DialogDescription>Preencha os dados do cliente.</DialogDescription>
                </DialogHeader>

                {error && (
                    <p className="text-sm text-destructive mb-2">{error}</p>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input
                            id="name"
                            value={formData.nome}
                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefone</Label>
                            <Input
                                id="phone"
                                placeholder="(11) 98765-4321"
                                value={formData.telefone}
                                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cpf">CPF ou CNPJ (opcional)</Label>
                            <Input
                                id="cpf"
                                placeholder="123.456.789-00"
                                value={formData.cpf_cnpj}
                                onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
