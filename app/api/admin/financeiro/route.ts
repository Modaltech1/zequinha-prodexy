import { NextResponse } from 'next/server'
import { parseFinancialReportFilters } from '@/features/financial/domain/report'
import { loadFinancialReport } from '@/features/financial/server/report-repository'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  const filters = parseFinancialReportFilters(new URL(request.url).searchParams)
  if (!filters.ok) {
    return NextResponse.json({ error: filters.message }, { status: 400 })
  }

  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('perfis')
      .select('papel,ativo')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) throw profileError
    if (!profile || !profile.ativo || profile.papel !== 'admin') {
      return NextResponse.json(
        { error: 'Você não tem permissão para consultar o relatório financeiro.' },
        { status: 403 }
      )
    }

    const report = await loadFinancialReport({ supabase, filters: filters.value })
    return NextResponse.json(report, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    console.error('Erro ao carregar relatório financeiro:', error)
    return NextResponse.json(
      { error: 'Não foi possível carregar o relatório financeiro.' },
      { status: 500 }
    )
  }
}
