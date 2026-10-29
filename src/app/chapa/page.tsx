import type { Metadata } from 'next';
import { getChapaSession } from '@/lib/auth';
import { carregarEstado } from '@/server/store';
import {
  obterConfiguracaoEscolaAtual,
  obterDadosPortalChapa,
} from '@/server/queries';
import { PortalChapaClient } from '@/components/chapa/PortalChapaClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Portal da Chapa (Somente Leitura)',
};

export default async function PortalChapaPage() {
  await carregarEstado();
  const session = await getChapaSession();
  const escola = obterConfiguracaoEscolaAtual();
  const dados = session ? await obterDadosPortalChapa(session.chapaId) : null;

  return (
    <PortalChapaClient
      autenticadoInicialmente={Boolean(session && dados)}
      escolaInicial={escola}
      dadosIniciais={dados}
    />
  );
}
