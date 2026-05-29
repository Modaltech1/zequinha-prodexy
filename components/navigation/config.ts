// components/navigation/config.ts
import type { LucideIcon } from 'lucide-react'
import { Briefcase, CalendarDays, Car, IdCardLanyard, LayoutDashboard, Package, Receipt, Users } from 'lucide-react'

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
                href: '/admin/servicos',
                label: 'Serviços',
                icon: Briefcase,
            },
            {
                href: '/admin/produtos',
                label: 'Produtos',
                icon: Package,
            },
            {
                href: '/admin/ordens',
                label: 'Ordens de Serviços',
                icon: Receipt,
            },
            {
                href: '/admin/clientes',
                label: 'Clientes',
                icon: Users,
            },
            {
                href: '/admin/fidelizacao',
                label: 'Fidelização',
                icon: Car,
            },
            {
                href: '/admin/eventos',
                label: 'Eventos',
                icon: CalendarDays,
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
            href: '/colaborador/ordens',
            label: 'Ordens de Serviço',
            icon: Receipt,
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
