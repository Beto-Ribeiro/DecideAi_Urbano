'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Lock,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  LogOut,
  Trophy,
  Award,
  FileDown,
  Users,
  Clock,
  EyeOff,
  Sparkles,
  CheckCircle2,
  BarChart3,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { ConfiguracaoEscola } from '@/lib/escola';
import { DadosPortalChapa } from '@/server/queries';
import {
  loginChapaAction,
  logoutChapaAction,
  obterPortalChapaPollingAction,
} from '@/server/actions';
import {
  gerarCertificadoOficialPdf,
  gerarDiagnosticoChapaPdf,
} from '@/lib/pdf';
import { SchoolCrest, GovSpLogo } from '@/components/SchoolCrest';
import { CivicHeader, CivicFooter } from '@/components/CivicHeader';

interface PortalChapaClientProps {
  autenticadoInicialmente: boolean;
  escolaInicial: ConfiguracaoEscola;
  dadosIniciais: DadosPortalChapa | null;
}

export function PortalChapaClient({
  autenticadoInicialmente,
  escolaInicial,
  dadosIniciais,
}: PortalChapaClientProps) {
  const [autenticado, setAutenticado] = useState(autenticadoInicialmente);
  const [dados, setDados] = useState<DadosPortalChapa | null>(dadosIniciais);
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erroLogin, setErroLogin] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  const atualizarPortal = useCallback(async () => {
    setAtualizando(true);
    try {
      const novo = await obterPortalChapaPollingAction();
      if (novo) {
        setDados(novo);
      }
    } finally {
      setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    if (!autenticado) return;
    const interval = setInterval(() => {
      atualizarPortal();
    }, 15000);
    return () => clearInterval(interval);
  }, [autenticado, atualizarPortal]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingLogin(true);
    setErroLogin('');
    try {
      const res = await loginChapaAction(usuario, senha);
      if (res.error) {
        setErroLogin(res.error);
      } else if (res.success) {
        setAutenticado(true);
        await atualizarPortal();
      }
    } catch {
      setErroLogin('Erro ao conectar ao servidor.');
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleLogout = async () => {
    await logoutChapaAction();
    setAutenticado(false);
    setDados(null);
    setSenha('');
  };

  // Tela de Login exclusiva do Portal da Chapa (sessão separada)
  if (!autenticado || !dados) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#f8f9ff] dark:bg-slate-950 text-[#0b1c30] dark:text-slate-100">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-8 sm:p-10">
          <div className="flex flex-col items-center text-center mb-8">
            <SchoolCrest
              logoPath={escolaInicial.logos.escola}
              nomeCurto={escolaInicial.nomeCurto}
              size="lg"
            />
            <span className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5" />
              Portal Oficial da Chapa • Somente Leitura
            </span>
            <h1 className="text-2xl font-extrabold mt-3 text-slate-900 dark:text-white">
              Acesso da Chapa Homologada
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
              {escolaInicial.nomeCompleto}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="chapa-usuario"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5"
              >
                Usuário da Chapa
              </label>
              <input
                id="chapa-usuario"
                type="text"
                required
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Ex: chapa01"
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-sm font-mono font-bold focus:outline-none focus:border-[#004ac6]"
              />
            </div>

            <div>
              <label
                htmlFor="chapa-senha"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5"
              >
                Senha Fornecida pela Comissão Eleitoral
              </label>
              <input
                id="chapa-senha"
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite a senha da chapa"
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:border-[#004ac6]"
              />
            </div>

            {erroLogin && (
              <div
                role="alert"
                className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{erroLogin}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loadingLogin}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#004ac6] to-[#2563eb] hover:from-[#0037b0] hover:to-[#1d4ed8] text-white font-bold shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              {loadingLogin ? 'Verificando Credenciais...' : 'Acessar Painel da Chapa'}
            </button>
          </form>

          <div className="mt-6 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-[11px] text-slate-500 text-center">
            As credenciais são criadas exclusivamente pela Comissão Eleitoral. Caso tenha esquecido a senha ou precise corrigir dados da chapa, procure a coordenação da {escolaInicial.nomeCurto}.
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <Link
              href="/"
              className="inline-flex items-center gap-1 font-semibold hover:text-[#004ac6]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar para a Urna
            </Link>
            <span>Acesso Somente Leitura</span>
          </div>
        </div>
      </div>
    );
  }

  const {
    escola,
    eleicao,
    chapa,
    resultadosLiberados,
    motivoRestricao,
    participacaoGeral,
    desempenho,
  } = dados;

  const handleBaixarCertificado = async () => {
    if (!desempenho || !desempenho.certificadoEmitido) return;
    await gerarCertificadoOficialPdf({
      escola,
      eleicao,
      chapa,
      tipo: desempenho.certificadoEmitido.tipo,
      votosChapa: desempenho.votosChapa,
      percentualValidos: desempenho.percentualValidos,
      totalVotosEleicao: participacaoGeral.totalParticipacoes,
      colocacao: desempenho.colocacao,
      codigoVerificacao: desempenho.certificadoEmitido.codigo_verificacao,
      originUrl: typeof window !== 'undefined' ? window.location.origin : '',
    });
  };

  const handleBaixarDiagnostico = () => {
    if (!desempenho) return;
    gerarDiagnosticoChapaPdf({
      escola,
      eleicaoNome: eleicao.nome,
      chapaNome: chapa.nome,
      colocacao: desempenho.colocacao,
      votosChapa: desempenho.votosChapa,
      percentualValidos: desempenho.percentualValidos,
      destaques: desempenho.destaquesAnalise,
      votosPorSerie: desempenho.votosPorSerie,
    });
  };

  const maxVotosHora = Math.max(
    1,
    ...participacaoGeral.votosPorHora.map((h) => h.total_votos)
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9ff] dark:bg-slate-950 text-[#0b1c30] dark:text-slate-100">
      <CivicHeader
        escola={escola}
        subtitulo={`Portal da Chapa • ${chapa.nome} (Nº ${chapa.numero})`}
        badgeTexto="Somente Leitura"
        badgeCor="azul"
        acoesDireita={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={atualizarPortal}
              disabled={atualizando}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${atualizando ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-xs font-bold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        }
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Aviso Institucional de Portal Somente Leitura */}
        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-[#004ac6] dark:text-blue-300 font-semibold">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>
              <strong>Portal de Transparência da Chapa (Somente Leitura):</strong> Para solicitar correção de nomes, cargos ou propostas, procure diretamente a Comissão Eleitoral da {escola.nomeCompleto}.
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-500 shrink-0">
            Status do Pleito: {eleicao.status.toUpperCase()}
          </span>
        </div>

        {/* Cabeçalho de Identidade da Chapa */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-white text-2xl shadow-lg"
              style={{ backgroundColor: chapa.cor || '#004ac6' }}
            >
              {chapa.numero}
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#004ac6] dark:text-blue-400">
                {eleicao.nome}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {chapa.nome}
              </h1>
              {chapa.slogan && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  &ldquo;{chapa.slogan}&rdquo;
                </p>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 text-right min-w-[200px]">
            <span className="text-[11px] font-bold uppercase text-slate-400 block">
              Comparecimento Geral na Escola
            </span>
            <span className="text-3xl font-black text-[#004ac6] dark:text-blue-400">
              {participacaoGeral.percentualParticipacao}%
            </span>
            <span className="text-xs text-slate-500 block">
              {participacaoGeral.totalParticipacoes} de {participacaoGeral.totalAptos} alunos
            </span>
          </div>
        </section>

        {/* Regra de Visibilidade: Se ainda não liberado, mostra aviso + participação geral */}
        {!resultadosLiberados || !desempenho ? (
          <section className="space-y-6">
            <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800/60 flex items-start gap-4">
              <Clock className="w-7 h-7 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-base font-extrabold text-amber-900 dark:text-amber-200">
                  Apuração Nominal das Chapas Protegida Durante a Votação
                </h2>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                  {motivoRestricao}
                </p>
              </div>
            </div>

            {/* Evolução Geral por Hora e Dados Homologados da Chapa */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <h3 className="text-base font-extrabold mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#004ac6]" />
                  Ritmo de Comparecimento por Hora na {escola.nomeCurto}
                </h3>
                <div className="space-y-2.5">
                  {participacaoGeral.votosPorHora.map((h) => (
                    <div key={h.hora} className="flex items-center gap-3 text-xs">
                      <span className="w-12 font-mono text-slate-500">{h.hora}</span>
                      <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#004ac6] rounded-full"
                          style={{
                            width: `${
                              h.total_votos > 0
                                ? Math.max(6, Math.round((h.total_votos / maxVotosHora) * 100))
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="w-8 text-right font-bold">{h.total_votos}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#004ac6]" />
                  Integrantes Homologados ({chapa.integrantes.length})
                </h3>
                <div className="space-y-2">
                  {chapa.integrantes.map((i) => (
                    <div
                      key={i.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {i.nome}
                        </span>
                        <span className="text-slate-500">{i.cargo}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 font-bold text-[11px]">
                        {i.turma}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : (
          /* RESULTADO LIBERADO: Painel Analítico Completo + Certificado Oficial A4 Paisagem */
          <>
            {/* KPIs da Chapa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div
                className={`p-6 rounded-2xl shadow-lg text-white ${
                  desempenho.vencedora
                    ? 'bg-gradient-to-br from-emerald-600 to-emerald-800'
                    : 'bg-gradient-to-br from-[#0037b0] to-[#004ac6]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest opacity-85">
                    Colocação Oficial
                  </span>
                  <Trophy className="w-5 h-5 text-amber-300" />
                </div>
                <span className="text-3xl font-black block">
                  {desempenho.colocacao}º Lugar
                </span>
                <span className="text-xs opacity-90 mt-1 block">
                  {desempenho.vencedora
                    ? 'Chapa Eleita para a Gestão do Grêmio!'
                    : 'Participação Democrática Homologada'}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <span className="text-xs font-bold uppercase text-slate-500 block">
                  Votos Conquistados
                </span>
                <span className="text-3xl font-black text-slate-900 dark:text-white mt-2 block">
                  {desempenho.votosChapa}
                </span>
                <span className="text-xs text-slate-500 mt-1 block">
                  Votos nominais válidos na urna
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <span className="text-xs font-bold uppercase text-slate-500 block">
                  % Sobre Votos Válidos
                </span>
                <span className="text-3xl font-black text-[#004ac6] dark:text-blue-400 mt-2 block">
                  {desempenho.percentualValidos}%
                </span>
                <span className="text-xs text-slate-500 mt-1 block">
                  {desempenho.percentualTotal}% sobre o total geral
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold uppercase text-slate-500 block">
                  Certificado & Diagnóstico
                </span>
                <div className="space-y-2 mt-2">
                  <button
                    type="button"
                    onClick={handleBaixarCertificado}
                    className="w-full py-2 px-3 rounded-xl bg-[#004ac6] hover:bg-[#0037b0] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Award className="w-4 h-4" />
                    Baixar Certificado A4 (PDF)
                  </button>
                  <button
                    type="button"
                    onClick={handleBaixarDiagnostico}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileDown className="w-4 h-4" />
                    Exportar Diagnóstico (PDF)
                  </button>
                </div>
              </div>
            </div>

            {/* Destaques Estratégicos para a Gestão + Comparativo entre Chapas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#004ac6] dark:text-blue-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Apoio à Gestão Estudantil
                    </span>
                    <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                      Destaques & Onde Aproximar o Diálogo
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleBaixarDiagnostico}
                    className="text-xs font-bold text-[#004ac6] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>

                <ul className="space-y-3">
                  {desempenho.destaquesAnalise.map((d, i) => (
                    <li
                      key={i}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs leading-relaxed flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#004ac6] shrink-0 mt-0.5" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#004ac6]" />
                  Comparativo entre Chapas e Votos por Série
                </h2>

                <div className="space-y-3">
                  {desempenho.comparativoChapas.map((c) => (
                    <div key={c.chapa_id} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span>
                          Nº {c.numero} — {c.nome}
                        </span>
                        <span>
                          {c.total_votos} votos ({c.percentual_validos}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, c.percentual_validos)}%`,
                            backgroundColor: c.cor || '#004ac6',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                  <h3 className="text-xs font-extrabold uppercase text-slate-500">
                    Desempenho da {chapa.nome} por Série
                  </h3>
                  {desempenho.votosPorSerie.map((s) => (
                    <div
                      key={s.serie}
                      className="flex items-center justify-between text-xs py-1"
                    >
                      <span className="font-bold">{s.serie}</span>
                      <span className="font-mono font-bold text-[#004ac6] dark:text-blue-400">
                        {s.votosChapa} de {s.totalSerie} votos ({s.percentual}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Votos por Sala e Perfil Agregado (com proteção K-Anonimato < 5) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Votos da Chapa por Sala de Aula
                    </h3>
                    <p className="text-xs text-slate-500">
                      Salas com menos de 5 votos totais têm os valores ocultados para preservar o anonimato.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                  {desempenho.votosPorSala.map((sala) => (
                    <div
                      key={sala.turma}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs"
                    >
                      <div className="flex justify-between font-bold">
                        <span>{sala.turma}</span>
                        {sala.ocultoAnonimato ? (
                          <span className="text-[10px] text-amber-600 italic">
                            &lt; 5 votos (Oculto)
                          </span>
                        ) : (
                          <span className="text-[#004ac6] dark:text-blue-400">
                            {sala.percentual}% ({sala.votosChapa}/{sala.totalSala})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <EyeOff className="w-4 h-4 text-[#004ac6]" />
                  Perfil dos Eleitores da Chapa
                </h3>
                <p className="text-[11px] text-slate-500">
                  Recortes com menos de 5 votos são automaticamente suprimidos (K-Anonimato).
                </p>

                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400">
                    Por Gênero
                  </span>
                  {desempenho.perfilEleitoresChapa.genero.map((g) => (
                    <div
                      key={g.categoria}
                      className="flex justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800"
                    >
                      <span>{g.categoria}</span>
                      {g.oculto_anonimato ? (
                        <span className="text-[11px] italic text-amber-600">
                          Oculto (&lt; 5)
                        </span>
                      ) : (
                        <span className="font-bold">
                          {g.total} ({g.percentual}%)
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-black uppercase text-slate-400">
                    Por Faixa Etária
                  </span>
                  {desempenho.perfilEleitoresChapa.faixaEtaria.map((f) => (
                    <div
                      key={f.categoria}
                      className="flex justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800"
                    >
                      <span>{f.categoria}</span>
                      {f.oculto_anonimato ? (
                        <span className="text-[11px] italic text-amber-600">
                          Oculto (&lt; 5)
                        </span>
                      ) : (
                        <span className="font-bold">
                          {f.total} ({f.percentual}%)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pré-Visualização do Certificado Oficial (A4 Paisagem) */}
            {desempenho.certificadoEmitido && (
              <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border-4 border-double border-[#004ac6]/40 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                  <div className="flex items-center gap-4">
                    <GovSpLogo logoPath={escola.logos.spEducacao} />
                    <SchoolCrest
                      logoPath={escola.logos.escola}
                      nomeCurto={escola.nomeCurto}
                      size="md"
                    />
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                      Governo do Estado de São Paulo — Secretaria da Educação
                    </p>
                    <h2 className="text-lg sm:text-xl font-extrabold text-[#004ac6] dark:text-blue-400 mt-0.5">
                      {escola.nomeCompleto}
                    </h2>
                    <p className="text-xs font-serif-formal italic text-slate-500">
                      {desempenho.vencedora
                        ? 'CERTIFICADO OFICIAL DE VITÓRIA ELEITORAL E POSSE ESTUDANTIL'
                        : 'CERTIFICADO DE PARTICIPAÇÃO DEMOCRÁTICA E CIDADANIA'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleBaixarCertificado}
                    className="px-4 py-2.5 rounded-xl bg-[#004ac6] hover:bg-[#0037b0] text-white text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Award className="w-4 h-4" />
                    Baixar PDF A4 Paisagem
                  </button>
                </div>

                <div className="text-center max-w-3xl mx-auto space-y-3 py-4">
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200 font-serif-formal">
                    A Direção Escolar e a Comissão Eleitoral da{' '}
                    <strong>{escola.nomeCompleto}</strong> ({escola.cidade}) certificam que a{' '}
                    <strong className="text-[#004ac6] dark:text-blue-400">
                      {chapa.nome} (Nº {chapa.numero})
                    </strong>{' '}
                    {desempenho.vencedora
                      ? `foi democraticamente ELEITA em 1º Lugar na "${eleicao.nome}", conquistando ${desempenho.votosChapa} votos válidos (${desempenho.percentualValidos}%).`
                      : `participou oficialmente da "${eleicao.nome}", contribuindo para a democracia estudantil com ${desempenho.votosChapa} votos válidos (${desempenho.percentualValidos}%).`}
                  </p>
                  {chapa.integrantes.length > 0 && (
                    <p className="text-xs text-slate-500">
                      <strong>Integrantes Nominados:</strong>{' '}
                      {chapa.integrantes
                        .map((i) => `${i.nome} (${i.cargo} - ${i.turma})`)
                        .join(' • ')}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
                  <div>
                    <div className="w-48 mx-auto border-b border-slate-400 mb-1.5" />
                    <p className="font-bold">{escola.assinaturas.direcao.nome}</p>
                    <p className="text-[11px] text-slate-500">
                      {escola.assinaturas.direcao.cargo}
                    </p>
                  </div>
                  <div>
                    <div className="w-48 mx-auto border-b border-slate-400 mb-1.5" />
                    <p className="font-bold">{escola.assinaturas.coordenacao.nome}</p>
                    <p className="text-[11px] text-slate-500">
                      {escola.assinaturas.coordenacao.cargo}
                    </p>
                  </div>
                  <div>
                    <div className="w-48 mx-auto border-b border-slate-400 mb-1.5" />
                    <p className="font-bold">{escola.assinaturas.comissao.nome}</p>
                    <p className="text-[11px] text-slate-500">
                      {escola.assinaturas.comissao.cargo}
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-500 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl">
                  <span>
                    CÓDIGO DE VERIFICAÇÃO:{' '}
                    <strong className="text-[#004ac6] dark:text-blue-400">
                      {desempenho.certificadoEmitido.codigo_verificacao}
                    </strong>
                  </span>
                  <Link
                    href={`/verificar/${encodeURIComponent(
                      desempenho.certificadoEmitido.codigo_verificacao
                    )}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 font-bold text-[#004ac6] dark:text-blue-400 hover:underline"
                  >
                    <span>Abrir Página Pública de Autenticidade</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <CivicFooter escola={escola} />
    </div>
  );
}
