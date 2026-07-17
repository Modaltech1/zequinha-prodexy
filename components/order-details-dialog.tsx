'use client'

import { useState } from 'react'
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@prodexy/ui'
import { Printer } from 'lucide-react'
import { printOrder, type PrintableOrder } from '@/components/order-print'

export type OrdemServicoItem = {
  id: string
  nome: string
  valor?: number
  quantidade?: number | null
  codigo_peca?: string | null
  observacao?: string | null
}

export type OrdemDiagnosticoItem = {
  id: string
  descricao: string
}

export type OrdemServicoDetails = PrintableOrder & {
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
  const [printFeedback, setPrintFeedback] = useState<string | null>(null)

  if (!order) return null

  function handlePrint() {
    if (!order) return
    printOrder(order)
    setPrintFeedback(`Impressão da OS #${order.numero} aberta em uma nova janela.`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[820px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div>
                <DialogTitle>OS #{order.numero}</DialogTitle>
                <DialogDescription>Detalhes da ordem de serviço.</DialogDescription>
              </div>
              <Badge variant={order.status === 'finalizada' ? 'default' : 'secondary'}>
                {formatStatus(order.status)}
              </Badge>
            </div>
            <Button type="button" variant="outline" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Imprimir A4
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {printFeedback && (
            <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">{printFeedback}</p>
          )}

          <Section title="Cliente">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>Nome: <span className="font-medium">{order.cliente_nome}</span></p>
              <p>Telefone: <span className="font-medium">{order.cliente_telefone || 'Não informado'}</span></p>
              <p>CPF/CNPJ: <span className="font-medium">{order.cliente_cpf_cnpj || 'Não informado'}</span></p>
            </div>
          </Section>

          <Section title="Veículo">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>Placa: <span className="font-medium">{order.veiculo_placa || 'Não informada'}</span></p>
              <p>Marca: <span className="font-medium">{order.veiculo_marca || 'Não informada'}</span></p>
              <p>Modelo: <span className="font-medium">{order.veiculo_modelo || 'Não informado'}</span></p>
              <p>Ano: <span className="font-medium">{order.veiculo_ano || 'Não informado'}</span></p>
              <p>Cor: <span className="font-medium">{order.veiculo_cor || 'Não informada'}</span></p>
              <p>KM entrada: <span className="font-medium">{order.km_entrada ?? '-'}</span></p>
              <p>Tem seguro?: <span className="font-medium">{order.veiculo_tem_seguro ? 'Sim' : 'Não'}</span></p>
            </div>
          </Section>

          <Section title="Serviços autorizados">
            <div className="space-y-2">
              {order.servicos.map((item) => {
                const quantidade = Math.max(1, Number(item.quantidade || 1))
                const valorLinha = Number(item.valor || 0) * quantidade
                return (
                <div key={item.id} className="rounded-lg border p-3">
                  <p className="font-medium">{item.nome} x{quantidade}</p>
                  <p className="text-sm text-muted-foreground">Valor: R$ {valorLinha.toFixed(2)}</p>
                  {item.codigo_peca && <p className="text-sm text-muted-foreground">Código peça: {item.codigo_peca}</p>}
                  {item.observacao && <p className="text-sm text-muted-foreground">Obs: {item.observacao}</p>}
                </div>
                )
              })}
              {order.servicos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum serviço adicionado.</p>}
            </div>
          </Section>

          <Section title="Produtos vendidos">
            <div className="space-y-2">
              {(order.produtos || []).map((item) => {
                const quantidade = Math.max(1, Number(item.quantidade || 1))
                const valorLinha = Number(item.valor_unitario || 0) * quantidade
                return (
                <div key={item.id} className="rounded-lg border p-3">
                  <p className="font-medium">{item.nome} x{quantidade}</p>
                  <p className="text-sm text-muted-foreground">Valor: R$ {valorLinha.toFixed(2)}</p>
                  {item.codigo && <p className="text-sm text-muted-foreground">Código produto: {item.codigo}</p>}
                  {item.observacao && <p className="text-sm text-muted-foreground">Obs: {item.observacao}</p>}
                </div>
                )
              })}
              {(order.produtos || []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum produto adicionado.</p>}
            </div>
          </Section>

          <Section title="Diagnóstico / não autorizado">
            <div className="space-y-2">
              {order.diagnosticos.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <p className="text-sm">{item.descricao}</p>
                </div>
              ))}
              {order.diagnosticos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum diagnóstico registrado.</p>}
            </div>
          </Section>

          <Section title="Resumo financeiro">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>Valor total: <span className="font-medium">R$ {Number(order.valor_total || 0).toFixed(2)}</span></p>
              <p>Valor final: <span className="font-medium">R$ {Number(order.valor_final || 0).toFixed(2)}</span></p>
              <p>Mão de obra: <span className="font-medium">R$ {Number(order.mao_de_obra || 0).toFixed(2)}</span></p>
              <p>Acréscimos: <span className="font-medium">R$ {Number(order.acrescimos || 0).toFixed(2)}</span></p>
              <p>Desconto: <span className="font-medium">- R$ {Number(order.desconto || 0).toFixed(2)}</span></p>
              <p>Responsável: <span className="font-medium">{order.responsavel_nome || '-'}</span></p>
              <p>Forma de pagamento: <span className="font-medium">{order.forma_pagamento || '-'}</span></p>
              <p>Criado em: <span className="font-medium">{new Date(order.criado_em).toLocaleString('pt-BR')}</span></p>
              <p>Atualizado em: <span className="font-medium">{order.atualizado_em ? new Date(order.atualizado_em).toLocaleString('pt-BR') : '-'}</span></p>
            </div>
          </Section>

          {order.observacoes && (
            <Section title="Observações">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.observacoes}</p>
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

function formatStatus(status: string | null) {
  const labels: Record<string, string> = {
    agendada: 'Agendada',
    aberta: 'Aberta',
    em_andamento: 'Em andamento',
    finalizada: 'Finalizada',
    cancelada: 'Cancelada',
  }

  return status ? labels[status] || status : 'Sem status'
}
