'use client';

import React, { useState } from 'react';
import {
  Vote,
  Users,
  UserMinus,
  Trophy,
  AlertTriangle,
  Clock,
  Award,
  FileDown,
  ShieldCheck,
  BarChart3,
  EyeOff,
} from 'lucide-react';
import { DashboardAdminAggregated } from '@/server/queries';
import { emitirCertificadoOficialAction } from '@/server/actions';
import { gerarCertificadoOficialPdf, gerarAtaEleitoralPdf } from '@/lib/pdf';

interface AdminOverviewTabProps {
  dados: DashboardAdminAggregated;
  onSelectTab: (tab: string) => void;
}

export function AdminOverviewTab({ dados, onSelectTab }: AdminOverviewTabProps) {
  const {
    escola,
    eleicaoAtual,
    kpis,
    apuracaoChapas,
    votosPorHora,
    participacaoPorTurma,
    participacaoPorSerie,
    perfilDemografico,
    chapas,
    integridade,
  } = dados;

  const [emitindoCertId, setEmitindoCertId] = useState<string | null>(null);

  const handleEmitirCertificado = async (
    chapaId: string,
    tipo: 'vitoria' | 'participacao',
    colocacao: number,
    votosChapa: number,
    percentualValidos: number
  ) => {
    setEmitindoCertId(`${chapaId}-${tipo}`);
    try {
      const res = await emitirCertificadoOficialAction({ chapaId, tipo });
      const chapaFull = chapas.find((c) => c.id === chapaId);
      if (res.success && res.certificado && chapaFull) {
        await gerarCertificadoOficialPdf({
          escola,
          eleicao: eleicaoAtual,
          chapa: chapaFull,
          tipo,
          votosChapa,
          percentualValidos,
          totalVotosEleicao: kpis.totalVotos,
          colocacao,
          codigoVerificacao: res.certificado.codigo_verificacao,
          originUrl: typeof window !== 'undefined' ? window.location.origin : '',
        });
      }
    } finally {
      setEmitindoCertId(null);
    }
  };

  const handleBaixarAta = async () => {
    await gerarAtaEleitoralPdf({
      escola,
      eleicao: eleicaoAtual,
      apuracao: apuracaoChapas,
      integridade,
      participacaoTurmas: participacaoPorTurma,
      totalAptos: kpis.totalAptos,
    });
  };

  const maxVotosHora = Math.max(1, ...votosPorHora.map((h) => h.total_votos));

  return (
    <div className="space-y-8">
      {/* Alerta de Empate Técnico se houver */}
      {kpis.empate && (
        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-200">
                Empate Técnico Detectado no 1º Lugar
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                Duas ou mais chapas estão empatadas na liderança. Acesse a aba &ldquo;Controle da Eleição&rdquo; para registrar o critério regimental de desempate antes de homologar a ata final.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('controle')}
            className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors shrink-0 cursor-pointer"
          >
            Resolver Empate
          </button>
        </div>
      )}

      {/* 4 KPIs Executivos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total de Votos na Urna
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#004ac6] dark:text-blue-400">
              <Vote className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {kpis.totalVotos}
            </span>
            <span className="text-xs font-bold text-emerald-600">
              ({kpis.votosValidos} válidos • {kpis.votosBrancos} brancos)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Sem voto nulo (apenas chapas homologadas e branco)
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Participação & Quórum
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {kpis.percentualParticipacao}%
            </span>
            <span className="text-xs font-semibold text-slate-500">
              ({kpis.totalParticipacoes}/{kpis.totalAptos})
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, kpis.percentualParticipacao)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Meta da escola: {kpis.metaParticipacao}%{' '}
            {kpis.metaAtingida ? '• Meta atingida!' : ''}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Eleitores Pendentes
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <UserMinus className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {kpis.faltantes}
            </span>
            <span className="text-xs font-semibold text-slate-500">alunos aptos</span>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('eleitores')}
            className="mt-2 text-xs font-bold text-[#004ac6] dark:text-blue-400 hover:underline cursor-pointer"
          >
            Ver lista de chamada por turma →
          </button>
        </div>

        <div className="bg-gradient-to-br from-[#0037b0] to-[#004ac6] text-white p-6 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-blue-200">
              Chapa Líder Atual
            </span>
            <Trophy className="w-5 h-5 text-amber-300" />
          </div>
          {kpis.lider ? (
            <>
              <h3 className="text-xl font-black truncate">{kpis.lider.nome}</h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Nº {kpis.lider.numero} • {kpis.lider.total_votos} votos ({kpis.lider.percentual_validos}% dos válidos)
              </p>
            </>
          ) : (
            <p className="text-sm font-semibold text-blue-100 mt-2">
              Aguardando primeiros votos válidos
            </p>
          )}
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1 text-emerald-300 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Urna Íntegra ({integridade.hash_resumo})
            </span>
            <button
              type="button"
              onClick={handleBaixarAta}
              className="underline font-bold hover:text-blue-200 cursor-pointer"
            >
              Gerar Ata PDF
            </button>
          </div>
        </div>
      </div>

      {/* Apuração em Tempo Real por Chapa + Certificados */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Apuração Agregada por Chapa
              </h2>
              <p className="text-xs text-slate-500">
                Contabilização direta no banco (views SQL) • Atualização automática a cada 12s
              </p>
            </div>
            <button
              type="button"
              onClick={handleBaixarAta}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              Exportar Ata Oficial (PDF)
            </button>
          </div>

          {apuracaoChapas.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Nenhuma chapa homologada nesta eleição ainda.
              </p>
              <button
                type="button"
                onClick={() => onSelectTab('chapas')}
                className="mt-3 px-4 py-2 rounded-xl bg-[#004ac6] text-white text-xs font-bold cursor-pointer"
              >
                Cadastrar Primeira Chapa
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {apuracaoChapas.map((c, idx) => {
                const isFirst = idx === 0 && c.total_votos > 0 && !kpis.empate;
                return (
                  <div
                    key={c.chapa_id}
                    className={`p-4 rounded-2xl border ${
                      isFirst
                        ? 'border-blue-500/40 bg-blue-50/30 dark:bg-blue-950/20'
                        : 'border-slate-200/70 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-xs"
                          style={{ backgroundColor: c.cor || '#004ac6' }}
                        >
                          {c.numero}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                              {c.nome}
                            </span>
                            {isFirst && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                1º Lugar
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {c.lideranca || c.slogan || `Status: ${c.status}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-lg font-black text-slate-900 dark:text-white">
                            {c.percentual_validos}%
                          </span>
                          <p className="text-[11px] text-slate-500 font-semibold">
                            {c.total_votos} votos ({c.percentual_total}% do total)
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isFirst && (
                            <button
                              type="button"
                              disabled={emitindoCertId === `${c.chapa_id}-vitoria`}
                              onClick={() =>
                                handleEmitirCertificado(
                                  c.chapa_id,
                                  'vitoria',
                                  idx + 1,
                                  c.total_votos,
                                  c.percentual_validos
                                )
                              }
                              title="Emitir Certificado Oficial de Vitória (PDF A4 Paisagem)"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Award className="w-3.5 h-3.5" />
                              Cert. Vitória
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={emitindoCertId === `${c.chapa_id}-participacao`}
                            onClick={() =>
                              handleEmitirCertificado(
                                c.chapa_id,
                                'participacao',
                                idx + 1,
                                c.total_votos,
                                c.percentual_validos
                              )
                            }
                            title="Emitir Certificado Oficial de Participação Democrática"
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Award className="w-3.5 h-3.5" />
                            Cert. Participação
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, c.percentual_validos)}%`,
                          backgroundColor: c.cor || '#004ac6',
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Linha de Votos em Branco */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>Votos em Branco</span>
                <span>
                  {kpis.votosBrancos} votos (
                  {kpis.totalVotos > 0
                    ? ((kpis.votosBrancos / kpis.totalVotos) * 100).toFixed(1)
                    : '0.0'}
                  % do total)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Fluxo de Votação por Hora */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Votos por Hora
                </h2>
                <p className="text-xs text-slate-500">
                  Agregado sem correlação com o voto individual
                </p>
              </div>
              <Clock className="w-5 h-5 text-[#004ac6]" />
            </div>

            <div className="space-y-2.5 mt-4">
              {votosPorHora.map((item) => {
                const largura = Math.round((item.total_votos / maxVotosHora) * 100);
                return (
                  <div key={item.hora} className="flex items-center gap-3 text-xs">
                    <span className="w-12 font-mono font-bold text-slate-500">
                      {item.hora}
                    </span>
                    <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#004ac6] dark:bg-blue-500 rounded-full transition-all"
                        style={{ width: `${item.total_votos > 0 ? Math.max(6, largura) : 0}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-bold text-slate-700 dark:text-slate-300">
                      {item.total_votos}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
            Segredo do voto garantido: a tabela <code className="font-mono">votos</code> não armazena horário nem IP. O fluxo horário é contabilizado a partir do protocolo de comparecimento.
          </div>
        </div>
      </div>

      {/* Participação por Série e por Turma */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Participação por Série
            </h3>
            <BarChart3 className="w-5 h-5 text-[#004ac6]" />
          </div>
          <div className="space-y-4">
            {participacaoPorSerie.map((s) => (
              <div key={s.serie} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span>{s.serie}</span>
                  <span className="text-[#004ac6] dark:text-blue-400">
                    {s.percentual_participacao}% ({s.total_votaram}/{s.total_aptos})
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#004ac6] rounded-full"
                    style={{ width: `${Math.min(100, s.percentual_participacao)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Perfil Demográfico com K-Anonimato */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5" />
              Perfil Demográfico (K-Anonimato ≥ 5)
            </h4>
            <div className="space-y-2">
              {perfilDemografico.genero.map((g) => (
                <div
                  key={g.categoria}
                  className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60"
                >
                  <span className="text-slate-600 dark:text-slate-300">{g.categoria}</span>
                  {g.oculto_anonimato ? (
                    <span className="text-[11px] italic text-amber-600">
                      Oculto (&lt; 5 votos)
                    </span>
                  ) : (
                    <span className="font-bold">
                      {g.total} ({g.percentual}%)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Mapa de Comparecimento por Turma ({participacaoPorTurma.length} turmas)
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhamento de quórum por sala de aula da {escola.nomeCurto}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
            {participacaoPorTurma.map((t) => (
              <div
                key={t.turma}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                    {t.turma}
                  </span>
                  <span className="text-xs font-black text-[#004ac6] dark:text-blue-400">
                    {t.percentual_participacao}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#004ac6] dark:bg-blue-500 rounded-full"
                    style={{ width: `${Math.min(100, t.percentual_participacao)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
                  <span>Votaram: {t.total_votaram}</span>
                  <span>Faltam: {Math.max(0, t.total_aptos - t.total_votaram)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
