// components/sidebar.tsx
'use client'

import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { NavContent } from '@/components/navigation/nav-content'
import { type NavMode } from '@/components/navigation/config'

interface SidebarProps {
  mode: NavMode
  collaboratorName?: string
}

export function Sidebar({ mode, collaboratorName }: SidebarProps) {
  const pathname = usePathname()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Erro ao sair', error)
    } finally {
      window.location.href = '/login'
    }
  }

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col overflow-y-auto border-r bg-card pb-4">
        <NavContent
          mode={mode}
          pathname={pathname}
          collaboratorName={collaboratorName}
          onLogout={handleLogout}
        />
      </div>
    </aside>
  )
}