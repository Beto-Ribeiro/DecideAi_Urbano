import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { ESCOLA_DEFAULT } from '@/lib/escola';
import { obterEleicaoAtiva } from '@/server/queries';
import { carregarEstado } from '@/server/store';

export const dynamic = 'force-dynamic';

/**
 * Endpoint leve de Health-Check e Keep-Alive do Supabase Free (chamado pelo Vercel Cron diário).
 * Evita a pausa automática do banco de dados após 7 dias sem atividade.
 */
export async function GET() {
  const start = Date.now();
  let supabaseReachable = false;

  try {
    const sb = getSupabaseServer();
    const { error } = await sb.from('alunos').select('ra', { head: true, count: 'exact' }).limit(1);
    supabaseReachable = !error;
  } catch {
    supabaseReachable = false;
  }

  await carregarEstado();
  const eleicao = obterEleicaoAtiva();

  return NextResponse.json(
    {
      status: 'ok',
      escola: ESCOLA_DEFAULT.nome,
      nomeCurto: ESCOLA_DEFAULT.nomeCurto,
      eleicaoAtiva: eleicao.nome,
      statusEleicao: eleicao.status,
      supabaseReachable,
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
