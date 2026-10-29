import type { Metadata } from 'next';
import { obterDashboardAdminAgregado } from '@/server/queries';
import { ResultadosPublicosClient } from '@/components/eleitor/ResultadosPublicosClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Resultados e Ranking de Participação',
};

export default async function ResultadosPublicosPage() {
  const dados = await obterDashboardAdminAgregado();
  const resultadoPublicado =
    (dados.eleicaoAtual.status === 'encerrada' ||
      dados.eleicaoAtual.status === 'arquivada') &&
    dados.eleicaoAtual.resultado_publicado;

  return (
    <ResultadosPublicosClient
      escola={dados.escola}
      eleicao={dados.eleicaoAtual}
      kpis={{
        totalVotos: dados.kpis.totalVotos,
        votosValidos: dados.kpis.votosValidos,
        votosBrancos: dados.kpis.votosBrancos,
        totalParticipacoes: dados.kpis.totalParticipacoes,
        totalAptos: dados.kpis.totalAptos,
        percentualParticipacao: dados.kpis.percentualParticipacao,
      }}
      rankingTurmas={dados.participacaoPorTurma}
      apuracaoChapas={resultadoPublicado ? dados.apuracaoChapas : []}
      chapasDetalhes={dados.chapas.filter((c) => c.status === 'aprovada')}
      perfilDemografico={dados.perfilDemografico}
      resultadoPublicado={resultadoPublicado}
    />
  );
}
