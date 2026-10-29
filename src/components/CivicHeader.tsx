'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  Sun,
  Moon,
  Vote,
  LayoutDashboard,
  Award,
  Trophy,
  Monitor,
  Clock,
} from 'lucide-react';
import { SchoolCrest } from './SchoolCrest';
import { ConfiguracaoEscola, ESCOLA_DEFAULT } from '@/lib/escola';
import { StatusEleicao } from '@/lib/database.types';

interface CivicHeaderProps {
  escola?: ConfiguracaoEscola;
  eleicaoNome?: string;
  statusEleicao?: StatusEleicao;
  encerraEm?: string | null;
  modoQuiosque?: boolean;
  subtitulo?: string;
  badgeTexto?: string;
  badgeCor?: string;
  acoesDireita?: React.ReactNode;
}

export function CivicHeader({
  escola = ESCOLA_DEFAULT,
  eleicaoNome = 'Eleição Grêmio Estudantil 2026',
  statusEleicao = 'aberta',
  encerraEm = null,
  modoQuiosque = false,
  subtitulo,
  badgeTexto,
  acoesDireita,
}: CivicHeaderProps) {
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('decideai_theme') === 'dark';
  });
  const [tempoRestante, setTempoRestante] = useState<string>('');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    if (!encerraEm || statusEleicao !== 'aberta') {
      return;
    }

    const updateTimer = () => {
      const diff = new Date(encerraEm).getTime() - Date.now();
      if (diff <= 0) {
        setTempoRestante('Encerrando...');
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTempoRestante(
        `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
      );
    };

    const initTimeout = setTimeout(updateTimer, 0);
    const interval = setInterval(updateTimer, 1000);
    return () => {
      clearTimeout(initTimeout);
      clearInterval(interval);
    };
  }, [encerraEm, statusEleicao]);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('decideai_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('decideai_theme', 'light');
    }
  };

  return (
    <header className="w-full sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
      {/* Top Status Strip */}
      <div className="bg-indigo-50 dark:bg-slate-950 px-4 lg:px-8 py-1.5 flex items-center justify-between text-xs border-b border-indigo-100/80 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {statusEleicao === 'aberta' ? (
            <>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
              <span className="font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                URNA ABERTA
              </span>
            </>
          ) : (
            <span className="font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              STATUS: {statusEleicao.toUpperCase()}
            </span>
          )}
          <span className="text-slate-700 dark:text-slate-300 font-medium hidden sm:inline">
            • {badgeTexto || eleicaoNome}
          </span>
          {tempoRestante && (
            <span className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full font-mono font-bold border border-blue-200 dark:border-slate-700">
              <Clock className="w-3 h-3" /> {tempoRestante}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Ambiente Auditado • {escola.nomeCurto}
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Alternar modo claro ou escuro"
            className="h-8 px-2.5 rounded-full flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors text-xs font-semibold cursor-pointer"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
            <span className="hidden sm:inline">{darkMode ? 'Claro' : 'Escuro'}</span>
          </button>
        </div>
      </div>

      {/* Main Institutional Bar */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 h-20 flex items-center justify-between gap-4">
        <Link href={modoQuiosque ? '/urna' : '/'} className="flex items-center gap-3.5 group">
          <SchoolCrest size="md" />
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-extrabold text-blue-900 dark:text-blue-300 tracking-tight leading-tight group-hover:text-blue-700 transition-colors">
              {escola.nome}
            </span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {subtitulo || 'Sistema Oficial de Votação do Grêmio Estudantil • DecideAI'}
            </span>
          </div>
        </Link>

        {acoesDireita && <div className="flex items-center gap-2">{acoesDireita}</div>}

        {!modoQuiosque && (
          <nav className="hidden xl:flex items-center gap-1.5" aria-label="Navegação Principal">
            <Link
              href="/"
              className={`px-3.5 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all ${
                pathname === '/'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Vote className="w-4 h-4" />
              Cabine de Votação
            </Link>
            <Link
              href="/urna"
              className={`px-3.5 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all ${
                pathname === '/urna'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Monitor className="w-4 h-4" />
              Modo Quiosque
            </Link>
            <Link
              href="/resultados"
              className={`px-3.5 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all ${
                pathname === '/resultados'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Trophy className="w-4 h-4" />
              Participação & Resultados
            </Link>
            <Link
              href="/chapa"
              className={`px-3.5 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all ${
                pathname?.startsWith('/chapa')
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Award className="w-4 h-4" />
              Portal da Chapa
            </Link>
            <Link
              href="/admin"
              className={`px-3.5 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all ${
                pathname?.startsWith('/admin')
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Painel Admin
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

export function CivicFooter({
  escola = ESCOLA_DEFAULT,
  modoQuiosque = false,
}: {
  escola?: ConfiguracaoEscola;
  modoQuiosque?: boolean;
}) {
  return (
    <footer className="w-full bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <SchoolCrest size="sm" />
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">
              {escola.nome} ({escola.nomeCurto})
            </p>
            <p>
              Garantia de Voto Secreto (Art. 14 CF/88) & Proteção de Dados (LGPD) • O RA nunca é vinculado ao voto.
            </p>
          </div>
        </div>

        {!modoQuiosque && (
          <div className="flex flex-wrap items-center gap-4 font-semibold">
            <Link href="/" className="hover:text-blue-700 dark:hover:text-blue-400">
              Urna Eleitoral
            </Link>
            <span>•</span>
            <Link href="/resultados" className="hover:text-blue-700 dark:hover:text-blue-400">
              Ranking de Turmas & Resultados
            </Link>
            <span>•</span>
            <Link href="/chapa" className="hover:text-blue-700 dark:hover:text-blue-400">
              Portal da Chapa
            </Link>
            <span>•</span>
            <Link href="/admin" className="hover:text-blue-700 dark:hover:text-blue-400">
              Comissão Eleitoral
            </Link>
          </div>
        )}
      </div>
    </footer>
  );
}
