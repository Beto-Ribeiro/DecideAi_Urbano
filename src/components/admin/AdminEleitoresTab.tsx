'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Download,
  FileText,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldCheck,
} from 'lucide-react';
import { ConfiguracaoEscola } from '@/lib/escola';
import { buscarEleitoresAdminAction } from '@/server/actions';
import { gerarListaEleitoresPdf } from '@/lib/pdf';

interface AdminEleitoresTabProps {
  escola: ConfiguracaoEscola;
  eleicaoId: string;
  turmasDisponiveis: string[];
}

interface EleitorItem {
  ra: string;
  nome: string;
  turma: string;
  serie: string;
  situacao: string;
  data_nascimento: string | null;
  votou: boolean;
  votou_em: string | null;
  protocolo: string | null;
}

export function AdminEleitoresTab({
  escola,
  eleicaoId,
  turmasDisponiveis,
}: AdminEleitoresTabProps) {
  const [busca, setBusca] = useState('');
  const [turmaFiltro, setTurmaFiltro] = useState('todas');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'votou' | 'pendente'>('todos');
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(false);

  const [itens, setItens] = useState<EleitorItem[]>([]);
  const [totalFiltrado, setTotalFiltrado] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const carregarEleitores = useCallback(
    async (pag: number) => {
      setLoading(true);
      try {
        const res = await buscarEleitoresAdminAction({
          eleicaoId,
          busca,
          turma: turmaFiltro,
          statusVoto: statusFiltro,
          pagina: pag,
          porPagina: 25,
        });
        setItens(res.itens);
        setTotalFiltrado(res.totalFiltrado);
        setTotalPaginas(res.totalPaginas);
        setPagina(res.paginaAtual);
      } finally {
        setLoading(false);
      }
    },
    [eleicaoId, busca, turmaFiltro, statusFiltro]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      carregarEleitores(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [carregarEleitores]);

  const exportarCsv = async () => {
    const res = await buscarEleitoresAdminAction({
      eleicaoId,
      busca,
      turma: turmaFiltro,
      statusVoto: statusFiltro,
      pagina: 1,
      porPagina: 200,
    });
    const cabecalho = 'RA;Nome;Turma;Serie;Status_Comparecimento;Data_Hora_Voto;Protocolo\n';
    const linhas = res.itens
      .map(
        (item) =>
          `${item.ra};"${item.nome}";"${item.turma}";"${item.serie}";${
            item.votou ? 'VOTOU' : 'PENDENTE'
          };${item.votou_em ? new Date(item.votou_em).toLocaleString('pt-BR') : '-'};${
            item.protocolo || '-'
          }`
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + cabecalho + linhas], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lista-eleitores-${turmaFiltro}-${statusFiltro}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportarPdf = async () => {
    const res = await buscarEleitoresAdminAction({
      eleicaoId,
      busca,
      turma: turmaFiltro,
      statusVoto: statusFiltro,
      pagina: 1,
      porPagina: 200,
    });
    const titulo = `Lista de Comparecimento (${
      turmaFiltro === 'todas' ? 'Todas as Turmas' : `Turma ${turmaFiltro}`
    } — ${statusFiltro.toUpperCase()})`;
    gerarListaEleitoresPdf({
      escola,
      titulo,
      eleitores: res.itens,
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Filtros */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Caderno de Votação & Lista de Chamada
            </h2>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Exibe exclusivamente se o estudante compareceu e quando. O voto é 100% anônimo e separado.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportarCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={exportarPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#004ac6] text-white text-xs font-bold hover:bg-[#0037b0] transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              Baixar Lista em PDF (Chamada / Pendentes)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome do estudante ou número de RA..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#004ac6]"
            />
          </div>

          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <select
              value={turmaFiltro}
              onChange={(e) => setTurmaFiltro(e.target.value)}
              aria-label="Filtrar por turma"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#004ac6]"
            >
              <option value="todas">Todas as Turmas</option>
              {turmasDisponiveis.map((t) => (
                <option key={t} value={t}>
                  Turma {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFiltro}
              onChange={(e) =>
                setStatusFiltro(e.target.value as 'todos' | 'votou' | 'pendente')
              }
              aria-label="Filtrar por status de comparecimento"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#004ac6]"
            >
              <option value="todos">Todos os Estudantes ({totalFiltrado})</option>
              <option value="votou">Já Votaram</option>
              <option value="pendente">Pendentes (Faltam Votar)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela Paginada no Servidor */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">RA</th>
                <th className="py-3.5 px-4">Nome Completo do Estudante</th>
                <th className="py-3.5 px-4">Turma / Série</th>
                <th className="py-3.5 px-4">Status na Urna</th>
                <th className="py-3.5 px-4">Horário / Protocolo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    Consultando caderno de eleitores no servidor...
                  </td>
                </tr>
              ) : itens.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    Nenhum estudante encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                itens.map((aluno) => (
                  <tr
                    key={aluno.ra}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {aluno.ra}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {aluno.nome}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold">
                        {aluno.turma}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {aluno.votou ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Compareceu
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                          <Clock className="w-3.5 h-3.5" />
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {aluno.votou && aluno.votou_em ? (
                        <div>
                          <span>
                            {new Date(aluno.votou_em).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {aluno.protocolo && (
                            <span className="ml-2 text-slate-400">({aluno.protocolo})</span>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <span className="font-semibold text-slate-500">
            Total filtrado: <strong>{totalFiltrado}</strong> estudantes • Página{' '}
            <strong>{pagina}</strong> de <strong>{totalPaginas}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagina <= 1 || loading}
              onClick={() => carregarEleitores(pagina - 1)}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold disabled:opacity-40 flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
            <button
              type="button"
              disabled={pagina >= totalPaginas || loading}
              onClick={() => carregarEleitores(pagina + 1)}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold disabled:opacity-40 flex items-center gap-1 cursor-pointer"
            >
              Próxima
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
