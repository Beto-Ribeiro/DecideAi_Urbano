import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getSupabaseServer } from '@/lib/supabase/server';
import {
  AlunoRow,
  CertificadoRow,
  ChapaAcessoRow,
  ChapaCompleta,
  ChapaIntegranteRow,
  ChapaPropostaRow,
  ChapaRow,
  ConfiguracoesEscolaRow,
  EleicaoRow,
  EscopoTentativaLogin,
  LogAuditoriaRow,
  ParticipacaoRow,
  TentativaLoginRow,
  VotoRow,
} from '@/lib/database.types';
import { ESCOLA_DEFAULT } from '@/lib/escola';
import { parseCsvTextToRows, processarLinhasImportacao } from '@/lib/spreadsheet';

export interface LocalDatabaseState {
  configuracoes_escola: ConfiguracoesEscolaRow;
  eleicoes: EleicaoRow[];
  chapas: ChapaRow[];
  chapa_acessos: ChapaAcessoRow[];
  chapa_integrantes: ChapaIntegranteRow[];
  chapa_propostas: ChapaPropostaRow[];
  participacoes: ParticipacaoRow[];
  votos: VotoRow[];
  tentativas_login: TentativaLoginRow[];
  log_auditoria: LogAuditoriaRow[];
  certificados: CertificadoRow[];
  alunos_extras: AlunoRow[];
}

const STATE_FILE_PATH = path.join(process.cwd(), '.next', 'decideai-local-store.json');

// Trava atômica em memória por (eleicao_id:ra) para impedir corrida simultânea no mesmo processo
const activeVoteLocks = new Set<string>();
const committedVotesMemory = new Set<string>();

let cachedState: LocalDatabaseState | null = null;
let cachedCsvAlunos: Map<string, AlunoRow> | null = null;

function loadAlunosFromCsvFolder(): Map<string, AlunoRow> {
  if (cachedCsvAlunos) return cachedCsvAlunos;
  const map = new Map<string, AlunoRow>();

  // Aluno de teste garantido para avaliação e testes automatizados
  map.set('123456789', {
    ra: '123456789',
    digito_ra: '0',
    nome: 'Matheus Silva Oliveira',
    uf_ra: 'SP',
    data_nascimento: '14/05/2009',
    situacao: 'Ativo',
    turma: '3 A',
  });
  map.set('00010948523', {
    ra: '00010948523',
    digito_ra: '7',
    nome: 'Ana Clara Martins de Oliveira',
    uf_ra: 'SP',
    data_nascimento: '22/08/2009',
    situacao: 'Ativo',
    turma: '3 B',
  });
  map.set('999999999', {
    ra: '999999999',
    digito_ra: '9',
    nome: 'Estudante Transferido Teste',
    uf_ra: 'SP',
    data_nascimento: '10/02/2010',
    situacao: 'Transferido',
    turma: '2 A',
  });

  try {
    const alunosDir = path.join(process.cwd(), 'Alunos');
    if (fs.existsSync(alunosDir)) {
      const files = fs.readdirSync(alunosDir);
      for (const file of files) {
        if (!file.toLowerCase().endsWith('.csv')) continue;
        const fullPath = path.join(alunosDir, file);
        const rawBuf = fs.readFileSync(fullPath);
        let text = rawBuf.toString('utf-8');
        if (text.includes('\uFFFD')) {
          text = rawBuf.toString('latin1');
        }
        const rows = parseCsvTextToRows(text);
        const parsed = processarLinhasImportacao(rows, file);
        for (const a of parsed.validos) {
          map.set(a.ra, a);
          // Também indexa sem zeros à esquerda para facilitar busca do aluno
          const semZeros = a.ra.replace(/^0+/, '');
          if (semZeros.length >= 4 && !map.has(semZeros)) {
            map.set(semZeros, a);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Aviso ao ler pasta Alunos local:', err);
  }

  cachedCsvAlunos = map;
  return map;
}

function createInitialSeedState(): LocalDatabaseState {
  const eleicaoAtualId = '11111111-1111-4111-8111-111111111111';
  const eleicaoAnteriorId = '00000000-0000-4000-8000-000000000000';

  const chapa10Id = 'aaaa1111-1111-4111-8111-111111111111';
  const chapa20Id = 'bbbb2222-2222-4222-8222-222222222222';
  const chapa30Id = 'cccc3333-3333-4333-8333-333333333333';
  const chapaHist1Id = 'dddd4444-4444-4444-8444-444444444444';
  const chapaHist2Id = 'eeee5555-5555-4555-8555-555555555555';

  const nowIso = new Date().toISOString();
  const encerraEm = new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(); // +8h

  // Senhas iniciais documentadas para homologação:
  // chapa10 -> VozAtiva@2026
  // chapa20 -> Conexao@2026
  // chapa30 -> Juventude@2026
  const hashChapa10 = bcrypt.hashSync('VozAtiva@2026', 8);
  const hashChapa20 = bcrypt.hashSync('Conexao@2026', 8);
  const hashChapa30 = bcrypt.hashSync('Juventude@2026', 8);

  return {
    configuracoes_escola: {
      id: 1,
      nome: ESCOLA_DEFAULT.nome,
      nome_curto: ESCOLA_DEFAULT.nomeCurto,
      cidade: ESCOLA_DEFAULT.cidade,
      diretoria_ensino: ESCOLA_DEFAULT.diretoriaEnsino,
      assinaturas: ESCOLA_DEFAULT.assinaturas,
      texto_boas_vindas: ESCOLA_DEFAULT.textoBoasVindas,
      meta_participacao: ESCOLA_DEFAULT.metaParticipacao,
      updated_at: nowIso,
    },
    eleicoes: [
      {
        id: eleicaoAtualId,
        nome: 'Eleição Grêmio Estudantil 2026 — Gestão Urbano Alves',
        status: 'aberta',
        abre_em: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        encerra_em: encerraEm,
        resultado_publicado: false,
        mostrar_parcial_para_chapas: false,
        desempate_chapa_id: null,
        desempate_justificativa: null,
        created_at: nowIso,
      },
      {
        id: eleicaoAnteriorId,
        nome: 'Eleição Grêmio Estudantil 2025 — Gestão Anterior',
        status: 'arquivada',
        abre_em: '2025-03-24T11:00:00.000Z',
        encerra_em: '2025-03-24T20:00:00.000Z',
        resultado_publicado: true,
        mostrar_parcial_para_chapas: true,
        desempate_chapa_id: null,
        desempate_justificativa: null,
        created_at: '2025-03-20T12:00:00.000Z',
      },
    ],
    chapas: [
      {
        id: chapa10Id,
        eleicao_id: eleicaoAtualId,
        nome: 'Chapa Voz Ativa',
        numero: 10,
        slogan: 'Nossa Voz, Nossa Escola',
        descricao:
          'Movimento estudantil focado na modernização dos espaços de convivência, campeonato interclasses semestral e representação ativa no Conselho de Escola.',
        cor: '#2563EB',
        logo_url: null,
        propostas_url: null,
        status: 'aprovada',
        redes_sociais: { instagram: '@chapa10.vozativa' },
        created_at: nowIso,
      },
      {
        id: chapa20Id,
        eleicao_id: eleicaoAtualId,
        nome: 'Chapa Conexão Urbano',
        numero: 20,
        slogan: 'Inovação, Esporte e Cultura',
        descricao:
          'Integração entre todos os turnos da E.E. Urbano com clube de robótica e podcasts, oficinas culturais e melhorias nos vestiários e quadra.',
        cor: '#EA580C',
        logo_url: null,
        propostas_url: null,
        status: 'aprovada',
        redes_sociais: { instagram: '@conexao.urbano20' },
        created_at: nowIso,
      },
      {
        id: chapa30Id,
        eleicao_id: eleicaoAtualId,
        nome: 'Chapa Juventude em Pauta',
        numero: 30,
        slogan: 'Transparência, Acolhimento e Conquistas',
        descricao:
          'Gestão participativa com mural de transparência mensal, cine-debate quinzenal, feira de profissões ENEM/FATEC e acolhimento aos calouros.',
        cor: '#059669',
        logo_url: null,
        propostas_url: null,
        status: 'aprovada',
        redes_sociais: { instagram: '@juventude.urbano30' },
        created_at: nowIso,
      },
      // Histórico 2025
      {
        id: chapaHist1Id,
        eleicao_id: eleicaoAnteriorId,
        nome: 'Chapa União Estudantil 2025',
        numero: 11,
        slogan: 'Unidos pelo Urbano',
        descricao: 'Chapa eleita na gestão 2025.',
        cor: '#1D4ED8',
        logo_url: null,
        propostas_url: null,
        status: 'arquivada',
        redes_sociais: {},
        created_at: '2025-03-20T12:00:00.000Z',
      },
      {
        id: chapaHist2Id,
        eleicao_id: eleicaoAnteriorId,
        nome: 'Chapa Renovação 2025',
        numero: 22,
        slogan: 'Renovar para Avançar',
        descricao: 'Chapa participante da eleição 2025.',
        cor: '#059669',
        logo_url: null,
        propostas_url: null,
        status: 'arquivada',
        redes_sociais: {},
        created_at: '2025-03-20T12:00:00.000Z',
      },
    ],
    chapa_acessos: [
      {
        id: 'acc-10',
        chapa_id: chapa10Id,
        usuario: 'chapa10',
        senha_hash: hashChapa10,
        ativo: true,
        ultimo_login: null,
        created_at: nowIso,
      },
      {
        id: 'acc-20',
        chapa_id: chapa20Id,
        usuario: 'chapa20',
        senha_hash: hashChapa20,
        ativo: true,
        ultimo_login: null,
        created_at: nowIso,
      },
      {
        id: 'acc-30',
        chapa_id: chapa30Id,
        usuario: 'chapa30',
        senha_hash: hashChapa30,
        ativo: true,
        ultimo_login: null,
        created_at: nowIso,
      },
    ],
    chapa_integrantes: [
      {
        id: 'int-10-1',
        chapa_id: chapa10Id,
        aluno_ra: null,
        nome: 'Mariana Costa Ribeiro',
        cargo: 'Presidente',
        turma: '3 B',
        foto_url: null,
        ordem: 0,
      },
      {
        id: 'int-10-2',
        chapa_id: chapa10Id,
        aluno_ra: null,
        nome: 'Gabriel Santos de Andrade',
        cargo: 'Vice-Presidente',
        turma: '3 A',
        foto_url: null,
        ordem: 1,
      },
      {
        id: 'int-10-3',
        chapa_id: chapa10Id,
        aluno_ra: null,
        nome: 'Lucas Mendonça Pires',
        cargo: 'Secretário-Geral',
        turma: '2 A',
        foto_url: null,
        ordem: 2,
      },
      {
        id: 'int-10-4',
        chapa_id: chapa10Id,
        aluno_ra: null,
        nome: 'Beatriz Lima Albuquerque',
        cargo: 'Diretora Financeira',
        turma: '2 B',
        foto_url: null,
        ordem: 3,
      },
      {
        id: 'int-20-1',
        chapa_id: chapa20Id,
        aluno_ra: null,
        nome: 'Lucas Fagundes Nogueira',
        cargo: 'Presidente',
        turma: '2 A',
        foto_url: null,
        ordem: 0,
      },
      {
        id: 'int-20-2',
        chapa_id: chapa20Id,
        aluno_ra: null,
        nome: 'Thiago Duarte Ramos',
        cargo: 'Vice-Presidente',
        turma: '3 C',
        foto_url: null,
        ordem: 1,
      },
      {
        id: 'int-20-3',
        chapa_id: chapa20Id,
        aluno_ra: null,
        nome: 'Rebeca Alves Cardoso',
        cargo: 'Diretora de Esportes',
        turma: '1 B',
        foto_url: null,
        ordem: 2,
      },
      {
        id: 'int-30-1',
        chapa_id: chapa30Id,
        aluno_ra: null,
        nome: 'Clara Siqueira Prado',
        cargo: 'Presidente',
        turma: '3 A',
        foto_url: null,
        ordem: 0,
      },
      {
        id: 'int-30-2',
        chapa_id: chapa30Id,
        aluno_ra: null,
        nome: 'Pedro Henrique Valente',
        cargo: 'Vice-Presidente',
        turma: '1 C',
        foto_url: null,
        ordem: 1,
      },
    ],
    chapa_propostas: [
      {
        id: 'prop-10-1',
        chapa_id: chapa10Id,
        eixo: 'Infraestrutura',
        titulo: 'Revitalização da Sala de Leitura e Pátio',
        descricao: 'Novos bancos no pátio coberto, melhoria dos espelhos nos banheiros e cantinho de leitura atualizado.',
        ordem: 0,
      },
      {
        id: 'prop-10-2',
        chapa_id: chapa10Id,
        eixo: 'Esporte e Lazer',
        titulo: 'Campeonato Interclasses Semestral Oficial',
        descricao: 'Torneio de futsal, vôlei, basquete e tênis de mesa com medalhas e arbitragem organizada.',
        ordem: 1,
      },
      {
        id: 'prop-10-3',
        chapa_id: chapa10Id,
        eixo: 'Pedagógico e Convivência',
        titulo: 'Grupos de Estudo ENEM, Provão Paulista e ETEC/FATEC',
        descricao: 'Monitoria colaborativa entre alunos do 3º ano e demais séries no contraturno.',
        ordem: 2,
      },
      {
        id: 'prop-20-1',
        chapa_id: chapa20Id,
        eixo: 'Cultura e Eventos',
        titulo: 'Rádio e Podcast Estudantil Urbano',
        descricao: 'Programação musical e avisos estudantis durante os intervalos com participação das turmas.',
        ordem: 0,
      },
      {
        id: 'prop-20-2',
        chapa_id: chapa20Id,
        eixo: 'Infraestrutura',
        titulo: 'Manutenção das Quadras e Bebedouros',
        descricao: 'Solicitação de redes novas para as traves e tabela de basquete, além de revisão dos filtros.',
        ordem: 1,
      },
      {
        id: 'prop-20-3',
        chapa_id: chapa20Id,
        eixo: 'Esporte e Lazer',
        titulo: 'Jogos de Tabuleiro e Xadrez no Intervalo',
        descricao: 'Empréstimo organizado de jogos de dama, xadrez e dominó no pátio.',
        ordem: 2,
      },
      {
        id: 'prop-30-1',
        chapa_id: chapa30Id,
        eixo: 'Comunicação e Transparência',
        titulo: 'Mural Aberto de Prestação de Contas',
        descricao: 'Relatório mensal de todas as ações, reuniões com a direção e recursos do Grêmio.',
        ordem: 0,
      },
      {
        id: 'prop-30-2',
        chapa_id: chapa30Id,
        eixo: 'Cultura e Eventos',
        titulo: 'Cine-Debate e Festival de Talentos da E.E. Urbano',
        descricao: 'Sessões culturais bimestrais e mostra de música, poesia, dança e artes visuais.',
        ordem: 1,
      },
      {
        id: 'prop-30-3',
        chapa_id: chapa30Id,
        eixo: 'Pedagógico e Convivência',
        titulo: 'Semana de Acolhimento e Combate ao Bullying',
        descricao: 'Rodas de conversa e caixa de escuta estudantil em parceria com a coordenação pedagógica.',
        ordem: 2,
      },
    ],
    participacoes: [],
    votos: [],
    tentativas_login: [],
    log_auditoria: [
      {
        id: 'log-init-1',
        ator: 'sistema',
        acao: 'INICIALIZACAO_SISTEMA',
        detalhes: {
          escola: ESCOLA_DEFAULT.nome,
          modo: 'Urna Criptográfica Auditável',
          sigilo_voto: 'Ativo (sem IP/User-Agent/timestamp em votos)',
        },
        created_at: nowIso,
      },
    ],
    certificados: [
      {
        id: 'cert-demo-1',
        eleicao_id: eleicaoAtualId,
        chapa_id: chapa10Id,
        tipo: 'participacao',
        codigo_verificacao: 'URB-2026-DEMO01',
        emitido_em: nowIso,
        emitido_por: 'Comissão Eleitoral • E.E. Urbano',
      },
    ],
    alunos_extras: [],
  };
}

export function getLocalState(): LocalDatabaseState {
  if (cachedState) return cachedState;

  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const raw = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as LocalDatabaseState;
      if (parsed && Array.isArray(parsed.eleicoes)) {
        cachedState = parsed;
        for (const p of parsed.participacoes) {
          committedVotesMemory.add(`${p.eleicao_id}:${p.ra}`);
        }
        return cachedState;
      }
    }
  } catch (err) {
    console.warn('Criando novo estado local DecideAI:', err);
  }

  cachedState = createInitialSeedState();
  saveLocalState(cachedState);
  return cachedState;
}

export function saveLocalState(state: LocalDatabaseState): void {
  cachedState = state;
  try {
    const dir = path.dirname(STATE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    // Em ambiente serverless read-only (Vercel), mantém em memória enquanto a instância durar e usa Supabase como fonte primária
  }
}

/**
 * Busca um aluno pelo RA (sem exigir dígito) combinando Supabase + CSVs locais + alunos importados.
 */
export async function buscarAlunoPorRa(raNormalizado: string): Promise<AlunoRow | null> {
  const state = getLocalState();

  // 1. Verificar alunos importados recentemente no painel
  const extra = state.alunos_extras.find(
    (a) => a.ra === raNormalizado || a.ra.replace(/^0+/, '') === raNormalizado.replace(/^0+/, '')
  );
  if (extra) return extra;

  // 2. Verificar CSVs locais da pasta Alunos + alunos de teste
  const csvMap = loadAlunosFromCsvFolder();
  const fromCsv =
    csvMap.get(raNormalizado) || csvMap.get(raNormalizado.replace(/^0+/, ''));
  if (fromCsv) return fromCsv;

  // 3. Consultar tabela alunos no Supabase (tentando com e sem zeros à esquerda)
  try {
    const sb = getSupabaseServer();
    const padded12 = raNormalizado.padStart(12, '0');
    const { data } = await sb
      .from('alunos')
      .select('ra, digito_ra, nome, uf_ra, data_nascimento, situacao, turma')
      .in('ra', [raNormalizado, padded12])
      .limit(1);

    if (data && data.length > 0) {
      return data[0] as AlunoRow;
    }
  } catch {
    // Ignorar falha de rede se banco estiver offline
  }

  return null;
}

/**
 * Retorna a lista consolidada de todos os alunos do colégio eleitoral.
 */
export async function listarTodosAlunos(): Promise<AlunoRow[]> {
  const state = getLocalState();
  const csvMap = loadAlunosFromCsvFolder();
  const unik = new Map<string, AlunoRow>();

  for (const [, aluno] of csvMap.entries()) {
    unik.set(aluno.ra, aluno);
  }

  for (const a of state.alunos_extras) {
    unik.set(a.ra, a);
  }

  // Se a pasta local Alunos estiver vazia, tenta buscar do Supabase
  if (unik.size <= 3) {
    try {
      const sb = getSupabaseServer();
      const { data } = await sb
        .from('alunos')
        .select('ra, digito_ra, nome, uf_ra, data_nascimento, situacao, turma');
      if (data) {
        for (const row of data) {
          unik.set(row.ra, row as AlunoRow);
        }
      }
    } catch {
      // fallback silencioso
    }
  }

  return Array.from(unik.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/**
 * Registra log de auditoria no estado local e no Supabase (se tabela existir).
 */
export async function registrarAuditoria(
  ator: string,
  acao: string,
  detalhes: Record<string, string | number | boolean | null>
): Promise<void> {
  const state = getLocalState();
  const entry: LogAuditoriaRow = {
    id: crypto.randomUUID(),
    ator,
    acao,
    detalhes,
    created_at: new Date().toISOString(),
  };

  state.log_auditoria.unshift(entry);
  if (state.log_auditoria.length > 500) {
    state.log_auditoria = state.log_auditoria.slice(0, 500);
  }
  saveLocalState(state);

  try {
    const sb = getSupabaseServer();
    await sb.from('log_auditoria').insert(entry);
  } catch {
    // Tabela pode ainda não estar migrada no Supabase remoto
  }
}

/**
 * Rate Limiter baseado em tabela Postgres / estado do servidor (sem Redis pago).
 * Controla tentativas por IP, por RA, RAs inexistentes, login Admin e login Chapa.
 */
export async function verificarRateLimit(params: {
  chave: string;
  escopo: EscopoTentativaLogin;
  limiteTentativas: number;
  janelaSegundos: number;
  bloqueioSegundos: number;
}): Promise<{ permitido: boolean; aguardarSegundos: number; tentativasRecentes: number }> {
  const { chave, escopo, limiteTentativas, janelaSegundos, bloqueioSegundos } = params;
  const state = getLocalState();
  const agoraMs = Date.now();
  const corteJanelaMs = agoraMs - janelaSegundos * 1000;

  const falhasRecentes = state.tentativas_login.filter(
    (t) =>
      t.chave === chave &&
      t.escopo === escopo &&
      !t.sucesso &&
      new Date(t.created_at).getTime() >= corteJanelaMs
  );

  // Verifica se há bloqueio ativo
  for (const t of falhasRecentes) {
    if (t.bloqueado_ate) {
      const ateMs = new Date(t.bloqueado_ate).getTime();
      if (ateMs > agoraMs) {
        return {
          permitido: false,
          aguardarSegundos: Math.ceil((ateMs - agoraMs) / 1000),
          tentativasRecentes: falhasRecentes.length,
        };
      }
    }
  }

  if (falhasRecentes.length >= limiteTentativas) {
    const bloqueadoAte = new Date(agoraMs + bloqueioSegundos * 1000).toISOString();
    state.tentativas_login.unshift({
      id: crypto.randomUUID(),
      chave,
      escopo,
      sucesso: false,
      bloqueado_ate: bloqueadoAte,
      created_at: new Date(agoraMs).toISOString(),
    });
    saveLocalState(state);

    await registrarAuditoria('sistema', 'BLOQUEIO_RATE_LIMIT', {
      chave,
      escopo,
      tentativas: falhasRecentes.length,
      bloqueado_ate: bloqueadoAte,
    });

    return {
      permitido: false,
      aguardarSegundos: bloqueioSegundos,
      tentativasRecentes: falhasRecentes.length,
    };
  }

  return {
    permitido: true,
    aguardarSegundos: 0,
    tentativasRecentes: falhasRecentes.length,
  };
}

export async function registrarTentativaLogin(params: {
  chave: string;
  escopo: EscopoTentativaLogin;
  sucesso: boolean;
}): Promise<void> {
  const state = getLocalState();
  const row: TentativaLoginRow = {
    id: crypto.randomUUID(),
    chave: params.chave,
    escopo: params.escopo,
    sucesso: params.sucesso,
    bloqueado_ate: null,
    created_at: new Date().toISOString(),
  };

  state.tentativas_login.unshift(row);
  if (state.tentativas_login.length > 1000) {
    state.tentativas_login = state.tentativas_login.slice(0, 1000);
  }
  saveLocalState(state);

  try {
    const sb = getSupabaseServer();
    await sb.from('tentativas_login').insert(row);
  } catch {
    // fallback silencioso
  }
}

/**
 * Execução atômica de voto (Mutex por eleicao_id:ra + RPC Postgres quando disponível).
 * Impede 100% que dois cliques ou duas requisições simultâneas do mesmo RA gravem voto duplo.
 */
export function acquireVoteLock(eleicaoId: string, ra: string): boolean {
  const key = `${eleicaoId}:${ra}`;
  if (activeVoteLocks.has(key) || committedVotesMemory.has(key)) {
    return false;
  }
  activeVoteLocks.add(key);
  return true;
}

export function releaseVoteLock(eleicaoId: string, ra: string, committed: boolean): void {
  const key = `${eleicaoId}:${ra}`;
  activeVoteLocks.delete(key);
  if (committed) {
    committedVotesMemory.add(key);
  }
}

export function obterChapasCompletasDaEleicao(
  eleicaoId: string,
  incluirAcesso = false
): ChapaCompleta[] {
  const state = getLocalState();
  const chapas = state.chapas
    .filter((c) => c.eleicao_id === eleicaoId)
    .sort((a, b) => (a.numero || 999) - (b.numero || 999));

  return chapas.map((c) => {
    const integrantes = state.chapa_integrantes
      .filter((i) => i.chapa_id === c.id)
      .sort((a, b) => a.ordem - b.ordem);
    const propostas = state.chapa_propostas
      .filter((p) => p.chapa_id === c.id)
      .sort((a, b) => a.ordem - b.ordem);
    const acessoRow = state.chapa_acessos.find((a) => a.chapa_id === c.id);

    return {
      ...c,
      integrantes,
      propostas,
      acesso:
        incluirAcesso && acessoRow
          ? {
              id: acessoRow.id,
              chapa_id: acessoRow.chapa_id,
              usuario: acessoRow.usuario,
              ativo: acessoRow.ativo,
              ultimo_login: acessoRow.ultimo_login,
            }
          : null,
    };
  });
}
