'use client';

import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  FileDown,
  Lock,
  CheckCircle2,
  Activity,
  Hash,
} from 'lucide-react';
import { DashboardAdminAggregated } from '@/server/queries';
import { gerarAtaEleitoralPdf } from '@/lib/pdf';

interface AdminAuditoriaTabProps {
  dados: DashboardAdminAggregated;
}

export function AdminAuditoriaTab({ dados }: AdminAuditoriaTabProps) {
  const {
    escola,
    eleicaoAtual,
    apuracaoChapas,
    integridade,
    participacaoPorTurma,
    kpis,
    auditoriaRecente,
  } = dados;

  const handleGerarAtaOficial = async () => {
    await gerarAtaEleitoralPdf({
      escola,
      eleicao: eleicaoAtual,
      apuracao: apuracaoChapas,
      integridade,
      participacaoTurmas: participacaoPorTurma,
      totalAptos: kpis.totalAptos,
    });
  };

  return (
    <div className="space-y-6">
      {/* Relatório de Integridade Criptográfica e Paridade */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div
              className={`p-3 rounded-2xl ${
                integridade.integro
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600'
                  : 'bg-red-50 dark:bg-red-950/60 text-red-600'
              }`}
            >
              {integridade.integro ? (
                <ShieldCheck className="w-7 h-7" />
              ) : (
                <AlertTriangle className="w-7 h-7" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Relatório de Integridade da Urna Eletrônica
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    integridade.integro
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {integridade.integro ? 'PARIDADE 100% ÍNTEGRA' : 'ATENÇÃO: DIVERGÊNCIA'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Verifica matematicamente se o número de votos anônimos na urna corresponde exatamente ao número de participações registradas no caderno de chamada, sem RAs duplicados.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGerarAtaOficial}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#004ac6] hover:bg-[#0037b0] text-white text-xs font-bold shadow-md transition-colors shrink-0 cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            Emitir Ata Oficial da Eleição (PDF)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase text-slate-500 block">
              Assinaturas (Participações)
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
              {integridade.total_participacoes}
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold">
              PK (eleicao_id, ra) única
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase text-slate-500 block">
              Cédulas na Urna (Votos)
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
              {integridade.total_votos}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">
              {integridade.votos_validos} válidos • {integridade.votos_brancos} brancos
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase text-slate-500 block">
              Duplicidades de RA
            </span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">
              {integridade.duplicidades_ra}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">
              Bloqueio atômico ativo
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5" /> Hash de Verificação
            </span>
            <span className="text-lg font-mono font-black text-[#004ac6] dark:text-blue-400 mt-1 block">
              {integridade.hash_resumo}
            </span>
            <span className="text-[11px] text-slate-500">
              Sem IP, User-Agent ou Timestamp no voto
            </span>
          </div>
        </div>
      </div>

      {/* Log de Auditoria de Ações Administrativas e Eventos Suspeitos */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#004ac6]" />
              Trilha de Auditoria Imutável (log_auditoria)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Registra logins administrativos, alterações de chapas, emissão de certificados e tentativas suspeitas na urna (como botão &ldquo;Não sou eu&rdquo; ou RAs inexistentes).
            </p>
          </div>
          <Lock className="w-5 h-5 text-slate-400" />
        </div>

        <div className="overflow-x-auto max-h-[450px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold uppercase text-slate-500">
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Ator</th>
                <th className="py-3 px-4">Evento Auditado</th>
                <th className="py-3 px-4">Detalhes Técnicos (JSON)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditoriaRecente.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    Nenhum evento registrado no log de auditoria até o momento.
                  </td>
                </tr>
              ) : (
                auditoriaRecente.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 font-bold">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">
                        {log.ator}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#004ac6]" />
                        {log.acao}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 max-w-md truncate">
                      {JSON.stringify(log.detalhes)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
