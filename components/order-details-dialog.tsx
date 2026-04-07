'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@prodexy/ui'
import { Badge } from '@prodexy/ui'

export type OrdemServicoItem = {
    id: string
    nome: string
    valor: number
}

export type OrdemServicoDetails = {
    id: string
    numero: string
    status: string
    valor_total: number
    valor_final: number
    observacoes: string | null
    criado_em: string
    atualizado_em: string | null
    cliente_nome: string
    cliente_telefone: string
    veiculo_placa: string | null
    veiculo_marca: string | null
    veiculo_modelo: string | null
    veiculo_ano: string | null
    veiculo_cor: string | null
    servicos: OrdemServicoItem[]
    fotos: { id: string; foto_url: string }[]
}

export function OrderDetailsDialog({
    open,
    onOpenChange,
    order,
}: {
    open: boolean
    onOpenChange: (value: boolean) => void
    order: OrdemServicoDetails | null
}) {
    if (!order) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between gap-3">
                        <DialogTitle>OS #{order.numero}</DialogTitle>
                        <Badge variant={order.status === 'finalizada' ? 'default' : 'secondary'}>
                            {order.status}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="space-y-5">
                    <Section title="Cliente">
                        <p className="font-medium">{order.cliente_nome}</p>
                        <p className="text-sm text-muted-foreground">
                            {order.cliente_telefone || 'Telefone não informado'}
                        </p>
                    </Section>

                    <Section title="Veículo">
                        <div className="grid gap-2 text-sm sm:grid-cols-2">
                            <p>Placa: <span className="font-medium">{order.veiculo_placa || 'Não informada'}</span></p>
                            <p>Marca: <span className="font-medium">{order.veiculo_marca || 'Não informada'}</span></p>
                            <p>Modelo: <span className="font-medium">{order.veiculo_modelo || 'Não informado'}</span></p>
                            <p>Ano: <span className="font-medium">{order.veiculo_ano || 'Não informado'}</span></p>
                            <p>Cor: <span className="font-medium">{order.veiculo_cor || 'Não informada'}</span></p>
                        </div>
                    </Section>

                    <Section title="Serviços">
                        <div className="space-y-2">
                            {order.servicos.map((item) => (
                                <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                                    <p className="font-medium">{item.nome}</p>
                                    <p className="font-medium">R$ {Number(item.valor || 0).toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section title="Resumo">
                        <div className="grid gap-2 text-sm sm:grid-cols-2">
                            <p>Valor total: <span className="font-medium">R$ {Number(order.valor_total || 0).toFixed(2)}</span></p>
                            <p>Valor final: <span className="font-medium">R$ {Number(order.valor_final || 0).toFixed(2)}</span></p>
                            <p>Criado em: <span className="font-medium">{new Date(order.criado_em).toLocaleString('pt-BR')}</span></p>
                            <p>Atualizado em: <span className="font-medium">{order.atualizado_em ? new Date(order.atualizado_em).toLocaleString('pt-BR') : '-'}</span></p>
                        </div>
                    </Section>

                    {order.observacoes && (
                        <Section title="Observações">
                            <p className="text-sm text-muted-foreground">{order.observacoes}</p>
                        </Section>
                    )}

                    <Section title="Fotos">
                        {order.fotos.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhuma foto registrada.</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {order.fotos.map((foto) => (
                                    <img
                                        key={foto.id}
                                        src={foto.foto_url}
                                        alt="Foto da OS"
                                        className="h-32 w-full rounded-lg border object-cover"
                                    />
                                ))}
                            </div>
                        )}
                    </Section>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2 rounded-xl border p-4">
            <p className="text-sm font-semibold">{title}</p>
            {children}
        </div>
    )
}