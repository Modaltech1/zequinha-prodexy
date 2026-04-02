import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

function getAuthClient(request: NextRequest, response: NextResponse) {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    response.cookies.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    response.cookies.set({ name, value: '', ...options })
                },
            },
        }
    )
}

function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )
}

async function ensureAdmin(request: NextRequest, response: NextResponse) {
    const authClient = getAuthClient(request, response)

    const { data: { user }, } = await authClient.auth.getUser()

    if (!user) return { ok: false as const, status: 401 }

    const { data: perfil } = await authClient
        .from('perfis')
        .select('papel,ativo')
        .eq('id', user.id)
        .single()

    if (!perfil || !perfil.ativo || perfil.papel !== 'admin') return { ok: false as const, status: 403 }

    return { ok: true as const }
}

export async function POST(request: NextRequest) {
    const response = NextResponse.json({ ok: true })

    const authCheck = await ensureAdmin(request, response)
    if (!authCheck.ok) {
        return NextResponse.json({ error: 'Não autorizado.' }, { status: authCheck.status })
    }

    const body = await request.json()
    const nome = String(body.nome || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const senha = String(body.senha || '').trim()

    if (!nome || !email || !senha) {
        return NextResponse.json({ error: 'Nome, email e senha são obrigatórios.' }, { status: 400 })
    }

    const service = getServiceClient()

    const { data: created, error: createError } = await service.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: {
            nome,
            papel: 'colaborador',
        },
    })

    if (createError || !created.user) {
        return NextResponse.json({ error: createError?.message || 'Erro ao criar colaborador.' }, { status: 400 })
    }

    const { error: perfilError } = await service
        .from('perfis')
        .update({
            nome,
            email,
            papel: 'colaborador',
            ativo: true,
        })
        .eq('id', created.user.id)

    if (perfilError) {
        return NextResponse.json({ error: perfilError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
}

export async function PATCH(request: NextRequest) {
    const response = NextResponse.json({ ok: true })

    const authCheck = await ensureAdmin(request, response)
    if (!authCheck.ok) {
        return NextResponse.json({ error: 'Não autorizado.' }, { status: authCheck.status })
    }

    const body = await request.json()
    const id = String(body.id || '').trim()
    const nome = String(body.nome || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const senha = String(body.senha || '').trim()
    const ativo = Boolean(body.ativo)

    if (!id || !nome || !email) {
        return NextResponse.json({ error: 'ID, nome e email são obrigatórios.' }, { status: 400 })
    }

    const service = getServiceClient()

    const updateAuthPayload: Record<string, any> = {
        email,
        user_metadata: {
            nome,
            papel: 'colaborador',
        },
    }

    if (senha) {
        updateAuthPayload.password = senha
    }

    const { error: authError } = await service.auth.admin.updateUserById(id, updateAuthPayload)
    if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const { error: perfilError } = await service
        .from('perfis')
        .update({
            nome,
            email,
            papel: 'colaborador',
            ativo,
        })
        .eq('id', id)

    if (perfilError) {
        return NextResponse.json({ error: perfilError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
}