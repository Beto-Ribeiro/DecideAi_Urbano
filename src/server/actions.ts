'use server';

import crypto from 'crypto';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  clearAdminSessionCookie,
  clearChapaSessionCookie,
  getAdminSession,
  getChapaSession,
  hashPassword,
  requireAdminSession,
  setAdminSessionCookie,
  setChapaSessionCookie,
  verifyAdminCredentials,
  verifyPassword,
} from '@/lib/auth';
import {
  AlunoRow,
  CertificadoRow,
  ChapaAcessoRow,
  StatusChapa,
  StatusEleicao,
} from '@/lib/database.types';
import {
  AdminLoginSchema,
  calcularFaixaEtaria,
  calcularStatusEfetivoEleicao,
  ChapaLoginSchema,
  ConfiguracaoEscolaSchema,
  ConfigurarEleicaoSchema,
  extrairSerieDaTurma,
  LoginEleitorSchema,
  normalizarRa,
  RegistrarVotoSchema,
  SalvarChapaSchema,
} from '@/lib/validations';
import { getSupabaseServer } from '@/lib/supabase/server';
import {
  acquireVoteLock,
  buscarAlunoPorRa,
  getLocalState,
  registrarAuditoria,
  registrarTentativaLogin,
  releaseVoteLock,
  saveLocalState,
  verificarRateLimit,
} from './store';
import {
  consultarEleitoresPaginado,
  obterDadosPortalChapa,
  obterDadosPublicosUrna,
  obterDashboardAdminAgregado,
  obterEleicaoAtiva,
} from './queries';

async function obterIpRequisicao(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return h.get('x-real-ip') || '127.0.0.1';
  } catch {
    return '127.0.0.1';
  }
}

// ============================================================================
// FRENTE 1: AÇÕES DO ELEITOR (SEM SENHA, APENAS RA + PROTEÇÕES DE INTEGRIDADE)
// ============================================================================

export async function loginEleitorPorRa(raInput: string): Promise<{
  success?: boolean;
  error?: string;
  code?:
    | 'RATE_LIMIT'
    | 'RA_INEXISTENTE'
    | 'ALUNO_INATIVO'
    | 'JA_VOTOU'
    | 'ELEICAO_FECHADA'
    | 'ELEICAO_AGENDADA'
    | 'ELEICAO_ENCERRADA'
    | 'VALIDACAO';
  aguardarSegundos?: number;
  votouEm?: string;
  protocolo?: string;
  aluno?: {
    ra: string;
    nome: string;
    turma: string;
    serie: string;
    dataNascimento: string | null;
    faixaEtaria: string;
  };
}> {
  const parsed = LoginEleitorSchema.safeParse({ ra: raInput });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || 'Digite um RA válido.',
      code: 'VALIDACAO',
    };
  }

  const ra = parsed.data.ra;
  const ip = await obterIpRequisicao();

  // 1. Verificar bloqueio por excesso de consultas de RAs inexistentes no mesmo IP
  const limitRaInexistente = await verificarRateLimit({
    chave: `inexistente:${ip}`,
    escopo: 'ra_inexistente_ip',
    limiteTentativas: 6,
    janelaSegundos: 300,
    bloqueioSegundos: 120,
  });

  if (!limitRaInexistente.permitido) {
    return {
      error: `Muitas tentativas com RAs não localizados a partir deste terminal. Aguarde ${limitRaInexistente.aguardarSegundos} segundos ou chame o mesário.`,
      code: 'RATE_LIMIT',
      aguardarSegundos: limitRaInexistente.aguardarSegundos,
    };
  }

  // 2. Verificar limite de tentativas por RA específico
  const limitPorRa = await verificarRateLimit({
    chave: `ra:${ra}`,
    escopo: 'eleitor_ra',
    limiteTentativas: 10,
    janelaSegundos: 300,
    bloqueioSegundos: 60,
  });

  if (!limitPorRa.permitido) {
    return {
      error: `Muitas tentativas seguidas para este RA. Aguarde ${limitPorRa.aguardarSegundos}s.`,
      code: 'RATE_LIMIT',
      aguardarSegundos: limitPorRa.aguardarSegundos,
    };
  }

  // 3. Verificar estado da eleição em tempo real
  const eleicao = obterEleicaoAtiva();
  const statusEfetivo = calcularStatusEfetivoEleicao(eleicao);

  if (statusEfetivo === 'agendada') {
    return {
      error: 'A votação ainda não foi iniciada. Aguarde o horário oficial de abertura.',
      code: 'ELEICAO_AGENDADA',
    };
  }
  if (statusEfetivo === 'encerrada' || statusEfetivo === 'arquivada') {
    return {
      error: 'As urnas já foram encerradas para esta eleição.',
      code: 'ELEICAO_ENCERRADA',
    };
  }
  if (statusEfetivo === 'rascunho') {
    return {
      error: 'A eleição está em fase de preparação pela Comissão Eleitoral.',
      code: 'ELEICAO_FECHADA',
    };
  }

  // 4. Buscar aluno apenas pelo RA (sem exigir dígito)
  const aluno = await buscarAlunoPorRa(ra);
  if (!aluno) {
    await registrarTentativaLogin({
      chave: `inexistente:${ip}`,
      escopo: 'ra_inexistente_ip',
      sucesso: false,
    });
    await registrarAuditoria('urna', 'TENTATIVA_RA_INEXISTENTE', {
      ra_informado: ra.substring(0, 14),
    });
    return {
      error:
        'Não localizamos esse RA no cadastro da E.E. Urbano. Confira os números da sua carteirinha ou procure a mesa eleitoral.',
      code: 'RA_INEXISTENTE',
    };
  }

  // 5. Verificar se matrícula está ativa
  if (aluno.situacao.trim().toLowerCase() !== 'ativo') {
    await registrarAuditoria('urna', 'TENTATIVA_ALUNO_INATIVO', {
      ra: aluno.ra,
      situacao: aluno.situacao,
    });
    return {
      error: `Sua matrícula consta como "${aluno.situacao}" no censo escolar. Procure a secretaria ou a comissão eleitoral para regularização.`,
      code: 'ALUNO_INATIVO',
    };
  }

  // 6. Verificar se já votou nesta eleição
  const state = getLocalState();
  const participacaoExistente = state.participacoes.find(
    (p) => p.eleicao_id === eleicao.id && p.ra === aluno.ra
  );

  if (participacaoExistente) {
    await registrarTentativaLogin({
      chave: `ra:${aluno.ra}`,
      escopo: 'eleitor_ra',
      sucesso: false,
    });
    return {
      error: 'Este RA já registrou voto nesta eleição. Cada estudante tem direito a um único voto secreto.',
      code: 'JA_VOTOU',
      votouEm: participacaoExistente.created_at,
      protocolo: participacaoExistente.protocolo,
    };
  }

  await registrarTentativaLogin({
    chave: `ra:${aluno.ra}`,
    escopo: 'eleitor_ra',
    sucesso: true,
  });

  return {
    success: true,
    aluno: {
      ra: aluno.ra,
      nome: aluno.nome,
      turma: aluno.turma,
      serie: extrairSerieDaTurma(aluno.turma),
      dataNascimento: aluno.data_nascimento,
      faixaEtaria: calcularFaixaEtaria(aluno.data_nascimento),
    },
  };
}

export async function registrarBotaoNaoSouEuAction(ra: string): Promise<{ ok: boolean }> {
  const raLimpo = normalizarRa(ra);
  await registrarAuditoria('urna', 'BOTAO_NAO_SOU_EU_ACIONADO', {
    ra_rejeitado_pelo_eleitor: raLimpo,
  });
  return { ok: true };
}

/**
 * Gravação atômica do voto:
 * - Valida elegibilidade, janela de tempo da eleição e opção (chapa aprovada ou branco, sem nulo).
 * - Usa trava atômica por (eleicao_id, ra) + RPC Postgres registrar_voto quando disponível.
 * - NÃO grava IP, User-Agent, RA nem timestamp na tabela de votos.
 */
export async function registrarVotoEleitorAction(input: {
  ra: string;
  chapaId?: string | null;
  votoBranco?: boolean;
  raca: string;
  genero: string;
}): Promise<{
  success?: boolean;
  error?: string;
  code?: string;
  protocolo?: string;
  registradoEm?: string;
}> {
  const parsed = RegistrarVotoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || 'Dados de votação inválidos.',
      code: 'VALIDACAO',
    };
  }

  const { ra, chapaId, votoBranco, raca, genero } = parsed.data;
  const eleicao = obterEleicaoAtiva();
  const statusEfetivo = calcularStatusEfetivoEleicao(eleicao);

  if (statusEfetivo !== 'aberta') {
    return {
      error: 'A eleição não está aberta para recebimento de votos neste momento.',
      code: 'ELEICAO_FECHADA',
    };
  }

  const aluno = await buscarAlunoPorRa(ra);
  if (!aluno || aluno.situacao.trim().toLowerCase() !== 'ativo') {
    return {
      error: 'Estudante não encontrado ou matrícula inativa.',
      code: 'ALUNO_INVALIDO',
    };
  }

  // Trava atômica imediata por (eleicao.id, aluno.ra) contra requisições simultâneas
  if (!acquireVoteLock(eleicao.id, aluno.ra)) {
    return {
      error: 'Este RA já registrou voto nesta eleição (duplicidade bloqueada).',
      code: 'JA_VOTOU',
    };
  }

  let committed = false;
  try {
    const state = getLocalState();

    // Dupla verificação dentro da região crítica
    const jaVotou = state.participacoes.some(
      (p) => p.eleicao_id === eleicao.id && p.ra === aluno.ra
    );
    if (jaVotou) {
      committed = true;
      return {
        error: 'Este RA já registrou voto nesta eleição.',
        code: 'JA_VOTOU',
      };
    }

    // Validar chapa se voto for válido
    let chapaEscolhidaId: string | null = null;
    if (!votoBranco) {
      const chapaValida = state.chapas.find(
        (c) =>
          c.id === chapaId &&
          c.eleicao_id === eleicao.id &&
          c.status === 'aprovada'
      );
      if (!chapaValida) {
        return {
          error: 'A chapa selecionada não é válida ou não está homologada.',
          code: 'CHAPA_INVALIDA',
        };
      }
      chapaEscolhidaId = chapaValida.id;
    }

    const registradoEm = new Date().toISOString();
    const ano = new Date().getFullYear();
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const protocolo = `URB-${ano}-${randomHex}`;
    const serie = extrairSerieDaTurma(aluno.turma);
    const faixaEtaria = calcularFaixaEtaria(aluno.data_nascimento);

    // Tenta executar a RPC atômica no Supabase se disponível
    try {
      const sb = getSupabaseServer();
      const { data: rpcData, error: rpcErr } = await sb.rpc('registrar_voto', {
        p_ra: aluno.ra,
        p_chapa_id: chapaEscolhidaId,
        p_voto_branco: Boolean(votoBranco),
        p_raca: raca,
        p_genero: genero,
        p_faixa_etaria: faixaEtaria,
      });

      if (!rpcErr && rpcData && typeof rpcData === 'object' && 'error' in rpcData) {
        const rpcObj = rpcData as { error?: string; code?: string };
        if (rpcObj.code === 'JA_VOTOU') {
          committed = true;
          return { error: rpcObj.error || 'Este RA já votou.', code: 'JA_VOTOU' };
        }
      }
    } catch {
      // Continua com gravação atômica local sincronizada
    }

    // Grava participação e voto anônimo na mesma transação lógica
    state.participacoes.push({
      eleicao_id: eleicao.id,
      ra: aluno.ra,
      nome: aluno.nome,
      turma: aluno.turma,
      protocolo,
      created_at: registradoEm,
    });

    // Voto 100% anônimo: sem RA, sem IP, sem User-Agent, sem created_at
    state.votos.push({
      id: crypto.randomUUID(),
      eleicao_id: eleicao.id,
      chapa_id: chapaEscolhidaId,
      tipo: votoBranco ? 'branco' : 'valido',
      turma: aluno.turma,
      serie,
      raca,
      genero,
      faixa_etaria: faixaEtaria,
    });

    saveLocalState(state);
    committed = true;

    revalidatePath('/');
    revalidatePath('/urna');
    revalidatePath('/admin');
    revalidatePath('/chapa');
    revalidatePath('/resultados');

    return {
      success: true,
      protocolo,
      registradoEm,
    };
  } finally {
    releaseVoteLock(eleicao.id, aluno.ra, committed);
  }
}

// ============================================================================
// FRENTE 2: AÇÕES ADMINISTRATIVAS (TODAS PROTEGIDAS POR SESSÃO JWT ASSINADA)
// ============================================================================

export async function loginAdminAction(password: string): Promise<{
  success?: boolean;
  error?: string;
}> {
  const parsed = AdminLoginSchema.safeParse({ password });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Senha inválida.' };
  }

  const ip = await obterIpRequisicao();
  const limit = await verificarRateLimit({
    chave: `admin:${ip}`,
    escopo: 'admin',
    limiteTentativas: 5,
    janelaSegundos: 600,
    bloqueioSegundos: 180,
  });

  if (!limit.permitido) {
    return {
      error: `Muitas tentativas incorretas. Acesso bloqueado por ${limit.aguardarSegundos} segundos.`,
    };
  }

  const ok = await verifyAdminCredentials(parsed.data.password);
  if (!ok) {
    await registrarTentativaLogin({
      chave: `admin:${ip}`,
      escopo: 'admin',
      sucesso: false,
    });
    await registrarAuditoria('anonimo', 'FALHA_LOGIN_ADMIN', { ip });
    return { error: 'Credencial administrativa incorreta.' };
  }

  await registrarTentativaLogin({
    chave: `admin:${ip}`,
    escopo: 'admin',
    sucesso: true,
  });
  await setAdminSessionCookie('comissao-eleitoral-urbano');
  await registrarAuditoria('admin', 'LOGIN_ADMIN_SUCESSO', { ip });

  revalidatePath('/admin');
  return { success: true };
}

export async function logoutAdminAction(): Promise<{ success: boolean }> {
  await clearAdminSessionCookie();
  await registrarAuditoria('admin', 'LOGOUT_ADMIN', {});
  revalidatePath('/admin');
  return { success: true };
}

export async function obterDashboardPollingAction(eleicaoId?: string) {
  await requireAdminSession();
  return obterDashboardAdminAgregado(eleicaoId);
}

export async function buscarEleitoresAdminAction(params: {
  eleicaoId?: string;
  busca?: string;
  turma?: string;
  statusVoto?: 'todos' | 'votou' | 'pendente';
  pagina?: number;
  porPagina?: number;
}) {
  await requireAdminSession();
  return consultarEleitoresPaginado(params);
}

export async function buscarAlunoPorRaAdminAction(raInput: string): Promise<{
  encontrado: boolean;
  aluno?: AlunoRow;
}> {
  await requireAdminSession();
  const ra = normalizarRa(raInput);
  if (!ra) return { encontrado: false };
  const aluno = await buscarAlunoPorRa(ra);
  if (!aluno) return { encontrado: false };
  return { encontrado: true, aluno };
}

export async function salvarChapaAdminAction(
  payload: unknown
): Promise<{ success?: boolean; error?: string; chapaId?: string }> {
  await requireAdminSession();

  const parsed = SalvarChapaSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || 'Dados inválidos para cadastro da chapa.',
    };
  }

  const data = parsed.data;
  const state = getLocalState();
  const eleicaoAtiva = obterEleicaoAtiva();

  // Impedir duplicidade de número na mesma eleição
  const conflitoNumero = state.chapas.find(
    (c) =>
      c.eleicao_id === eleicaoAtiva.id &&
      c.numero === data.numero &&
      c.id !== data.id &&
      c.status !== 'arquivada'
  );
  if (conflitoNumero) {
    return {
      error: `Já existe outra chapa com o número ${data.numero} (${conflitoNumero.nome}) nesta eleição.`,
    };
  }

  let chapaId = data.id;
  const nowIso = new Date().toISOString();

  if (chapaId) {
    const idx = state.chapas.findIndex((c) => c.id === chapaId);
    if (idx === -1) return { error: 'Chapa não localizada para edição.' };

    state.chapas[idx] = {
      ...state.chapas[idx],
      nome: data.nome,
      numero: data.numero,
      slogan: data.slogan || null,
      descricao: data.descricao || null,
      cor: data.cor,
      logo_url: data.logo_url ?? state.chapas[idx].logo_url,
      propostas_url: data.propostas_url ?? state.chapas[idx].propostas_url,
      status: data.status,
      redes_sociais: data.redes_sociais || {},
    };
  } else {
    chapaId = crypto.randomUUID();
    state.chapas.push({
      id: chapaId,
      eleicao_id: eleicaoAtiva.id,
      nome: data.nome,
      numero: data.numero,
      slogan: data.slogan || null,
      descricao: data.descricao || null,
      cor: data.cor,
      logo_url: data.logo_url || null,
      propostas_url: data.propostas_url || null,
      status: data.status,
      redes_sociais: data.redes_sociais || {},
      created_at: nowIso,
    });
  }

  // Atualizar propostas por eixo
  state.chapa_propostas = state.chapa_propostas.filter((p) => p.chapa_id !== chapaId);
  data.propostas.forEach((prop, index) => {
    state.chapa_propostas.push({
      id: crypto.randomUUID(),
      chapa_id: chapaId!,
      eixo: prop.eixo,
      titulo: prop.titulo,
      descricao: prop.descricao,
      ordem: index,
    });
  });

  // Atualizar integrantes
  state.chapa_integrantes = state.chapa_integrantes.filter(
    (i) => i.chapa_id !== chapaId
  );
  data.integrantes.forEach((intg, index) => {
    state.chapa_integrantes.push({
      id: crypto.randomUUID(),
      chapa_id: chapaId!,
      aluno_ra: intg.aluno_ra || null,
      nome: intg.nome,
      cargo: intg.cargo,
      turma: intg.turma,
      foto_url: intg.foto_url || null,
      ordem: index,
    });
  });

  // Criar ou atualizar credenciais de acesso do Portal da Chapa (somente leitura)
  if (data.acessoUsuario && data.acessoUsuario.trim().length >= 3) {
    const usrNorm = data.acessoUsuario.trim().toLowerCase();
    const outroAcesso = state.chapa_acessos.find(
      (a) => a.usuario.toLowerCase() === usrNorm && a.chapa_id !== chapaId
    );
    if (outroAcesso) {
      return {
        error: `O usuário "${usrNorm}" já está atribuído a outra chapa. Escolha outro identificador.`,
      };
    }

    const existenteIdx = state.chapa_acessos.findIndex((a) => a.chapa_id === chapaId);
    if (existenteIdx >= 0) {
      state.chapa_acessos[existenteIdx].usuario = usrNorm;
      if (data.acessoSenha && data.acessoSenha.trim().length >= 6) {
        state.chapa_acessos[existenteIdx].senha_hash = await hashPassword(
          data.acessoSenha.trim()
        );
      }
    } else if (data.acessoSenha && data.acessoSenha.trim().length >= 6) {
      const novoAcesso: ChapaAcessoRow = {
        id: crypto.randomUUID(),
        chapa_id: chapaId,
        usuario: usrNorm,
        senha_hash: await hashPassword(data.acessoSenha.trim()),
        ativo: true,
        ultimo_login: null,
        created_at: nowIso,
      };
      state.chapa_acessos.push(novoAcesso);
    }
  }

  saveLocalState(state);
  await registrarAuditoria('admin', data.id ? 'EDITAR_CHAPA' : 'CRIAR_CHAPA', {
    chapa_id: chapaId,
    nome: data.nome,
    numero: data.numero,
    status: data.status,
  });

  revalidatePath('/');
  revalidatePath('/urna');
  revalidatePath('/admin');
  revalidatePath('/chapa');
  return { success: true, chapaId };
}

export async function alterarStatusChapaAdminAction(
  chapaId: string,
  novoStatus: StatusChapa
): Promise<{ success?: boolean; error?: string }> {
  await requireAdminSession();
  const state = getLocalState();
  const chapa = state.chapas.find((c) => c.id === chapaId);
  if (!chapa) return { error: 'Chapa não encontrada.' };

  chapa.status = novoStatus;
  saveLocalState(state);

  await registrarAuditoria('admin', 'ALTERAR_STATUS_CHAPA', {
    chapa_id: chapaId,
    nome: chapa.nome,
    novo_status: novoStatus,
  });

  revalidatePath('/');
  revalidatePath('/admin');
  return { success: true };
}

/**
 * Fase 0 item 6: Impede exclusão física de chapa se houver votos vinculados;
 * arquiva (soft delete) para preservar integridade referencial e histórico.
 */
export async function arquivarOuExcluirChapaAdminAction(
  chapaId: string
): Promise<{ success?: boolean; acaoRealizada?: 'arquivada' | 'excluida'; message?: string; error?: string }> {
  await requireAdminSession();
  const state = getLocalState();
  const chapa = state.chapas.find((c) => c.id === chapaId);
  if (!chapa) return { error: 'Chapa não localizada.' };

  const votosVinculados = state.votos.filter((v) => v.chapa_id === chapaId).length;
  if (votosVinculados > 0) {
    chapa.status = 'arquivada';
    saveLocalState(state);
    await registrarAuditoria('admin', 'ARQUIVAR_CHAPA_COM_VOTOS', {
      chapa_id: chapaId,
      nome: chapa.nome,
      votos_preservados: votosVinculados,
    });
    revalidatePath('/');
    revalidatePath('/admin');
    return {
      success: true,
      acaoRealizada: 'arquivada',
      message: `A chapa "${chapa.nome}" possui ${votosVinculados} voto(s) computado(s). Para preservar a integridade da urna, ela foi ARQUIVADA em vez de excluída.`,
    };
  }

  state.chapas = state.chapas.filter((c) => c.id !== chapaId);
  state.chapa_integrantes = state.chapa_integrantes.filter((i) => i.chapa_id !== chapaId);
  state.chapa_propostas = state.chapa_propostas.filter((p) => p.chapa_id !== chapaId);
  state.chapa_acessos = state.chapa_acessos.filter((a) => a.chapa_id !== chapaId);
  saveLocalState(state);

  await registrarAuditoria('admin', 'EXCLUIR_CHAPA_SEM_VOTOS', {
    chapa_id: chapaId,
    nome: chapa.nome,
  });

  revalidatePath('/');
  revalidatePath('/admin');
  return {
    success: true,
    acaoRealizada: 'excluida',
    message: `Chapa "${chapa.nome}" (sem votos registrados) removida com sucesso.`,
  };
}

export async function gerenciarCredencialChapaAdminAction(params: {
  chapaId: string;
  usuario: string;
  novaSenha?: string;
  ativo: boolean;
}): Promise<{ success?: boolean; error?: string }> {
  await requireAdminSession();
  const state = getLocalState();
  const chapa = state.chapas.find((c) => c.id === params.chapaId);
  if (!chapa) return { error: 'Chapa não encontrada.' };

  const usuarioNorm = params.usuario.trim().toLowerCase();
  if (usuarioNorm.length < 3) {
    return { error: 'O nome de usuário deve ter pelo menos 3 caracteres.' };
  }

  const conflito = state.chapa_acessos.find(
    (a) => a.usuario.toLowerCase() === usuarioNorm && a.chapa_id !== params.chapaId
  );
  if (conflito) {
    return { error: 'Este usuário já está em uso por outra chapa.' };
  }

  const idx = state.chapa_acessos.findIndex((a) => a.chapa_id === params.chapaId);
  if (idx >= 0) {
    state.chapa_acessos[idx].usuario = usuarioNorm;
    state.chapa_acessos[idx].ativo = params.ativo;
    if (params.novaSenha && params.novaSenha.trim().length >= 6) {
      state.chapa_acessos[idx].senha_hash = await hashPassword(params.novaSenha.trim());
    }
  } else {
    if (!params.novaSenha || params.novaSenha.trim().length < 6) {
      return { error: 'Defina uma senha de pelo menos 6 caracteres para criar o acesso.' };
    }
    state.chapa_acessos.push({
      id: crypto.randomUUID(),
      chapa_id: params.chapaId,
      usuario: usuarioNorm,
      senha_hash: await hashPassword(params.novaSenha.trim()),
      ativo: params.ativo,
      ultimo_login: null,
      created_at: new Date().toISOString(),
    });
  }

  saveLocalState(state);
  await registrarAuditoria('admin', 'GERENCIAR_CREDENCIAL_CHAPA', {
    chapa_id: params.chapaId,
    usuario: usuarioNorm,
    ativo: params.ativo,
    senha_redefinida: Boolean(params.novaSenha),
  });

  revalidatePath('/admin');
  return { success: true };
}

export async function atualizarControleEleicaoAdminAction(payload: {
  eleicaoId: string;
  nome: string;
  status: StatusEleicao;
  abre_em?: string | null;
  encerra_em?: string | null;
  resultado_publicado: boolean;
  mostrar_parcial_para_chapas: boolean;
  desempate_chapa_id?: string | null;
  desempate_justificativa?: string | null;
  confirmacaoDuasEtapas?: string;
}): Promise<{ success?: boolean; error?: string }> {
  await requireAdminSession();

  const parsed = ConfigurarEleicaoSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Dados inválidos.' };
  }

  const state = getLocalState();
  const eleicao = state.eleicoes.find((e) => e.id === payload.eleicaoId);
  if (!eleicao) return { error: 'Eleição não encontrada.' };

  // Se estiver encerrando uma eleição aberta, exigir confirmação em duas etapas
  if (
    eleicao.status === 'aberta' &&
    payload.status === 'encerrada' &&
    payload.confirmacaoDuasEtapas !== 'ENCERRAR URNA'
  ) {
    return {
      error:
        'Para encerrar definitivamente a votação, digite exatamente "ENCERRAR URNA" na confirmação de segurança.',
    };
  }

  eleicao.nome = payload.nome.trim();
  eleicao.status = payload.status;
  eleicao.abre_em = payload.abre_em || null;
  eleicao.encerra_em = payload.encerra_em || null;
  eleicao.resultado_publicado = payload.resultado_publicado;
  eleicao.mostrar_parcial_para_chapas = payload.mostrar_parcial_para_chapas;
  eleicao.desempate_chapa_id = payload.desempate_chapa_id || null;
  eleicao.desempate_justificativa = payload.desempate_justificativa || null;

  saveLocalState(state);
  await registrarAuditoria('admin', 'ATUALIZAR_CONTROLE_ELEICAO', {
    eleicao_id: eleicao.id,
    status: eleicao.status,
    resultado_publicado: eleicao.resultado_publicado,
    mostrar_parcial: eleicao.mostrar_parcial_para_chapas,
  });

  revalidatePath('/');
  revalidatePath('/urna');
  revalidatePath('/admin');
  revalidatePath('/chapa');
  revalidatePath('/resultados');
  return { success: true };
}

/**
 * Fase 0 item 7: Substitui o antigo resetElection destrutivo por "Encerrar e Arquivar",
 * criando uma nova eleição limpa sem perder o histórico de chapas e votações anteriores.
 */
export async function arquivarECriarNovaEleicaoAdminAction(params: {
  nomeNovaEleicao: string;
  confirmacaoTexto: string;
}): Promise<{ success?: boolean; novaEleicaoId?: string; error?: string }> {
  await requireAdminSession();

  if (params.confirmacaoTexto.trim().toUpperCase() !== 'ARQUIVAR E CRIAR NOVA') {
    return {
      error: 'Digite exatamente "ARQUIVAR E CRIAR NOVA" para confirmar o arquivamento do ciclo atual.',
    };
  }

  if (!params.nomeNovaEleicao || params.nomeNovaEleicao.trim().length < 5) {
    return { error: 'Informe um título válido para a nova eleição (mín. 5 caracteres).' };
  }

  const state = getLocalState();
  for (const el of state.eleicoes) {
    if (el.status !== 'arquivada') {
      el.status = 'arquivada';
      el.resultado_publicado = true;
    }
  }

  const novaId = crypto.randomUUID();
  const novaEleicao = {
    id: novaId,
    nome: params.nomeNovaEleicao.trim(),
    status: 'rascunho' as StatusEleicao,
    abre_em: null,
    encerra_em: null,
    resultado_publicado: false,
    mostrar_parcial_para_chapas: false,
    desempate_chapa_id: null,
    desempate_justificativa: null,
    created_at: new Date().toISOString(),
  };

  state.eleicoes.unshift(novaEleicao);
  saveLocalState(state);

  await registrarAuditoria('admin', 'ARQUIVAR_CICLO_E_CRIAR_NOVA_ELEICAO', {
    nova_eleicao_id: novaId,
    nome: novaEleicao.nome,
  });

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/chapa');
  return { success: true, novaEleicaoId: novaId };
}

export async function importarAlunosLoteAdminAction(
  alunos: AlunoRow[]
): Promise<{ success?: boolean; importados?: number; error?: string }> {
  await requireAdminSession();

  if (!Array.isArray(alunos) || alunos.length === 0) {
    return { error: 'Nenhum aluno válido para importar.' };
  }

  const state = getLocalState();
  const mapExtras = new Map<string, AlunoRow>();
  for (const a of state.alunos_extras) {
    mapExtras.set(a.ra, a);
  }
  for (const novo of alunos) {
    const raNorm = normalizarRa(novo.ra);
    if (!raNorm) continue;
    mapExtras.set(raNorm, {
      ...novo,
      ra: raNorm,
    });
  }

  state.alunos_extras = Array.from(mapExtras.values());
  saveLocalState(state);

  // Também tenta sincronizar em lotes no Supabase
  try {
    const sb = getSupabaseServer();
    const BATCH = 500;
    for (let i = 0; i < alunos.length; i += BATCH) {
      await sb.from('alunos').upsert(alunos.slice(i, i + BATCH), { onConflict: 'ra' });
    }
  } catch {
    // continua com persistência local
  }

  await registrarAuditoria('admin', 'IMPORTACAO_ALUNOS_LOTE', {
    quantidade: alunos.length,
  });

  revalidatePath('/admin');
  return { success: true, importados: alunos.length };
}

export async function salvarConfiguracaoEscolaAdminAction(
  payload: unknown
): Promise<{ success?: boolean; error?: string }> {
  await requireAdminSession();
  const parsed = ConfiguracaoEscolaSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Dados inválidos.' };
  }

  const d = parsed.data;
  const state = getLocalState();
  state.configuracoes_escola = {
    id: 1,
    nome: d.nome,
    nome_curto: d.nome_curto,
    cidade: d.cidade,
    diretoria_ensino: d.diretoria_ensino,
    texto_boas_vindas: d.texto_boas_vindas,
    meta_participacao: d.meta_participacao,
    assinaturas: {
      direcao: { nome: d.direcao_nome, cargo: d.direcao_cargo, registro: 'SEDUC-SP' },
      coordenacao: { nome: d.coordenacao_nome, cargo: d.coordenacao_cargo, registro: 'SEDUC-SP' },
      comissao: { nome: d.comissao_nome, cargo: d.comissao_cargo, registro: 'Conselho de Escola' },
    },
    updated_at: new Date().toISOString(),
  };

  saveLocalState(state);
  await registrarAuditoria('admin', 'ATUALIZAR_CONFIGURACOES_ESCOLA', {
    nome: d.nome,
    meta_participacao: d.meta_participacao,
  });

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/chapa');
  return { success: true };
}

export async function uploadArquivoChapaAdminAction(
  formData: FormData
): Promise<{ success?: boolean; url?: string; error?: string }> {
  await requireAdminSession();

  const file = formData.get('file');
  const tipo = String(formData.get('tipo') || 'logo'); // 'logo' | 'propostas' | 'integrante'

  if (!(file instanceof File)) {
    return { error: 'Arquivo não recebido.' };
  }

  if (tipo === 'propostas') {
    if (file.size > 5 * 1024 * 1024) {
      return { error: 'O PDF de propostas excede o limite gratuito de 5 MB.' };
    }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return { error: 'Apenas arquivos PDF (.pdf) são aceitos para o documento de propostas.' };
    }
  } else {
    if (file.size > 300 * 1024) {
      return { error: 'A imagem comprimida deve ter no máximo 300 KB (WebP).' };
    }
    if (!file.type.startsWith('image/')) {
      return { error: 'O arquivo enviado não é uma imagem válida.' };
    }
  }

  // Tenta fazer upload para o bucket 'chapas' via Service Role no servidor
  try {
    const sb = getSupabaseServer();
    const ext = file.name.split('.').pop() || (tipo === 'propostas' ? 'pdf' : 'webp');
    const pathStorage = `${tipo}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const { error: upErr } = await sb.storage
      .from('chapas')
      .upload(pathStorage, Buffer.from(arrayBuffer), {
        contentType: file.type,
        upsert: false,
      });

    if (!upErr) {
      const { data: pub } = sb.storage.from('chapas').getPublicUrl(pathStorage);
      return { success: true, url: pub.publicUrl };
    }
  } catch {
    // Fallback para Data URL se o bucket não estiver acessível
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buf.toString('base64')}`;
  return { success: true, url: dataUrl };
}

export async function expurgarDadosCicloLgpdAdminAction(params: {
  eleicaoId: string;
  confirmacao: string;
}): Promise<{ success?: boolean; error?: string }> {
  await requireAdminSession();

  if (params.confirmacao.trim().toUpperCase() !== 'EXPURGAR DADOS LGPD') {
    return {
      error: 'Digite exatamente "EXPURGAR DADOS LGPD" para confirmar a limpeza de registros pessoais do ciclo encerrado.',
    };
  }

  const state = getLocalState();
  const eleicao = state.eleicoes.find((e) => e.id === params.eleicaoId);
  if (!eleicao || (eleicao.status !== 'encerrada' && eleicao.status !== 'arquivada')) {
    return { error: 'Apenas eleições encerradas ou arquivadas permitem expurgo final de ciclo (LGPD).' };
  }

  const qtdRemovida = state.participacoes.filter((p) => p.eleicao_id === eleicao.id).length;
  state.participacoes = state.participacoes.filter((p) => p.eleicao_id !== eleicao.id);
  state.tentativas_login = [];
  saveLocalState(state);

  await registrarAuditoria('admin', 'EXPURGO_LGPD_FIM_DE_CICLO', {
    eleicao_id: eleicao.id,
    participacoes_anonimizadas: qtdRemovida,
  });

  revalidatePath('/admin');
  return { success: true };
}

// ============================================================================
// FRENTE 3: AÇÕES DO PORTAL DA CHAPA (SESSÃO SEPARADA, SOMENTE LEITURA)
// ============================================================================

export async function loginChapaAction(
  usuario: string,
  senha: string
): Promise<{ success?: boolean; error?: string }> {
  const parsed = ChapaLoginSchema.safeParse({ usuario, senha });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Preencha usuário e senha.' };
  }

  const ip = await obterIpRequisicao();
  const usrNorm = parsed.data.usuario.trim().toLowerCase();

  const limit = await verificarRateLimit({
    chave: `chapa:${usrNorm}:${ip}`,
    escopo: 'chapa',
    limiteTentativas: 6,
    janelaSegundos: 300,
    bloqueioSegundos: 120,
  });

  if (!limit.permitido) {
    return {
      error: `Muitas tentativas incorretas. Aguarde ${limit.aguardarSegundos} segundos.`,
    };
  }

  const state = getLocalState();
  const acesso = state.chapa_acessos.find(
    (a) => a.usuario.toLowerCase() === usrNorm
  );

  if (!acesso) {
    await registrarTentativaLogin({
      chave: `chapa:${usrNorm}:${ip}`,
      escopo: 'chapa',
      sucesso: false,
    });
    return { error: 'Usuário ou senha inválidos.' };
  }

  if (!acesso.ativo) {
    return {
      error: 'O acesso desta chapa foi desativado pela Comissão Eleitoral.',
    };
  }

  const senhaValida = await verifyPassword(parsed.data.senha, acesso.senha_hash);
  if (!senhaValida) {
    await registrarTentativaLogin({
      chave: `chapa:${usrNorm}:${ip}`,
      escopo: 'chapa',
      sucesso: false,
    });
    await registrarAuditoria(`chapa:${usrNorm}`, 'FALHA_LOGIN_PORTAL_CHAPA', { ip });
    return { error: 'Usuário ou senha inválidos.' };
  }

  const chapa = state.chapas.find((c) => c.id === acesso.chapa_id);
  if (!chapa) {
    return { error: 'Chapa vinculada não encontrada.' };
  }

  acesso.ultimo_login = new Date().toISOString();
  saveLocalState(state);

  await registrarTentativaLogin({
    chave: `chapa:${usrNorm}:${ip}`,
    escopo: 'chapa',
    sucesso: true,
  });

  await setChapaSessionCookie({
    chapaId: chapa.id,
    eleicaoId: chapa.eleicao_id,
    usuario: acesso.usuario,
    chapaNome: chapa.nome,
  });

  await registrarAuditoria(`chapa:${acesso.usuario}`, 'LOGIN_PORTAL_CHAPA_SUCESSO', {
    chapa_id: chapa.id,
    chapa_nome: chapa.nome,
  });

  revalidatePath('/chapa');
  return { success: true };
}

export async function logoutChapaAction(): Promise<{ success: boolean }> {
  const session = await getChapaSession();
  await clearChapaSessionCookie();
  if (session) {
    await registrarAuditoria(`chapa:${session.usuario}`, 'LOGOUT_PORTAL_CHAPA', {
      chapa_id: session.chapaId,
    });
  }
  revalidatePath('/chapa');
  return { success: true };
}

export async function emitirCertificadoOficialAction(params: {
  chapaId: string;
  tipo: 'vitoria' | 'participacao';
}): Promise<{
  success?: boolean;
  certificado?: CertificadoRow;
  error?: string;
}> {
  const adminSession = await getAdminSession();
  const chapaSession = await getChapaSession();

  if (!adminSession && (!chapaSession || chapaSession.chapaId !== params.chapaId)) {
    return { error: 'Sessão não autorizada para emitir este certificado.' };
  }

  const state = getLocalState();
  const chapa = state.chapas.find((c) => c.id === params.chapaId);
  if (!chapa) return { error: 'Chapa não localizada.' };

  let cert = state.certificados.find(
    (c) =>
      c.eleicao_id === chapa.eleicao_id &&
      c.chapa_id === chapa.id &&
      c.tipo === params.tipo
  );

  if (!cert) {
    const hash = crypto
      .createHash('sha256')
      .update(`${chapa.eleicao_id}:${chapa.id}:${params.tipo}:${Date.now()}`)
      .digest('hex')
      .substring(0, 6)
      .toUpperCase();

    cert = {
      id: crypto.randomUUID(),
      eleicao_id: chapa.eleicao_id,
      chapa_id: chapa.id,
      tipo: params.tipo,
      codigo_verificacao: `URB-${new Date().getFullYear()}-${chapa.numero || 'CH'}-${hash}`,
      emitido_em: new Date().toISOString(),
      emitido_por: adminSession
        ? 'Comissão Eleitoral • E.E. Urbano'
        : `Portal da Chapa (${chapa.nome})`,
    };
    state.certificados.push(cert);
    saveLocalState(state);
  }

  await registrarAuditoria(
    adminSession ? 'admin' : `chapa:${chapaSession?.usuario || chapa.id}`,
    'EMISSAO_CERTIFICADO_OFICIAL',
    {
      chapa_id: chapa.id,
      tipo: params.tipo,
      codigo_verificacao: cert.codigo_verificacao,
    }
  );

  revalidatePath(`/verificar/${cert.codigo_verificacao}`);
  return { success: true, certificado: cert };
}

export async function obterDadosPublicosPollingAction() {
  return obterDadosPublicosUrna();
}

export async function obterPortalChapaPollingAction() {
  const session = await getChapaSession();
  if (!session) return null;
  return obterDadosPortalChapa(session.chapaId);
}
