'use client';

import React from 'react';
import Link from 'next/link';
import {
  Trophy,
  Download,
  Award,
  CheckCircle2,
  BarChart3,
  Clock,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { ConfiguracaoEscola } from '@/lib/escola';
import {
  EleicaoRow,
  ApuracaoChapaItem,
  ParticipacaoTurmaItem,
  ChapaCompleta,
  RecorteDemograficoItem,
} from '@/lib/database.types';
import { CivicHeader, CivicFooter } from '@/components/CivicHeader';

interface ResultadosPublicosClientProps {
  escola: ConfiguracaoEscola;
  eleicao: EleicaoRow;
  kpis: {
    totalVotos: number;
    votosValidos: number;
    votosBrancos: number;
    totalParticipacoes: number;
    totalAptos: number;
    percentualParticipacao: number;
  };
  rankingTurmas: ParticipacaoTurmaItem[];
  apuracaoChapas: ApuracaoChapaItem[];
  chapasDetalhes: ChapaCompleta[];
  perfilDemografico: {
    genero: RecorteDemograficoItem[];
    raca: RecorteDemograficoItem[];
    faixaEtaria: RecorteDemograficoItem[];
  };
  resultadoPublicado: boolean;
}

export function ResultadosPublicosClient({
  escola,
  eleicao,
  kpis,
  rankingTurmas,
  apuracaoChapas,
  chapasDetalhes,
  perfilDemografico,
  resultadoPublicado,
}: ResultadosPublicosClientProps) {
  const exportarPacotePropostas = () => {
    const pacote = {
      escola: escola.nomeCompleto,
      cidade: escola.cidade,
      eleicao: eleicao.nome,
      exportadoEm: new Date().toISOString(),
      resumoParticipacao: {
        totalAlunos: kpis.totalAptos,
        totalComparecimento: kpis.totalParticipacoes,
        percentualComparecimento: kpis.percentualParticipacao,
      },
      perfilDemograficoAnonimizado: perfilDemografico,
      chapasParticipantes: chapasDetalhes.map((c) => ({
        numero: c.numero,
        nome: c.nome,
        slogan: c.slogan,
        propostas: c.propostas.map((p) => ({
          eixo: p.eixo,
          titulo: p.titulo,
          descricao: p.descricao,
        })),
      })),
    };
    const blob = new Blob([JSON.stringify(pacote, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pacote-propostas-gremio-urbano-${eleicao.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const turmasOrdenadas = [...rankingTurmas].sort(
    (a, b) => b.percentual_participacao - a.percentual_participacao
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9ff] dark:bg-slate-950 text-[#0b1c30] dark:text-slate-100">
      <CivicHeader
        escola={escola}
        subtitulo="Transparência e Engajamento Estudantil"
        badgeTexto={
          resultadoPublicado ? 'Resultado Oficial Publicado' : 'Participação em Tempo Real'
        }
        badgeCor={resultadoPublicado ? 'verde' : 'azul'}
        acoesDireita={
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar à Urna
          </Link>
        }
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Banner Institucional */}
        <section className="bg-gradient-to-br from-[#004ac6] to-[#1e40af] text-white rounded-3xl p-6 sm:p-10 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-bold uppercase tracking-widest mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                {escola.nomeCompleto}
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                {eleicao.nome}
              </h1>
              <p className="text-blue-100 text-sm sm:text-base mt-2 max-w-2xl">
                {resultadoPublicado
                  ? 'Confira a apuração oficial certificada pela Comissão Eleitoral e o ranking de engajamento das turmas.'
                  : 'Acompanhe o ranking saudável de comparecimento das turmas. Os votos por chapa serão divulgados após o encerramento oficial.'}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 min-w-[220px] text-center">
              <p className="text-xs uppercase font-bold tracking-widest text-blue-200">
                Comparecimento Geral
              </p>
              <p className="text-4xl font-black mt-1">{kpis.percentualParticipacao}%</p>
              <p className="text-xs text-blue-100 mt-1">
                {kpis.totalParticipacoes} de {kpis.totalAptos} estudantes
              </p>
            </div>
          </div>
        </section>

        {/* Resultado Oficial (Somente quando publicado) */}
        {resultadoPublicado ? (
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Apuração Homologada
                </span>
                <h2 className="text-2xl font-extrabold mt-1">Resultado Oficial das Chapas</h2>
              </div>
              <button
                type="button"
                onClick={exportarPacotePropostas}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#004ac6] dark:text-blue-400 text-xs font-bold hover:bg-blue-100 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar Pacote de Propostas + Perfil Anonimizado
              </button>
            </div>

            <div className="space-y-4">
              {apuracaoChapas.map((chapa, index) => {
                const isWinner = index === 0 && chapa.total_votos > 0;
                return (
                  <div
                    key={chapa.chapa_id}
                    className={`p-5 rounded-2xl border-2 transition-all ${
                      isWinner
                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm"
                          style={{ backgroundColor: chapa.cor || '#004ac6' }}
                        >
                          {chapa.numero}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                              {chapa.nome}
                            </h3>
                            {isWinner && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
                                <Trophy className="w-3 h-3" /> Chapa Eleita
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {index + 1}º Lugar {chapa.slogan ? `• "${chapa.slogan}"` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">
                          {chapa.percentual_validos}%
                        </span>
                        <p className="text-xs font-semibold text-slate-500">
                          {chapa.total_votos} votos válidos
                        </p>
                      </div>
                    </div>
                    <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, chapa.percentual_validos)}%`,
                          backgroundColor: isWinner ? '#059669' : chapa.cor || '#004ac6',
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>Votos em Branco Registrados</span>
                <span>{kpis.votosBrancos} votos</span>
              </div>
            </div>
          </section>
        ) : (
          <section className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-5 flex items-center gap-4">
            <Clock className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-amber-900 dark:text-amber-300">
                Apuração de votos por chapa aguardando publicação oficial
              </h2>
              <p className="text-xs text-amber-800 dark:text-amber-400 mt-0.5">
                Status atual da eleição: <strong className="uppercase">{eleicao.status}</strong>.
                Enquanto o resultado oficial não é publicado pela Comissão Eleitoral, acompanhe
                abaixo o Ranking Cívico de Comparecimento por Turma!
              </p>
            </div>
          </section>
        )}

        {/* Ranking Saudável de Participação por Turma */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#004ac6] dark:text-blue-400 flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                Mobilização Cívica
              </span>
              <h2 className="text-2xl font-extrabold mt-1">
                Ranking Saudável de Participação por Turma
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Exibe apenas o percentual de comparecimento de cada sala, preservando 100% do
                sigilo individual.
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-[#004ac6] hidden sm:block" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {turmasOrdenadas.map((turma, idx) => (
              <div
                key={turma.turma}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                        idx === 0
                          ? 'bg-amber-400 text-amber-950'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-900'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {idx + 1}º
                    </span>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Turma {turma.turma}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-[#004ac6] dark:text-blue-400">
                      {turma.percentual_participacao}%
                    </span>
                    <span className="text-[11px] text-slate-500 ml-1.5">
                      ({turma.total_votaram}/{turma.total_aptos})
                    </span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#004ac6] dark:bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, turma.percentual_participacao)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <CivicFooter escola={escola} />
    </div>
  );
}
