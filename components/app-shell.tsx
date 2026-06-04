// components/app-shell.tsx
import { MobileNav } from '@/components/mobile-nav'
import { type NavMode } from '@/components/navigation/config'

type AppShellProps = {
    mode: NavMode
    collaboratorName?: string
    children: React.ReactNode
}

export function AppShell({ mode, collaboratorName, children, }: AppShellProps) {
    return (
        <div className="flex min-h-screen bg-muted/30">
            <div className="flex-1">
                <MobileNav mode={mode} collaboratorName={collaboratorName} />
                <main className="p-4 lg:p-8">{children}</main>
            </div>
        </div>
    )
}
