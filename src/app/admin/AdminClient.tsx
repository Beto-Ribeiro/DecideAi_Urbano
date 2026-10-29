'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Flag,
  Sliders,
  ShieldCheck,
  FileSpreadsheet,
  LogOut,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { ConfiguracaoEscola } from '@/lib/escola';
import { DashboardAdminAggregated } from '@/server/queries';
import {
  obterDashboardPollingAction,
  logoutAdminAction,
} from '@/server/actions';
import { CivicHeader, CivicFooter } from '@/components/CivicHeader';
import { AdminLoginView } from '@/components/admin/AdminLoginView';
import { AdminOverviewTab } from '@/components/admin/AdminOverviewTab';
import { AdminEleitoresTab } from '@/components/admin/AdminEleitoresTab';
import { AdminChapasTab } from '@/components/admin/AdminChapasTab';
import { AdminControleTab } from '@/components/admin/AdminControleTab';
import { AdminAuditoriaTab } from '@/components/admin/AdminAuditoriaTab';
import { AdminImportarTab } from '@/components/admin/AdminImportarTab';

type AbaAdmin =
  | 'visao_geral'
  | 'eleitores'
  | 'chapas'
  | 'controle'
  | 'auditoria'
  | 'importar';

interface AdminClientProps {
  autenticadoInicialmente: boolean;
  escolaInicial: ConfiguracaoEscola;
  dadosIniciais: DashboardAdminAggregated | null;
}

export default function AdminClient({
  autenticadoInicialmente,
  escolaInicial,
  dadosIniciais,
}: AdminClientProps) {
  // Todos os hooks declarados incondicionalmente no topo (corrige bug da Fase 0 item 5)
  const [autenticado, setAutenticado] = useState<boolean>(autenticadoInicialmente);
  const [dados, setDados] = useState<DashboardAdminAggregated | null>(dadosIniciais);
  const [abaAtiva, setAbaAtiva] = useState<AbaAdmin>('visao_geral');
  const [atualizando, setAtualizando] = useState<boolean>(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string>(
    new Date().toLocaleTimeString('pt-BR')
  );

  const atualizarDashboard = useCallback(async () => {
    setAtualizando(true);
    try {
      const novo = await obterDashboardPollingAction();
      setDados(novo);
      setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'));
    } catch {
      // Se a sessão expirou
    } finally {
      setAtualizando(false);
    }
  }, []);

  // Polling leve de 12 segundos no painel administrativo (Respeito ao limite gratuito Supabase)
  useEffect(() => {
    if (!autenticado) return;
    const interval = setInterval(() => {
      atualizarDashboard();
    }, 12000);
    return () => clearInterval(interval);
  }, [autenticado, atualizarDashboard]);

  const handleLogout = async () => {
    await logoutAdminAction();
    setAutenticado(false);
    setDados(null);
  };

  if (!autenticado || !dados) {
    return (
      <AdminLoginView
        escola={escolaInicial}
        onSuccess={() => {
          setAutenticado(true);
          atualizarDashboard();
        }}
      />
    );
  }

  const abas: Array<{ id: AbaAdmin; label: string; icon: React.ReactNode }> = [
    {
      id: 'visao_geral',
      label: 'Visão Geral & Apuração',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'eleitores',
      label: 'Eleitores & Chamada',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'chapas',
      label: 'Chapas & Acessos',
      icon: <Flag className="w-4 h-4" />,
    },
    {
      id: 'controle',
      label: 'Controle da Eleição',
      icon: <Sliders className="w-4 h-4" />,
    },
    {
      id: 'auditoria',
      label: 'Auditoria & Ata PDF',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      id: 'importar',
      label: 'Importar Alunos & Escola',
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
  ];

  const corStatus =
    dados.eleicaoAtual.status === 'aberta'
      ? 'verde'
      : dados.eleicaoAtual.status === 'agendada'
      ? 'amarelo'
      : 'azul';

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9ff] dark:bg-slate-950 text-[#0b1c30] dark:text-slate-100">
      <CivicHeader
        escola={dados.escola}
        subtitulo="Painel Administrativo & Comissão Eleitoral"
        badgeTexto={`Eleição ${dados.eleicaoAtual.status.toUpperCase()}`}
        badgeCor={corStatus}
        acoesDireita={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={atualizarDashboard}
              disabled={atualizando}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
              title="Sincronizado a cada 12s"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${atualizando ? 'animate-spin text-[#004ac6]' : ''}`}
              />
              <span className="hidden md:inline">{ultimaAtualizacao}</span>
            </button>

            <Link
              href="/urna"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#004ac6] dark:text-blue-400 text-xs font-bold hover:bg-blue-100 transition-colors"
            >
              <span>Abrir Quiosque</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        }
      />

      {/* Barra de Navegação das Abas */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto py-2.5">
          {abas.map((aba) => {
            const ativa = abaAtiva === aba.id;
            return (
              <button
                key={aba.id}
                type="button"
                onClick={() => setAbaAtiva(aba.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  ativa
                    ? 'bg-[#004ac6] text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {aba.icon}
                <span>{aba.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {abaAtiva === 'visao_geral' && (
          <AdminOverviewTab
            dados={dados}
            onSelectTab={(t) => setAbaAtiva(t as AbaAdmin)}
          />
        )}

        {abaAtiva === 'eleitores' && (
          <AdminEleitoresTab
            escola={dados.escola}
            eleicaoId={dados.eleicaoAtual.id}
            turmasDisponiveis={dados.turmasDisponiveis}
          />
        )}

        {abaAtiva === 'chapas' && (
          <AdminChapasTab chapas={dados.chapas} onRefresh={atualizarDashboard} />
        )}

        {abaAtiva === 'controle' && (
          <AdminControleTab dados={dados} onRefresh={atualizarDashboard} />
        )}

        {abaAtiva === 'auditoria' && <AdminAuditoriaTab dados={dados} />}

        {abaAtiva === 'importar' && (
          <AdminImportarTab
            escola={dados.escola}
            onRefresh={atualizarDashboard}
          />
        )}
      </main>

      <CivicFooter escola={dados.escola} />
    </div>
  );
}
