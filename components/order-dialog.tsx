'use client'

import { useEffect, useMemo, useState } from 'react'
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
  Textarea,
} from '@prodexy/ui'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export type ClienteOption = {
  id: string
  nome: string | null
  cpf_cnpj?: string | null
  telefone?: string | null
  email?: string | null
  cidade?: string | null
  bairro?: string | null
  nascimento?: string | null
}

export type ServicoOption = {
  id: string
  nome: string
  is_periodico?: boolean | null
  periodicidade_meses?: number | null
}

export type OrdemServicoEdit = {
  id: string
  numero: string | null
  cliente_id: string | null
  veiculo_id?: string | null
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
  servicos: {
    id?: string
    servico_id: string
    nome: string
    valor?: number
    is_periodico?: boolean | null
    periodicidade_meses?: number | null
  }[]
  diagnosticos: {
    id?: string
    descricao: string
  }[]
  fotos: {
    id?: string
    foto_url: string
  }[]
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: OrdemServicoEdit | null
  onSaved?: () => void
}

type ServicoSelecionado = {
  servico_id: string
  nome: string
  is_periodico?: boolean | null
  periodicidade_meses?: number | null
}

type DiagnosticoSelecionado = {
  id?: string
  descricao: string
}

type VeiculoOption = {
  id: string
  cliente_id: string
  placa: string | null
  marca: string | null
  modelo: string | null
  ano: string | null
  cor: string | null
  km_atual: number | null
  tem_seguro?: boolean | null
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '')
}

function parseMoney(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.')
  return Number(normalized) || 0
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addMonths(date: Date, months: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

async function insertWithOptionalCreatedAt(table: 'ordem_servicos' | 'ordem_diagnosticos', rows: Record<string, any>[]) {
  if (rows.length === 0) return

  const { error } = await supabase.from(table).insert(rows)
  if (!error) return

  const message = String(error.message || '').toLowerCase()
  const details = String((error as any).details || '').toLowerCase()
  const hint = String((error as any).hint || '').toLowerCase()
  const mentionsCreatedAt = [message, details, hint].some((value) =>
    value.includes('criado_em') || value.includes('created_at')
  )

  // Alguns bancos exigem timestamp na tabela filha sem default.
  if (!mentionsCreatedAt) throw error

  const now = new Date().toISOString()
  const rowsWithCreatedAt = rows.map((row) => ({ ...row, criado_em: now }))
  const { error: retryError } = await supabase.from(table).insert(rowsWithCreatedAt)
  if (retryError) throw retryError
}

export function OrderDialog({ open, onOpenChange, order, onSaved }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [servicosDisponiveis, setServicosDisponiveis] = useState<ServicoOption[]>([])
  const [veiculos, setVeiculos] = useState<VeiculoOption[]>([])

  const [numero, setNumero] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [clienteSearch, setClienteSearch] = useState('')
  const [createClientInline, setCreateClientInline] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientCpf, setNewClientCpf] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  const [newClientCity, setNewClientCity] = useState('')
  const [newClientDistrict, setNewClientDistrict] = useState('')
  const [newClientBirth, setNewClientBirth] = useState('')

  const [veiculoId, setVeiculoId] = useState('')
  const [isNovoVeiculo, setIsNovoVeiculo] = useState(true)
  const [veiculoPlaca, setVeiculoPlaca] = useState('')
  const [veiculoMarca, setVeiculoMarca] = useState('')
  const [veiculoModelo, setVeiculoModelo] = useState('')
  const [veiculoAno, setVeiculoAno] = useState('')
  const [veiculoCor, setVeiculoCor] = useState('')
  const [veiculoTemSeguro, setVeiculoTemSeguro] = useState(false)

  const [status, setStatus] = useState('em_andamento')
  const [observacoes, setObservacoes] = useState('')
  const [valorOs, setValorOs] = useState('')

  const [servicos, setServicos] = useState<ServicoSelecionado[]>([])
  const [novoServicoId, setNovoServicoId] = useState('')
  const [novoDiagnostico, setNovoDiagnostico] = useState('')
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoSelecionado[]>([])

  const [existingPhotos, setExistingPhotos] = useState<{ id?: string; foto_url: string }[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  async function loadBaseData() {
    const [clientesRes, servicosRes] = await Promise.all([
      supabase.from('clientes').select('id, nome, cpf_cnpj, telefone, email, cidade, bairro, nascimento').order('nome', { ascending: true }),
      supabase.from('servicos').select('id, nome, is_periodico, periodicidade_meses').order('nome', { ascending: true }),
    ])

    if (clientesRes.error) {
      console.error('Erro ao carregar clientes:', clientesRes.error)
      setClientes([])
    } else {
      setClientes((clientesRes.data as ClienteOption[]) || [])
    }

    if (servicosRes.error) {
      console.error('Erro ao carregar serviços:', servicosRes.error)
      setServicosDisponiveis([])
    } else {
      setServicosDisponiveis((servicosRes.data as ServicoOption[]) || [])
    }
  }

  async function loadVehiclesByCustomer(customerId: string) {
    if (!customerId) {
      setVeiculos([])
      return
    }

    const { data, error } = await supabase
      .from('veiculos')
      .select('id, cliente_id, placa, marca, modelo, ano, cor, km_atual, tem_seguro')
      .eq('cliente_id', customerId)
      .order('placa', { ascending: true })

    if (error) {
      console.error('Erro ao carregar veículos:', error)
      setVeiculos([])
      return
    }

    setVeiculos((data as VeiculoOption[]) || [])
  }

  useEffect(() => {
    if (open) loadBaseData()
  }, [open])

  useEffect(() => {
    if (!open) return
    loadVehiclesByCustomer(clienteId)
  }, [clienteId, open])

  useEffect(() => {
    if (!veiculoId) return
    const selected = veiculos.find((item) => item.id === veiculoId)
    if (!selected) return

    setVeiculoPlaca(selected.placa || '')
    setVeiculoMarca(selected.marca || '')
    setVeiculoModelo(selected.modelo || '')
    setVeiculoAno(selected.ano || '')
    setVeiculoCor(selected.cor || '')
    setVeiculoTemSeguro(Boolean(selected.tem_seguro))
  }, [veiculoId, veiculos])

  useEffect(() => {
    if (order) {
      setNumero(order.numero || '')
      setClienteId(order.cliente_id || '')
      setClienteSearch('')
      setCreateClientInline(false)
      setVeiculoId(order.veiculo_id || '')
      setIsNovoVeiculo(!order.veiculo_id)
      setVeiculoPlaca(order.veiculo_placa || '')
      setVeiculoMarca(order.veiculo_marca || '')
      setVeiculoModelo(order.veiculo_modelo || '')
      setVeiculoAno(order.veiculo_ano || '')
      setVeiculoCor(order.veiculo_cor || '')
      setVeiculoTemSeguro(Boolean(order.veiculo_tem_seguro))
      setStatus(order.status || 'em_andamento')
      setObservacoes(order.observacoes || '')
      setValorOs(String(Number(order.valor_final || order.valor_total || 0).toFixed(2)).replace('.', ','))
      setServicos(
        (order.servicos || []).map((s) => ({
          servico_id: s.servico_id,
          nome: s.nome,
          is_periodico: s.is_periodico,
          periodicidade_meses: s.periodicidade_meses,
        }))
      )
      setDiagnosticos(order.diagnosticos || [])
      setExistingPhotos(order.fotos || [])
    } else {
      setNumero('')
      setClienteId('')
      setClienteSearch('')
      setCreateClientInline(false)
      setNewClientName('')
      setNewClientCpf('')
      setNewClientPhone('')
      setNewClientEmail('')
      setNewClientCity('')
      setNewClientDistrict('')
      setNewClientBirth('')
      setVeiculoId('')
      setIsNovoVeiculo(true)
      setVeiculoPlaca('')
      setVeiculoMarca('')
      setVeiculoModelo('')
      setVeiculoAno('')
      setVeiculoCor('')
      setVeiculoTemSeguro(false)
      setStatus('em_andamento')
      setObservacoes('')
      setValorOs('')
      setServicos([])
      setDiagnosticos([])
      setExistingPhotos([])
    }

    setNovoServicoId('')
    setNovoDiagnostico('')
    setNewFiles([])
    setPreviewUrls([])
    setError(null)
  }, [order, open])

  const totalFotos = existingPhotos.length + newFiles.length
  const valorTotal = useMemo(() => parseMoney(valorOs), [valorOs])

  const clientesFiltrados = useMemo(() => {
    const term = clienteSearch.trim().toLowerCase()
    const digits = normalizeDigits(clienteSearch)
    if (!term && !digits) return clientes.slice(0, 30)
    return clientes.filter((cliente) => {
      const searchable = [cliente.nome || '', cliente.telefone || '', cliente.cpf_cnpj || '', cliente.email || '', cliente.cidade || '', cliente.bairro || '']
        .join(' ')
        .toLowerCase()
      const docDigits = normalizeDigits(cliente.cpf_cnpj || '')
      return searchable.includes(term) || (!!digits && docDigits.includes(digits))
    }).slice(0, 30)
  }, [clientes, clienteSearch])

  const selectedCustomer = clientes.find((cliente) => cliente.id === clienteId)

  function clearVehicle() {
    setVeiculoId('')
    setIsNovoVeiculo(true)
    setVeiculoPlaca('')
    setVeiculoMarca('')
    setVeiculoModelo('')
    setVeiculoAno('')
    setVeiculoCor('')
    setVeiculoTemSeguro(false)
  }

  function handleAddServico() {
    const selected = servicosDisponiveis.find((s) => s.id === novoServicoId)
    if (!selected) return

    const alreadyAdded = servicos.some((s) => s.servico_id === selected.id)
    if (alreadyAdded) {
      setNovoServicoId('')
      return
    }

    setServicos((prev) => [
      ...prev,
      {
        servico_id: selected.id,
        nome: selected.nome,
        is_periodico: selected.is_periodico,
        periodicidade_meses: selected.periodicidade_meses,
      },
    ])
    setNovoServicoId('')
  }

  function handleRemoveServico(index: number) {
    setServicos((prev) => prev.filter((_, i) => i !== index))
  }

  function handleAddDiagnostico() {
    const descricao = novoDiagnostico.trim()
    if (!descricao) return
    setDiagnosticos((prev) => [...prev, { descricao }])
    setNovoDiagnostico('')
  }

  function handleRemoveDiagnostico(index: number) {
    setDiagnosticos((prev) => prev.filter((_, i) => i !== index))
  }

  function handleAddFiles(files: FileList | null) {
    if (!files) return

    const incoming = Array.from(files)
    const available = 5 - (existingPhotos.length + newFiles.length)
    const accepted = incoming.slice(0, Math.max(available, 0))

    if (accepted.length === 0) return

    setNewFiles((prev) => [...prev, ...accepted])
    setPreviewUrls((prev) => [...prev, ...accepted.map((file) => URL.createObjectURL(file))])
  }

  function removeExistingPhoto(index: number) {
    setExistingPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  function removeNewPhoto(index: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index))
  }

  async function uploadPhoto(file: File, osId: string) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('itemId', osId)
    formData.append('folder', 'ordens-servico')

    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result?.error || 'Erro ao enviar imagem')
    }

    return {
      key: result.key as string,
      url: result.url as string,
    }
  }

  async function ensureCustomer() {
    if (clienteId) return clienteId
    if (!createClientInline) throw new Error('Selecione um cliente ou cadastre um novo pelo modal.')
    if (!newClientName.trim()) throw new Error('Informe o nome do novo cliente.')

    const { data, error } = await supabase
      .from('clientes')
      .insert({
        nome: newClientName.trim(),
        cpf_cnpj: newClientCpf.trim() || null,
        telefone: newClientPhone.trim() || null,
        email: newClientEmail.trim() || null,
        cidade: newClientCity.trim() || null,
        bairro: newClientDistrict.trim() || null,
        nascimento: newClientBirth || null,
      })
      .select('id, nome, cpf_cnpj, telefone, email, cidade, bairro, nascimento')
      .single()

    if (error) throw error
    const created = data as ClienteOption
    setClientes((prev) => [...prev, created].sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''))))
    setClienteId(created.id)
    return created.id
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const uploadedKeys: string[] = []

    try {
      const selectedServicoFromDraft = servicosDisponiveis.find((item) => item.id === novoServicoId)
      const servicosToPersist = (() => {
        const current = [...servicos]
        if (selectedServicoFromDraft && !current.some((item) => item.servico_id === selectedServicoFromDraft.id)) {
          current.push({
            servico_id: selectedServicoFromDraft.id,
            nome: selectedServicoFromDraft.nome,
            is_periodico: selectedServicoFromDraft.is_periodico,
            periodicidade_meses: selectedServicoFromDraft.periodicidade_meses,
          })
        }
        return current
      })()

      const diagnosticosToPersist = (() => {
        const current = [...diagnosticos]
        const draft = novoDiagnostico.trim()
        if (draft) current.push({ descricao: draft })
        return current
      })()

      const finalClienteId = await ensureCustomer()
      if (!finalClienteId) throw new Error('Selecione um cliente.')
      if (!isNovoVeiculo && !veiculoId) throw new Error('Selecione um veículo ou cadastre um novo.')
      if (isNovoVeiculo && !veiculoPlaca.trim()) throw new Error('Informe a placa do veículo.')

      let finalVeiculoId = veiculoId || null
      let finalVeiculoPlaca = veiculoPlaca.trim() || null
      let finalVeiculoMarca = veiculoMarca.trim() || null
      let finalVeiculoModelo = veiculoModelo.trim() || null
      let finalVeiculoAno = veiculoAno.trim() || null
      let finalVeiculoCor = veiculoCor.trim() || null
      let finalVeiculoTemSeguro = veiculoTemSeguro

      if (isNovoVeiculo) {
        const payloadVeiculo = {
          cliente_id: finalClienteId,
          placa: finalVeiculoPlaca,
          marca: finalVeiculoMarca,
          modelo: finalVeiculoModelo,
          ano: finalVeiculoAno,
          cor: finalVeiculoCor,
          tem_seguro: finalVeiculoTemSeguro,
          atualizado_em: new Date().toISOString(),
        }

        const { data: veiculoData, error: veiculoError } = await supabase
          .from('veiculos')
          .insert({
            ...payloadVeiculo,
            criado_em: new Date().toISOString(),
          })
          .select('id, placa, marca, modelo, ano, cor, tem_seguro')
          .single()

        if (veiculoError) throw veiculoError

        finalVeiculoId = veiculoData.id
        finalVeiculoPlaca = veiculoData.placa || finalVeiculoPlaca
        finalVeiculoMarca = veiculoData.marca || finalVeiculoMarca
        finalVeiculoModelo = veiculoData.modelo || finalVeiculoModelo
        finalVeiculoAno = veiculoData.ano || finalVeiculoAno
        finalVeiculoCor = veiculoData.cor || finalVeiculoCor
        finalVeiculoTemSeguro = Boolean(veiculoData.tem_seguro)
      } else {
        const selected = veiculos.find((item) => item.id === veiculoId)
        if (!selected) throw new Error('Veículo selecionado não encontrado para o cliente.')

        finalVeiculoPlaca = selected.placa || finalVeiculoPlaca
        finalVeiculoMarca = selected.marca || finalVeiculoMarca
        finalVeiculoModelo = selected.modelo || finalVeiculoModelo
        finalVeiculoAno = selected.ano || finalVeiculoAno
        finalVeiculoCor = selected.cor || finalVeiculoCor
        finalVeiculoTemSeguro = Boolean(selected.tem_seguro)
      }

      const payload = {
        numero: numero.trim() || null,
        cliente_id: finalClienteId,
        veiculo_id: finalVeiculoId,
        veiculo_placa: finalVeiculoPlaca,
        veiculo_marca: finalVeiculoMarca,
        veiculo_modelo: finalVeiculoModelo,
        veiculo_ano: finalVeiculoAno,
        veiculo_cor: finalVeiculoCor,
        veiculo_tem_seguro: finalVeiculoTemSeguro,
        valor_total: valorTotal,
        valor_final: valorTotal,
        status,
        observacoes: observacoes.trim() || null,
        atualizado_em: new Date().toISOString(),
      }

      let osId = order?.id || null

      if (order) {
        const { error } = await supabase.from('ordens_de_servico').update(payload).eq('id', order.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('ordens_de_servico')
          .insert({
            ...payload,
            criado_em: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (error) throw error
        osId = data.id
      }

      if (!osId) throw new Error('OS não identificada.')

      if (order) {
        const { error: deleteServicosError } = await supabase
          .from('ordem_servicos')
          .delete()
          .eq('os_id', osId)

        if (deleteServicosError) throw deleteServicosError
      }

      if (servicosToPersist.length > 0) {
        await insertWithOptionalCreatedAt(
          'ordem_servicos',
          servicosToPersist.map((s) => ({
            os_id: osId,
            servico_id: s.servico_id,
            valor: 0,
          }))
        )
      }

      if (finalVeiculoId && status !== 'cancelada') {
        const today = new Date()

        const periodicMaintenances = servicosToPersist
          .map((servico) => {
            const meta = servicosDisponiveis.find((item) => item.id === servico.servico_id) || servico
            const months = Number(meta.periodicidade_meses || 0)

            if (!meta.is_periodico || months < 1) return null

            return {
              veiculo_id: finalVeiculoId,
              servico_id: servico.servico_id,
              tipo: meta.nome,
              descricao: `Manutenção periódica gerada pela OS ${numero.trim() || osId}`,
              periodicidade_meses: months,
              ultima_data: formatDateInput(today),
              proxima_data: formatDateInput(addMonths(today, months)),
              status: 'pendente',
              ultima_os_id: osId,
              atualizado_em: new Date().toISOString(),
            }
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item))

        if (periodicMaintenances.length > 0) {
          const { error: manutencoesError } = await supabase
            .from('manutencoes_veiculo')
            .upsert(periodicMaintenances, { onConflict: 'veiculo_id,servico_id' })

          if (manutencoesError) throw manutencoesError
        }
      }

      if (order) {
        const { error: deleteDiagnosticosError } = await supabase
          .from('ordem_diagnosticos')
          .delete()
          .eq('os_id', osId)

        if (deleteDiagnosticosError) throw deleteDiagnosticosError
      }

      const diagnosticosValidos = diagnosticosToPersist.map((item) => item.descricao.trim()).filter(Boolean)
      if (diagnosticosValidos.length > 0) {
        await insertWithOptionalCreatedAt(
          'ordem_diagnosticos',
          diagnosticosValidos.map((descricao) => ({ os_id: osId, descricao }))
        )
      }

      const oldPhotoIds = new Set((order?.fotos || []).map((f) => f.id).filter(Boolean))
      const keptPhotoIds = new Set(existingPhotos.map((f) => f.id).filter(Boolean))
      const removedPhotoIds = [...oldPhotoIds].filter((id) => !keptPhotoIds.has(id))

      if (removedPhotoIds.length > 0) {
        const removedPhotos = (order?.fotos || []).filter((f) => f.id && removedPhotoIds.includes(f.id))
        for (const photo of removedPhotos) {
          const key = (() => {
            try {
              const url = new URL(photo.foto_url)
              return url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname
            } catch {
              return ''
            }
          })()

          if (key) {
            await fetch('/api/delete-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key }),
            }).catch(() => { })
          }
        }

        const { error: deletePhotosError } = await supabase
          .from('ordem_fotos')
          .delete()
          .in('id', removedPhotoIds)

        if (deletePhotosError) throw deletePhotosError
      }

      if (newFiles.length > 0) {
        const uploaded = []
        for (const file of newFiles) {
          const result = await uploadPhoto(file, osId)
          uploadedKeys.push(result.key)
          uploaded.push({
            os_id: osId,
            foto_url: result.url,
            criado_em: new Date().toISOString(),
          })
        }

        const { error: insertPhotosError } = await supabase
          .from('ordem_fotos')
          .insert(uploaded)

        if (insertPhotosError) throw insertPhotosError
      }

      onSaved?.()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao salvar OS:', err)

      for (const key of uploadedKeys) {
        await fetch('/api/delete-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key }),
        }).catch(() => { })
      }

      setError(err?.message || 'Erro ao salvar ordem de serviço.')
    } finally {
      setLoading(false)
    }
  }

  const availableServicesToAdd = servicosDisponiveis.filter(
    (servico) => !servicos.some((item) => item.servico_id === servico.id)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[960px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? 'Editar ordem de serviço' : 'Nova ordem de serviço'}</DialogTitle>
          <DialogDescription>
            Selecione ou cadastre o cliente, registre o veículo, serviços, diagnóstico e o valor final da OS.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="numero">Número da OS</Label>
              <Input id="numero" value={numero} placeholder="2026-001" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNumero(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="finalizada">Finalizada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor-os">Valor total da OS</Label>
              <Input
                id="valor-os"
                value={valorOs}
                placeholder="Ex.: 350,00"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValorOs(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Cliente</p>
                <p className="text-xs text-muted-foreground">Busque por CPF/CNPJ, nome, telefone ou email. Se não encontrar, cadastre aqui mesmo.</p>
              </div>
              <Button type="button" variant="outline" onClick={() => setCreateClientInline((prev) => !prev)}>
                {createClientInline ? 'Usar cliente existente' : 'Cadastrar cliente no modal'}
              </Button>
            </div>

            {!createClientInline && (
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
                <div className="space-y-2">
                  <Label htmlFor="cliente-search">Procurar cliente</Label>
                  <Input
                    id="cliente-search"
                    value={clienteSearch}
                    placeholder="Digite CPF, nome ou telefone"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClienteSearch(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Selecionar cliente</Label>
                  <Select
                    value={clienteId}
                    onValueChange={(value: string) => {
                      setClienteId(value)
                      clearVehicle()
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientesFiltrados.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome || 'Cliente sem nome'}{cliente.cpf_cnpj ? ` • ${cliente.cpf_cnpj}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCustomer && (
                    <p className="text-xs text-muted-foreground">
                      Selecionado: {selectedCustomer.nome}{selectedCustomer.cpf_cnpj ? ` • ${selectedCustomer.cpf_cnpj}` : ''}
                    </p>
                  )}
                </div>
              </div>
            )}

            {createClientInline && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="novo-cliente-nome">Nome</Label>
                  <Input id="novo-cliente-nome" value={newClientName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClientName(e.target.value)} required={createClientInline} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="novo-cliente-cpf">CPF/CNPJ</Label>
                  <Input id="novo-cliente-cpf" value={newClientCpf} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClientCpf(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="novo-cliente-telefone">Telefone</Label>
                  <Input id="novo-cliente-telefone" value={newClientPhone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClientPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="novo-cliente-email">Email</Label>
                  <Input id="novo-cliente-email" type="email" value={newClientEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClientEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="novo-cliente-cidade">Cidade</Label>
                  <Input id="novo-cliente-cidade" value={newClientCity} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClientCity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="novo-cliente-bairro">Bairro</Label>
                  <Input id="novo-cliente-bairro" value={newClientDistrict} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClientDistrict(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="novo-cliente-nascimento">Nascimento</Label>
                  <Input id="novo-cliente-nascimento" type="date" value={newClientBirth} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClientBirth(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-xl border p-4">
            <p className="text-sm font-semibold">Veículo</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={veiculoId}
                onValueChange={(value: string) => {
                  setVeiculoId(value)
                  setIsNovoVeiculo(false)
                }}
                disabled={!clienteId || createClientInline || veiculos.length === 0}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue
                    placeholder={
                      !clienteId || createClientInline
                        ? 'Selecione ou salve um cliente primeiro'
                        : veiculos.length === 0
                          ? 'Nenhum veículo cadastrado'
                          : 'Selecione um veículo cadastrado'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {veiculos.map((veiculo) => (
                    <SelectItem key={veiculo.id} value={veiculo.id}>
                      {(veiculo.placa || 'Sem placa')} - {[veiculo.marca, veiculo.modelo].filter(Boolean).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={clearVehicle} disabled={!clienteId && !createClientInline}>
                Cadastrar novo veículo
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="placa">Placa</Label>
                <Input id="placa" value={veiculoPlaca} placeholder="ABC1D23" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVeiculoPlaca(e.target.value)} disabled={!isNovoVeiculo} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marca">Marca</Label>
                <Input id="marca" value={veiculoMarca} placeholder="Fiat" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVeiculoMarca(e.target.value)} disabled={!isNovoVeiculo} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelo">Modelo</Label>
                <Input id="modelo" value={veiculoModelo} placeholder="Uno Way" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVeiculoModelo(e.target.value)} disabled={!isNovoVeiculo} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ano">Ano</Label>
                <Input id="ano" value={veiculoAno} placeholder="2018" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVeiculoAno(e.target.value)} disabled={!isNovoVeiculo} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cor">Cor</Label>
                <Input id="cor" value={veiculoCor} placeholder="prata" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVeiculoCor(e.target.value)} disabled={!isNovoVeiculo} />
              </div>
              <div className="space-y-2">
                <Label>Tem seguro?</Label>
                <Select value={veiculoTemSeguro ? 'sim' : 'nao'} onValueChange={(value: string) => setVeiculoTemSeguro(value === 'sim')} disabled={!isNovoVeiculo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao">Não</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border p-4">
            <p className="text-sm font-semibold">Serviços autorizados na OS</p>
            <p className="text-xs text-muted-foreground">O catálogo de serviços não possui valor. O valor final fica na própria OS.</p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <Select value={novoServicoId} onValueChange={setNovoServicoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um serviço para adicionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableServicesToAdd.map((servico) => (
                      <SelectItem key={servico.id} value={servico.id}>
                        {servico.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" onClick={handleAddServico} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar serviço
              </Button>
            </div>

            <div className="space-y-2">
              {servicos.map((servico, index) => (
                <div key={`${servico.servico_id}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <p className="font-medium">{servico.nome}</p>
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => handleRemoveServico(index)}>
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </Button>
                </div>
              ))}
              {servicos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum serviço adicionado.</p>}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border p-4">
            <p className="text-sm font-semibold">Diagnóstico / itens não autorizados</p>
            <p className="text-xs text-muted-foreground">Use esta lista para registrar problemas encontrados que o cliente não autorizou virar serviço na OS.</p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={novoDiagnostico}
                placeholder="Ex.: desgaste irregular nos pneus traseiros"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNovoDiagnostico(e.target.value)}
              />
              <Button type="button" variant="outline" onClick={handleAddDiagnostico} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar diagnóstico
              </Button>
            </div>

            <div className="space-y-2">
              {diagnosticos.map((item, index) => (
                <div key={`${item.descricao}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <p className="text-sm">{item.descricao}</p>
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => handleRemoveDiagnostico(index)}>
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </Button>
                </div>
              ))}
              {diagnosticos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum diagnóstico adicionado.</p>}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border p-4">
            <p className="text-sm font-semibold">Fotos da OS</p>
            <p className="text-xs text-muted-foreground">
              Limite de 5 imagens. Em dispositivos móveis, o botão da câmera pode abrir a câmera traseira.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Input type="file" accept="image/*" multiple onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAddFiles(e.target.files)} />
              <Input type="file" accept="image/*" capture="environment" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAddFiles(e.target.files)} />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {existingPhotos.map((photo, index) => (
                <div key={`existing-${photo.id || index}`} className="space-y-2">
                  <img src={photo.foto_url} alt={`Foto ${index + 1}`} className="h-28 w-full rounded-lg border object-cover" />
                  <Button type="button" variant="outline" className="w-full" onClick={() => removeExistingPhoto(index)}>
                    Remover
                  </Button>
                </div>
              ))}

              {previewUrls.map((url, index) => (
                <div key={`new-${index}`} className="space-y-2">
                  <img src={url} alt={`Nova foto ${index + 1}`} className="h-28 w-full rounded-lg border object-cover" />
                  <Button type="button" variant="outline" className="w-full" onClick={() => removeNewPhoto(index)}>
                    Remover
                  </Button>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">{totalFotos}/5 imagens</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" value={observacoes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setObservacoes(e.target.value)} placeholder="Detalhes adicionais da OS..." />
          </div>

          <div className="rounded-xl border bg-muted/30 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Valor total da OS</span>
              <span className="text-lg font-semibold">R$ {valorTotal.toFixed(2)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar OS'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
