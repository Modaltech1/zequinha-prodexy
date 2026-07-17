import type { ReactNode } from 'react'

type AdminPageProps = {
  children: ReactNode
}

type AdminPageHeaderProps = {
  title: string
  description?: string
  actions?: ReactNode
}

export function AdminPage({ children }: AdminPageProps) {
  return (
    <div className="w-full space-y-6">
      {children}
    </div>
  )
}

export function AdminPageHeader({ title, description, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-3xl font-bold leading-tight tracking-tight">{title}</h1>
        {description && (
          <p className="max-w-3xl text-muted-foreground">{description}</p>
        )}
      </div>

      {actions && (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end [&>button]:w-full [&>button]:sm:w-auto">
          {actions}
        </div>
      )}
    </div>
  )
}
