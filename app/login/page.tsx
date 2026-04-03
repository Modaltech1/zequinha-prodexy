//app/login/page.tsx
'use client'

import { Suspense, FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, Label } from '@prodexy/ui'
import { supabase } from '@/lib/supabaseClient'

function LoginPageInner() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error || !data.user) {
        setError('Email ou senha inválidos.')
        return
      }

      const { data: perfil, error: perfilError } = await supabase
        .from('perfis')
        .select('papel, ativo')
        .eq('id', data.user.id)
        .single()

      if (perfilError || !perfil || !perfil.ativo) {
        await supabase.auth.signOut()
        setError('Seu acesso está inativo ou inválido.')
        return
      }

      if (perfil.papel === 'admin') {
        router.push('/admin/dashboard')
        router.refresh()
        return
      }

      if (perfil.papel === 'colaborador') {
        router.push('/colaborador/pagina')
        router.refresh()
        return
      }

      await supabase.auth.signOut()
      setError('Perfil sem rota configurada.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-primary text-primary-foreground">
            <img src="/icon.jpg" alt="Logo" className="object-cover" />
          </div>
          <div>
            <CardTitle className="text-2xl">Zequinha Pneus</CardTitle>
            <CardDescription>Acesse o sistema com seu email e senha.</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>

            <p className="text-xs text-muted-foreground">
              Admins e colaboradores usam o mesmo fluxo de autenticação.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Carregando página de login...</div>}>
      <LoginPageInner />
    </Suspense>
  )
}