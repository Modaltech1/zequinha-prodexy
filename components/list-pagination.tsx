'use client'

import { Button } from '@prodexy/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type ListPaginationProps = {
  currentPage: number
  totalItems: number
  itemsPerPage: number
  itemLabel: string
  onPageChange: (page: number) => void
}

export function ListPagination({
  currentPage,
  totalItems,
  itemsPerPage,
  itemLabel,
  onPageChange,
}: ListPaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  if (totalPages <= 1) return null

  const safePage = Math.min(Math.max(currentPage, 1), totalPages)
  const startIndex = (safePage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1
    if (safePage <= 3) return i + 1
    if (safePage >= totalPages - 2) return totalPages - 4 + i
    return safePage - 2 + i
  })

  return (
    <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Mostrando {startIndex + 1} a {endIndex} de {totalItems} {itemLabel}
      </p>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1">
          {pages.map((page) => (
            <Button
              key={page}
              variant={safePage === page ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(page)}
              className="h-8 w-8 p-0"
            >
              {page}
            </Button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
