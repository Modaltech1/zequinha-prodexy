// components/navigation/nav-content.tsx
'use client'

import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { Button, cn } from '@prodexy/ui'
import {
    getMenuItems,
    getPanelSubtitle,
    type NavMode,
} from '@/components/navigation/config'

type NavContentProps = {
    mode: NavMode
    pathname: string
    collaboratorName?: string
    onLogout: () => void
}

export function NavContent({
    mode,
    pathname,
    collaboratorName,
    onLogout,
}: NavContentProps) {
    const menuItems = getMenuItems(mode)
    const subtitle = getPanelSubtitle(mode, collaboratorName)

    return (
        <>
            <div className="flex h-16 shrink-0 items-center border-b px-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground">
                        <img src="/icon.jpg" alt="Logo" className="object-cover" />
                    </div>
                    <div>
                        <span className="block text-lg font-semibold">Zequinha Pneus</span>
                        <span className="text-xs text-muted-foreground">{subtitle}</span>
                    </div>
                </div>
            </div>

            <nav className="flex flex-1 flex-col p-6">
                <ul className="flex flex-1 flex-col gap-y-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon
                        const active = pathname === item.href

                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        'group flex w-full gap-x-3 rounded-lg p-3 text-sm font-medium leading-6 transition-colors',
                                        active
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    )}
                                >
                                    <Icon className="h-5 w-5 shrink-0" />
                                    {item.label}
                                </Link>
                            </li>
                        )
                    })}
                </ul>

                <Button
                    onClick={onLogout}
                    variant="ghost"
                    className="mt-4 justify-start gap-x-3 rounded-lg p-3 text-sm font-medium leading-6 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    <LogOut className="h-5 w-5 shrink-0" />
                    Sair
                </Button>
            </nav>
        </>
    )
}