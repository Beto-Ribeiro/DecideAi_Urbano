'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  UserCheck,
  Vote,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Volume2,
  VolumeX,
  Delete,
  RotateCcw,
  Star,
  Columns3,
  FileText,
  Users,
  Sparkles,
  Download,
  Share2,
  WifiOff,
  Lock,
  Clock,
  Maximize2,
  BookOpen,
  Trophy,
  X,
} from 'lucide-react';
import {
  loginEleitorPorRa,
  registrarBotaoNaoSouEuAction,
  registrarVotoEleitorAction,
} from '@/server/actions';
import { DadosPublicosUrna } from '@/server/queries';
import { ChapaCompleta } from '@/lib/database.types';
import { EIXOS_PROPOSTAS, OPCOES_GENERO, OPCOES_RACA } from '@/lib/validations';
import { baixarAdesivoEuVoteiPng } from '@/lib/pdf';
import { SchoolCrest } from '@/components/SchoolCrest';
import { CivicHeader, CivicFooter } from '@/components/CivicHeader';
import { UrnaQuiosqueView } from './UrnaQuiosqueView';

type EtapaEleitor = 'ra' | 'confirmar' | 'chapas' | 'urna' | 'sucesso';

interface UrnaEleitorClientProps {
  dadosIniciais: DadosPublicosUrna;
  modoQuiosque?: boolean;
}

export function UrnaEleitorClient({
  dadosIniciais,
  modoQuiosque = false,
}: UrnaEleitorClientProps) {
  const { escola, eleicao, statusEfetivo, chapasAprovadas, rankingTurmas } = dadosIniciais;

  const [etapa, setEtapa] = useState<EtapaEleitor>('ra');
  const [ra, setRa] = useState('');
  const [loading, setLoading] = useState(false);
  const [erroMensagem, setErroMensagem] = useState('');
  const [erroCodigo, setErroCodigo] = useState<string | null>(null);
  const [votouAnteriormenteEm, setVotouAnteriormenteEm] = useState<string | null>(null);
  const [protocoloAnterior, setProtocoloAnterior] = useState<string | null>(null);

  // Dados do aluno autenticado pelo RA
  const [aluno, setAluno] = useState<{
    ra: string;
    nome: string;
    turma: string;
    serie: string;
    dataNascimento: string | null;
    faixaEtaria: string;
  } | null>(null);

  // Censo demográfico anônimo (ambos têm "Prefiro não informar")
  const [raca, setRaca] = useState<string>('Prefiro não informar');
  const [genero, setGenero] = useState<string>('Prefiro não informar');

  // Etapa Conheça as Chapas
  const [eixoFiltro, setEixoFiltro] = useState<string>('Todas');
  const [chapaDetalhe, setChapaDetalhe] = useState<ChapaCompleta | null>(null);
  const [abaDetalhe, setAbaDetalhe] = useState<'propostas' | 'integrantes' | 'documentos'>(
    'propostas'
  );
  const [comparadorAberto, setComparadorAberto] = useState(false);
  const [chapasComparadasIds, setChapasComparadasIds] = useState<string[]>([]);
  const [chapaFavoritaId, setChapaFavoritaId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('decideai_chapa_favorita');
    } catch {
      return null;
    }
  });

  // Etapa Urna (Cédula Oficial)
  const [opcaoSelecionada, setOpcaoSelecionada] = useState<string | 'BRANCO' | null>(null);
  const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState(false);

  // Etapa Sucesso
  const [protocoloGerado, setProtocoloGerado] = useState<string>('');
  const [horarioVoto, setHorarioVoto] = useState<string>('');
  const [contadorReset, setContadorReset] = useState<number>(modoQuiosque ? 6 : 12);

  // Áudio, conectividade e protetor de tela do quiosque
  const [somAtivo, setSomAtivo] = useState<boolean>(true);
  const [semConexao, setSemConexao] = useState<boolean>(false);
  const [screensaverAtivo, setScreensaverAtivo] = useState<boolean>(false);

  const reiniciarFluxoUrna = useCallback(() => {
    setEtapa('ra');
    setRa('');
    setErroMensagem('');
    setErroCodigo(null);
    setVotouAnteriormenteEm(null);
    setProtocoloAnterior(null);
    setAluno(null);
    setRaca('Prefiro não informar');
    setGenero('Prefiro não informar');
    setOpcaoSelecionada(null);
    setModalConfirmacaoAberto(false);
    setProtocoloGerado('');
    setContadorReset(modoQuiosque ? 6 : 12);
    if (modoQuiosque) {
      try {
        localStorage.removeItem('decideai_chapa_favorita');
      } catch {
        // ignore
      }
      setChapaFavoritaId(null);
    }
  }, [modoQuiosque]);

  // Monitorar status de rede (offline/online)
  useEffect(() => {
    const updateOnline = () => setSemConexao(!navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  // Bloquear botão voltar após o voto e endurecer atalhos no modo quiosque
  useEffect(() => {
    if (etapa === 'sucesso') {
      window.history.pushState(null, '', window.location.href);
      const handlePopState = () => {
        window.history.pushState(null, '', window.location.href);
        reiniciarFluxoUrna();
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [etapa, reiniciarFluxoUrna]);

  useEffect(() => {
    if (!modoQuiosque) return;
    let inactivityTimeout: ReturnType<typeof setTimeout>;

    const resetInactivity = () => {
      setScreensaverAtivo(false);
      clearTimeout(inactivityTimeout);
      if (etapa === 'ra') {
        inactivityTimeout = setTimeout(() => setScreensaverAtivo(true), 45000);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      resetInactivity();
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') ||
        (e.altKey && e.key === 'ArrowLeft')
      ) {
        e.preventDefault();
      }
    };

    resetInactivity();
    window.addEventListener('mousemove', resetInactivity);
    window.addEventListener('touchstart', resetInactivity);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(inactivityTimeout);
      window.removeEventListener('mousemove', resetInactivity);
      window.removeEventListener('touchstart', resetInactivity);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [modoQuiosque, etapa]);

  const tocarSomUrna = useCallback(() => {
    if (!somAtivo) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 1820;
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.04);
      gain.gain.setValueAtTime(0.22, now + 1.1);
      gain.gain.linearRampToValueAtTime(0, now + 1.25);

      osc.start(now);
      osc.stop(now + 1.3);
    } catch {
      // Navegador pode bloquear áudio sem gesto prévio
    }
  }, [somAtivo]);

  // Contagem regressiva de reset automático na tela de sucesso
  useEffect(() => {
    if (etapa !== 'sucesso') return;

    const interval = setInterval(() => {
      setContadorReset((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          reiniciarFluxoUrna();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [etapa, modoQuiosque, reiniciarFluxoUrna]);

  const toggleFavorita = (chapaId: string) => {
    const novo = chapaFavoritaId === chapaId ? null : chapaId;
    setChapaFavoritaId(novo);
    try {
      if (novo) localStorage.setItem('decideai_chapa_favorita', novo);
      else localStorage.removeItem('decideai_chapa_favorita');
    } catch {
      // ignore
    }
  };

  const toggleCompararChapa = (chapaId: string) => {
    setChapasComparadasIds((prev) => {
      if (prev.includes(chapaId)) return prev.filter((id) => id !== chapaId);
      if (prev.length >= 3) return [...prev.slice(1), chapaId];
      return [...prev, chapaId];
    });
  };

  const handleLoginRa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (semConexao) {
      setErroMensagem(
        'Sem conexão de rede no momento. Verifique o Wi-Fi do dispositivo antes de autenticar seu RA.'
      );
      setErroCodigo('SEM_CONEXAO');
      return;
    }

    setErroMensagem('');
    setErroCodigo(null);
    setLoading(true);

    try {
      const res = await loginEleitorPorRa(ra);
      if (res.error) {
        setErroMensagem(res.error);
        setErroCodigo(res.code || 'ERRO');
        setVotouAnteriormenteEm(res.votouEm || null);
        setProtocoloAnterior(res.protocolo || null);
      } else if (res.aluno) {
        setAluno(res.aluno);
        setEtapa('confirmar');
      }
    } catch {
      setErroMensagem(
        'Falha temporária de comunicação com o servidor escolar. Tente novamente em instantes.'
      );
      setErroCodigo('FALHA_SERVIDOR');
    } finally {
      setLoading(false);
    }
  };

  const handleNaoSouEu = async () => {
    if (aluno) {
      await registrarBotaoNaoSouEuAction(aluno.ra);
    }
    reiniciarFluxoUrna();
  };

  const handleConfirmarIdentidade = (irParaUrnaDireto = false) => {
    if (!raca || !genero) {
      setErroMensagem('Selecione uma opção ou "Prefiro não informar".');
      return;
    }
    setErroMensagem('');
    if (irParaUrnaDireto) {
      if (chapaFavoritaId) setOpcaoSelecionada(chapaFavoritaId);
      setEtapa('urna');
    } else {
      setEtapa('chapas');
    }
  };

  const handleAbrirModalConfirmacao = () => {
    if (!opcaoSelecionada) {
      setErroMensagem(
        'Selecione uma das chapas homologadas ou a opção Voto em Branco antes de confirmar.'
      );
      return;
    }
    setErroMensagem('');
    setModalConfirmacaoAberto(true);
  };

  const handleConfirmarVotoDefinitivo = async () => {
    if (!aluno || !opcaoSelecionada) return;
    setLoading(true);
    setErroMensagem('');

    try {
      const isBranco = opcaoSelecionada === 'BRANCO';
      const res = await registrarVotoEleitorAction({
        ra: aluno.ra,
        chapaId: isBranco ? null : opcaoSelecionada,
        votoBranco: isBranco,
        raca,
        genero,
      });

      if (res.error) {
        setModalConfirmacaoAberto(false);
        setErroMensagem(res.error);
        setErroCodigo(res.code || 'ERRO');
      } else if (res.success && res.protocolo) {
        setModalConfirmacaoAberto(false);
        setProtocoloGerado(res.protocolo);
        setHorarioVoto(
          new Date(res.registradoEm || Date.now()).toLocaleTimeString('pt-BR')
        );
        setEtapa('sucesso');
        tocarSomUrna();
      }
    } catch {
      setModalConfirmacaoAberto(false);
      setErroMensagem(
        'Não foi possível concluir o envio do voto por instabilidade na conexão. Seu voto ainda não foi registrado; tente confirmar novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const chapaSelecionadaObj =
    opcaoSelecionada && opcaoSelecionada !== 'BRANCO'
      ? chapasAprovadas.find((c) => c.id === opcaoSelecionada) || null
      : null;

  if (modoQuiosque) {
    return (
      <UrnaQuiosqueView
        dadosIniciais={dadosIniciais}
        etapa={etapa}
        setEtapa={setEtapa}
        ra={ra}
        setRa={setRa}
        loading={loading}
        erroMensagem={erroMensagem}
        erroCodigo={erroCodigo}
        votouAnteriormenteEm={votouAnteriormenteEm}
        protocoloAnterior={protocoloAnterior}
        aluno={aluno}
        raca={raca}
        setRaca={setRaca}
        genero={genero}
        setGenero={setGenero}
        opcaoSelecionada={opcaoSelecionada}
        setOpcaoSelecionada={setOpcaoSelecionada}
        chapaSelecionadaObj={chapaSelecionadaObj}
        modalConfirmacaoAberto={modalConfirmacaoAberto}
        setModalConfirmacaoAberto={setModalConfirmacaoAberto}
        protocoloGerado={protocoloGerado}
        horarioVoto={horarioVoto}
        contadorReset={contadorReset}
        somAtivo={somAtivo}
        setSomAtivo={setSomAtivo}
        screensaverAtivo={screensaverAtivo}
        setScreensaverAtivo={setScreensaverAtivo}
        semConexao={semConexao}
        reiniciarFluxoUrna={reiniciarFluxoUrna}
        handleLoginRa={handleLoginRa}
        handleNaoSouEu={handleNaoSouEu}
        handleConfirmarIdentidade={handleConfirmarIdentidade}
        handleAbrirModalConfirmacao={handleAbrirModalConfirmacao}
        handleConfirmarVotoDefinitivo={handleConfirmarVotoDefinitivo}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8FF] dark:bg-slate-950 text-[#131B2E] dark:text-slate-100 font-sans">
      <CivicHeader
        escola={escola}
        eleicaoNome={eleicao.nome}
        statusEleicao={statusEfetivo}
        encerraEm={eleicao.encerra_em}
        modoQuiosque={modoQuiosque}
      />

      {/* Protetor de Tela Interativo para o Modo Quiosque (/urna) */}
      {modoQuiosque && screensaverAtivo && (
        <div
          onClick={() => setScreensaverAtivo(false)}
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md text-white flex flex-col items-center justify-center p-8 text-center cursor-pointer animate-in fade-in"
        >
          <SchoolCrest size="xl" className="mb-6 ring-4 ring-blue-500/40" />
          <span className="px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-widest mb-3">
            Totem Eleitoral Pronto • {escola.nomeCurto}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight max-w-xl mb-3">
            {escola.nome}
          </h2>
          <p className="text-slate-300 max-w-md mb-8 text-base">
            Toque em qualquer lugar da tela com seu número de RA em mãos para iniciar seu voto secreto.
          </p>
          <button
            type="button"
            className="px-8 py-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-lg uppercase tracking-wider shadow-xl transition-transform hover:scale-105"
          >
            TOQUE PARA INICIAR MEU VOTO
          </button>
        </div>
      )}

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-8 py-6 sm:py-8">
        {/* Alerta Offline */}
        {semConexao && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border-l-4 border-amber-600 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <WifiOff className="w-6 h-6 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">Sem conexão com a internet no momento</p>
                <p className="text-xs opacity-90">
                  Aguarde o restabelecimento do sinal Wi-Fi da escola para autenticar ou enviar seu voto com segurança.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Barra de Contexto e Indicador de Etapas */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                {statusEfetivo === 'aberta'
                  ? `ELEIÇÃO ABERTA • ${eleicao.nome.toUpperCase()}`
                  : `ELEIÇÃO ${statusEfetivo.toUpperCase()}`}
              </span>
              {modoQuiosque && (
                <span className="px-2.5 py-1 rounded-full bg-blue-900 text-white text-xs font-mono font-bold">
                  MODO QUIOSQUE ATIVO
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Cabine Digital de Votação Estudantil
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {escola.nome} • Voto Único, Direto e 100% Secreto
            </p>
          </div>

          {/* Stepper Indicator */}
          <div className="bg-indigo-50/90 dark:bg-slate-900 p-1.5 rounded-2xl flex items-center gap-1 border border-indigo-100 dark:border-slate-800 overflow-x-auto">
            {[
              { id: 'ra', label: '1. RA' },
              { id: 'confirmar', label: '2. Identidade' },
              { id: 'chapas', label: '3. Propostas' },
              { id: 'urna', label: '4. Urna' },
              { id: 'sucesso', label: '5. Fim' },
            ].map((s, idx) => {
              const ativo = etapa === s.id;
              const ordemAtual = ['ra', 'confirmar', 'chapas', 'urna', 'sucesso'].indexOf(etapa);
              const concluido = idx < ordemAtual;
              return (
                <div
                  key={s.id}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    ativo
                      ? 'bg-[#0037B0] text-white shadow-xs'
                      : concluido
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {s.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Grid Principal: Coluna Institucional (4 cols) + Cabine Interativa (8 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Coluna Esquerda: Selo da Escola, Garantias de Sigilo e Ranking Amistoso */}
          <div className="hidden lg:flex lg:col-span-4 flex-col gap-5">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col items-center text-center">
              <SchoolCrest size="lg" className="mb-3" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                Garantia Eleitoral Oficial
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5 leading-snug">
                {escola.nome}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                {escola.textoBoasVindas}
              </p>

              <div className="w-full mt-4 p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-slate-800/70 text-left space-y-1.5 border border-indigo-100 dark:border-slate-700">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Voto 100% Secreto e Inviolável</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Sua presença e o seu voto são gravados em tabelas separadas sem qualquer vínculo de horário, IP ou RA. Ninguém jamais saberá em qual chapa você votou.
                </p>
              </div>
            </div>

            {/* Orientações Rápidas da Mesa */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Vote className="w-4 h-4 text-blue-700" />
                Como Votar na E.E. Urbano
              </h3>
              <ol className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span>
                    Digite somente o seu <strong>número de RA</strong> (sem precisar de senha ou dígito).
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>
                    Confirme seu nome, turma e data de nascimento (ou clique em <strong>&ldquo;Não sou eu&rdquo;</strong>).
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span>
                    Conheça e compare as chapas ou siga direto para a cédula oficial.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold flex items-center justify-center shrink-0">
                    4
                  </span>
                  <span>
                    Escolha uma <strong>Chapa Homologada</strong> ou <strong>Voto em Branco</strong> (não há voto nulo) e confirme!
                  </span>
                </li>
              </ol>
            </div>

            {/* Mini Ranking Amistoso de Participação por Turma */}
            {rankingTurmas.length > 0 && (
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Turmas mais engajadas
                  </h3>
                  <Link
                    href="/resultados"
                    className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline"
                  >
                    Ver ranking
                  </Link>
                </div>
                <div className="space-y-2">
                  {rankingTurmas.slice(0, 4).map((t, i) => (
                    <div
                      key={t.turma}
                      className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/70 px-3 py-2 rounded-xl"
                    >
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {i + 1}º • Turma {t.turma}
                      </span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {t.percentual_participacao}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita: Terminal / Cabine Digital da Urna */}
          <div className="w-full lg:col-span-8 flex justify-center">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col min-h-[680px]">
              {/* Barra Superior da Cabine */}
              <div className="bg-[#131B2E] text-white px-5 py-3 flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="font-bold tracking-tight">
                    Urna Eletrônica • {escola.nomeCurto}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSomAtivo(!somAtivo)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title={somAtivo ? 'Silenciar som da urna' : 'Ativar som da urna'}
                  >
                    {somAtivo ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Som Ativo</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                        <span>Silenciado</span>
                      </>
                    )}
                  </button>
                  {modoQuiosque && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!document.fullscreenElement) {
                          document.documentElement.requestFullscreen().catch(() => {});
                        } else {
                          document.exitFullscreen().catch(() => {});
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Tela Cheia</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Conteúdo Dinâmico das Etapas */}
              <div className="flex-1 p-5 sm:p-8 flex flex-col justify-between">
                {/* Estados Especiais de Eleição Fechada / Agendada / Encerrada */}
                {statusEfetivo !== 'aberta' && etapa === 'ra' ? (
                  <div className="my-auto py-8 text-center space-y-5">
                    <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto">
                      <Clock className="w-10 h-10" />
                    </div>
                    <div className="space-y-2 max-w-md mx-auto">
                      <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold uppercase">
                        {statusEfetivo === 'agendada'
                          ? 'ESTADO 05 • ELEIÇÃO AGENDADA'
                          : 'ESTADO 04 • ELEIÇÃO ENCERRADA'}
                      </span>
                      <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {statusEfetivo === 'agendada'
                          ? 'A votação ainda não foi iniciada'
                          : 'Votação Encerrada na E.E. Urbano'}
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {statusEfetivo === 'agendada'
                          ? `A urna eletrônica da ${escola.nome} abrirá automaticamente no horário agendado pela Comissão Eleitoral.`
                          : `As urnas para a ${eleicao.nome} foram encerradas. Confira o ranking de participação das turmas e a apuração oficial.`}
                      </p>
                    </div>
                    <div className="pt-2 flex flex-wrap justify-center gap-3">
                      <Link
                        href="/resultados"
                        className="px-6 py-3 rounded-xl bg-[#0037B0] hover:bg-blue-800 text-white font-bold text-sm inline-flex items-center gap-2 shadow-md"
                      >
                        <Trophy className="w-4 h-4" />
                        Ver Participação e Resultados
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEtapa('chapas')}
                        className="px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-sm inline-flex items-center gap-2 cursor-pointer"
                      >
                        <BookOpen className="w-4 h-4" />
                        Conhecer as Chapas
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Exibição Humanizada de Estados de Exceção (RA Inexistente, Aluno Inativo, Já Votou) */}
                    {erroMensagem && (
                      <div
                        role="alert"
                        className={`mb-5 p-4 rounded-2xl border-l-4 flex items-start gap-3 animate-in fade-in ${
                          erroCodigo === 'JA_VOTOU'
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-700 text-blue-950 dark:text-blue-200'
                            : erroCodigo === 'ALUNO_INATIVO'
                            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-600 text-amber-950 dark:text-amber-200'
                            : 'bg-red-50 dark:bg-red-950/60 border-red-600 text-red-900 dark:text-red-200'
                        }`}
                      >
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="flex-1 text-sm">
                          <p className="font-bold">{erroMensagem}</p>
                          {erroCodigo === 'JA_VOTOU' && (
                            <div className="mt-2 text-xs font-mono bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-blue-200 dark:border-blue-800">
                              {votouAnteriormenteEm && (
                                <div>
                                  Horário do comparecimento:{' '}
                                  <strong>
                                    {new Date(votouAnteriormenteEm).toLocaleString('pt-BR')}
                                  </strong>
                                </div>
                              )}
                              {protocoloAnterior && (
                                <div>
                                  Protocolo de presença: <strong>{protocoloAnterior}</strong>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ========================================================= */}
                    {/* ETAPA 1: LOGIN SOMENTE COM RA (SEM CAMPO DE DÍGITO)       */}
                    {/* ========================================================= */}
                    {etapa === 'ra' && (
                      <form
                        onSubmit={handleLoginRa}
                        className="flex-1 flex flex-col justify-between space-y-6"
                      >
                        <div className="space-y-5">
                          <div className="text-center flex flex-col items-center">
                            <SchoolCrest size="lg" className="mb-3" />
                            <span className="text-xs font-bold uppercase tracking-wider text-[#0037B0] dark:text-blue-400">
                              {escola.nome}
                            </span>
                            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                              {eleicao.nome}
                            </h2>
                          </div>

                          <div className="bg-indigo-50/70 dark:bg-slate-800/70 p-5 rounded-2xl border border-indigo-100 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-2">
                              <label
                                htmlFor="ra-input"
                                className="block text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200"
                              >
                                Digite somente o número do seu RA
                              </label>
                              <span className="text-xs text-blue-700 dark:text-blue-400 font-semibold">
                                Sem dígito e sem senha
                              </span>
                            </div>

                            <div className="relative">
                              <input
                                id="ra-input"
                                data-testid="input-ra"
                                type="text"
                                inputMode="numeric"
                                required
                                maxLength={15}
                                placeholder="Ex: 000113077535 ou 123456789"
                                value={ra}
                                onChange={(e) => setRa(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full h-14 px-4 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-[#0037B0] focus:ring-3 focus:ring-blue-500/20 rounded-xl font-mono text-xl sm:text-2xl font-extrabold tracking-widest text-center text-slate-900 dark:text-white outline-none transition-all"
                              />
                              {ra.length > 0 && (
                                <button
                                  type="button"
                                  aria-label="Limpar RA"
                                  onClick={() => setRa('')}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              )}
                            </div>

                            {/* Teclado Numérico Virtual de Alta Acessibilidade (48px+) */}
                            <div className="grid grid-cols-3 gap-2 mt-4">
                              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() =>
                                    setRa((prev) => (prev.length < 15 ? prev + num : prev))
                                  }
                                  className="h-12 rounded-xl bg-white dark:bg-slate-900 hover:bg-indigo-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-lg font-extrabold text-slate-900 dark:text-white shadow-2xs active:scale-95 transition-all cursor-pointer"
                                >
                                  {num}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => setRa('')}
                                className="h-12 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 text-xs font-extrabold uppercase text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Limpar
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setRa((prev) => (prev.length < 15 ? prev + '0' : prev))
                                }
                                className="h-12 rounded-xl bg-white dark:bg-slate-900 hover:bg-indigo-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-lg font-extrabold text-slate-900 dark:text-white shadow-2xs active:scale-95 transition-all cursor-pointer"
                              >
                                0
                              </button>
                              <button
                                type="button"
                                onClick={() => setRa((prev) => prev.slice(0, -1))}
                                className="h-12 rounded-xl bg-red-50 dark:bg-red-950/60 hover:bg-red-100 text-red-700 dark:text-red-300 font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                              >
                                <Delete className="w-4 h-4" /> Apagar
                              </button>
                            </div>

                            <div className="mt-4 p-3 rounded-xl bg-indigo-100/70 dark:bg-slate-900/90 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                              <Lock className="w-4 h-4 text-[#0037B0] dark:text-blue-400 shrink-0 mt-0.5" />
                              <p>
                                <strong>Seu voto é 100% secreto.</strong> O RA serve apenas para verificar que você é estudante ativo da {escola.nomeCurto} e garantir que cada pessoa vote somente uma vez.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 flex flex-col sm:flex-row gap-3">
                          <button
                            type="button"
                            onClick={() => setEtapa('chapas')}
                            className="h-14 px-5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                          >
                            <BookOpen className="w-4 h-4 text-blue-700" />
                            Conhecer Chapas Primeiro
                          </button>
                          <button
                            type="submit"
                            data-testid="btn-acessar-votacao"
                            disabled={loading || ra.trim().length < 4}
                            className="flex-1 h-14 px-6 rounded-xl bg-[#0037B0] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-900/15 transition-all cursor-pointer"
                          >
                            <span>{loading ? 'Verificando RA...' : 'Acessar Cabine de Votação'}</span>
                            {!loading && <ArrowRight className="w-5 h-5" />}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* ========================================================= */}
                    {/* ETAPA 2: CONFIRMAÇÃO DE DADOS + BOTÃO "NÃO SOU EU" + LGPD */}
                    {/* ========================================================= */}
                    {etapa === 'confirmar' && aluno && (
                      <div className="flex-1 flex flex-col justify-between space-y-6 animate-in fade-in">
                        <div className="space-y-5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-[#0037B0] dark:text-blue-400 flex items-center gap-1.5">
                              <UserCheck className="w-4 h-4" /> Etapa 2 de 5 • Confirme sua Identidade
                            </span>
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                              Eleitor Habilitado
                            </span>
                          </div>

                          {/* Card de Confirmação de Nome, Turma e Nascimento */}
                          <div className="p-5 rounded-2xl bg-indigo-50/80 dark:bg-slate-800 border border-indigo-200/80 dark:border-slate-700 space-y-3">
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              Confirme se os dados abaixo são seus:
                            </div>
                            <h3
                              data-testid="confirm-aluno-nome"
                              className="text-xl sm:text-2xl font-extrabold text-[#0037B0] dark:text-blue-300"
                            >
                              {aluno.nome}
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-sm">
                              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700">
                                <span className="text-xs text-slate-500 block">RA Escolar:</span>
                                <strong className="font-mono text-slate-900 dark:text-white">
                                  {aluno.ra}
                                </strong>
                              </div>
                              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700">
                                <span className="text-xs text-slate-500 block">Turma / Série:</span>
                                <strong className="text-slate-900 dark:text-white">
                                  {aluno.turma} ({aluno.serie})
                                </strong>
                              </div>
                              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700">
                                <span className="text-xs text-slate-500 block">
                                  Data de Nascimento:
                                </span>
                                <strong className="text-slate-900 dark:text-white">
                                  {aluno.dataNascimento || 'Cadastrada na SED'}
                                </strong>
                              </div>
                            </div>

                            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-indigo-200/60 dark:border-slate-700">
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Matrícula Ativa na {escola.nomeCurto}
                              </span>
                              <button
                                type="button"
                                data-testid="btn-nao-sou-eu"
                                onClick={handleNaoSouEu}
                                className="px-3.5 py-2 rounded-xl bg-red-100 hover:bg-red-200 dark:bg-red-950 dark:hover:bg-red-900 text-red-800 dark:text-red-200 text-xs font-extrabold transition-colors cursor-pointer"
                              >
                                ✕ Não sou eu (Digitar outro RA)
                              </button>
                            </div>
                          </div>

                          {/* Perguntas Complementares com Aviso de Anonimato e "Prefiro não informar" */}
                          <div className="space-y-4">
                            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                              <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                              <p>
                                <strong>Aviso de Anonimato (LGPD):</strong> As perguntas abaixo são usadas apenas para estatísticas agregadas de participação estudantil (ocultando grupos com menos de 5 alunos). Você pode escolher <em>&ldquo;Prefiro não informar&rdquo;</em>.
                              </p>
                            </div>

                            <div>
                              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
                                1. Autodeclaração de Raça / Cor
                              </label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {OPCOES_RACA.map((opcao) => (
                                  <button
                                    key={opcao}
                                    type="button"
                                    onClick={() => setRaca(opcao)}
                                    className={`min-h-[48px] px-3 py-2 rounded-xl text-xs font-bold text-left border transition-all flex items-center gap-2 cursor-pointer ${
                                      raca === opcao
                                        ? 'border-[#0037B0] bg-blue-50 dark:bg-blue-950/80 text-[#0037B0] dark:text-blue-300 ring-2 ring-blue-500/20'
                                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span
                                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                        raca === opcao ? 'border-[#0037B0] bg-[#0037B0]' : 'border-slate-400'
                                      }`}
                                    >
                                      {raca === opcao && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                      )}
                                    </span>
                                    <span>{opcao}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
                                2. Identidade de Gênero
                              </label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {OPCOES_GENERO.map((opcao) => (
                                  <button
                                    key={opcao}
                                    type="button"
                                    onClick={() => setGenero(opcao)}
                                    className={`min-h-[48px] px-3 py-2 rounded-xl text-xs font-bold text-left border transition-all flex items-center gap-2 cursor-pointer ${
                                      genero === opcao
                                        ? 'border-[#0037B0] bg-blue-50 dark:bg-blue-950/80 text-[#0037B0] dark:text-blue-300 ring-2 ring-blue-500/20'
                                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span
                                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                        genero === opcao ? 'border-[#0037B0] bg-[#0037B0]' : 'border-slate-400'
                                      }`}
                                    >
                                      {genero === opcao && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                      )}
                                    </span>
                                    <span>{opcao}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => handleConfirmarIdentidade(false)}
                            className="h-14 px-4 rounded-xl bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 text-[#0037B0] dark:text-blue-300 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4" />
                            Conhecer e Comparar Chapas
                          </button>
                          <button
                            type="button"
                            data-testid="btn-ir-para-urna"
                            onClick={() => handleConfirmarIdentidade(true)}
                            className="h-14 px-5 rounded-xl bg-[#0037B0] hover:bg-[#1D4ED8] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                          >
                            <span>Sou eu • Ir para a Urna</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ========================================================= */}
                    {/* ETAPA 3: CONHEÇA AS CHAPAS, DETALHES E COMPARADOR ATÉ 3   */}
                    {/* ========================================================= */}
                    {etapa === 'chapas' && (
                      <div className="flex-1 flex flex-col justify-between space-y-5 animate-in fade-in">
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="text-xs font-extrabold uppercase tracking-wider text-[#0037B0] dark:text-blue-400">
                                Etapa Opcional • Conheça as Propostas
                              </span>
                              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                                Chapas Homologadas ({chapasAprovadas.length})
                              </h2>
                            </div>
                            <div className="flex items-center gap-2">
                              {chapasComparadasIds.length >= 2 && (
                                <button
                                  type="button"
                                  onClick={() => setComparadorAberto(true)}
                                  className="px-3 py-2 rounded-xl bg-amber-100 text-amber-900 text-xs font-extrabold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                >
                                  <Columns3 className="w-4 h-4" />
                                  Comparar ({chapasComparadasIds.length})
                                </button>
                              )}
                              {aluno ? (
                                <button
                                  type="button"
                                  onClick={() => setEtapa('urna')}
                                  className="px-3.5 py-2 rounded-xl bg-[#0037B0] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  Ir para a Urna <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setEtapa('ra')}
                                  className="px-3.5 py-2 rounded-xl bg-[#0037B0] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  Digitar RA para Votar
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Filtro por Eixo Temático */}
                          <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {['Todas', ...EIXOS_PROPOSTAS].map((eixo) => (
                              <button
                                key={eixo}
                                type="button"
                                onClick={() => setEixoFiltro(eixo)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                                  eixoFiltro === eixo
                                    ? 'bg-[#0037B0] text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                                }`}
                              >
                                {eixo}
                              </button>
                            ))}
                          </div>

                          {/* Lista de Cards das Chapas */}
                          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                            {chapasAprovadas.map((chapa) => {
                              const isFav = chapaFavoritaId === chapa.id;
                              const isComp = chapasComparadasIds.includes(chapa.id);
                              const propostasFiltradas =
                                eixoFiltro === 'Todas'
                                  ? chapa.propostas
                                  : chapa.propostas.filter((p) => p.eixo === eixoFiltro);

                              return (
                                <div
                                  key={chapa.id}
                                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all space-y-3"
                                  style={{ borderLeftWidth: '5px', borderLeftColor: chapa.cor }}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className="w-14 h-14 rounded-2xl text-white font-black text-xl flex items-center justify-center shrink-0 shadow-xs"
                                        style={{ backgroundColor: chapa.cor }}
                                      >
                                        {chapa.numero ?? 'CH'}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                                            {chapa.nome}
                                          </h3>
                                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                            Homologada
                                          </span>
                                        </div>
                                        {chapa.slogan && (
                                          <p className="text-xs italic text-slate-600 dark:text-slate-300">
                                            &ldquo;{chapa.slogan}&rdquo;
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => toggleFavorita(chapa.id)}
                                        title="Favoritar chapa apenas neste navegador"
                                        className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                                          isFav
                                            ? 'bg-amber-100 border-amber-400 text-amber-900'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                        }`}
                                      >
                                        <Star
                                          className={`w-4 h-4 ${
                                            isFav ? 'fill-amber-500 text-amber-500' : ''
                                          }`}
                                        />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => toggleCompararChapa(chapa.id)}
                                        className={`px-2.5 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                                          isComp
                                            ? 'bg-blue-100 border-blue-400 text-blue-900'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                        }`}
                                      >
                                        {isComp ? '✓ Comparando' : '+ Comparar'}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl space-y-1.5 text-xs">
                                    <div className="font-bold text-slate-800 dark:text-slate-200">
                                      Propostas ({eixoFiltro}):
                                    </div>
                                    {propostasFiltradas.length === 0 ? (
                                      <p className="text-slate-400 italic">
                                        Nenhuma proposta cadastrada especificamente neste eixo.
                                      </p>
                                    ) : (
                                      propostasFiltradas.slice(0, 2).map((p) => (
                                        <div key={p.id} className="flex items-start gap-2">
                                          <span
                                            className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                                            style={{ backgroundColor: chapa.cor }}
                                          />
                                          <span>
                                            <strong>{p.titulo}:</strong> {p.descricao}
                                          </span>
                                        </div>
                                      ))
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between pt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setChapaDetalhe(chapa);
                                        setAbaDetalhe('propostas');
                                      }}
                                      className="text-xs font-extrabold text-[#0037B0] dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                      Ver Propostas, Integrantes e PDF ({chapa.integrantes.length}{' '}
                                      membros)
                                    </button>

                                    {aluno && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpcaoSelecionada(chapa.id);
                                          setEtapa('urna');
                                        }}
                                        className="px-3.5 py-2 rounded-xl text-white text-xs font-extrabold shadow-xs cursor-pointer"
                                        style={{ backgroundColor: chapa.cor }}
                                      >
                                        Selecionar {chapa.numero ?? chapa.nome} na Urna
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="pt-3 flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setEtapa(aluno ? 'confirmar' : 'ra')}
                            className="h-12 px-5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm flex items-center gap-1.5 cursor-pointer"
                          >
                            <ArrowLeft className="w-4 h-4" /> Voltar
                          </button>
                          {aluno && (
                            <button
                              type="button"
                              onClick={() => setEtapa('urna')}
                              className="flex-1 h-12 px-6 rounded-xl bg-[#0037B0] hover:bg-[#1D4ED8] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer"
                            >
                              <span>Prosseguir para a Cédula de Votação</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ========================================================= */}
                    {/* ETAPA 4: URNA ELETRÔNICA (CHAPAS APROVADAS + VOTO BRANCO) */}
                    {/* ========================================================= */}
                    {etapa === 'urna' && aluno && (
                      <div className="flex-1 flex flex-col justify-between space-y-5 animate-in fade-in">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-extrabold uppercase tracking-wider text-[#0037B0] dark:text-blue-400">
                                Etapa 4 de 5 • Cédula Oficial
                              </span>
                              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                                Escolha sua Chapa ou Voto em Branco
                              </h2>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" /> Voto Secreto
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-[#0037B0] shrink-0" />
                            <span>
                              Regimento Eleitoral ({escola.nomeCurto}): <strong>Não há voto nulo.</strong> Escolha uma das chapas homologadas ou Voto em Branco.
                            </span>
                          </div>

                          {/* Opções de Voto */}
                          <div className="space-y-3">
                            {chapasAprovadas.map((chapa) => {
                              const selecionada = opcaoSelecionada === chapa.id;
                              const pres = chapa.integrantes.find((i) =>
                                i.cargo.toLowerCase().includes('pres')
                              );
                              return (
                                <button
                                  key={chapa.id}
                                  type="button"
                                  data-testid={`opcao-chapa-${chapa.numero || chapa.id}`}
                                  onClick={() => setOpcaoSelecionada(chapa.id)}
                                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                                    selecionada
                                      ? 'border-[#0037B0] bg-blue-50/80 dark:bg-blue-950/60 shadow-md'
                                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-3.5">
                                    <div
                                      className="w-13 h-13 rounded-xl text-white font-black text-xl flex items-center justify-center shrink-0 shadow-xs"
                                      style={{ backgroundColor: chapa.cor }}
                                    >
                                      {chapa.numero ?? 'CH'}
                                    </div>
                                    <div>
                                      <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                        <span>{chapa.nome}</span>
                                        {chapaFavoritaId === chapa.id && (
                                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                                            ★ Sua Favorita
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-600 dark:text-slate-400">
                                        {pres
                                          ? `Presidência: ${pres.nome} (${pres.turma})`
                                          : chapa.slogan || 'Chapa Homologada'}
                                      </div>
                                    </div>
                                  </div>

                                  <div
                                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                      selecionada
                                        ? 'border-[#0037B0] bg-[#0037B0]'
                                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                                    }`}
                                  >
                                    {selecionada && (
                                      <span className="w-3 h-3 rounded-full bg-white" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}

                            {/* Voto em Branco */}
                            <button
                              type="button"
                              data-testid="opcao-voto-branco"
                              onClick={() => setOpcaoSelecionada('BRANCO')}
                              className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                                opcaoSelecionada === 'BRANCO'
                                  ? 'border-slate-700 bg-slate-200/80 dark:bg-slate-800 shadow-md'
                                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-3.5">
                                <div className="w-13 h-13 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-sm flex items-center justify-center shrink-0">
                                  BRANCO
                                </div>
                                <div>
                                  <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                                    Voto em Branco
                                  </div>
                                  <div className="text-xs text-slate-600 dark:text-slate-400">
                                    Voto formal registrado na urna sem atribuir a nenhuma chapa concorrente
                                  </div>
                                </div>
                              </div>

                              <div
                                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                  opcaoSelecionada === 'BRANCO'
                                    ? 'border-slate-800 bg-slate-800'
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                                }`}
                              >
                                {opcaoSelecionada === 'BRANCO' && (
                                  <span className="w-3 h-3 rounded-full bg-white" />
                                )}
                              </div>
                            </button>
                          </div>

                          {/* Faixa de Revisão da Escolha Atual */}
                          <div className="p-4 rounded-2xl bg-indigo-50/90 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 flex items-center justify-between">
                            <div>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                                Revisão da sua seleção na urna:
                              </span>
                              <div
                                data-testid="resumo-selecao-urna"
                                className="text-base font-extrabold text-[#0037B0] dark:text-blue-300 mt-0.5"
                              >
                                {!opcaoSelecionada
                                  ? 'Nenhuma opção selecionada ainda'
                                  : opcaoSelecionada === 'BRANCO'
                                  ? 'VOTO EM BRANCO'
                                  : `${chapaSelecionadaObj?.nome} (Nº ${chapaSelecionadaObj?.numero})`}
                              </div>
                            </div>
                            {opcaoSelecionada && (
                              <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                {opcaoSelecionada === 'BRANCO'
                                  ? 'Tipo: Branco'
                                  : `Nº ${chapaSelecionadaObj?.numero}`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Botoeira Canônica: CORRIGE + CONFIRMAR */}
                        <div className="pt-4 grid grid-cols-12 gap-3">
                          <button
                            type="button"
                            onClick={() => setOpcaoSelecionada(null)}
                            className="col-span-5 h-14 rounded-xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-500 text-amber-900 font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>CORRIGE</span>
                          </button>
                          <button
                            type="button"
                            data-testid="btn-abrir-confirmacao-voto"
                            disabled={!opcaoSelecionada || loading}
                            onClick={handleAbrirModalConfirmacao}
                            className="col-span-7 h-14 rounded-xl bg-[#006D30] hover:bg-[#15803D] disabled:opacity-50 text-white font-extrabold text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                            <span>CONFIRMAR VOTO</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ========================================================= */}
                    {/* ETAPA 5: SUCESSO, PROTOCOLO AUDITADO E ADESIVO EU VOTEI   */}
                    {/* ========================================================= */}
                    {etapa === 'sucesso' && (
                      <div
                        data-testid="tela-sucesso-voto"
                        className="flex-1 flex flex-col justify-between space-y-5 animate-in zoom-in-95 duration-300"
                      >
                        <div className="space-y-4">
                          {/* Banner FIM da Urna */}
                          <div className="w-full bg-[#006D30] p-5 rounded-2xl text-white text-center shadow-md">
                            <div className="text-[11px] font-bold tracking-widest uppercase opacity-90">
                              Urna Eletrônica Discente • {escola.nomeCurto}
                            </div>
                            <div className="text-4xl font-black tracking-widest my-1">F I M</div>
                            <div className="text-xs font-semibold opacity-95">
                              Voto computado com sucesso e total sigilo!
                            </div>
                          </div>

                          {/* Comprovante / Protocolo de Participação (SEM revelar a chapa!) */}
                          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold uppercase text-slate-600 dark:text-slate-300">
                                Protocolo Oficial de Participação
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                                ✓ Auditado
                              </span>
                            </div>
                            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 font-mono text-sm font-extrabold text-[#0037B0] dark:text-blue-400 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                              <span data-testid="protocolo-participacao">{protocoloGerado}</span>
                              <span className="text-xs text-slate-500 font-normal">
                                {horarioVoto}
                              </span>
                            </div>
                            <p className="text-[12px] text-slate-600 dark:text-slate-400">
                              🔒 Este protocolo comprova que você compareceu à votação da{' '}
                              <strong>{escola.nome}</strong> sem jamais revelar em quem você votou.
                            </p>
                          </div>

                          {/* Adesivo Social "Eu Votei" com o Brasão da Escola em Selo Circular Branco */}
                          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-[#0037B0] dark:text-blue-400 uppercase tracking-wider">
                                Adesivo &ldquo;Eu Votei!&rdquo; • {escola.nomeCurto}
                              </span>
                              <span className="text-[11px] text-slate-500 font-semibold">
                                Gerado no navegador
                              </span>
                            </div>

                            <div className="w-full bg-gradient-to-br from-[#0037B0] via-[#1D4ED8] to-[#006D30] p-5 rounded-2xl text-white text-center shadow-md flex flex-col items-center">
                              <SchoolCrest size="md" className="mb-2" />
                              <div className="text-2xl font-black tracking-tight">
                                EU VOTEI! 🗳️
                              </div>
                              <div className="text-xs font-bold uppercase tracking-wide opacity-95 mt-0.5">
                                {escola.nome}
                              </div>
                              <div className="mt-2 px-3 py-0.5 rounded-full bg-white/20 text-[11px] font-mono">
                                {eleicao.nome}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  baixarAdesivoEuVoteiPng({
                                    escola,
                                    nomeEleicao: eleicao.nome,
                                    protocolo: protocoloGerado,
                                  })
                                }
                                className="h-11 rounded-xl bg-[#0037B0] hover:bg-[#1D4ED8] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                              >
                                <Download className="w-4 h-4" /> Baixar Adesivo PNG
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const dataUrl = await baixarAdesivoEuVoteiPng({
                                    escola,
                                    nomeEleicao: eleicao.nome,
                                    protocolo: protocoloGerado,
                                  });
                                  if (navigator.share) {
                                    try {
                                      const blob = await (await fetch(dataUrl)).blob();
                                      const file = new File([blob], 'eu-votei-urbano.png', {
                                        type: 'image/png',
                                      });
                                      await navigator.share({
                                        title: `Eu Votei — ${escola.nomeCurto}`,
                                        text: `Participei da ${eleicao.nome} na ${escola.nome}!`,
                                        files: [file],
                                      });
                                    } catch {
                                      // ignore cancel
                                    }
                                  }
                                }}
                                className="h-11 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Share2 className="w-4 h-4" /> Compartilhar
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Contador de Reinício Automático da Cabine */}
                        <div className="pt-2 space-y-2">
                          <div className="text-center text-xs text-slate-500 dark:text-slate-400">
                            Reiniciando cabine automaticamente em{' '}
                            <strong className="text-[#0037B0] dark:text-blue-400">
                              {contadorReset}s
                            </strong>{' '}
                            para o próximo estudante...
                          </div>
                          <button
                            type="button"
                            data-testid="btn-concluir-liberar-cabine"
                            onClick={reiniciarFluxoUrna}
                            className="w-full h-13 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-900 dark:text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>Concluir e Liberar Cabine Agora</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ===================================================================== */}
      {/* MODAL PRÓPRIO DE CONFIRMAÇÃO DE VOTO (SUBSTITUI O confirm() NATIVO)    */}
      {/* ===================================================================== */}
      {modalConfirmacaoAberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-confirmar-voto-titulo"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span
                id="modal-confirmar-voto-titulo"
                className="text-xs font-extrabold uppercase tracking-wider text-[#0037B0] dark:text-blue-400"
              >
                Confirmação Oficial de Voto
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                Ação Irreversível
              </span>
            </div>

            <div className="text-center py-2 space-y-2">
              <span className="text-xs font-bold uppercase text-slate-500">
                Você está prestes a registrar seu voto em:
              </span>
              {opcaoSelecionada === 'BRANCO' ? (
                <div className="py-4 px-5 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-400">
                  <div className="text-3xl font-black text-slate-800 dark:text-white">
                    VOTO EM BRANCO
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Voto formal contabilizado sem atribuição a chapas
                  </p>
                </div>
              ) : (
                chapaSelecionadaObj && (
                  <div
                    className="py-4 px-5 rounded-2xl bg-blue-50/70 dark:bg-slate-800 border-2"
                    style={{ borderColor: chapaSelecionadaObj.cor }}
                  >
                    <div
                      className="text-4xl font-black leading-none"
                      style={{ color: chapaSelecionadaObj.cor }}
                    >
                      Nº {chapaSelecionadaObj.numero}
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                      {chapaSelecionadaObj.nome}
                    </h3>
                    {chapaSelecionadaObj.slogan && (
                      <p className="text-xs italic text-slate-600 dark:text-slate-300 mt-1">
                        &ldquo;{chapaSelecionadaObj.slogan}&rdquo;
                      </p>
                    )}
                  </div>
                )
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Após clicar em <strong>CONFIRMA</strong>, seu voto será gravado de forma única, anônima e definitiva na urna da{' '}
                <strong>{escola.nomeCurto}</strong>.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                disabled={loading}
                onClick={() => setModalConfirmacaoAberto(false)}
                className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-extrabold text-sm uppercase flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> CORRIGIR
              </button>
              <button
                type="button"
                data-testid="btn-confirmar-voto-modal"
                disabled={loading}
                onClick={handleConfirmarVotoDefinitivo}
                className="h-14 rounded-xl bg-[#006D30] hover:bg-[#15803D] disabled:opacity-50 text-white font-extrabold text-sm uppercase flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{loading ? 'GRAVANDO...' : 'CONFIRMA'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL DE DETALHES DA CHAPA (ABAS: PROPOSTAS, INTEGRANTES, DOCUMENTOS) */}
      {/* ===================================================================== */}
      {chapaDetalhe && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[88vh]">
            <div
              className="p-6 text-white flex items-center justify-between"
              style={{ backgroundColor: chapaDetalhe.cor }}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs font-black text-2xl flex items-center justify-center">
                  {chapaDetalhe.numero ?? 'CH'}
                </div>
                <div>
                  <h3 className="text-xl font-extrabold">{chapaDetalhe.nome}</h3>
                  {chapaDetalhe.slogan && (
                    <p className="text-xs opacity-90 italic">&ldquo;{chapaDetalhe.slogan}&rdquo;</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChapaDetalhe(null)}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Abas */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-6 gap-2 pt-2">
              {[
                { id: 'propostas', label: 'Propostas por Eixo', icon: Sparkles },
                { id: 'integrantes', label: `Integrantes (${chapaDetalhe.integrantes.length})`, icon: Users },
                { id: 'documentos', label: 'Documentos (PDF)', icon: FileText },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = abaDetalhe === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setAbaDetalhe(tab.id as 'propostas' | 'integrantes' | 'documentos')
                    }
                    className={`px-4 py-2.5 text-xs font-extrabold rounded-t-xl flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                      active
                        ? 'border-[#0037B0] text-[#0037B0] bg-white dark:bg-slate-900'
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {abaDetalhe === 'propostas' && (
                <div className="space-y-3">
                  {chapaDetalhe.descricao && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl">
                      {chapaDetalhe.descricao}
                    </p>
                  )}
                  {chapaDetalhe.propostas.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">
                      Nenhuma proposta detalhada cadastrada.
                    </p>
                  ) : (
                    chapaDetalhe.propostas.map((prop) => (
                      <div
                        key={prop.id}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1"
                      >
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-slate-800 text-[#0037B0] dark:text-blue-300 text-[11px] font-bold">
                          {prop.eixo}
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white pt-1">
                          {prop.titulo}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {prop.descricao}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {abaDetalhe === 'integrantes' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {chapaDetalhe.integrantes.map((intg) => (
                    <div
                      key={intg.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-3"
                    >
                      <div
                        className="w-10 h-10 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0"
                        style={{ backgroundColor: chapaDetalhe.cor }}
                      >
                        {intg.nome.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold uppercase text-blue-700 dark:text-blue-400">
                          {intg.cargo}
                        </div>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                          {intg.nome}
                        </div>
                        <div className="text-xs text-slate-500">Turma: {intg.turma}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {abaDetalhe === 'documentos' && (
                <div className="p-6 text-center space-y-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <FileText className="w-10 h-10 text-blue-700 mx-auto" />
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Carta-Programa e Plano de Gestão (PDF)
                  </h4>
                  {chapaDetalhe.propostas_url ? (
                    <a
                      href={chapaDetalhe.propostas_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0037B0] text-white text-xs font-bold shadow-sm"
                    >
                      <Download className="w-4 h-4" /> Abrir PDF Oficial de Propostas
                    </a>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Todas as propostas desta chapa estão disponíveis diretamente na aba &ldquo;Propostas por Eixo&rdquo;.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setChapaDetalhe(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL COMPARADOR DE ATÉ 3 CHAPAS LADO A LADO                          */}
      {/* ===================================================================== */}
      {comparadorAberto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-[#0037B0] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Columns3 className="w-5 h-5" />
                <h3 className="text-lg font-extrabold">
                  Comparador Lado a Lado de Chapas • {escola.nomeCurto}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setComparadorAberto(false)}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-auto grid grid-cols-1 md:grid-cols-3 gap-4">
              {chapasAprovadas
                .filter((c) => chapasComparadasIds.includes(c.id))
                .map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl border-2 space-y-3 flex flex-col justify-between"
                    style={{ borderColor: c.cor }}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-10 h-10 rounded-xl text-white font-black flex items-center justify-center"
                          style={{ backgroundColor: c.cor }}
                        >
                          {c.numero}
                        </span>
                        <div>
                          <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                            {c.nome}
                          </h4>
                          <p className="text-xs italic text-slate-500">{c.slogan}</p>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="font-bold uppercase text-slate-500">
                          Propostas Principais:
                        </div>
                        {c.propostas.map((p) => (
                          <div
                            key={p.id}
                            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800"
                          >
                            <span className="font-bold text-[#0037B0] dark:text-blue-400 block">
                              [{p.eixo}] {p.titulo}
                            </span>
                            <span className="text-slate-600 dark:text-slate-300">
                              {p.descricao}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                      Integrantes cadastrados: <strong>{c.integrantes.length}</strong>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      <CivicFooter escola={escola} modoQuiosque={modoQuiosque} />
    </div>
  );
}
