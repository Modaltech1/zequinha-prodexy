// components/customer-dialog.tsx
'use client'

import { useEffect, useState, type FormEvent } from 'react'
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Input,
    Label,
} from '@prodexy/ui'
import { supabase } from '@/lib/supabaseClient'

interface Customer {
    id: string
    nome: string
    telefone: string | null
    cpf_cnpj: string | null
    cidade: string | null
    bairro: string | null
    nascimento: string | null
    whatsapp_opt_in?: boolean
    totalPurchases?: number
    totalOrders?: number
}

interface CustomerDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    customer: Customer | null
    onSaved?: () => void
}

export function CustomerDialog({
    open,
    onOpenChange,
    customer,
    onSaved,
}: CustomerDialogProps) {
    const [formData, setFormData] = useState({
        nome: '',
        telefone: '',
        cpf_cnpj: '',
        cidade: '',
        bairro: '',
        nascimento: '',
        whatsapp_opt_in: true,
    })

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (customer) {
            setFormData({
                nome: customer.nome ?? '',
                telefone: customer.telefone ?? '',
                cpf_cnpj: customer.cpf_cnpj ?? '',
                cidade: customer.cidade ?? '',
                bairro: customer.bairro ?? '',
                nascimento: customer.nascimento ?? '',
                whatsapp_opt_in: Boolean(customer.whatsapp_opt_in),
            })
        } else {
            setFormData({
                nome: '',
                telefone: '',
                cpf_cnpj: '',
                cidade: '',
                bairro: '',
                nascimento: '',
                whatsapp_opt_in: true,
            })
        }

        setError(null)
    }, [customer, open])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            const payload = {
                nome: formData.nome.trim(),
                telefone: formData.telefone.trim() || null,
                cpf_cnpj: formData.cpf_cnpj.trim() || null,
                cidade: formData.cidade.trim() || null,
                bairro: formData.bairro.trim() || null,
                nascimento: formData.nascimento || null,
                whatsapp_opt_in: formData.whatsapp_opt_in,
            }

            if (!payload.nome) {
                throw new Error('Informe o nome do cliente.')
            }

            if (customer) {
                const { error } = await supabase
                    .from('clientes')
                    .update(payload)
                    .eq('id', customer.id)

                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('clientes')
                    .insert(payload)

                if (error) throw error
            }

            onSaved?.()
            onOpenChange(false)
        } catch (err: any) {
            console.error('Erro ao salvar cliente', err)
            setError(err?.message || 'Erro ao salvar cliente. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[560px]">
                <DialogHeader className="space-y-1">
                    <DialogTitle>
                        {customer ? 'Editar Cliente' : 'Novo Cliente'}
                    </DialogTitle>
                    <DialogDescription>
                        Preencha os dados do cliente. A data de nascimento é opcional e será usada para relacionamento.
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 [&_input]:border-[#d8c9b6] [&_input]:bg-white/80 [&_input]:shadow-sm [&_[role=combobox]]:border-[#d8c9b6] [&_[role=combobox]]:bg-white/80 [&_[role=combobox]]:shadow-sm">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome completo</Label>
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
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cpf">CPF ou CNPJ</Label>
                            <Input
                                id="cpf"
                                placeholder="123.456.789-00"
                                value={formData.cpf_cnpj}
                                onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="cidade">Cidade</Label>
                            <Input
                                id="cidade"
                                placeholder="Ex.: Vila Velha"
                                value={formData.cidade}
                                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bairro">Bairro</Label>
                            <Input
                                id="bairro"
                                placeholder="Ex.: Centro"
                                value={formData.bairro}
                                onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="nascimento">Data de nascimento</Label>
                        <Input
                            id="nascimento"
                            type="date"
                            value={formData.nascimento}
                            onChange={(e) => setFormData({ ...formData, nascimento: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                            Campo opcional. Use para campanhas de aniversário e relacionamento com o cliente.
                        </p>
                    </div>

                    <div className="flex items-start gap-2">
                        <input
                            id="whatsapp-opt-in"
                            type="checkbox"
                            className="mt-1 h-4 w-4"
                            checked={formData.whatsapp_opt_in}
                            onChange={(e) => setFormData({ ...formData, whatsapp_opt_in: e.target.checked })}
                        />
                        <Label htmlFor="whatsapp-opt-in" className="font-normal leading-snug">
                            Autoriza receber mensagens pelo WhatsApp.
                        </Label>
                    </div>

                    <DialogFooter className="gap-2 border-t pt-4 sm:justify-end [&>button]:w-full [&>button]:sm:w-auto">
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
