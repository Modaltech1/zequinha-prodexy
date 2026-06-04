// components/mobile-nav.tsx
'use client'

import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@prodexy/ui'
import { supabase } from '@/lib/supabaseClient'
import { NavContent } from '@/components/navigation/nav-content'
import {
  getPanelSubtitle,
  getSheetTitle,
  type NavMode,
} from '@/components/navigation/config'

interface MobileNavProps {
  mode: NavMode
  collaboratorName?: string
}

export function MobileNav({ mode, collaboratorName }: MobileNavProps) {
  const pathname = usePathname()
  const subtitle = getPanelSubtitle(mode, collaboratorName)
  const sheetTitle = getSheetTitle(mode)

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
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-card px-4">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>

        <SheetContent side="left" className="flex w-72 flex-col p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{sheetTitle}</SheetTitle>
            <SheetDescription>
              Navegação principal da aplicação.
            </SheetDescription>
          </SheetHeader>

          <NavContent
            mode={mode}
            pathname={pathname}
            collaboratorName={collaboratorName}
            onLogout={handleLogout}
          />
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground">
          <img src="/icon.jpg" alt="Logo" className="object-cover" />
        </div>
        <div>
          <span className="block text-base font-semibold">Zequinha Pneus</span>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
      </div>
    </div>
  )
}
