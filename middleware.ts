// muddleware.ts

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthRoute = pathname.startsWith('/login')

  if (
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/_next')
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user }, } = await supabase.auth.getUser()

  let perfil: { papel: string; ativo: boolean } | null = null

  if (user) {
    const { data } = await supabase
      .from('perfis')
      .select('papel, ativo')
      .eq('id', user.id)
      .single()

    perfil = data
  }

  if (pathname === '/') {
    if (!user || !perfil || !perfil.ativo) return NextResponse.redirect(new URL('/login', request.url))
    if (perfil.papel === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    if (perfil.papel === 'colaborador') return NextResponse.redirect(new URL('/colaborador/pagina', request.url))
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthRoute) {
    if (!user || !perfil || !perfil.ativo) return response
    if (perfil.papel === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    if (perfil.papel === 'colaborador') return NextResponse.redirect(new URL('/colaborador/pagina', request.url))
    return response
  }

  if (!user || !perfil || !perfil.ativo) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith('/admin') && perfil.papel !== 'admin') return NextResponse.redirect(new URL('/login', request.url))
  if (pathname.startsWith('/colaborador') && perfil.papel !== 'colaborador') return NextResponse.redirect(new URL('/login', request.url))

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}