import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function requirePublicEnvironmentVariable(
  name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
): string {
  const value = process.env[name]
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`)
  return value
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    requirePublicEnvironmentVariable('NEXT_PUBLIC_SUPABASE_URL'),
    requirePublicEnvironmentVariable('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // O middleware renova a sessão quando o contexto atual não permite escrita de cookies.
          }
        },
      },
    }
  )
}
