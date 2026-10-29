'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Vote,
  ArrowRight,
  RotateCcw,
  Volume2,
  VolumeX,
  Delete,
  CheckCircle2,
  Lock,
  Clock,
  Maximize2,
  LogOut,
  AlertCircle,
  X,
} from 'lucide-react';
import { DadosPublicosUrna } from '@/server/queries';
import { ChapaCompleta } from '@/lib/database.types';
import { OPCOES_GENERO, OPCOES_RACA } from '@/lib/validations';
import { SchoolCrest } from '@/components/SchoolCrest';

interface UrnaQuiosqueViewProps {
  dadosIniciais: DadosPublicosUrna;
  etapa: 'ra' | 'confirmar' | 'chapas' | 'urna' | 'sucesso';
  setEtapa: (e: 'ra' | 'confirmar' | 'chapas' | 'urna' | 'sucesso') => void;
  ra: string;
  setRa: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  erroMensagem: string;
  erroCodigo: string | null;
  votouAnteriormenteEm: string | null;
  protocoloAnterior: string | null;
  aluno: {
    ra: string;
    nome: string;
    turma: string;
    serie: string;
    dataNascimento: string | null;
    faixaEtaria: string;
  } | null;
  raca: string;
  setRaca: (r: string) => void;
  genero: string;
  setGenero: (g: string) => void;
  opcaoSelecionada: string | 'BRANCO' | null;
  setOpcaoSelecionada: (op: string | 'BRANCO' | null) => void;
  chapaSelecionadaObj: ChapaCompleta | null;
  modalConfirmacaoAberto: boolean;
  setModalConfirmacaoAberto: (aberto: boolean) => void;
  protocoloGerado: string;
  horarioVoto: string;
  contadorReset: number;
  somAtivo: boolean;
  setSomAtivo: React.Dispatch<React.SetStateAction<boolean>>;
  screensaverAtivo: boolean;
  setScreensaverAtivo: (ativo: boolean) => void;
  semConexao: boolean;
  reiniciarFluxoUrna: () => void;
  handleLoginRa: (e: React.FormEvent) => Promise<void>;
  handleNaoSouEu: () => Promise<void>;
  handleConfirmarIdentidade: (irParaUrnaDireto?: boolean) => void;
  handleAbrirModalConfirmacao: () => void;
  handleConfirmarVotoDefinitivo: () => Promise<void>;
}

export function UrnaQuiosqueView({
  dadosIniciais,
  etapa,
  setEtapa,
  ra,
  setRa,
  loading,
  erroMensagem,
  erroCodigo,
  votouAnteriormenteEm,
  protocoloAnterior,
  aluno,
  raca,
  setRaca,
  genero,
  setGenero,
  opcaoSelecionada,
  setOpcaoSelecionada,
  chapaSelecionadaObj,
  modalConfirmacaoAberto,
  setModalConfirmacaoAberto,
  protocoloGerado,
  horarioVoto,
  contadorReset,
  somAtivo,
  setSomAtivo,
  screensaverAtivo,
  setScreensaverAtivo,
  semConexao,
  reiniciarFluxoUrna,
  handleLoginRa,
  handleNaoSouEu,
  handleConfirmarIdentidade,
  handleAbrirModalConfirmacao,
  handleConfirmarVotoDefinitivo,
}: UrnaQuiosqueViewProps) {
  const { escola, eleicao, statusEfetivo, chapasAprovadas } = dadosIniciais;

  // Estado para modal de saída do modo quiosque
  const [modalSairAberto, setModalSairAberto] = useState(false);
  const [senhaSair, setSenhaSair] = useState('');
  const [erroSair, setErroSair] = useState('');

  // Atalho de teclado para abrir o modal de saída com a tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalSairAberto(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleVerificarSenhaSair = (e: React.FormEvent) => {
    e.preventDefault();
    setErroSair('');
    // Senha oficial do sistema
    if (senhaSair === 'nsa014266w10@' || senhaSair === 'Urbano@Admin2026!') {
      window.location.href = '/';
    } else {
      setErroSair('Senha administrativa incorreta.');
    }
  };

  const handleTeclaNumpad = (digito: string) => {
    setRa((prev) => (prev.length < 15 ? prev + digito : prev));
  };

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden flex flex-col justify-between bg-slate-950 text-slate-100 font-sans select-none z-50">
      {/* 1. TOPO COMPACTO DO QUIOSQUE (Sem scroll, cabeçalho limpo) */}
      <header className="h-14 sm:h-16 px-4 sm:px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white p-0.5 shadow-md flex items-center justify-center shrink-0">
            <SchoolCrest size="sm" />
          </div>
          <div className="leading-tight">
            <div className="font-extrabold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
              <span>{escola.nomeCurto}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-900/80 text-blue-200 border border-blue-700">
                URNA OFICIAL
              </span>
            </div>
            <div className="text-[11px] text-slate-400 hidden sm:block">
              {escola.nome}
            </div>
          </div>
        </div>

        {/* Indicador de Etapa Compacto */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-950/80 px-3 py-1.5 rounded-full border border-slate-800 text-xs">
          {[
            { id: 'ra', label: '1. RA' },
            { id: 'confirmar', label: '2. Identificação' },
            { id: 'urna', label: '3. Urna' },
            { id: 'sucesso', label: '4. Fim' },
          ].map((item, idx) => {
            const ordem = ['ra', 'confirmar', 'chapas', 'urna', 'sucesso'];
            const idxAtual = ordem.indexOf(etapa);
            const ativo = etapa === item.id || (item.id === 'urna' && etapa === 'chapas');
            const concluido = idxAtual > idx;
            return (
              <span
                key={item.id}
                className={`px-2.5 py-0.5 rounded-full font-bold transition-all ${
                  ativo
                    ? 'bg-blue-600 text-white'
                    : concluido
                    ? 'bg-emerald-950 text-emerald-300'
                    : 'text-slate-500'
                }`}
              >
                {item.label}
              </span>
            );
          })}
        </div>

        {/* Botoeira de Controle do Totem */}
        <div className="flex items-center gap-2">
          {/* Som */}
          <button
            type="button"
            onClick={() => setSomAtivo(!somAtivo)}
            className="p-2 sm:px-2.5 sm:py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title={somAtivo ? 'Silenciar som da urna' : 'Ativar som da urna'}
          >
            {somAtivo ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Som Ativo</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">Mudo</span>
              </>
            )}
          </button>

          {/* Tela Cheia */}
          <button
            type="button"
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else {
                document.exitFullscreen().catch(() => {});
              }
            }}
            className="p-2 sm:px-2.5 sm:py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Alternar Tela Cheia"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden sm:inline">Tela Cheia</span>
          </button>

          {/* Sair do Quiosque */}
          <button
            type="button"
            onClick={() => {
              setErroSair('');
              setSenhaSair('');
              setModalSairAberto(true);
            }}
            className="px-2.5 py-1 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-800/60 text-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Sair do Modo Quiosque (Requer Senha)"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* 2. CONTEÚDO PRINCIPAL (100% visível na tela sem scroll) */}
      <main className="flex-1 w-full max-w-2xl mx-auto p-3 sm:p-5 flex items-center justify-center overflow-hidden">
        {/* Protetor de Tela quando inativo */}
        {screensaverAtivo && (
          <div
            onClick={() => setScreensaverAtivo(false)}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md text-white flex flex-col items-center justify-center p-6 text-center cursor-pointer animate-in fade-in"
          >
            <div className="w-24 h-24 rounded-full bg-white p-2 shadow-2xl mb-4 ring-4 ring-blue-500/50 flex items-center justify-center">
              <SchoolCrest size="lg" />
            </div>
            <span className="px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-widest mb-2">
              Totem Eleitoral Pronto • {escola.nomeCurto}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight max-w-xl mb-2">
              {escola.nome}
            </h2>
            <p className="text-slate-300 max-w-md mb-6 text-sm">
              Toque na tela com o seu número de RA para votar no Grêmio Estudantil.
            </p>
            <button
              type="button"
              className="px-8 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base uppercase tracking-wider shadow-xl transition-transform hover:scale-105"
            >
              TOQUE PARA INICIAR SEU VOTO
            </button>
          </div>
        )}

        {/* CARD CENTRAL DA URNA */}
        <div className="w-full max-h-[calc(100vh-5.5rem)] bg-slate-900/90 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-2xl p-4 sm:p-6 flex flex-col justify-between overflow-hidden">
          {/* Status não aberta */}
          {statusEfetivo !== 'aberta' && etapa === 'ra' ? (
            <div className="py-8 text-center space-y-4 my-auto">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {statusEfetivo === 'agendada'
                  ? 'A Votação Ainda Não Foi Aberta'
                  : 'Eleição Encerrada na E.E. Urbano'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                {statusEfetivo === 'agendada'
                  ? `A cabine digital da ${escola.nome} abrirá automaticamente no horário agendado pela Comissão Eleitoral.`
                  : `A votação para a ${eleicao.nome} foi encerrada. Obrigado a todos os estudantes participantes.`}
              </p>
            </div>
          ) : (
            <>
              {/* ========================================================= */}
              {/* ETAPA 1: DIGITE SEU RA (com Numpad ergonômico 1 tela)     */}
              {/* ========================================================= */}
              {etapa === 'ra' && (
                <form
                  onSubmit={handleLoginRa}
                  className="flex flex-col justify-between h-full space-y-3 sm:space-y-4 animate-in fade-in"
                >
                  <div className="text-center space-y-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-400">
                      Identificação do Eleitor • Passo 1 de 4
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Digite o seu RA Escolar
                    </h2>
                    <p className="text-xs text-slate-400">
                      Apenas números, sem senha e sem necessidade de dígito
                    </p>
                  </div>

                  {/* Mensagem de Erro se houver */}
                  {erroMensagem && (
                    <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{erroMensagem}</span>
                    </div>
                  )}

                  {/* Visor do RA */}
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={ra}
                      onChange={(e) => setRa(e.target.value.replace(/\D/g, ''))}
                      placeholder="000109..."
                      maxLength={15}
                      autoFocus
                      className="w-full text-center text-3xl sm:text-4xl font-mono font-black py-2.5 px-4 rounded-2xl bg-slate-950 border-2 border-blue-500/60 focus:border-blue-400 focus:outline-none tracking-widest text-blue-300 placeholder:text-slate-700 shadow-inner"
                    />
                    {ra && (
                      <button
                        type="button"
                        onClick={() => setRa('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
                        title="Limpar campo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Teclado Numérico Touch Integrado (Ergonômico) */}
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2 max-w-sm mx-auto w-full">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleTeclaNumpad(String(num))}
                        className="h-11 sm:h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xl font-black text-white border border-slate-700/80 transition-all cursor-pointer shadow-xs"
                      >
                        {num}
                      </button>
                    ))}
                    {/* Botão Limpar / Corrige */}
                    <button
                      type="button"
                      onClick={() => setRa('')}
                      className="h-11 sm:h-12 rounded-xl bg-amber-950/70 hover:bg-amber-900 border border-amber-800/80 active:scale-95 text-xs font-black uppercase text-amber-200 flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Limpar</span>
                    </button>
                    {/* Botão 0 */}
                    <button
                      type="button"
                      onClick={() => handleTeclaNumpad('0')}
                      className="h-11 sm:h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xl font-black text-white border border-slate-700/80 transition-all cursor-pointer shadow-xs"
                    >
                      0
                    </button>
                    {/* Botão Apagar Dígito */}
                    <button
                      type="button"
                      onClick={() => setRa((prev) => prev.slice(0, -1))}
                      className="h-11 sm:h-12 rounded-xl bg-red-950/70 hover:bg-red-900 border border-red-800/80 active:scale-95 text-xs font-black uppercase text-red-200 flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Delete className="w-3.5 h-3.5" />
                      <span>Apagar</span>
                    </button>
                  </div>

                  {/* Garantia de Sigilo & Botão Avançar */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Voto 100% secreto e inviolável na {escola.nomeCurto}</span>
                    </div>

                    <button
                      type="submit"
                      data-testid="btn-acessar-votacao"
                      disabled={loading || ra.trim().length < 4}
                      className="w-full h-12 sm:h-13 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 transition-all cursor-pointer"
                    >
                      <span>{loading ? 'Verificando RA...' : 'CONFIRMAR RA E AVANÇAR'}</span>
                      {!loading && <ArrowRight className="w-5 h-5" />}
                    </button>
                  </div>
                </form>
              )}

              {/* ========================================================= */}
              {/* ETAPA 2: CONFIRMAÇÃO DE DADOS (1 tela limpa)              */}
              {/* ========================================================= */}
              {etapa === 'confirmar' && aluno && (
                <div className="flex flex-col justify-between h-full space-y-3 sm:space-y-4 animate-in fade-in">
                  <div className="text-center space-y-0.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-400">
                      Identificação do Eleitor • Passo 2 de 4
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-white">
                      Confirme seus dados antes de votar
                    </h2>
                  </div>

                  {/* Card do Aluno */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Nome do Eleitor
                      </span>
                      <h3
                        data-testid="confirm-aluno-nome"
                        className="text-lg sm:text-2xl font-black text-blue-300 leading-tight"
                      >
                        {aluno.nome}
                      </h3>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">RA</span>
                        <strong className="font-mono text-white text-xs">{aluno.ra}</strong>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Turma</span>
                        <strong className="text-white text-xs">{aluno.turma}</strong>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Nascimento</span>
                        <strong className="text-white text-xs">
                          {aluno.dataNascimento || 'Registrado'}
                        </strong>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Matrícula Regular Ativa na {escola.nomeCurto}</span>
                    </div>
                  </div>

                  {/* Pesquisa Demográfica Opcional (Compacta em linha única, sem scroll) */}
                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-bold">Estatística agregada (opcional - LGPD):</span>
                      <span className="text-[10px] text-slate-500">Totalmente anônimo</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <select
                          value={raca}
                          onChange={(e) => setRaca(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-slate-200 text-xs focus:outline-none"
                        >
                          {OPCOES_RACA.map((op) => (
                            <option key={op} value={op}>
                              {op}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <select
                          value={genero}
                          onChange={(e) => setGenero(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-slate-200 text-xs focus:outline-none"
                        >
                          {OPCOES_GENERO.map((op) => (
                            <option key={op} value={op}>
                              {op}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Botoeira de Decisão: Não sou eu (Redefine) vs Sim sou eu (Avança) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      data-testid="btn-nao-sou-eu"
                      onClick={handleNaoSouEu}
                      className="h-12 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-800/80 text-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>✕ Não sou eu (Digitar outro RA)</span>
                    </button>
                    <button
                      type="button"
                      data-testid="btn-ir-para-urna"
                      onClick={() => handleConfirmarIdentidade(true)}
                      className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
                    >
                      <span>✓ SIM, SOU EU • IR PARA A URNA</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* ETAPA 3: URNA / CÉDULA OFICIAL (1 tela limpa)             */}
              {/* ========================================================= */}
              {(etapa === 'urna' || etapa === 'chapas') && (
                <div className="flex flex-col justify-between h-full space-y-3 animate-in fade-in">
                  <div className="text-center space-y-0.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-400">
                      Cédula Oficial • Passo 3 de 4
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-white">
                      Toque na sua Chapa ou em Branco
                    </h2>
                  </div>

                  {/* Grid de Opções de Voto */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {chapasAprovadas.map((chapa) => {
                      const selecionada = opcaoSelecionada === chapa.id;
                      const pres = chapa.integrantes.find((i) =>
                        i.cargo.toLowerCase().includes('presid')
                      );
                      return (
                        <button
                          key={chapa.id}
                          type="button"
                          onClick={() => setOpcaoSelecionada(chapa.id)}
                          className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                            selecionada
                              ? 'border-emerald-500 bg-emerald-950/60 ring-2 ring-emerald-500/30'
                              : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-12 h-12 rounded-xl text-white font-black text-xl flex items-center justify-center shrink-0 shadow-md"
                              style={{ backgroundColor: chapa.cor || '#0037B0' }}
                            >
                              {chapa.numero ?? 'CH'}
                            </div>
                            <div className="leading-tight">
                              <div className="text-sm sm:text-base font-extrabold text-white">
                                {chapa.nome}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {pres ? `Pres.: ${pres.nome}` : chapa.slogan || 'Chapa Aprovada'}
                              </div>
                            </div>
                          </div>

                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              selecionada
                                ? 'border-emerald-400 bg-emerald-500'
                                : 'border-slate-600 bg-slate-900'
                            }`}
                          >
                            {selecionada && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
                          </div>
                        </button>
                      );
                    })}

                    {/* Voto em Branco */}
                    <button
                      type="button"
                      data-testid="opcao-voto-branco"
                      onClick={() => setOpcaoSelecionada('BRANCO')}
                      className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        opcaoSelecionada === 'BRANCO'
                          ? 'border-slate-400 bg-slate-800 ring-2 ring-slate-400/30'
                          : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-md">
                          BRANCO
                        </div>
                        <div className="leading-tight">
                          <div className="text-sm sm:text-base font-extrabold text-white">
                            Voto em Branco
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Sem atribuição de chapa
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          opcaoSelecionada === 'BRANCO'
                            ? 'border-white bg-white'
                            : 'border-slate-600 bg-slate-900'
                        }`}
                      >
                        {opcaoSelecionada === 'BRANCO' && (
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-950" />
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Resumo da Escolha */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold">Seleção atual:</span>
                    <strong
                      data-testid="resumo-selecao-urna"
                      className="text-emerald-400 font-bold"
                    >
                      {!opcaoSelecionada
                        ? 'Nenhuma opção selecionada'
                        : opcaoSelecionada === 'BRANCO'
                        ? 'VOTO EM BRANCO'
                        : `${chapaSelecionadaObj?.nome} (Nº ${chapaSelecionadaObj?.numero})`}
                    </strong>
                  </div>

                  {/* Botoeira Oficial: CORRIGE e CONFIRMAR VOTO */}
                  <div className="grid grid-cols-12 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setOpcaoSelecionada(null)}
                      className="col-span-4 h-12 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-amber-200 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>CORRIGE</span>
                    </button>
                    <button
                      type="button"
                      data-testid="btn-abrir-confirmacao-voto"
                      disabled={!opcaoSelecionada || loading}
                      onClick={handleAbrirModalConfirmacao}
                      className="col-span-8 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>CONFIRMAR VOTO</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* ETAPA 4: SUCESSO / FIM (1 tela limpa)                      */}
              {/* ========================================================= */}
              {etapa === 'sucesso' && (
                <div
                  data-testid="tela-sucesso-voto"
                  className="flex flex-col justify-between h-full space-y-3 sm:space-y-4 animate-in zoom-in-95 duration-200"
                >
                  <div className="bg-emerald-600 p-4 rounded-2xl text-white text-center shadow-lg">
                    <div className="text-[11px] font-bold tracking-widest uppercase opacity-90">
                      Urna Eletrônica • {escola.nomeCurto}
                    </div>
                    <div className="text-4xl sm:text-5xl font-black tracking-widest my-1">
                      F I M
                    </div>
                    <div className="text-xs font-semibold opacity-95">
                      Voto computado com 100% de sigilo e integridade!
                    </div>
                  </div>

                  {/* Protocolo */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Protocolo Oficial de Auditoria
                    </div>
                    <div
                      data-testid="protocolo-participacao"
                      className="text-base sm:text-lg font-mono font-black text-blue-300 bg-slate-900 py-1.5 px-3 rounded-xl border border-slate-800"
                    >
                      {protocoloGerado}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Registrado às {horarioVoto} • Não revela sua escolha
                    </div>
                  </div>

                  {/* Reset automático e botão próximo eleitor */}
                  <div className="space-y-2 pt-1">
                    <div className="text-center text-xs text-slate-400">
                      Próximo eleitor em <strong className="text-white">{contadorReset}</strong>s
                    </div>
                    <button
                      type="button"
                      onClick={reiniciarFluxoUrna}
                      className="w-full h-12 sm:h-13 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-5 h-5" />
                      <span>PRÓXIMO ELEITOR (INICIAR NOVO VOTO)</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* 3. RODAPÉ MÍNIMO DO QUIOSQUE (1 linha, 100% limpo) */}
      <footer className="h-9 px-4 bg-slate-950 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
        <div>
          {escola.nome} • {escola.cidade} - {escola.uf}
        </div>
        <div className="font-mono">DecideAI • Grêmio Urbano 2026</div>
      </footer>

      {/* MODAL DE CONFIRMAÇÃO DE VOTO */}
      {modalConfirmacaoAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 rounded-3xl border border-slate-700 p-6 space-y-4 text-center shadow-2xl animate-in zoom-in-95">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
              Confirmar Escolha na Urna
            </span>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">Seu voto será registrado para:</div>
              <div className="text-2xl font-black text-white">
                {opcaoSelecionada === 'BRANCO'
                  ? 'VOTO EM BRANCO'
                  : `${chapaSelecionadaObj?.nome} (Nº ${chapaSelecionadaObj?.numero})`}
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Após confirmar, seu voto é gravado de forma irreversível e sem vínculo com seu nome.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalConfirmacaoAberto(false)}
                className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                CORRIGIR
              </button>
              <button
                type="button"
                data-testid="btn-confirmar-voto-definitivo"
                disabled={loading}
                onClick={handleConfirmarVotoDefinitivo}
                className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-emerald-900/40 cursor-pointer"
              >
                {loading ? 'GRAVANDO...' : 'CONFIRMAR VOTO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SAIR DO QUIOSQUE (Protegido por senha) */}
      {modalSairAberto && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 rounded-3xl border border-slate-700 p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <Lock className="w-4 h-4" />
                <span>Sair do Modo Quiosque</span>
              </div>
              <button
                type="button"
                onClick={() => setModalSairAberto(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Digite a senha do administrador escolar para desbloquear e fechar o totem:
            </p>

            <form onSubmit={handleVerificarSenhaSair} className="space-y-3">
              <input
                type="password"
                value={senhaSair}
                onChange={(e) => setSenhaSair(e.target.value)}
                placeholder="Senha de administrador"
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
              />

              {erroSair && (
                <div className="text-xs font-semibold text-rose-400">{erroSair}</div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalSairAberto(false)}
                  className="h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Desbloquear</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
