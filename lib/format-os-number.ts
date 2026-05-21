const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Exibe número curto da OS; IDs longos/UUID viram até 5 caracteres + "..." */
export function formatOsNumber(numero?: string | null, id?: string) {
  const custom = numero?.trim()
  if (custom && custom.length <= 12 && !UUID_RE.test(custom)) {
    return custom
  }

  const value = (custom || id?.trim() || '')
  if (!value) return '-'
  if (value.length <= 5) return value

  return `${value.slice(0, 5)}...`
}
