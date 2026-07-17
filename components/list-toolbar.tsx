'use client'

import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@prodexy/ui'

type ListToolbarProps = {
  children: ReactNode
}

type ListSearchProps = {
  value: string
  placeholder: string
  onChange: (value: string) => void
}

type ListFilterGroupProps = {
  children: ReactNode
}

type ListStateProps = {
  loading?: boolean
  loadingText: string
  empty?: boolean
  emptyText: string
}

export function ListToolbar({ children }: ListToolbarProps) {
  return <div className="space-y-3">{children}</div>
}

export function ListSearch({ value, placeholder, onChange }: ListSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 pl-9"
        placeholder={placeholder}
      />
    </div>
  )
}

export function ListFilterGroup({ children }: ListFilterGroupProps) {
  return (
    <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
      {children}
    </div>
  )
}

export function ListState({ loading, loadingText, empty, emptyText }: ListStateProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        {loadingText}
      </div>
    )
  }

  if (empty) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        {emptyText}
      </div>
    )
  }

  return null
}