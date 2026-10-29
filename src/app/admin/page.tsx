import type { Metadata } from 'next';
import { getAdminSession } from '@/lib/auth';
import {
  obterConfiguracaoEscolaAtual,
  obterDashboardAdminAgregado,
} from '@/server/queries';
import AdminClient from './AdminClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Painel Administrativo e Apuração',
};

export default async function AdminPage() {
  const session = await getAdminSession();
  const escola = obterConfiguracaoEscolaAtual();
  const dados = session ? await obterDashboardAdminAgregado() : null;

  return (
    <AdminClient
      autenticadoInicialmente={Boolean(session)}
      escolaInicial={escola}
      dadosIniciais={dados}
    />
  );
}
