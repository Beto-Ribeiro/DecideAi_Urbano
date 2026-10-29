import type { Metadata } from 'next';
import { obterDadosPublicosUrna } from '@/server/queries';
import { UrnaEleitorClient } from '@/components/eleitor/UrnaEleitorClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Urna em Modo Quiosque',
};

export default async function UrnaQuiosquePage() {
  const dadosIniciais = await obterDadosPublicosUrna();

  return <UrnaEleitorClient dadosIniciais={dadosIniciais} modoQuiosque={true} />;
}
