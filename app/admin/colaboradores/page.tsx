// app/admin/colaboradores/page.tsx

'use client'
import { useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label
} from '@prodexy/ui'
import { Plus, Pencil } from 'lucide-react'
import { AdminPage, AdminPageHeader } from '@/components/admin-page'
import { supabase } from '@/lib/supabaseClient'

type Collaborator = {
  id: string
  nome: string
  email: string | null
  ativo: boolean
  criado_em: string
}

export default function Page() {
  const [items, setItems] = useState<Collaborator[]>([])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Collaborator | null>(null)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', ativo: true })
  const [saving, setSaving] = useState(false)

  async function loadItems() {
    const { data } = await supabase
      .from('perfis')
      .select('id,nome,email,ativo,criado_em')
      .eq('papel', 'colaborador')
      .order('criado_em', { ascending: false })

    setItems((data as Collaborator[]) || [])
  }

  useEffect(() => {
    loadItems()
  }, [])

  function openNew() {
    setSelected(null)
    setForm({ nome: '', email: '', senha: '', ativo: true })
    setOpen(true)
  }

  function openEdit(item: Collaborator) {
    setSelected(item)
    setForm({
      nome: item.nome,
      email: item.email || '',
      senha: '',
      ativo: item.ativo,
    })
    setOpen(true)
  }

  async function save() {
    setSaving(true)

    try {
      const method = selected ? 'PATCH' : 'POST'
      const payload = selected
        ? {
          id: selected.id,
          nome: form.nome,
          email: form.email,
          senha: form.senha,
          ativo: form.ativo,
        }
        : {
          nome: form.nome,
          email: form.email,
          senha: form.senha,
        }

      const res = await fetch('/api/admin/colaboradores', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok) {
        alert(json.error || 'Erro ao salvar colaborador.')
        return
      }

      setOpen(false)
      await loadItems()
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(item: Collaborator) {
    setSaving(true)

    try {
      const res = await fetch('/api/admin/colaboradores', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: item.id,
          nome: item.nome,
          email: item.email,
          ativo: !item.ativo,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        alert(json.error || 'Erro ao alterar status.')
        return
      }

      await loadItems()
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Colaboradores"
        description="Sublogins reais do sistema para os entregadores."
        actions={
          <Button className="gap-2" onClick={openNew}>
            <Plus className="h-4 w-4" />
            Novo colaborador
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Lista de colaboradores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && <p className="text-sm text-muted-foreground">Nenhum colaborador cadastrado.</p>}

          {items.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{item.nome}</p>
                  <Badge variant={item.ativo ? 'default' : 'secondary'}>
                    {item.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Email: {item.email || '-'}</p>
                <p className="text-sm text-muted-foreground">Papel: colaborador</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => openEdit(item)}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>

                <Button variant="outline" size="sm" onClick={() => toggleActive(item)} disabled={saving}>
                  {item.ativo ? 'Desativar' : 'Ativar'}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected ? 'Editar colaborador' : 'Novo colaborador'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{selected ? 'Nova senha (opcional)' : 'Senha'}</Label>
              <Input
                type="password"
                value={form.senha}
                onChange={(e) => setForm((prev) => ({ ...prev, senha: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  )
}