import { obterDadosPublicosUrna } from '@/server/queries';
import { UrnaEleitorClient } from '@/components/eleitor/UrnaEleitorClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const dadosIniciais = await obterDadosPublicosUrna();

  return <UrnaEleitorClient dadosIniciais={dadosIniciais} modoQuiosque={false} />;
}
