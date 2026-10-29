'use client';

import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Archive,
  History,
  Trash2,
  Eye,
  Scale,
  AlertCircle,
} from 'lucide-react';
import { DashboardAdminAggregated } from '@/server/queries';
import { StatusEleicao } from '@/lib/database.types';
import {
  atualizarControleEleicaoAdminAction,
  arquivarECriarNovaEleicaoAdminAction,
  expurgarDadosCicloLgpdAdminAction,
} from '@/server/actions';

interface AdminControleTabProps {
  dados: DashboardAdminAggregated;
  onRefresh: () => void;
}

export function AdminControleTab({ dados, onRefresh }: AdminControleTabProps) {
  const { eleicaoAtual, chapas, kpis, historicoEleicoes } = dados;

  const [nome, setNome] = useState(eleicaoAtual.nome);
  const [status, setStatus] = useState<StatusEleicao>(eleicaoAtual.status);
  const [abreEm, setAbreEm] = useState(
    eleicaoAtual.abre_em ? eleicaoAtual.abre_em.substring(0, 16) : ''
  );
  const [encerraEm, setEncerraEm] = useState(
    eleicaoAtual.encerra_em ? eleicaoAtual.encerra_em.substring(0, 16) : ''
  );
  const [resultadoPublicado, setResultadoPublicado] = useState(
    eleicaoAtual.resultado_publicado
  );
  const [mostrarParcial, setMostrarParcial] = useState(
    eleicaoAtual.mostrar_parcial_para_chapas
  );
  const [desempateChapaId, setDesempateChapaId] = useState(
    eleicaoAtual.desempate_chapa_id || ''
  );
  const [desempateJustificativa, setDesempateJustificativa] = useState(
    eleicaoAtual.desempate_justificativa || ''
  );
  const [confirmacaoDuasEtapas, setConfirmacaoDuasEtapas] = useState('');

  // Arquivar e Criar Nova Eleição (Fase 0 item 7)
  const [nomeNovaEleicao, setNomeNovaEleicao] = useState(
    `Eleição do Grêmio Estudantil ${new Date().getFullYear() + 1} — E.E. Urbano`
  );
  const [confirmacaoArquivar, setConfirmacaoArquivar] = useState('');

  // Expurgo LGPD de fim de ciclo
  const [confirmacaoLgpd, setConfirmacaoLgpd] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(
    null
  );

  const exigeConfirmacaoEncerramento =
    eleicaoAtual.status === 'aberta' && status === 'encerrada';

  const handleSalvarControle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setMensagem(null);
    try {
      const res = await atualizarControleEleicaoAdminAction({
        eleicaoId: eleicaoAtual.id,
        nome,
        status,
        abre_em: abreEm ? new Date(abreEm).toISOString() : null,
        encerra_em: encerraEm ? new Date(encerraEm).toISOString() : null,
        resultado_publicado: resultadoPublicado,
        mostrar_parcial_para_chapas: mostrarParcial,
        desempate_chapa_id: desempateChapaId || null,
        desempate_justificativa: desempateJustificativa || null,
        confirmacaoDuasEtapas: confirmacaoDuasEtapas.trim(),
      });
      if (res.error) {
        setMensagem({ tipo: 'erro', texto: res.error });
      } else {
        setConfirmacaoDuasEtapas('');
        setMensagem({
          tipo: 'ok',
          texto: 'Configurações de controle e janela eleitoral atualizadas com sucesso!',
        });
        onRefresh();
      }
    } finally {
      setSalvando(false);
    }
  };

  const handleArquivarECriarNova = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setMensagem(null);
    try {
      const res = await arquivarECriarNovaEleicaoAdminAction({
        nomeNovaEleicao,
        confirmacaoTexto: confirmacaoArquivar,
      });
      if (res.error) {
        setMensagem({ tipo: 'erro', texto: res.error });
      } else {
        setConfirmacaoArquivar('');
        setMensagem({
          tipo: 'ok',
          texto:
            'Eleição anterior preservada no histórico e novo ciclo eleitoral criado com sucesso!',
        });
        onRefresh();
      }
    } finally {
      setSalvando(false);
    }
  };

  const handleExpurgoLgpd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setMensagem(null);
    try {
      const res = await expurgarDadosCicloLgpdAdminAction({
        eleicaoId: eleicaoAtual.id,
        confirmacao: confirmacaoLgpd,
      });
      if (res.error) {
        setMensagem({ tipo: 'erro', texto: res.error });
      } else {
        setConfirmacaoLgpd('');
        setMensagem({
          tipo: 'ok',
          texto:
            'Expurgo LGPD realizado: protocolos nominais de comparecimento descartados, preservando apenas os totais anônimos da ata.',
        });
        onRefresh();
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-8">
      {mensagem && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            mensagem.tipo === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {mensagem.tipo === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{mensagem.texto}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensagem(null)}
            className="underline ml-4 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* 1. Controle de Janela de Tempo, Status e Publicação */}
      <form
        onSubmit={handleSalvarControle}
        className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6"
      >
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#004ac6]" />
            Controle Operacional da Eleição Ativa
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            A abertura e o encerramento são verificados em tempo real a cada requisição (sem depender de cron externo).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
              Título Oficial do Pleito
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
              Status da Urna Eletrônica
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusEleicao)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold"
            >
              <option value="rascunho">Rascunho (Em Preparação)</option>
              <option value="agendada">Agendada (Aguardando Horário)</option>
              <option value="aberta">Aberta (Recebendo Votos)</option>
              <option value="encerrada">Encerrada (Apuração Final)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
              Data/Hora de Abertura Automática (Opcional)
            </label>
            <input
              type="datetime-local"
              value={abreEm}
              onChange={(e) => setAbreEm(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
              Data/Hora de Encerramento Automático (Opcional)
            </label>
            <input
              type="datetime-local"
              value={encerraEm}
              onChange={(e) => setEncerraEm(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono"
            />
          </div>
        </div>

        {/* Confirmação em duas etapas para encerrar urna aberta */}
        {exigeConfirmacaoEncerramento && (
          <div className="p-5 rounded-2xl bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 space-y-3">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-extrabold text-xs uppercase">
              <AlertTriangle className="w-4 h-4" />
              Confirmação em Duas Etapas para Encerramento da Urna
            </div>
            <p className="text-xs text-red-700 dark:text-red-300">
              Para evitar encerramento acidental durante o horário de aula, digite exatamente{' '}
              <strong className="font-mono">ENCERRAR URNA</strong> no campo abaixo:
            </p>
            <input
              type="text"
              value={confirmacaoDuasEtapas}
              onChange={(e) => setConfirmacaoDuasEtapas(e.target.value)}
              placeholder="Digite ENCERRAR URNA"
              className="w-full max-w-xs px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-red-300 text-xs font-mono font-bold"
            />
          </div>
        )}

        {/* Visibilidade Pública e Portal da Chapa */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <label className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={resultadoPublicado}
              onChange={(e) => setResultadoPublicado(e.target.checked)}
              className="mt-1 rounded"
            />
            <div>
              <span className="text-xs font-extrabold block text-slate-900 dark:text-white">
                Publicar Resultado Oficial (/resultados e /chapa)
              </span>
              <span className="text-[11px] text-slate-500">
                Quando marcado (e com a eleição encerrada), libera o resultado completo e os certificados das chapas.
              </span>
            </div>
          </label>

          <label className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={mostrarParcial}
              onChange={(e) => setMostrarParcial(e.target.checked)}
              className="mt-1 rounded"
            />
            <div>
              <span className="text-xs font-extrabold block text-slate-900 dark:text-white flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-[#004ac6]" />
                Permitir Parcial para Chapas durante Votação
              </span>
              <span className="text-[11px] text-slate-500">
                Por padrão desmarcado: enquanto aberta, o portal /chapa exibe apenas o comparecimento geral da escola.
              </span>
            </div>
          </label>
        </div>

        {/* Tratamento Regimental de Empate */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            <Scale className="w-4 h-4 text-[#004ac6]" />
            Tratamento de Empate Regimental{' '}
            {kpis.empate && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px]">
                EMPATE ATIVO
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Chapa Vencedora por Critério de Desempate (Se houver empate)
              </label>
              <select
                value={desempateChapaId}
                onChange={(e) => setDesempateChapaId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
              >
                <option value="">Sem desempate manual aplicado</option>
                {chapas.map((c) => (
                  <option key={c.id} value={c.id}>
                    Nº {c.numero} — {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Justificativa em Ata (Ex: Art. 14 do Estatuto — Maior representatividade de séries)
              </label>
              <input
                type="text"
                value={desempateJustificativa}
                onChange={(e) => setDesempateJustificativa(e.target.value)}
                placeholder="Descreva a decisão da Comissão Eleitoral"
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={salvando}
            className="px-6 py-3 rounded-xl bg-[#004ac6] hover:bg-[#0037b0] text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
          >
            {salvando ? 'Salvando...' : 'Salvar Controle da Eleição'}
          </button>
        </div>
      </form>

      {/* 2. Histórico de Eleições com Comparativo */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[#004ac6]" />
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            Histórico de Ciclos Eleitorais & Comparativo
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold uppercase text-slate-500">
                <th className="py-3 px-4">Eleição</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Comparecimento</th>
                <th className="py-3 px-4">Total Votos (Brancos)</th>
                <th className="py-3 px-4">Chapa Vencedora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {historicoEleicoes.map((h) => (
                <tr key={h.eleicao.id}>
                  <td className="py-3 px-4 font-bold">{h.eleicao.nome}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800">
                      {h.eleicao.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold">
                    {h.totalParticipacoes} eleitores
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {h.totalVotos} ({h.votosBrancos} brancos)
                  </td>
                  <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                    {h.vencedoraNome || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Arquivar Ciclo Atual e Iniciar Nova Eleição (Fase 0 item 7) + Expurgo LGPD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <form
          onSubmit={handleArquivarECriarNova}
          className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2 text-[#004ac6]">
            <Archive className="w-5 h-5" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Encerrar e Arquivar Ciclo (Criar Nova Eleição)
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Substitui o antigo reset destrutivo: arquiva a eleição atual preservando todas as chapas, certificados e votos históricos, e abre uma nova eleição limpa.
          </p>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Nome da Nova Eleição
            </label>
            <input
              type="text"
              required
              value={nomeNovaEleicao}
              onChange={(e) => setNomeNovaEleicao(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Digite ARQUIVAR E CRIAR NOVA para confirmar
            </label>
            <input
              type="text"
              required
              value={confirmacaoArquivar}
              onChange={(e) => setConfirmacaoArquivar(e.target.value)}
              placeholder="ARQUIVAR E CRIAR NOVA"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold"
            />
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold cursor-pointer"
          >
            Arquivar Atual e Criar Nova Eleição
          </button>
        </form>

        <form
          onSubmit={handleExpurgoLgpd}
          className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2 text-amber-600">
            <Trash2 className="w-5 h-5" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Rotina LGPD de Fim de Ciclo (Descarte Operacional)
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Após a homologação definitiva da eleição encerrada, descarta os logs de tentativas de login e a lista nominal de presença, mantendo apenas os votos anônimos e certificados.
          </p>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Digite EXPURGAR DADOS LGPD para confirmar
            </label>
            <input
              type="text"
              required
              value={confirmacaoLgpd}
              onChange={(e) => setConfirmacaoLgpd(e.target.value)}
              placeholder="EXPURGAR DADOS LGPD"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold"
            />
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
          >
            Executar Expurgo Operacional LGPD
          </button>
        </form>
      </div>
    </div>
  );
}
