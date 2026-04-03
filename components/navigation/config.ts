// components/navigation/config.ts
import type { LucideIcon } from 'lucide-react'
import { IdCardLanyard, LayoutDashboard, Users } from 'lucide-react'

export type NavMode = 'admin' | 'colaborador'

export type NavItem = {
    href: string
    label: string
    icon: LucideIcon
}

export function getMenuItems(mode: NavMode): NavItem[] {
    if (mode === 'admin') {
        return [
            {
                href: '/admin/dashboard',
                label: 'Dashboard',
                icon: LayoutDashboard,
            },
            {
                href: '/admin/colaboradores',
                label: 'Colaboradores',
                icon: IdCardLanyard,
            },
        ]
    }

    return [
        {
            href: '/colaborador/pagina',
            label: 'Página',
            icon: Users,
        },
    ]
}

export function getPanelSubtitle(mode: NavMode, collaboratorName?: string): string {
    if (mode === 'admin') return 'Painel administrativo'
    return collaboratorName || 'Colaborador'
}

export function getSheetTitle(mode: NavMode): string {
    return mode === 'admin' ? 'Menu administrativo' : 'Menu do colaborador'
}