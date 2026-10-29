import crypto from 'crypto';
import {
  ApuracaoChapaItem,
  CertificadoRow,
  ChapaCompleta,
  EleicaoRow,
  LogAuditoriaRow,
  ParticipacaoTurmaItem,
  RecorteDemograficoItem,
  RelatorioIntegridade,
  VotoChapaPorTurmaItem,
  VotoPorHoraItem,
} from '@/lib/database.types';
import { ConfiguracaoEscola, mergeEscolaConfig } from '@/lib/escola';
import {
  aplicarKAnonimato,
  calcularResultadoEleitoral,
  calcularStatusEfetivoEleicao,
  extrairSerieDaTurma,
  LIMITE_MINIMO_K_ANONIMATO,
} from '@/lib/validations';
import {
  getLocalState,
  listarTodosAlunos,
  obterChapasCompletasDaEleicao,
} from './store';

export interface DadosPublicosUrna {
  escola: ConfiguracaoEscola;
  eleicao: EleicaoRow;
  statusEfetivo: EleicaoRow['status'];
  chapasAprovadas: ChapaCompleta[];
  totalParticipacoes: number;
  totalEleitoresAptos: number;
  percentualParticipacao: number;
  rankingTurmas: ParticipacaoTurmaItem[];
}

export function obterConfiguracaoEscolaAtual(): ConfiguracaoEscola {
  const state = getLocalState();
  return mergeEscolaConfig(state.configuracoes_escola);
}

export function obterEleicaoAtiva(): EleicaoRow {
  const state = getLocalState();
  const ativa =
    state.eleicoes.find((e) => e.status !== 'arquivada') || state.eleicoes[0];
  return {
    ...ativa,
    status: calcularStatusEfetivoEleicao(ativa),
  };
}

export async function obterDadosPublicosUrna(): Promise<DadosPublicosUrna> {
  const state = getLocalState();
  const escola = obterConfiguracaoEscolaAtual();
  const eleicao = obterEleicaoAtiva();
  const statusEfetivo = calcularStatusEfetivoEleicao(eleicao);

  const todasChapas = obterChapasCompletasDaEleicao(eleicao.id, false);
  const chapasAprovadas = todasChapas.filter((c) => c.status === 'aprovada');

  const todosAlunos = await listarTodosAlunos();
  const alunosAtivos = todosAlunos.filter(
    (a) => a.situacao.trim().toLowerCase() === 'ativo'
  );
  const participacoesEleicao = state.participacoes.filter(
    (p) => p.eleicao_id === eleicao.id
  );

  const votaramSet = new Set(participacoesEleicao.map((p) => p.ra));
  const turmasMap = new Map<string, { aptos: number; votaram: number }>();

  for (const aluno of alunosAtivos) {
    const t = aluno.turma || 'Sem Turma';
    const atual = turmasMap.get(t) || { aptos: 0, votaram: 0 };
    atual.aptos += 1;
    if (votaramSet.has(aluno.ra)) {
      atual.votaram += 1;
    }
    turmasMap.set(t, atual);
  }

  const rankingTurmas: ParticipacaoTurmaItem[] = Array.from(turmasMap.entries())
    .map(([turma, d]) => ({
      turma,
      serie: extrairSerieDaTurma(turma),
      total_aptos: d.aptos,
      total_votaram: d.votaram,
      percentual_participacao:
        d.aptos > 0 ? Number(((d.votaram / d.aptos) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.percentual_participacao - a.percentual_participacao);

  const totalEleitoresAptos = alunosAtivos.length;
  const totalParticipacoes = participacoesEleicao.length;
  const percentualParticipacao =
    totalEleitoresAptos > 0
      ? Number(((totalParticipacoes / totalEleitoresAptos) * 100).toFixed(1))
      : 0;

  return {
    escola,
    eleicao: { ...eleicao, status: statusEfetivo },
    statusEfetivo,
    chapasAprovadas,
    totalParticipacoes,
    totalEleitoresAptos,
    percentualParticipacao,
    rankingTurmas,
  };
}

export interface DashboardAdminAggregated {
  escola: ConfiguracaoEscola;
  eleicaoAtual: EleicaoRow;
  historicoEleicoes: Array<{
    eleicao: EleicaoRow;
    totalVotos: number;
    votosBrancos: number;
    totalParticipacoes: number;
    vencedoraNome: string | null;
  }>;
  kpis: {
    totalVotos: number;
    votosValidos: number;
    votosBrancos: number;
    totalParticipacoes: number;
    totalAptos: number;
    faltantes: number;
    percentualParticipacao: number;
    metaParticipacao: number;
    metaAtingida: boolean;
    empate: boolean;
    lider: ApuracaoChapaItem | null;
  };
  apuracaoChapas: ApuracaoChapaItem[];
  votosPorHora: VotoPorHoraItem[];
  participacaoPorTurma: ParticipacaoTurmaItem[];
  participacaoPorSerie: Array<{
    serie: string;
    total_aptos: number;
    total_votaram: number;
    percentual_participacao: number;
  }>;
  votosChapaPorTurma: VotoChapaPorTurmaItem[];
  perfilDemografico: {
    genero: RecorteDemograficoItem[];
    raca: RecorteDemograficoItem[];
    faixaEtaria: RecorteDemograficoItem[];
  };
  chapas: ChapaCompleta[];
  integridade: RelatorioIntegridade;
  auditoriaRecente: LogAuditoriaRow[];
  turmasDisponiveis: string[];
}

export async function obterDashboardAdminAgregado(
  eleicaoIdOpcional?: string
): Promise<DashboardAdminAggregated> {
  const state = getLocalState();
  const escola = obterConfiguracaoEscolaAtual();

  const eleicaoBase =
    (eleicaoIdOpcional
      ? state.eleicoes.find((e) => e.id === eleicaoIdOpcional)
      : null) || obterEleicaoAtiva();

  const eleicaoAtual: EleicaoRow = {
    ...eleicaoBase,
    status: calcularStatusEfetivoEleicao(eleicaoBase),
  };

  const todosAlunos = await listarTodosAlunos();
  const alunosAtivos = todosAlunos.filter(
    (a) => a.situacao.trim().toLowerCase() === 'ativo'
  );
  const totalAptos = alunosAtivos.length;

  const chapas = obterChapasCompletasDaEleicao(eleicaoAtual.id, true);
  const votosEleicao = state.votos.filter((v) => v.eleicao_id === eleicaoAtual.id);
  const participacoesEleicao = state.participacoes.filter(
    (p) => p.eleicao_id === eleicaoAtual.id
  );

  const votosBrancos = votosEleicao.filter((v) => v.tipo === 'branco').length;

  const chapasContagem = chapas
    .filter((c) => c.status !== 'rascunho')
    .map((c) => {
      const count = votosEleicao.filter(
        (v) => v.tipo === 'valido' && v.chapa_id === c.id
      ).length;
      return {
        chapa_id: c.id,
        nome: c.nome,
        numero: c.numero,
        total_votos: count,
      };
    });

  const resultadoCalc = calcularResultadoEleitoral(
    chapasContagem,
    votosBrancos,
    eleicaoAtual.desempate_chapa_id
  );

  const apuracaoChapas: ApuracaoChapaItem[] = resultadoCalc.chapasOrdenadas.map(
    (item) => {
      const full = chapas.find((c) => c.id === item.chapa_id)!;
      const pres = full.integrantes.find((i) =>
        i.cargo.toLowerCase().includes('pres')
      );
      return {
        chapa_id: full.id,
        nome: full.nome,
        numero: full.numero,
        slogan: full.slogan,
        cor: full.cor,
        logo_url: full.logo_url,
        status: full.status,
        total_votos: item.total_votos,
        percentual_total: item.percentual_total,
        percentual_validos: item.percentual_validos,
        lideranca: pres ? `${pres.nome} (${pres.turma})` : undefined,
      };
    }
  );

  // Evolução por hora (agregada de participacoes sem expor voto individual)
  const horasMap = new Map<string, number>();
  for (let h = 7; h <= 18; h++) {
    horasMap.set(`${String(h).padStart(2, '0')}:00`, 0);
  }
  for (const p of participacoesEleicao) {
    const dt = new Date(p.created_at);
    const key = `${String(dt.getHours()).padStart(2, '0')}:00`;
    horasMap.set(key, (horasMap.get(key) || 0) + 1);
  }
  const votosPorHora: VotoPorHoraItem[] = Array.from(horasMap.entries()).map(
    ([hora, total_votos]) => ({ hora, total_votos })
  );

  // Participação por turma e série
  const votaramRaSet = new Set(participacoesEleicao.map((p) => p.ra));
  const turmasStatsMap = new Map<string, { aptos: number; votaram: number }>();

  for (const a of alunosAtivos) {
    const t = a.turma || 'Sem Turma';
    const entry = turmasStatsMap.get(t) || { aptos: 0, votaram: 0 };
    entry.aptos += 1;
    if (votaramRaSet.has(a.ra)) {
      entry.votaram += 1;
    }
    turmasStatsMap.set(t, entry);
  }

  const participacaoPorTurma: ParticipacaoTurmaItem[] = Array.from(
    turmasStatsMap.entries()
  )
    .map(([turma, d]) => ({
      turma,
      serie: extrairSerieDaTurma(turma),
      total_aptos: d.aptos,
      total_votaram: d.votaram,
      percentual_participacao:
        d.aptos > 0 ? Number(((d.votaram / d.aptos) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => a.turma.localeCompare(b.turma, 'pt-BR'));

  // Agregação por série
  const seriesStatsMap = new Map<string, { aptos: number; votaram: number }>();
  for (const t of participacaoPorTurma) {
    const s = seriesStatsMap.get(t.serie) || { aptos: 0, votaram: 0 };
    s.aptos += t.total_aptos;
    s.votaram += t.total_votaram;
    seriesStatsMap.set(t.serie, s);
  }
  const participacaoPorSerie = Array.from(seriesStatsMap.entries()).map(
    ([serie, d]) => ({
      serie,
      total_aptos: d.aptos,
      total_votaram: d.votaram,
      percentual_participacao:
        d.aptos > 0 ? Number(((d.votaram / d.aptos) * 100).toFixed(1)) : 0,
    })
  );

  // Votos por chapa por turma (aplicando k-anonimato se turma tiver menos de 5 votos totais)
  const votosPorTurmaTotal = new Map<string, number>();
  for (const v of votosEleicao) {
    votosPorTurmaTotal.set(v.turma, (votosPorTurmaTotal.get(v.turma) || 0) + 1);
  }

  const votosChapaPorTurma: VotoChapaPorTurmaItem[] = [];
  for (const t of participacaoPorTurma) {
    const totalVotosNaTurma = votosPorTurmaTotal.get(t.turma) || 0;
    const oculto =
      totalVotosNaTurma > 0 && totalVotosNaTurma < LIMITE_MINIMO_K_ANONIMATO;

    for (const c of chapas) {
      const count = votosEleicao.filter(
        (v) => v.turma === t.turma && v.chapa_id === c.id && v.tipo === 'valido'
      ).length;
      votosChapaPorTurma.push({
        chapa_id: c.id,
        chapa_nome: c.nome,
        turma: t.turma,
        serie: t.serie,
        total_votos: oculto ? 0 : count,
        oculto_anonimato: oculto,
      });
    }
  }

  // Perfil demográfico agregado com proteção de k-anonimato (< 5 oculto)
  const buildDemografico = (
    extrator: (v: (typeof votosEleicao)[number]) => string
  ): RecorteDemograficoItem[] => {
    const map = new Map<string, number>();
    for (const v of votosEleicao) {
      const cat = extrator(v) || 'Prefiro não informar';
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    const bruto = Array.from(map.entries()).map(([categoria, total]) => ({
      categoria,
      total,
      percentual:
        votosEleicao.length > 0
          ? Number(((total / votosEleicao.length) * 100).toFixed(1))
          : 0,
    }));
    return aplicarKAnonimato(bruto).map((b) => ({
      ...b,
      percentual: b.oculto_anonimato ? 0 : b.percentual,
    }));
  };

  // Verificação de integridade criptográfica (votos == participações, sem duplicidades de RA)
  const rasParticipacoes = participacoesEleicao.map((p) => p.ra);
  const rasUnicos = new Set(rasParticipacoes);
  const duplicidadesRa = rasParticipacoes.length - rasUnicos.size;
  const integro =
    participacoesEleicao.length === votosEleicao.length && duplicidadesRa === 0;

  const hashResumo = crypto
    .createHash('sha256')
    .update(
      `${eleicaoAtual.id}:${participacoesEleicao.length}:${votosEleicao.length}:${votosBrancos}`
    )
    .digest('hex')
    .substring(0, 16)
    .toUpperCase();

  const integridade: RelatorioIntegridade = {
    eleicao_id: eleicaoAtual.id,
    total_participacoes: participacoesEleicao.length,
    total_votos: votosEleicao.length,
    votos_validos: resultadoCalc.votosValidos,
    votos_brancos: votosBrancos,
    integro,
    duplicidades_ra: duplicidadesRa,
    verificado_em: new Date().toISOString(),
    hash_resumo: `#URB-${hashResumo}`,
  };

  // Histórico de eleições
  const historicoEleicoes = state.eleicoes.map((e) => {
    const votosE = state.votos.filter((v) => v.eleicao_id === e.id);
    const partE = state.participacoes.filter((p) => p.eleicao_id === e.id);
    const chapasE = state.chapas.filter((c) => c.eleicao_id === e.id);
    const brancosE = votosE.filter((v) => v.tipo === 'branco').length;
    const calcE = calcularResultadoEleitoral(
      chapasE.map((c) => ({
        chapa_id: c.id,
        nome: c.nome,
        numero: c.numero,
        total_votos: votosE.filter((v) => v.chapa_id === c.id).length,
      })),
      brancosE,
      e.desempate_chapa_id
    );
    const venc = chapasE.find((c) => c.id === calcE.vencedoraId);
    return {
      eleicao: { ...e, status: calcularStatusEfetivoEleicao(e) },
      totalVotos: votosE.length,
      votosBrancos: brancosE,
      totalParticipacoes: partE.length,
      vencedoraNome: venc ? venc.nome : null,
    };
  });

  const totalParticipacoes = participacoesEleicao.length;
  const percentualParticipacao =
    totalAptos > 0
      ? Number(((totalParticipacoes / totalAptos) * 100).toFixed(1))
      : 0;

  return {
    escola,
    eleicaoAtual,
    historicoEleicoes,
    kpis: {
      totalVotos: resultadoCalc.totalVotos,
      votosValidos: resultadoCalc.votosValidos,
      votosBrancos,
      totalParticipacoes,
      totalAptos,
      faltantes: Math.max(0, totalAptos - totalParticipacoes),
      percentualParticipacao,
      metaParticipacao: escola.metaParticipacao,
      metaAtingida: percentualParticipacao >= escola.metaParticipacao,
      empate: resultadoCalc.empateTecnico,
      lider:
        apuracaoChapas.length > 0 && apuracaoChapas[0].total_votos > 0
          ? apuracaoChapas[0]
          : null,
    },
    apuracaoChapas,
    votosPorHora,
    participacaoPorTurma,
    participacaoPorSerie,
    votosChapaPorTurma,
    perfilDemografico: {
      genero: buildDemografico((v) => v.genero),
      raca: buildDemografico((v) => v.raca),
      faixaEtaria: buildDemografico((v) => v.faixa_etaria),
    },
    chapas,
    integridade,
    auditoriaRecente: state.log_auditoria.slice(0, 60),
    turmasDisponiveis: participacaoPorTurma.map((t) => t.turma),
  };
}

/**
 * Busca paginada no servidor para a aba de Eleitores (mostra apenas se votou e quando).
 */
export async function consultarEleitoresPaginado(params: {
  eleicaoId?: string;
  busca?: string;
  turma?: string;
  statusVoto?: 'todos' | 'votou' | 'pendente';
  pagina?: number;
  porPagina?: number;
}): Promise<{
  itens: Array<{
    ra: string;
    nome: string;
    turma: string;
    serie: string;
    situacao: string;
    data_nascimento: string | null;
    votou: boolean;
    votou_em: string | null;
    protocolo: string | null;
  }>;
  totalFiltrado: number;
  totalPaginas: number;
  paginaAtual: number;
}> {
  const state = getLocalState();
  const eleicaoId = params.eleicaoId || obterEleicaoAtiva().id;
  const todosAlunos = await listarTodosAlunos();
  const ativos = todosAlunos.filter(
    (a) => a.situacao.trim().toLowerCase() === 'ativo'
  );

  const partMap = new Map<string, { created_at: string; protocolo: string }>();
  for (const p of state.participacoes) {
    if (p.eleicao_id === eleicaoId) {
      partMap.set(p.ra, { created_at: p.created_at, protocolo: p.protocolo });
    }
  }

  const buscaLower = (params.busca || '').trim().toLowerCase();
  const turmaFiltro = (params.turma || 'todas').trim();
  const statusFiltro = params.statusVoto || 'todos';

  const filtrados = ativos
    .map((a) => {
      const part = partMap.get(a.ra);
      return {
        ra: a.ra,
        nome: a.nome,
        turma: a.turma,
        serie: extrairSerieDaTurma(a.turma),
        situacao: a.situacao,
        data_nascimento: a.data_nascimento,
        votou: Boolean(part),
        votou_em: part ? part.created_at : null,
        protocolo: part ? part.protocolo : null,
      };
    })
    .filter((item) => {
      if (
        buscaLower &&
        !item.nome.toLowerCase().includes(buscaLower) &&
        !item.ra.toLowerCase().includes(buscaLower)
      ) {
        return false;
      }
      if (
        turmaFiltro &&
        turmaFiltro !== 'todas' &&
        item.turma !== turmaFiltro &&
        item.serie !== turmaFiltro
      ) {
        return false;
      }
      if (statusFiltro === 'votou' && !item.votou) return false;
      if (statusFiltro === 'pendente' && item.votou) return false;
      return true;
    });

  const porPagina = Math.min(Math.max(params.porPagina || 25, 5), 200);
  const totalFiltrado = filtrados.length;
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrado / porPagina));
  const paginaAtual = Math.min(Math.max(params.pagina || 1, 1), totalPaginas);
  const inicio = (paginaAtual - 1) * porPagina;

  return {
    itens: filtrados.slice(inicio, inicio + porPagina),
    totalFiltrado,
    totalPaginas,
    paginaAtual,
  };
}

/**
 * Dados do Portal da Chapa (Frente 3 - somente leitura, respeitando regras de visibilidade).
 */
export interface DadosPortalChapa {
  escola: ConfiguracaoEscola;
  eleicao: EleicaoRow;
  chapa: ChapaCompleta;
  resultadosLiberados: boolean;
  motivoRestricao: string | null;
  participacaoGeral: {
    totalParticipacoes: number;
    totalAptos: number;
    percentualParticipacao: number;
    votosPorHora: VotoPorHoraItem[];
  };
  desempenho?: {
    colocacao: number;
    vencedora: boolean;
    votosChapa: number;
    percentualValidos: number;
    percentualTotal: number;
    comparativoChapas: ApuracaoChapaItem[];
    votosPorSerie: Array<{
      serie: string;
      votosChapa: number;
      totalSerie: number;
      percentual: number;
    }>;
    votosPorSala: Array<{
      turma: string;
      serie: string;
      votosChapa: number;
      totalSala: number;
      percentual: number;
      ocultoAnonimato: boolean;
    }>;
    perfilEleitoresChapa: {
      genero: RecorteDemograficoItem[];
      faixaEtaria: RecorteDemograficoItem[];
    };
    destaquesAnalise: string[];
    certificadoEmitido: CertificadoRow | null;
  };
}

export async function obterDadosPortalChapa(
  chapaId: string
): Promise<DadosPortalChapa | null> {
  const state = getLocalState();
  const chapaRow = state.chapas.find((c) => c.id === chapaId);
  if (!chapaRow) return null;

  const dashboard = await obterDashboardAdminAgregado(chapaRow.eleicao_id);
  const chapa =
    dashboard.chapas.find((c) => c.id === chapaId) ||
    obterChapasCompletasDaEleicao(chapaRow.eleicao_id, false).find(
      (c) => c.id === chapaId
    );
  if (!chapa) return null;

  const eleicao = dashboard.eleicaoAtual;
  const resultadosLiberados =
    (eleicao.status === 'encerrada' || eleicao.status === 'arquivada') &&
    eleicao.resultado_publicado
      ? true
      : eleicao.mostrar_parcial_para_chapas;

  const participacaoGeral = {
    totalParticipacoes: dashboard.kpis.totalParticipacoes,
    totalAptos: dashboard.kpis.totalAptos,
    percentualParticipacao: dashboard.kpis.percentualParticipacao,
    votosPorHora: dashboard.votosPorHora,
  };

  if (!resultadosLiberados) {
    return {
      escola: dashboard.escola,
      eleicao,
      chapa,
      resultadosLiberados: false,
      motivoRestricao:
        eleicao.status === 'aberta' || eleicao.status === 'agendada'
          ? 'A votação está em andamento. Conforme o regimento eleitoral, durante o pleito apenas o índice de participação geral da escola é exibido (a menos que a Comissão Eleitoral habilite a visualização parcial).'
          : 'A votação foi encerrada e aguarda a publicação oficial da ata pela Comissão Eleitoral.',
      participacaoGeral,
    };
  }

  // Calcular estatísticas completas da chapa
  const apuracaoIndex = dashboard.apuracaoChapas.findIndex(
    (a) => a.chapa_id === chapa.id
  );
  const colocacao = apuracaoIndex >= 0 ? apuracaoIndex + 1 : 1;
  const itemChapa = dashboard.apuracaoChapas[apuracaoIndex] || {
    total_votos: 0,
    percentual_validos: 0,
    percentual_total: 0,
  };
  const vencedora = colocacao === 1 && itemChapa.total_votos > 0 && !dashboard.kpis.empate;

  const votosEleicao = state.votos.filter((v) => v.eleicao_id === eleicao.id);
  const votosDaChapa = votosEleicao.filter(
    (v) => v.chapa_id === chapa.id && v.tipo === 'valido'
  );

  // Votos por série
  const seriesUnicas = Array.from(
    new Set(dashboard.participacaoPorTurma.map((t) => t.serie))
  );
  const votosPorSerie = seriesUnicas.map((serie) => {
    const totalSerie = votosEleicao.filter((v) => v.serie === serie).length;
    const votosChapaSerie = votosDaChapa.filter((v) => v.serie === serie).length;
    return {
      serie,
      votosChapa: votosChapaSerie,
      totalSerie,
      percentual:
        totalSerie > 0
          ? Number(((votosChapaSerie / totalSerie) * 100).toFixed(1))
          : 0,
    };
  });

  // Votos por sala (com k-anonimato >= 5)
  const votosPorSala = dashboard.participacaoPorTurma.map((t) => {
    const totalSala = votosEleicao.filter((v) => v.turma === t.turma).length;
    const oculto = totalSala > 0 && totalSala < LIMITE_MINIMO_K_ANONIMATO;
    const votosChapaSala = oculto
      ? 0
      : votosDaChapa.filter((v) => v.turma === t.turma).length;
    return {
      turma: t.turma,
      serie: t.serie,
      votosChapa: votosChapaSala,
      totalSala: oculto ? 0 : totalSala,
      percentual:
        !oculto && totalSala > 0
          ? Number(((votosChapaSala / totalSala) * 100).toFixed(1))
          : 0,
      ocultoAnonimato: oculto,
    };
  });

  // Perfil agregado dos eleitores da chapa (k-anonimato >= 5)
  const buildPerfilChapa = (
    extrator: (v: (typeof votosDaChapa)[number]) => string
  ): RecorteDemograficoItem[] => {
    const map = new Map<string, number>();
    for (const v of votosDaChapa) {
      const k = extrator(v) || 'Prefiro não informar';
      map.set(k, (map.get(k) || 0) + 1);
    }
    const bruto = Array.from(map.entries()).map(([categoria, total]) => ({
      categoria,
      total,
      percentual:
        votosDaChapa.length > 0
          ? Number(((total / votosDaChapa.length) * 100).toFixed(1))
          : 0,
    }));
    return aplicarKAnonimato(bruto).map((b) => ({
      ...b,
      percentual: b.oculto_anonimato ? 0 : b.percentual,
    }));
  };

  // Destaques estratégicos em texto simples para a próxima gestão
  const serieMaisForte = [...votosPorSerie].sort(
    (a, b) => b.percentual - a.percentual
  )[0];
  const serieMenorAdesao = [...votosPorSerie]
    .filter((s) => s.totalSerie > 0)
    .sort((a, b) => a.percentual - b.percentual)[0];

  const destaquesAnalise: string[] = [
    `A ${chapa.nome} conquistou o ${colocacao}º lugar geral com ${itemChapa.total_votos} votos (${itemChapa.percentual_validos}% dos votos válidos).`,
    serieMaisForte && serieMaisForte.votosChapa > 0
      ? `Maior fortaleza eleitoral: ${serieMaisForte.serie}, onde obteve ${serieMaisForte.percentual}% dos votos (${serieMaisForte.votosChapa} de ${serieMaisForte.totalSerie} votos).`
      : 'Participe das reuniões de representantes de sala para consolidar o diálogo com todas as séries da E.E. Urbano.',
    serieMenorAdesao && serieMenorAdesao.serie !== serieMaisForte?.serie
      ? `Oportunidade de aproximação para a gestão: ${serieMenorAdesao.serie} (${serieMenorAdesao.percentual}% de adesão). Recomenda-se promover rodas de conversa e ouvir as demandas específicas dessas turmas nos primeiros 60 dias.`
      : 'Mantenha assembleias estudantis bimestrais para prestação de contas das propostas apresentadas nos eixos de Infraestrutura, Esporte e Cultura.',
    `Comparecimento geral na E.E. Urbano: ${dashboard.kpis.percentualParticipacao}% do colégio eleitoral (${dashboard.kpis.totalParticipacoes} votantes de ${dashboard.kpis.totalAptos} aptos).`,
  ];

  // Verificar ou gerar registro de certificado oficial
  const tipoCert: 'vitoria' | 'participacao' = vencedora ? 'vitoria' : 'participacao';
  let cert =
    state.certificados.find(
      (c) =>
        c.eleicao_id === eleicao.id &&
        c.chapa_id === chapa.id &&
        c.tipo === tipoCert
    ) || null;

  if (!cert) {
    cert = {
      id: crypto.randomUUID(),
      eleicao_id: eleicao.id,
      chapa_id: chapa.id,
      tipo: tipoCert,
      codigo_verificacao: `URB-${new Date().getFullYear()}-${chapa.numero || 'CH'}-${crypto
        .createHash('sha256')
        .update(`${eleicao.id}:${chapa.id}:${tipoCert}`)
        .digest('hex')
        .substring(0, 6)
        .toUpperCase()}`,
      emitido_em: new Date().toISOString(),
      emitido_por: 'Comissão Eleitoral • E.E. Urbano',
    };
    state.certificados.push(cert);
  }

  return {
    escola: dashboard.escola,
    eleicao,
    chapa,
    resultadosLiberados: true,
    motivoRestricao: null,
    participacaoGeral,
    desempenho: {
      colocacao,
      vencedora,
      votosChapa: itemChapa.total_votos,
      percentualValidos: itemChapa.percentual_validos,
      percentualTotal: itemChapa.percentual_total,
      comparativoChapas: dashboard.apuracaoChapas,
      votosPorSerie,
      votosPorSala,
      perfilEleitoresChapa: {
        genero: buildPerfilChapa((v) => v.genero),
        faixaEtaria: buildPerfilChapa((v) => v.faixa_etaria),
      },
      destaquesAnalise,
      certificadoEmitido: cert,
    },
  };
}

/**
 * Busca pública para verificação de autenticidade de certificado (/verificar/[codigo]).
 * Exibe apenas dados públicos não sensíveis.
 */
export function verificarCertificadoPorCodigo(codigo: string): {
  valido: boolean;
  certificado?: CertificadoRow;
  escola?: ConfiguracaoEscola;
  eleicao?: EleicaoRow;
  chapa?: ChapaCompleta;
  votosChapa?: number;
  percentualValidos?: number;
} {
  const state = getLocalState();
  const codLimpo = decodeURIComponent(codigo).trim().toUpperCase();
  const cert = state.certificados.find(
    (c) => c.codigo_verificacao.toUpperCase() === codLimpo
  );
  if (!cert) {
    return { valido: false };
  }

  const escola = obterConfiguracaoEscolaAtual();
  const eleicao = state.eleicoes.find((e) => e.id === cert.eleicao_id);
  const chapas = obterChapasCompletasDaEleicao(cert.eleicao_id, false);
  const chapa = chapas.find((c) => c.id === cert.chapa_id);

  const votosEleicao = state.votos.filter((v) => v.eleicao_id === cert.eleicao_id);
  const votosValidos = votosEleicao.filter((v) => v.tipo === 'valido').length;
  const votosChapa = votosEleicao.filter(
    (v) => v.chapa_id === cert.chapa_id && v.tipo === 'valido'
  ).length;
  const percentualValidos =
    votosValidos > 0 ? Number(((votosChapa / votosValidos) * 100).toFixed(1)) : 0;

  return {
    valido: true,
    certificado: cert,
    escola,
    eleicao,
    chapa,
    votosChapa,
    percentualValidos,
  };
}
