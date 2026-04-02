// app/colaborador/layout.tsx
'use client'

import { useEffect, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { supabase } from '@/lib/supabaseClient'

export default function ColaboradorLayout({ children, }: { children: React.ReactNode }) {
  const [name, setName] = useState('Colaborador')

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: perfil } = await supabase
        .from('perfis')
        .select('nome')
        .eq('id', user.id)
        .single()

      if (perfil?.nome) {
        setName(perfil.nome)
      }
    }

    loadProfile()
  }, [])

  return (
    <AppShell mode="colaborador" collaboratorName={name}>
      {children}
    </AppShell>
  )
}