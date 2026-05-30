'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@prodexy/ui'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { OrderForm, type OrdemServicoEdit } from '@/components/order-form'

type OrdemRow = {
  id: string
  numero: string | null
  cliente_id: string | null
  veiculo_id: string | null
  veiculo_placa: string | null
  veiculo_marca: string | null
  veiculo_modelo: string | null
  veiculo_ano: string | null
  veiculo_cor: string | null
  veiculo_tem_seguro?: boolean | null
  valor_total: number | null
  valor_final: number | null
  status: string | null
  observacoes: string | null
  criado_em: string
  atualizado_em: string | null
  km_entrada?: number | null
  mao_de_obra?: number | null
  acrescimos?: number | null
  responsavel_id?: string | null
  forma_pagamento?: string | null
}

type OrdemServicoItemRow = {
  id: string
  os_id: string
  servico_id: string
  valor: number | null
  quantidade?: number | null
  codigo_peca?: string | null
  observacao?: string | null
}

type OrdemProdutoItemRow = {
  id: string
  os_id: string
  produto_id: string
  quantidade?: number | null
  valor_unitario?: number | null
  codigo_produto?: string | null
  observacao?: string | null
}

type Servico = {
  id: string
  nome: string
  is_periodico?: boolean | null
  periodicidade_meses?: number | null
}

type Produto = {
  id: string
  nome: string
  marca_modelo?: string | null
  codigo?: string | null
}

type OrdemFoto = {
  id: string
  os_id: string
  foto_url: string
}

type OrdemDiagnostico = {
  id: string
  os_id: string
  descricao: string
}

type VeiculoRow = {
  id: string
  cliente_id: string | null
  placa: string | null
  marca: string | null
  modelo: string | null
  ano: string | null
  cor: string | null
  km_atual?: number | null
  tem_seguro?: boolean | null
}

function normalizePlate(value: string | null | undefined) {
  return String(value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

const VEICULO_SELECT = 'id,cliente_id,placa,marca,modelo,ano,cor,km_atual,tem_seguro'

function getPlateVariants(value: string | null | undefined) {
  const raw = String(value || '').trim()
  const normalized = normalizePlate(raw)

  return Array.from(
    new Set(
      [
        raw,
        raw.toUpperCase(),
        normalized,
        normalized.length === 7 ? `${normalized.slice(0, 3)}-${normalized.slice(3)}` : '',
      ].filter(Boolean)
    )
  )
}

async function findVehicleForOrder(row: OrdemRow): Promise<VeiculoRow | null> {
  if (row.veiculo_id) {
    const { data, error } = await supabase
      .from('veiculos')
      .select(VEICULO_SELECT)
      .eq('id', row.veiculo_id)
      .maybeSingle()

    if (error) {
      console.error('Erro ao buscar veículo da OS pelo veiculo_id:', error)
    }

    if (data) {
      return data as VeiculoRow
    }
  }

  const orderPlate = normalizePlate(row.veiculo_placa)

  if (!orderPlate) {
    return null
  }

  const plateVariants = getPlateVariants(row.veiculo_placa)

  // 1) Primeiro tenta buscar pela placa, respeitando cliente_id da OS se existir.
  for (const plate of plateVariants) {
    let query = supabase
      .from('veiculos')
      .select(VEICULO_SELECT)
      .ilike('placa', plate)

    if (row.cliente_id) {
      query = query.eq('cliente_id', row.cliente_id)
    }

    const { data, error } = await query.limit(20)

    if (error) {
      console.error('Erro ao buscar veículo por placa dentro do cliente da OS:', error)
      continue
    }

    const match = ((data as VeiculoRow[]) || []).find(
      (vehicle) => normalizePlate(vehicle.placa) === orderPlate
    )

    if (match) {
      return match
    }
  }

  // 2) Se a OS antiga estiver sem cliente_id, busca pela placa sem travar no cliente.
  for (const plate of plateVariants) {
    const { data, error } = await supabase
      .from('veiculos')
      .select(VEICULO_SELECT)
      .ilike('placa', plate)
      .limit(20)

    if (error) {
      console.error('Erro ao buscar veículo por placa sem cliente:', error)
      continue
    }

    const match = ((data as VeiculoRow[]) || []).find(
      (vehicle) => normalizePlate(vehicle.placa) === orderPlate
    )

    if (match) {
      return match
    }
  }

  // 3) Último fallback: varre os veículos e compara placa normalizada.
  // Isso cobre placa salva como ODH7J56 em um lugar e ODH-7J56 em outro.
  const { data: vehicles, error } = await supabase
    .from('veiculos')
    .select(VEICULO_SELECT)
    .range(0, 9999)

  if (error) {
    console.error('Erro ao buscar veículos para relacionar OS pela placa normalizada:', error)
    return null
  }

  const match = ((vehicles as VeiculoRow[]) || []).find(
    (vehicle) => normalizePlate(vehicle.placa) === orderPlate
  )

  return match || null
}

export function OrderEditorPage({
  orderId,
  collaboratorMode = false,
}: {
  orderId?: string
  collaboratorMode?: boolean
}) {
  const params = useParams<{ id?: string | string[] }>()
  const routeOrderId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const effectiveOrderId = orderId || routeOrderId
  const router = useRouter()
  const [loading, setLoading] = useState(Boolean(effectiveOrderId))
  const [order, setOrder] = useState<OrdemServicoEdit | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const basePath = collaboratorMode ? '/colaborador/ordens' : '/admin/ordens'

  useEffect(() => {
    if (!effectiveOrderId) return

    async function loadOrderForEdit() {
      setLoading(true)
      setLoadError(null)
      const orderRes = await supabase.from('ordens_de_servico').select('*').eq('id', effectiveOrderId).single()

      if (orderRes.error || !orderRes.data) {
        console.error('Erro ao carregar OS para edição:', orderRes.error)
        setLoadError('Não foi possível carregar os dados desta OS para edição.')
        setLoading(false)
        return
      }

      const row = orderRes.data as OrdemRow
      const [serviceRowsRes, productRowsRes, servicosRes, produtosRes, diagnosticosRes, fotosRes] = await Promise.all([
        supabase.from('ordem_servicos').select('id,os_id,servico_id,valor,quantidade,codigo_peca,observacao').eq('os_id', effectiveOrderId),
        supabase.from('ordem_produtos').select('id,os_id,produto_id,quantidade,valor_unitario,codigo_produto,observacao').eq('os_id', effectiveOrderId),
        supabase.from('servicos').select('id,nome,is_periodico,periodicidade_meses'),
        supabase.from('produtos').select('id,nome,marca_modelo,codigo'),
        supabase.from('ordem_diagnosticos').select('id,os_id,descricao').eq('os_id', effectiveOrderId),
        supabase.from('ordem_fotos').select('id,os_id,foto_url').eq('os_id', effectiveOrderId),
      ])


      const veiculoFallback = await findVehicleForOrder(row)

      console.log('[OS EDIT] Dados resolvidos para edição:', {
        os_id: row.id,
        os_cliente_id: row.cliente_id,
        os_veiculo_id: row.veiculo_id,
        os_placa: row.veiculo_placa,
        veiculo_encontrado_id: veiculoFallback?.id,
        cliente_do_veiculo: veiculoFallback?.cliente_id,
      })

      const servicesById = (((servicosRes.data as Servico[]) || []).reduce<Record<string, Servico>>((acc, item) => {
        acc[item.id] = item
        return acc
      }, {}))
      const productsById = (((produtosRes.data as Produto[]) || []).reduce<Record<string, Produto>>((acc, item) => {
        acc[item.id] = item
        return acc
      }, {}))

      const mapped: OrdemServicoEdit = {
        id: row.id,
        numero: row.numero,
        cliente_id: row.cliente_id || veiculoFallback?.cliente_id || null,
        veiculo_id: row.veiculo_id || veiculoFallback?.id || null,
        veiculo_placa: row.veiculo_placa || veiculoFallback?.placa || null,
        veiculo_marca: row.veiculo_marca || veiculoFallback?.marca || null,
        veiculo_modelo: row.veiculo_modelo || veiculoFallback?.modelo || null,
        veiculo_ano: row.veiculo_ano || veiculoFallback?.ano || null,
        veiculo_cor: row.veiculo_cor || veiculoFallback?.cor || null,
        veiculo_tem_seguro: typeof row.veiculo_tem_seguro === 'boolean' ? row.veiculo_tem_seguro : Boolean(veiculoFallback?.tem_seguro),
        valor_total: Number(row.valor_total || 0),
        valor_final: Number(row.valor_final || 0),
        status: row.status,
        observacoes: row.observacoes,
        criado_em: row.criado_em,
        atualizado_em: row.atualizado_em,
        km_entrada: row.km_entrada == null
          ? veiculoFallback?.km_atual == null ? null : Number(veiculoFallback.km_atual)
          : Number(row.km_entrada),
        mao_de_obra: row.mao_de_obra == null ? 0 : Number(row.mao_de_obra),
        acrescimos: row.acrescimos == null ? 0 : Number(row.acrescimos),
        responsavel_id: row.responsavel_id || null,
        forma_pagamento: row.forma_pagamento || null,
        servicos: ((serviceRowsRes.data as OrdemServicoItemRow[]) || []).map((item) => ({
          id: item.id,
          servico_id: item.servico_id,
          nome: servicesById[item.servico_id]?.nome || 'Serviço não identificado',
          valor: Number(item.valor || 0),
          quantidade: item.quantidade == null ? 1 : Number(item.quantidade),
          codigo_peca: item.codigo_peca || null,
          observacao: item.observacao || null,
          is_periodico: servicesById[item.servico_id]?.is_periodico,
          periodicidade_meses: servicesById[item.servico_id]?.periodicidade_meses,
        })),
        produtos: ((productRowsRes.data as OrdemProdutoItemRow[]) || []).map((item) => ({
          id: item.id,
          produto_id: item.produto_id,
          nome: productsById[item.produto_id]?.nome || 'Produto não identificado',
          marca_modelo: productsById[item.produto_id]?.marca_modelo || null,
          codigo: item.codigo_produto || productsById[item.produto_id]?.codigo || null,
          valor_unitario: Number(item.valor_unitario || 0),
          quantidade: item.quantidade == null ? 1 : Number(item.quantidade),
          observacao: item.observacao || null,
        })),
        diagnosticos: ((diagnosticosRes.data as OrdemDiagnostico[]) || []).map((item) => ({
          id: item.id,
          descricao: item.descricao,
        })),
        fotos: ((fotosRes.data as OrdemFoto[]) || []).map((item) => ({
          id: item.id,
          foto_url: item.foto_url,
        })),
      }

      setOrder(mapped)
      setLoading(false)
    }

    loadOrderForEdit()
  }, [effectiveOrderId])

  if (loading) {
    return (
      <div className="space-y-4">
        <Button variant="outline" className="gap-2" onClick={() => router.push(basePath)}>
          <ArrowLeft className="h-4 w-4" />
          Voltar para ordens
        </Button>
        <p className="text-sm text-muted-foreground">Carregando dados da OS...</p>
      </div>
    )
  }

  if (effectiveOrderId && loadError) {
    return (
      <div className="space-y-4">
        <Button variant="outline" className="gap-2" onClick={() => router.push(basePath)}>
          <ArrowLeft className="h-4 w-4" />
          Voltar para ordens
        </Button>
        <p className="text-sm text-destructive">{loadError}</p>
      </div>
    )
  }

  return <OrderForm order={order} onCancel={() => router.push(basePath)} onSaved={() => router.push(basePath)} />
}
