'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Lock, ShieldCheck, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { ConfiguracaoEscola } from '@/lib/escola';
import { loginAdminAction } from '@/server/actions';
import { SchoolCrest } from '@/components/SchoolCrest';

interface AdminLoginViewProps {
  escola: ConfiguracaoEscola;
  onSuccess: () => void;
}

export function AdminLoginView({ escola, onSuccess }: AdminLoginViewProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await loginAdminAction(password);
      if (res.error) {
        setError(res.error);
      } else if (res.success) {
        onSuccess();
      }
    } catch {
      setError('Falha ao conectar com o servidor de autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#f8f9ff] dark:bg-slate-950 text-[#0b1c30] dark:text-slate-100">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-8 sm:p-10">
        <div className="flex flex-col items-center text-center mb-8">
          <SchoolCrest logoPath={escola.logos.escola} nomeCurto={escola.nomeCurto} size="lg" />
          <span className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#004ac6] dark:text-blue-400 text-[11px] font-bold uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5" />
            Comissão Eleitoral • Acesso Restrito
          </span>
          <h1 className="text-2xl font-extrabold mt-3 text-slate-900 dark:text-white">
            Painel Administrativo
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            {escola.nomeCompleto}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2"
            >
              Credencial da Comissão Eleitoral
            </label>
            <div className="relative">
              <KeyRound className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Digite a senha administrativa"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-[#004ac6] transition-all"
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#004ac6] to-[#2563eb] hover:from-[#0037b0] hover:to-[#1d4ed8] text-white font-bold shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            {loading ? 'Autenticando Sessão JWT...' : 'Entrar no Painel Administrativo'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <Link
            href="/"
            className="inline-flex items-center gap-1 font-semibold hover:text-[#004ac6] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar para a Urna
          </Link>
          <span>Sessão JWT HttpOnly</span>
        </div>
      </div>
    </div>
  );
}
