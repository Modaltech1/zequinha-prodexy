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
import { supabase } from '@/lib/supabaseClient'

export type ClienteOption = {
    id: string
    nome: string | null
}

export type ServicoOption = {
    id: string
    nome: string
    valor: number
}

export type OrdemServicoEdit = {
    id: string
    numero: string | null
    cliente_id: string | null
    veiculo_placa: string | null
    veiculo_marca: string | null
    veiculo_modelo: string | null
    veiculo_ano: string | null
    veiculo_cor: string | null
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
        valor: number
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
    valor: string
}

export function OrderDialog({ open, onOpenChange, order, onSaved }: Props) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [clientes, setClientes] = useState<ClienteOption[]>([])
    const [servicosDisponiveis, setServicosDisponiveis] = useState<ServicoOption[]>([])

    const [numero, setNumero] = useState('')
    const [clienteId, setClienteId] = useState('')
    const [veiculoPlaca, setVeiculoPlaca] = useState('')
    const [veiculoMarca, setVeiculoMarca] = useState('')
    const [veiculoModelo, setVeiculoModelo] = useState('')
    const [veiculoAno, setVeiculoAno] = useState('')
    const [veiculoCor, setVeiculoCor] = useState('')
    const [status, setStatus] = useState('em_andamento')
    const [observacoes, setObservacoes] = useState('')

    const [servicos, setServicos] = useState<ServicoSelecionado[]>([])
    const [novoServicoId, setNovoServicoId] = useState('')

    const [existingPhotos, setExistingPhotos] = useState<{ id?: string; foto_url: string }[]>([])
    const [newFiles, setNewFiles] = useState<File[]>([])
    const [previewUrls, setPreviewUrls] = useState<string[]>([])

    async function loadBaseData() {
        const [clientesRes, servicosRes] = await Promise.all([
            supabase.from('clientes').select('id, nome').order('nome', { ascending: true }),
            supabase.from('servicos').select('id, nome, valor').order('nome', { ascending: true }),
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
            setServicosDisponiveis(
                ((servicosRes.data as ServicoOption[]) || []).map((s) => ({
                    id: s.id,
                    nome: s.nome,
                    valor: Number(s.valor || 0),
                }))
            )
        }
    }

    useEffect(() => {
        if (open) loadBaseData()
    }, [open])

    useEffect(() => {
        if (order) {
            setNumero(order.numero || '')
            setClienteId(order.cliente_id || '')
            setVeiculoPlaca(order.veiculo_placa || '')
            setVeiculoMarca(order.veiculo_marca || '')
            setVeiculoModelo(order.veiculo_modelo || '')
            setVeiculoAno(order.veiculo_ano || '')
            setVeiculoCor(order.veiculo_cor || '')
            setStatus(order.status || 'em_andamento')
            setObservacoes(order.observacoes || '')
            setServicos(
                (order.servicos || []).map((s) => ({
                    servico_id: s.servico_id,
                    nome: s.nome,
                    valor: String(Number(s.valor || 0).toFixed(2)),
                }))
            )
            setExistingPhotos(order.fotos || [])
        } else {
            setNumero('')
            setClienteId('')
            setVeiculoPlaca('')
            setVeiculoMarca('')
            setVeiculoModelo('')
            setVeiculoAno('')
            setVeiculoCor('')
            setStatus('em_andamento')
            setObservacoes('')
            setServicos([])
            setExistingPhotos([])
        }

        setNovoServicoId('')
        setNewFiles([])
        setPreviewUrls([])
        setError(null)
    }, [order, open])

    const totalFotos = existingPhotos.length + newFiles.length

    const valorTotal = useMemo(() => {
        return servicos.reduce((sum, s) => sum + (Number(String(s.valor).replace(',', '.')) || 0), 0)
    }, [servicos])

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
                valor: String(Number(selected.valor || 0).toFixed(2)),
            },
        ])

        setNovoServicoId('')
    }

    function handleRemoveServico(index: number) {
        setServicos((prev) => prev.filter((_, i) => i !== index))
    }

    function handleServicoValorChange(index: number, value: string) {
        setServicos((prev) =>
            prev.map((item, i) => (i === index ? { ...item, valor: value } : item))
        )
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

    async function uploadPhoto(file: File) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('itemId', order?.id || crypto.randomUUID())
        formData.append('folder', 'ordens-servico')

        const response = await fetch('/api/update-image', {
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

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const uploadedKeys: string[] = []

        try {
            if (!clienteId) throw new Error('Selecione um cliente.')
            if (servicos.length === 0) throw new Error('Adicione pelo menos um serviço.')

            const payload = {
                numero: numero.trim() || null,
                cliente_id: clienteId || null,
                veiculo_placa: veiculoPlaca.trim() || null,
                veiculo_marca: veiculoMarca.trim() || null,
                veiculo_modelo: veiculoModelo.trim() || null,
                veiculo_ano: veiculoAno.trim() || null,
                veiculo_cor: veiculoCor.trim() || null,
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

            const { error: deleteServicosError } = await supabase
                .from('ordem_servicos')
                .delete()
                .eq('os_id', osId)

            if (deleteServicosError) throw deleteServicosError

            const { error: insertServicosError } = await supabase
                .from('ordem_servicos')
                .insert(
                    servicos.map((s) => ({
                        os_id: osId,
                        servico_id: s.servico_id,
                        valor: Number(String(s.valor).replace(',', '.')) || 0,
                    }))
                )

            if (insertServicosError) throw insertServicosError

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
                    const result = await uploadPhoto(file)
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
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{order ? 'Editar ordem de serviço' : 'Nova ordem de serviço'}</DialogTitle>
                    <DialogDescription>
                        Preencha os dados da OS, adicione serviços e inclua até 5 fotos.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="numero">Número da OS</Label>
                            <Input id="numero" value={numero} placeholder="2025-001" onChange={(e) => setNumero(e.target.value)} />
                        </div>

                        <div className="space-y-2 lg:col-span-2">
                            <Label>Cliente</Label>
                            <Select value={clienteId} onValueChange={setClienteId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o cliente" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clientes.map((cliente) => (
                                        <SelectItem key={cliente.id} value={cliente.id}>
                                            {cliente.nome || 'Cliente sem nome'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="placa">Placa</Label>
                            <Input id="placa" value={veiculoPlaca} placeholder="ABC1D23" onChange={(e) => setVeiculoPlaca(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="marca">Marca</Label>
                            <Input id="marca" value={veiculoMarca} placeholder="Fiat" onChange={(e) => setVeiculoMarca(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="modelo">Modelo</Label>
                            <Input id="modelo" value={veiculoModelo} placeholder="Uno Way" onChange={(e) => setVeiculoModelo(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ano">Ano</Label>
                            <Input id="ano" value={veiculoAno} placeholder="2018" onChange={(e) => setVeiculoAno(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cor">Cor</Label>
                            <Input id="cor" value={veiculoCor} placeholder="prata" onChange={(e) => setVeiculoCor(e.target.value)} />
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
                    </div>

                    <div className="space-y-3 rounded-xl border p-4">
                        <p className="text-sm font-semibold">Serviços da OS</p>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="flex-1">
                                <Select value={novoServicoId} onValueChange={setNovoServicoId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um serviço para adicionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableServicesToAdd.map((servico) => (
                                            <SelectItem key={servico.id} value={servico.id}>
                                                {servico.nome} — R$ {Number(servico.valor || 0).toFixed(2)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="button" onClick={handleAddServico}>
                                Adicionar serviço
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {servicos.map((servico, index) => (
                                <div key={`${servico.servico_id}-${index}`} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_160px_auto]">
                                    <div>
                                        <p className="font-medium">{servico.nome}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Valor</Label>
                                        <Input
                                            value={servico.valor}
                                            placeholder="Ex.: 120,00"
                                            onChange={(e) => handleServicoValorChange(index, e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <Button type="button" variant="outline" onClick={() => handleRemoveServico(index)}>
                                            Remover
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            {servicos.length === 0 && (
                                <p className="text-sm text-muted-foreground">Nenhum serviço adicionado.</p>
                            )}
                        </div>

                        <div className="flex justify-end">
                            <p className="text-sm font-semibold">Total: R$ {valorTotal.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="space-y-3 rounded-xl border p-4">
                        <p className="text-sm font-semibold">Fotos da OS</p>
                        <p className="text-xs text-muted-foreground">
                            Limite de 5 imagens. Em dispositivos móveis, o botão da câmera pode abrir a câmera traseira.
                        </p>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => handleAddFiles(e.target.files)}
                            />
                            <Input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={(e) => handleAddFiles(e.target.files)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                            {existingPhotos.map((photo, index) => (
                                <div key={`existing-${photo.id || index}`} className="space-y-2">
                                    <img
                                        src={photo.foto_url}
                                        alt={`Foto ${index + 1}`}
                                        className="h-28 w-full rounded-lg border object-cover"
                                    />
                                    <Button type="button" variant="outline" className="w-full" onClick={() => removeExistingPhoto(index)}>
                                        Remover
                                    </Button>
                                </div>
                            ))}

                            {previewUrls.map((url, index) => (
                                <div key={`new-${index}`} className="space-y-2">
                                    <img
                                        src={url}
                                        alt={`Nova foto ${index + 1}`}
                                        className="h-28 w-full rounded-lg border object-cover"
                                    />
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
                        <Textarea
                            id="observacoes"
                            value={observacoes}
                            onChange={(e) => setObservacoes(e.target.value)}
                            placeholder="Detalhes adicionais da OS..."
                        />
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