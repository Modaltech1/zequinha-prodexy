'use client'

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { Input } from '@prodexy/ui'

export type SearchComboboxItem = {
  id: string
}

type SearchComboboxProps<T extends SearchComboboxItem> = {
  items: T[]
  value: string
  onValueChange: (value: string) => void
  getItemLabel: (item: T) => string
  getItemSearchText: (item: T) => string
  renderItem: (item: T) => ReactNode
  placeholder: string
  emptyMessage: (query: string) => string
  itemName: string
  resultLimit?: number
}

export function normalizeComboboxSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function SearchCombobox<T extends SearchComboboxItem>({
  items,
  value,
  onValueChange,
  getItemLabel,
  getItemSearchText,
  renderItem,
  placeholder,
  emptyMessage,
  itemName,
  resultLimit = 30,
}: SearchComboboxProps<T>) {
  const generatedId = useId()
  const listboxId = `search-combobox-${generatedId}`
  const containerRef = useRef<HTMLDivElement>(null)
  const previousValueRef = useRef(value)
  const pendingUserClearRef = useRef(false)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const selectedItem = items.find((item) => item.id === value)

  useEffect(() => {
    if (value === previousValueRef.current) return

    const wasClearedByTyping = pendingUserClearRef.current && value === ''
    previousValueRef.current = value
    pendingUserClearRef.current = false

    if (!wasClearedByTyping) {
      setQuery(selectedItem ? getItemLabel(selectedItem) : '')
    }
  }, [getItemLabel, selectedItem, value])

  const filteredItems = useMemo(() => {
    const terms = normalizeComboboxSearch(query).split(/\s+/).filter(Boolean)
    const results = terms.length === 0
      ? items
      : items.filter((item) => {
          const searchable = normalizeComboboxSearch(getItemSearchText(item))
          return terms.every((term) => searchable.includes(term))
        })

    return results.slice(0, resultLimit)
  }, [getItemSearchText, items, query, resultLimit])

  function selectItem(item: T) {
    pendingUserClearRef.current = false
    onValueChange(item.id)
    setQuery(getItemLabel(item))
    setOpen(false)
  }

  function clearSelection(nextQuery = '') {
    setQuery(nextQuery)
    setActiveIndex(0)
    setOpen(true)

    if (value) {
      pendingUserClearRef.current = true
      onValueChange('')
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open && filteredItems[activeIndex] ? `${listboxId}-option-${filteredItems[activeIndex].id}` : undefined}
          value={query}
          placeholder={placeholder}
          className="pr-16 pl-9"
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => clearSelection(event.target.value)}
          onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setOpen(true)
              setActiveIndex((current) => filteredItems.length ? Math.min(current + 1, filteredItems.length - 1) : 0)
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActiveIndex((current) => Math.max(current - 1, 0))
            } else if (event.key === 'Enter' && open && filteredItems[activeIndex]) {
              event.preventDefault()
              selectItem(filteredItems[activeIndex])
            } else if (event.key === 'Escape') {
              setOpen(false)
            }
          }}
        />
        {query && (
          <button
            type="button"
            aria-label={`Limpar busca de ${itemName}`}
            className="absolute right-9 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => clearSelection()}
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          aria-label={`${open ? 'Fechar' : 'Abrir'} lista de ${itemName}`}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => setOpen((current) => !current)}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div id={listboxId} role="listbox" className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg">
          {filteredItems.length > 0 ? filteredItems.map((item, index) => (
            <button
              id={`${listboxId}-option-${item.id}`}
              key={item.id}
              type="button"
              role="option"
              aria-selected={item.id === value}
              className={`flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${index === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectItem(item)}
            >
              <Check className={`mt-0.5 h-4 w-4 shrink-0 ${item.id === value ? 'opacity-100' : 'opacity-0'}`} />
              <span className="min-w-0 flex-1">{renderItem(item)}</span>
            </button>
          )) : (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyMessage(query)}</p>
          )}
          {items.length > resultLimit && filteredItems.length === resultLimit && (
            <p className="border-t px-3 py-2 text-xs text-muted-foreground">
              Mostrando os {resultLimit} primeiros resultados. Continue digitando para refinar.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
