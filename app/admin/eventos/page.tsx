'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
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
import { CalendarDays, Gift, Pencil, Plus, Shuffle, Trash2, Trophy, Users } from 'lucide-react'
import { AdminPage, AdminPageHeader } from '@/components/admin-page'
import { supabase } from '@/lib/supabaseClient'

type ClienteRow = {
  id: string
  nome: string | null
  cpf_cnpj: string | null
  telefone: string | null
  email: string | null
  nascimento: string | null
}

type OrdemRow = {
  id: string
  cliente_id: string | null
  veiculo_id: string | null
  criado_em: string
  status: string | null
}

type EventoRow = {
  id: string
  titulo: string
  descricao: string | null
  data_evento: string
  filtro_tipo: string
  filtro_inicio: string | null
  filtro_fim: string | null
  ganhador_cliente_id: string | null
  criado_em: string
  atualizado_em: string | null
}

type EventoClienteRow = {
  id: string
  evento_id: string
  cliente_id: string
  criado_em: string
}

type EventForm = {
  titulo: string
  descricao: string
  data_evento: string
  filtro_tipo: string
  filtro_inicio: string
  filtro_fim: string
}

const defaultForm: EventForm = {
  titulo: '',
  descricao: '',
  data_evento: '',
  filtro_tipo: 'todos',
  filtro_inicio: '',
  filtro_fim: '',
}

function sameMonthBirthday(cliente: ClienteRow, dataEvento: string) {
  if (!cliente.nascimento || !dataEvento) return false
  const birth = new Date(`${cliente.nascimento}T00:00:00`)
  const event = new Date(`${dataEvento}T00:00:00`)
  return birth.getMonth() === event.getMonth()
}

export default function Page() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [events, setEvents] = useState<EventoRow[]>([])
  const [clientes, setClientes] = useState<ClienteRow[]>([])
  const [ordens, setOrdens] = useState<OrdemRow[]>([])
  const [participants, setParticipants] = useState<EventoClienteRow[]>([])
  const [open, setOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [editingEvent, setEditingEvent] = useState<EventoRow | null>(null)
  const [form, setForm] = useState<EventForm>(defaultForm)
  const [search, setSearch] = useState('')
  const [drawing, setDrawing] = useState(false)
  const [animatedName, setAnimatedName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    setError(null)

    const [eventosRes, clientesRes, ordensRes, participantsRes] = await Promise.all([
      supabase.from('eventos').select('*').order('data_evento', { ascending: false }),
      supabase.from('clientes').select('id,nome,cpf_cnpj,telefone,email,nascimento').order('nome', { ascending: true }),
      supabase.from('ordens_de_servico').select('id,cliente_id,veiculo_id,criado_em,status').order('criado_em', { ascending: false }),
      supabase.from('evento_clientes').select('id,evento_id,cliente_id,criado_em'),
    ])

    if (eventosRes.error || clientesRes.error || ordensRes.error || participantsRes.error) {
      console.error(eventosRes.error || clientesRes.error || ordensRes.error || participantsRes.error)
      setError('Erro ao carregar eventos.')
      setLoading(false)
      return
    }

    const loadedEvents = (eventosRes.data || []) as EventoRow[]
    setEvents(loadedEvents)
    setClientes((clientesRes.data || []) as ClienteRow[])
    setOrdens((ordensRes.data || []) as OrdemRow[])
    setParticipants((participantsRes.data || []) as EventoClienteRow[])
    setSelectedEventId((prev) => loadedEvents.some((event) => event.id === prev) ? prev : loadedEvents[0]?.id || '')
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const clientesById = useMemo(() => {
    return clientes.reduce<Record<string, ClienteRow>>((acc, cliente) => {
      acc[cliente.id] = cliente
      return acc
    }, {})
  }, [clientes])

  const selectedEvent = events.find((event) => event.id === selectedEventId) || null

  const currentParticipants = useMemo(() => {
    if (!selectedEvent) return []
    return participants
      .filter((item) => item.evento_id === selectedEvent.id)
      .map((item) => clientesById[item.cliente_id])
      .filter(Boolean)
  }, [participants, selectedEvent, clientesById])

  const eligibleCustomers = useMemo(() => {
    if (!selectedEvent) return []
    const alreadyAdded = new Set(currentParticipants.map((cliente) => cliente.id))
    let list = [...clientes]

    if (selectedEvent.filtro_tipo === 'aniversario') {
      list = list.filter((cliente) => sameMonthBirthday(cliente, selectedEvent.data_evento))
    }

    if (selectedEvent.filtro_tipo === 'manutencao_periodo') {
      const start = selectedEvent.filtro_inicio
      const end = selectedEvent.filtro_fim
      if (start && end) {
        const ids = new Set(
          ordens
            .filter((ordem) => ordem.cliente_id && ordem.criado_em >= `${start}T00:00:00` && ordem.criado_em <= `${end}T23:59:59`)
            .map((ordem) => ordem.cliente_id as string)
        )
        list = list.filter((cliente) => ids.has(cliente.id))
      } else {
        list = []
      }
    }

    const term = search.trim().toLowerCase()
    if (term) {
      list = list.filter((cliente) => [cliente.nome || '', cliente.telefone || '', cliente.cpf_cnpj || '', cliente.email || ''].join(' ').toLowerCase().includes(term))
    }

    return list.filter((cliente) => !alreadyAdded.has(cliente.id))
  }, [clientes, selectedEvent, currentParticipants, ordens, search])

  const winner = selectedEvent?.ganhador_cliente_id ? clientesById[selectedEvent.ganhador_cliente_id] : null

  function openNew() {
    setEditingEvent(null)
    setForm(defaultForm)
    setOpen(true)
  }

  function openEdit(event: EventoRow) {
    setEditingEvent(event)
    setForm({
      titulo: event.titulo,
      descricao: event.descricao || '',
      data_evento: event.data_evento || '',
      filtro_tipo: event.filtro_tipo || 'todos',
      filtro_inicio: event.filtro_inicio || '',
      filtro_fim: event.filtro_fim || '',
    })
    setOpen(true)
  }

  async function saveEvent() {
    setSaving(true)
    setError(null)

    try {
      if (!form.titulo.trim()) throw new Error('Informe o nome do evento.')
      if (!form.data_evento) throw new Error('Informe a data do evento.')

      const payload = {
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || null,
        data_evento: form.data_evento,
        filtro_tipo: form.filtro_tipo,
        filtro_inicio: form.filtro_inicio || null,
        filtro_fim: form.filtro_fim || null,
        atualizado_em: new Date().toISOString(),
      }

      if (editingEvent) {
        const { error } = await supabase.from('eventos').update(payload).eq('id', editingEvent.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('eventos').insert({ ...payload, criado_em: new Date().toISOString() }).select('id').single()
        if (error) throw error
        setSelectedEventId(data.id)
      }

      setOpen(false)
      await loadData()
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Erro ao salvar evento.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteEvent(event: EventoRow) {
    const confirmed = window.confirm(`Deseja excluir o evento "${event.titulo}"?`)
    if (!confirmed) return
    const { error } = await supabase.from('eventos').delete().eq('id', event.id)
    if (error) {
      console.error(error)
      setError('Erro ao excluir evento.')
      return
    }
    if (selectedEventId === event.id) setSelectedEventId('')
    await loadData()
  }

  async function addEligibleCustomers() {
    if (!selectedEvent || eligibleCustomers.length === 0) return
    const { error } = await supabase
      .from('evento_clientes')
      .insert(eligibleCustomers.map((cliente) => ({ evento_id: selectedEvent.id, cliente_id: cliente.id })))
    if (error) {
      console.error(error)
      setError('Erro ao adicionar clientes ao evento.')
      return
    }
    await loadData()
  }

  async function removeParticipant(clienteId: string) {
    if (!selectedEvent) return
    const { error } = await supabase.from('evento_clientes').delete().eq('evento_id', selectedEvent.id).eq('cliente_id', clienteId)
    if (error) {
      console.error(error)
      setError('Erro ao remover participante.')
      return
    }
    await loadData()
  }

  async function drawWinner() {
    if (!selectedEvent || currentParticipants.length === 0) return
    setDrawing(true)
    setAnimatedName('')

    let ticks = 0
    const interval = window.setInterval(() => {
      const random = currentParticipants[Math.floor(Math.random() * currentParticipants.length)]
      setAnimatedName(random?.nome || 'Cliente')
      ticks += 1
      if (ticks >= 22) window.clearInterval(interval)
    }, 80)

    window.setTimeout(async () => {
      const winner = currentParticipants[Math.floor(Math.random() * currentParticipants.length)]
      setAnimatedName(winner?.nome || 'Cliente')
      if (winner) {
        const { error } = await supabase
          .from('eventos')
          .update({ ganhador_cliente_id: winner.id, atualizado_em: new Date().toISOString() })
          .eq('id', selectedEvent.id)
        if (error) {
          console.error(error)
          setError('Erro ao gravar ganhador.')
        } else {
          await loadData()
        }
      }
      setDrawing(false)
    }, 1900)
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Eventos"
        description="Crie eventos, filtre clientes participantes e realize sorteios."
        actions={
          <Button className="gap-2" onClick={openNew}>
            <Plus className="h-4 w-4" />
            Novo evento
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Eventos" value={String(events.length)} icon={CalendarDays} />
        <SummaryCard title="Participantes do evento" value={String(currentParticipants.length)} icon={Users} />
        <SummaryCard title="Ganhador definido" value={winner ? 'Sim' : 'Não'} icon={Trophy} />
      </div>

      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card>
          <CardHeader>
            <p className="font-semibold">Lista de eventos</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && <p className="text-sm text-muted-foreground">Carregando eventos...</p>}
            {!loading && events.length === 0 && <p className="text-sm text-muted-foreground">Nenhum evento cadastrado.</p>}
            {events.map((event) => (
              <button
                type="button"
                key={event.id}
                onClick={() => setSelectedEventId(event.id)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${selectedEventId === event.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{event.titulo}</p>
                    <p className="text-sm text-muted-foreground">{new Date(`${event.data_evento}T00:00:00`).toLocaleDateString('pt-BR')}</p>
                  </div>
                  {event.ganhador_cliente_id && <Badge>Ganhador</Badge>}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-lg font-semibold">{selectedEvent?.titulo || 'Selecione um evento'}</p>
                {selectedEvent && (
                  <p className="text-sm text-muted-foreground">
                    Data: {new Date(`${selectedEvent.data_evento}T00:00:00`).toLocaleDateString('pt-BR')} • Filtro: {selectedEvent.filtro_tipo}
                  </p>
                )}
              </div>
              {selectedEvent && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => openEdit(selectedEvent)}>
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={() => deleteEvent(selectedEvent)}>
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {!selectedEvent && <p className="text-sm text-muted-foreground">Crie ou selecione um evento para gerenciar participantes.</p>}

            {selectedEvent && (
              <>
                {selectedEvent.descricao && <p className="rounded-xl border p-3 text-sm text-muted-foreground">{selectedEvent.descricao}</p>}

                <div className="rounded-xl border p-4">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">Clientes elegíveis</p>
                      <p className="text-sm text-muted-foreground">{eligibleCustomers.length} cliente(s) encontrado(s) pelo filtro do evento.</p>
                    </div>
                    <Button onClick={addEligibleCustomers} disabled={eligibleCustomers.length === 0}>Adicionar elegíveis ao evento</Button>
                  </div>
                  <Input value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} placeholder="Refinar por nome, telefone, CPF/CNPJ ou email" />
                </div>

                <div className="rounded-xl border p-4">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">Participantes</p>
                      <p className="text-sm text-muted-foreground">{currentParticipants.length} cliente(s) no evento.</p>
                    </div>
                    <Button className="gap-2" onClick={drawWinner} disabled={drawing || currentParticipants.length === 0}>
                      <Shuffle className="h-4 w-4" />
                      {drawing ? 'Sorteando...' : 'Sortear ganhador'}
                    </Button>
                  </div>

                  {(drawing || animatedName) && (
                    <div className="mb-4 rounded-xl border bg-muted/40 p-6 text-center">
                      <Gift className="mx-auto mb-2 h-8 w-8" />
                      <p className="text-sm text-muted-foreground">Sorteio em andamento</p>
                      <p className="text-2xl font-bold tracking-tight">{animatedName || '...'}</p>
                    </div>
                  )}

                  {winner && !drawing && (
                    <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
                      <p className="text-sm text-muted-foreground">Ganhador fixado</p>
                      <p className="text-xl font-bold">{winner.nome || 'Cliente sem nome'}</p>
                      <p className="text-sm text-muted-foreground">{winner.telefone || '-'} {winner.email ? `• ${winner.email}` : ''}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {currentParticipants.map((cliente) => (
                      <div key={cliente.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">{cliente.nome || 'Cliente sem nome'}</p>
                          <p className="text-sm text-muted-foreground">{cliente.telefone || '-'} {cliente.cpf_cnpj ? `• ${cliente.cpf_cnpj}` : ''}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => removeParticipant(cliente.id)}>Remover</Button>
                      </div>
                    ))}
                    {currentParticipants.length === 0 && <p className="text-sm text-muted-foreground">Nenhum participante adicionado.</p>}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Editar evento' : 'Novo evento'}</DialogTitle>
            <DialogDescription>Defina a data e o filtro usado para montar a lista de clientes elegíveis.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={form.titulo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, titulo: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((prev) => ({ ...prev, descricao: e.target.value }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Data do evento</Label>
                <Input type="date" value={form.data_evento} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, data_evento: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Filtro base</Label>
                <Select value={form.filtro_tipo} onValueChange={(value: string) => setForm((prev) => ({ ...prev, filtro_tipo: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os clientes</SelectItem>
                    <SelectItem value="aniversario">Aniversariantes do mês do evento</SelectItem>
                    <SelectItem value="manutencao_periodo">Clientes com OS/manutenção em período</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.filtro_tipo === 'manutencao_periodo' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Início do período</Label>
                  <Input type="date" value={form.filtro_inicio} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, filtro_inicio: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Fim do período</Label>
                  <Input type="date" value={form.filtro_fim} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, filtro_fim: e.target.value }))} />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={saveEvent} disabled={saving}>{saving ? 'Salvando...' : 'Salvar evento'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  )
}

function SummaryCard({ title, value, icon: Icon }: { title: string; value: string; icon: any }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}
