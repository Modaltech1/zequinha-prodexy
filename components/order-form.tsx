'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@prodexy/ui'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

type ClienteOption = {
  id: string
  nome: string | null
  cpf_cnpj?: string | null
  telefone?: string | null
  email?: string | null
  nascimento?: string | null
}

type ServicoOption = {
  id: string
  nome: string
  is_periodico?: boolean | null
  periodicidade_meses?: number | null
}

type CollaboratorOption = {
  id: string
  nome: string | null
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
  km_entrada?: number | null
  mao_de_obra?: number | null
  acrescimos?: number | null
  responsavel_id?: string | null
  servicos: {
    id?: string
    servico_id: string
    nome: string
    valor?: number
    codigo_peca?: string | null
    observacao?: string | null
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

type ServicoSelecionado = {
  servico_id: string
  nome: string
  valor: string
  codigo_peca: string
  observacao: string
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

function mergeById<T extends { id: string }>(items: T[], item: T | null) {
  if (!item) return items
  return items.some((current) => current.id === item.id) ? items : [item, ...items]
}

function buildOrderVehicleOption(order: OrdemServicoEdit | null): VeiculoOption | null {
  if (!order?.veiculo_id) return null

  return {
    id: order.veiculo_id,
    cliente_id: order.cliente_id || '',
    placa: order.veiculo_placa || null,
    marca: order.veiculo_marca || null,
    modelo: order.veiculo_modelo || null,
    ano: order.veiculo_ano || null,
    cor: order.veiculo_cor || null,
    km_atual: order.km_entrada ?? null,
    tem_seguro: order.veiculo_tem_seguro ?? null,
  }
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, '')
}

function parseMoney(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return 0
  const normalized = trimmed.replace(/\./g, '').replace(',', '.')
  return Number(normalized) || 0
}

function formatMoneyInput(value: number | null | undefined) {
  if (!value) return ''
  return Number(value).toFixed(2).replace('.', ',')
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

  if (!mentionsCreatedAt) throw error

  const now = new Date().toISOString()
  const rowsWithCreatedAt = rows.map((row) => ({ ...row, criado_em: now }))
  const { error: retryError } = await supabase.from(table).insert(rowsWithCreatedAt)
  if (retryError) throw retryError
}

export function OrderForm({
  order,
  onSaved,
  onCancel,
}: {
  order: OrdemServicoEdit | null
  onSaved?: () => void
  onCancel?: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [servicosDisponiveis, setServicosDisponiveis] = useState<ServicoOption[]>([])
  const [veiculos, setVeiculos] = useState<VeiculoOption[]>([])
  const [collaborators, setCollaborators] = useState<CollaboratorOption[]>([])

  const [numero, setNumero] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [clienteSearch, setClienteSearch] = useState('')
  const [createClientInline, setCreateClientInline] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientCpf, setNewClientCpf] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  const [newClientBirth, setNewClientBirth] = useState('')

  const [veiculoId, setVeiculoId] = useState('')
  const [isNovoVeiculo, setIsNovoVeiculo] = useState(true)
  const [veiculoPlaca, setVeiculoPlaca] = useState('')
  const [veiculoMarca, setVeiculoMarca] = useState('')
  const [veiculoModelo, setVeiculoModelo] = useState('')
  const [veiculoAno, setVeiculoAno] = useState('')
  const [veiculoCor, setVeiculoCor] = useState('')
  const [veiculoTemSeguro, setVeiculoTemSeguro] = useState(false)
  const [kmEntrada, setKmEntrada] = useState('')

  const [status, setStatus] = useState('em_andamento')
  const [observacoes, setObservacoes] = useState('')
  const [responsavelId, setResponsavelId] = useState('')
  const [maoDeObra, setMaoDeObra] = useState('')
  const [acrescimos, setAcrescimos] = useState('')

  const [servicos, setServicos] = useState<ServicoSelecionado[]>([])
  const [novoServicoId, setNovoServicoId] = useState('')
  const [novoDiagnostico, setNovoDiagnostico] = useState('')
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoSelecionado[]>([])

  const [existingPhotos, setExistingPhotos] = useState<{ id?: string; foto_url: string }[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  async function loadBaseData(selectedClienteId?: string | null) {
    const [clientesRes, servicosRes, colaboradoresRes] = await Promise.all([
      supabase.from('clientes').select('id, nome, cpf_cnpj, telefone, email, nascimento').order('nome', { ascending: true }),
      supabase.from('servicos').select('id, nome, is_periodico, periodicidade_meses').order('nome', { ascending: true }),
      supabase.from('perfis').select('id,nome').eq('papel', 'colaborador').eq('ativo', true).order('nome', { ascending: true }),
    ])

    if (clientesRes.error) console.error('Erro ao carregar clientes:', clientesRes.error)
    if (servicosRes.error) console.error('Erro ao carregar serviços:', servicosRes.error)
    if (colaboradoresRes.error) console.error('Erro ao carregar colaboradores:', colaboradoresRes.error)

    let clientesList = (clientesRes.data as ClienteOption[]) || []

    if (selectedClienteId && !clientesList.some((cliente) => cliente.id === selectedClienteId)) {
      const { data: selectedCliente, error: selectedClienteError } = await supabase
        .from('clientes')
        .select('id, nome, cpf_cnpj, telefone, email, nascimento')
        .eq('id', selectedClienteId)
        .maybeSingle()

      if (selectedClienteError) {
        console.error('Erro ao carregar cliente selecionado da OS:', selectedClienteError)
      }

      if (selectedCliente) {
        clientesList = mergeById(clientesList, selectedCliente as ClienteOption)
      }
    }

    setClientes(clientesList)
    setServicosDisponiveis((servicosRes.data as ServicoOption[]) || [])
    setCollaborators((colaboradoresRes.data as CollaboratorOption[]) || [])
  }

  async function loadVehiclesByCustomer(customerId: string, selectedOrder?: OrdemServicoEdit | null) {
    const orderVehicle = buildOrderVehicleOption(selectedOrder || null)

    if (!customerId) {
      setVeiculos(orderVehicle ? [orderVehicle] : [])
      return
    }

    const { data, error } = await supabase
      .from('veiculos')
      .select('id, cliente_id, placa, marca, modelo, ano, cor, km_atual, tem_seguro')
      .eq('cliente_id', customerId)
      .order('placa', { ascending: true })

    if (error) {
      console.error('Erro ao carregar veículos:', error)
      setVeiculos(orderVehicle ? [orderVehicle] : [])
      return
    }

    const vehiclesList = mergeById((data as VeiculoOption[]) || [], orderVehicle)
    setVeiculos(vehiclesList)
  }

  useEffect(() => {
    loadBaseData(order?.cliente_id || null)
  }, [order?.cliente_id])

  useEffect(() => {
    loadVehiclesByCustomer(clienteId, order)
  }, [clienteId, order?.cliente_id, order?.veiculo_id])

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
      setIsNovoVeiculo(!(order.veiculo_id && order.cliente_id))
      setVeiculoPlaca(order.veiculo_placa || '')
      setVeiculoMarca(order.veiculo_marca || '')
      setVeiculoModelo(order.veiculo_modelo || '')
      setVeiculoAno(order.veiculo_ano || '')
      setVeiculoCor(order.veiculo_cor || '')
      setVeiculoTemSeguro(Boolean(order.veiculo_tem_seguro))
      setKmEntrada(order.km_entrada ? String(order.km_entrada) : '')
      setStatus(order.status || 'em_andamento')
      setResponsavelId(order.responsavel_id || '')
      setMaoDeObra(formatMoneyInput(order.mao_de_obra))
      setAcrescimos(formatMoneyInput(order.acrescimos))
      setObservacoes(order.observacoes || '')
      setServicos(
        (order.servicos || []).map((s) => ({
          servico_id: s.servico_id,
          nome: s.nome,
          valor: formatMoneyInput(s.valor),
          codigo_peca: s.codigo_peca || '',
          observacao: s.observacao || '',
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
      setNewClientBirth('')
      setVeiculoId('')
      setIsNovoVeiculo(true)
      setVeiculoPlaca('')
      setVeiculoMarca('')
      setVeiculoModelo('')
      setVeiculoAno('')
      setVeiculoCor('')
      setVeiculoTemSeguro(false)
      setKmEntrada('')
      setStatus('em_andamento')
      setResponsavelId('')
      setMaoDeObra('')
      setAcrescimos('')
      setObservacoes('')
      setServicos([])
      setDiagnosticos([])
      setExistingPhotos([])
    }

    setNovoServicoId('')
    setNovoDiagnostico('')
    setNewFiles([])
    setPreviewUrls([])
    setError(null)
  }, [order])

  const totalFotos = existingPhotos.length + newFiles.length

  const subtotalServicos = useMemo(
    () => servicos.reduce((sum, item) => sum + parseMoney(item.valor), 0),
    [servicos]
  )
  const maoDeObraValue = useMemo(() => parseMoney(maoDeObra), [maoDeObra])
  const acrescimosValue = useMemo(() => parseMoney(acrescimos), [acrescimos])
  const valorFinal = useMemo(
    () => subtotalServicos + maoDeObraValue + acrescimosValue,
    [subtotalServicos, maoDeObraValue, acrescimosValue]
  )

  const clientesFiltrados = useMemo(() => {
    const selected = clienteId ? clientes.find((cliente) => cliente.id === clienteId) : undefined
    const term = clienteSearch.trim().toLowerCase()
    const digits = normalizeDigits(clienteSearch)
    const filtered = (!term && !digits
      ? clientes.slice(0, 30)
      : clientes.filter((cliente) => {
        const searchable = [cliente.nome || '', cliente.telefone || '', cliente.cpf_cnpj || '', cliente.email || '']
          .join(' ')
          .toLowerCase()
        const docDigits = normalizeDigits(cliente.cpf_cnpj || '')
        return searchable.includes(term) || (!!digits && docDigits.includes(digits))
      }).slice(0, 30))

    if (selected && !filtered.some((item) => item.id === selected.id)) {
      return [selected, ...filtered].slice(0, 30)
    }
    return filtered
  }, [clientes, clienteSearch, clienteId])

  const selectedCustomer = clienteId ? clientes.find((cliente) => cliente.id === clienteId) : undefined
  const clientesParaSelect = selectedCustomer
    ? mergeById(clientesFiltrados, selectedCustomer)
    : clientesFiltrados

  const selectedCustomerLabel = selectedCustomer
    ? `${selectedCustomer.nome || 'Cliente sem nome'}${selectedCustomer.cpf_cnpj ? ` • ${selectedCustomer.cpf_cnpj}` : ''}`
    : ''

  const selectedVehicle = veiculoId ? veiculos.find((veiculo) => veiculo.id === veiculoId) : undefined
  const veiculosParaSelect = selectedVehicle
    ? mergeById(veiculos, selectedVehicle)
    : veiculos

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
        valor: '',
        codigo_peca: '',
        observacao: '',
        is_periodico: selected.is_periodico,
        periodicidade_meses: selected.periodicidade_meses,
      },
    ])
    setNovoServicoId('')
  }

  function updateServico(index: number, patch: Partial<ServicoSelecionado>) {
    setServicos((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
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
    if (!createClientInline) throw new Error('Selecione um cliente ou cadastre um novo pelo formulário.')
    if (!newClientName.trim()) throw new Error('Informe o nome do novo cliente.')

    const { data, error } = await supabase
      .from('clientes')
      .insert({
        nome: newClientName.trim(),
        cpf_cnpj: newClientCpf.trim() || null,
        telefone: newClientPhone.trim() || null,
        email: newClientEmail.trim() || null,
        nascimento: newClientBirth || null,
      })
      .select('id, nome, cpf_cnpj, telefone, email, nascimento')
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
            valor: '',
            codigo_peca: '',
            observacao: '',
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

      const kmEntradaValue = kmEntrada.trim() ? Number(kmEntrada.replace(',', '.')) : null
      if (kmEntrada.trim() && (!Number.isFinite(kmEntradaValue) || kmEntradaValue! < 0)) {
        throw new Error('KM de entrada inválido.')
      }

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
          km_atual: kmEntradaValue,
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

      const subtotalServicosToPersist = servicosToPersist.reduce((sum, item) => sum + parseMoney(item.valor), 0)
      const maoDeObraToPersist = parseMoney(maoDeObra)
      const acrescimosToPersist = parseMoney(acrescimos)
      const valorFinalToPersist = subtotalServicosToPersist + maoDeObraToPersist + acrescimosToPersist

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
        km_entrada: kmEntradaValue,
        responsavel_id: responsavelId || null,
        mao_de_obra: maoDeObraToPersist,
        acrescimos: acrescimosToPersist,
        valor_total: subtotalServicosToPersist,
        valor_final: valorFinalToPersist,
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

      if (finalVeiculoId && kmEntradaValue !== null) {
        await supabase
          .from('veiculos')
          .update({ km_atual: kmEntradaValue, atualizado_em: new Date().toISOString() })
          .eq('id', finalVeiculoId)
      }

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
            valor: parseMoney(s.valor),
            codigo_peca: s.codigo_peca.trim() || null,
            observacao: s.observacao.trim() || null,
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{order ? 'Editar ordem de serviço' : 'Nova ordem de serviço'}</h1>
          <p className="text-muted-foreground">Preencha os dados da OS com serviços, diagnóstico e valores.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 rounded-xl border p-4">
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
            <Label>Responsável</Label>
            <Select value={responsavelId || '__none'} onValueChange={(value: string) => setResponsavelId(value === '__none' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Não informado</SelectItem>
                {collaborators.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.nome || 'Sem nome'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="km-entrada">KM de entrada</Label>
            <Input
              id="km-entrada"
              value={kmEntrada}
              placeholder="Ex.: 85620"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKmEntrada(e.target.value)}
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
              {createClientInline ? 'Usar cliente existente' : 'Cadastrar cliente no formulário'}
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
                    {clientesParaSelect.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome || 'Cliente sem nome'}{cliente.cpf_cnpj ? ` • ${cliente.cpf_cnpj}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCustomer && (
                  <p className="text-xs text-muted-foreground">
                    Selecionado: {selectedCustomerLabel}
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
              disabled={!clienteId || createClientInline || veiculosParaSelect.length === 0}
            >
              <SelectTrigger className="flex-1">
                <SelectValue
                  placeholder={
                    !clienteId || createClientInline
                      ? 'Selecione ou salve um cliente primeiro'
                      : veiculosParaSelect.length === 0
                        ? 'Nenhum veículo cadastrado'
                        : 'Selecione um veículo cadastrado'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {veiculosParaSelect.map((veiculo) => (
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
          <p className="text-xs text-muted-foreground">Nesta OS você pode preencher valor, código da peça e observações de cada serviço.</p>

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

          <div className="space-y-3">
            {servicos.map((servico, index) => (
              <div key={`${servico.servico_id}-${index}`} className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{servico.nome}</p>
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => handleRemoveServico(index)}>
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Valor do serviço (opcional)</Label>
                    <Input
                      value={servico.valor}
                      placeholder="Ex.: 120,00"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateServico(index, { valor: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Código da peça (opcional)</Label>
                    <Input
                      value={servico.codigo_peca}
                      placeholder="Ex.: PNEU-175-65R14"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateServico(index, { codigo_peca: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label>Observação do serviço</Label>
                    <Input
                      value={servico.observacao}
                      placeholder="Ex.: trocar por marca X"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateServico(index, { observacao: e.target.value })}
                    />
                  </div>
                </div>
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
          <p className="text-sm font-semibold">Mão de obra e adicionais</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mao-de-obra">Mão de obra</Label>
              <Input id="mao-de-obra" value={maoDeObra} placeholder="Ex.: 80,00" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaoDeObra(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acrescimos">Acréscimos</Label>
              <Input id="acrescimos" value={acrescimos} placeholder="Ex.: 20,00" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAcrescimos(e.target.value)} />
            </div>
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

        <div className="rounded-xl border bg-muted/30 p-4 text-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal dos serviços</span>
            <span className="font-semibold">R$ {subtotalServicos.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Mão de obra</span>
            <span className="font-semibold">R$ {maoDeObraValue.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Acréscimos</span>
            <span className="font-semibold">R$ {acrescimosValue.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between border-t pt-2">
            <span className="text-muted-foreground">Valor final da OS</span>
            <span className="text-lg font-semibold">R$ {valorFinal.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar OS'}
          </Button>
        </div>
      </form>
    </div>
  )
}
