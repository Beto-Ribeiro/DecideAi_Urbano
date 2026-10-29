import { z } from 'zod';
import { EleicaoRow, StatusEleicao } from './database.types';

export const OPCOES_RACA = [
  'Branca',
  'Preta',
  'Parda',
  'Amarela',
  'Indígena',
  'Prefiro não informar',
] as const;

export const OPCOES_GENERO = [
  'Feminino',
  'Masculino',
  'Não-binário',
  'Outro',
  'Prefiro não informar',
] as const;

export const EIXOS_PROPOSTAS = [
  'Infraestrutura',
  'Esporte e Lazer',
  'Cultura e Eventos',
  'Pedagógico e Convivência',
  'Comunicação e Transparência',
] as const;

export function normalizarRa(raInput: string): string {
  // Remove espaços, pontos, traços, prefixos SP e zeros à esquerda opcionais preservando formato
  const limpo = raInput.trim().toUpperCase().replace(/[^0-9]/g, '');
  return limpo;
}

export const LoginEleitorSchema = z.object({
  ra: z
    .string()
    .trim()
    .min(4, 'Digite um RA válido (mínimo de 4 dígitos).')
    .max(20, 'O RA digitado é longo demais.')
    .transform((val) => normalizarRa(val))
    .refine((val) => val.length >= 4, 'O RA deve conter apenas números (ex: 000123456).'),
});

export const RegistrarVotoSchema = z
  .object({
    ra: z
      .string()
      .trim()
      .min(4, 'RA inválido.')
      .max(20, 'RA inválido.'),
    chapaId: z.string().uuid('ID de chapa inválido.').nullable().optional(),
    votoBranco: z.boolean().default(false),
    raca: z.string().trim().min(1, 'Selecione uma opção de autodeclaração ou "Prefiro não informar".'),
    genero: z.string().trim().min(1, 'Selecione uma opção de gênero ou "Prefiro não informar".'),
  })
  .refine(
    (data) => {
      if (data.votoBranco) return data.chapaId === null || data.chapaId === undefined;
      return Boolean(data.chapaId);
    },
    {
      message: 'Escolha uma chapa homologada ou selecione Voto em Branco. Não há voto nulo.',
      path: ['chapaId'],
    }
  );

export const AdminLoginSchema = z.object({
  password: z.string().min(4, 'Informe a senha administrativa.'),
});

export const ChapaLoginSchema = z.object({
  usuario: z.string().trim().min(3, 'Informe o usuário da chapa.').max(60),
  senha: z.string().min(4, 'Informe a senha de acesso.'),
});

export const PropostaInputSchema = z.object({
  eixo: z.string().trim().min(2, 'Informe o eixo temático.'),
  titulo: z.string().trim().min(3, 'Informe o título da proposta.').max(120),
  descricao: z.string().trim().min(5, 'Descreva a proposta.').max(600),
});

export const IntegranteInputSchema = z.object({
  aluno_ra: z.string().trim().nullable().optional(),
  nome: z.string().trim().min(2, 'Informe o nome do integrante.').max(120),
  cargo: z.string().trim().min(2, 'Informe o cargo na chapa.').max(80),
  turma: z.string().trim().min(1, 'Informe a turma.').max(40),
  foto_url: z.string().nullable().optional(),
});

export const SalvarChapaSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(2, 'O nome da chapa deve ter ao menos 2 caracteres.').max(100),
  numero: z.coerce.number().int().min(1, 'O número deve ser positivo.').max(999, 'Máximo 3 dígitos.'),
  slogan: z.string().trim().max(160).nullable().optional(),
  descricao: z.string().trim().max(800).nullable().optional(),
  cor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida (use formato hexadecimal #RRGGBB).')
    .default('#1D4ED8'),
  logo_url: z.string().nullable().optional(),
  propostas_url: z.string().nullable().optional(),
  status: z.enum(['rascunho', 'aprovada', 'oculta', 'arquivada']).default('aprovada'),
  redes_sociais: z
    .object({
      instagram: z.string().optional(),
      tiktok: z.string().optional(),
      youtube: z.string().optional(),
      site: z.string().optional(),
    })
    .optional(),
  propostas: z.array(PropostaInputSchema).default([]),
  integrantes: z.array(IntegranteInputSchema).default([]),
  acessoUsuario: z.string().trim().optional(),
  acessoSenha: z.string().optional(),
});

export const ConfigurarEleicaoSchema = z.object({
  nome: z.string().trim().min(3, 'Informe o nome da eleição.').max(120),
  status: z.enum(['rascunho', 'agendada', 'aberta', 'encerrada', 'arquivada']),
  abre_em: z.string().nullable().optional(),
  encerra_em: z.string().nullable().optional(),
  resultado_publicado: z.boolean().default(false),
  mostrar_parcial_para_chapas: z.boolean().default(false),
});

export const ConfiguracaoEscolaSchema = z.object({
  nome: z.string().trim().min(5, 'Nome da escola obrigatório.'),
  nome_curto: z.string().trim().min(3, 'Nome curto obrigatório.'),
  cidade: z.string().trim().min(2, 'Cidade obrigatória.'),
  diretoria_ensino: z.string().trim().min(3, 'Diretoria de ensino obrigatória.'),
  texto_boas_vindas: z.string().trim().min(5, 'Texto de boas-vindas obrigatório.'),
  meta_participacao: z.number().min(1).max(100),
  direcao_nome: z.string().trim().min(3),
  direcao_cargo: z.string().trim().min(3),
  coordenacao_nome: z.string().trim().min(3),
  coordenacao_cargo: z.string().trim().min(3),
  comissao_nome: z.string().trim().min(3),
  comissao_cargo: z.string().trim().min(3),
});

/**
 * Calcula a faixa etária sem armazenar idade exata individualizada quando extremo,
 * preservando privacidade e LGPD.
 */
export function calcularFaixaEtaria(dataNascimento?: string | null, refDate = new Date()): string {
  if (!dataNascimento) return 'Não informada';
  const partes = dataNascimento.trim().split('/');
  if (partes.length !== 3) return 'Não informada';

  const dia = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10);
  const ano = parseInt(partes[2], 10);
  if (isNaN(dia) || isNaN(mes) || isNaN(ano) || ano < 1990 || ano > refDate.getFullYear()) {
    return 'Não informada';
  }

  let idade = refDate.getFullYear() - ano;
  const m = refDate.getMonth() + 1 - mes;
  if (m < 0 || (m === 0 && refDate.getDate() < dia)) {
    idade--;
  }

  if (idade <= 12) return 'Até 12 anos';
  if (idade <= 14) return '13 a 14 anos';
  if (idade <= 16) return '15 a 16 anos';
  if (idade === 17) return '17 anos';
  return '18 anos ou mais';
}

/**
 * Extrai a série/ano escolar a partir do nome da turma.
 */
export function extrairSerieDaTurma(turma: string): string {
  const t = (turma || '').trim().toUpperCase();
  if (t.startsWith('6')) return '6º Ano EF';
  if (t.startsWith('7')) return '7º Ano EF';
  if (t.startsWith('8')) return '8º Ano EF';
  if (t.startsWith('9')) return '9º Ano EF';
  if (t.startsWith('1')) return '1ª Série EM';
  if (t.startsWith('2')) return '2ª Série EM';
  if (t.startsWith('3')) return '3ª Série EM';
  return 'Outras Turmas';
}

/**
 * Calcula o status efetivo da eleição em tempo real a cada requisição
 * (sem depender de cron, que no plano Vercel Hobby é apenas diário).
 */
export function calcularStatusEfetivoEleicao(
  eleicao: Pick<EleicaoRow, 'status' | 'abre_em' | 'encerra_em'>,
  agora = new Date()
): StatusEleicao {
  if (eleicao.status === 'arquivada' || eleicao.status === 'encerrada' || eleicao.status === 'rascunho') {
    return eleicao.status;
  }

  const nowMs = agora.getTime();
  const abreMs = eleicao.abre_em ? new Date(eleicao.abre_em).getTime() : null;
  const encerraMs = eleicao.encerra_em ? new Date(eleicao.encerra_em).getTime() : null;

  if (encerraMs && !isNaN(encerraMs) && nowMs >= encerraMs) {
    return 'encerrada';
  }

  if (abreMs && !isNaN(abreMs)) {
    if (nowMs < abreMs) {
      return 'agendada';
    }
    if (eleicao.status === 'agendada' && nowMs >= abreMs) {
      return 'aberta';
    }
  }

  return eleicao.status;
}

/**
 * Regra de k-anonimato (LGPD): oculta recortes com menos de 5 pessoas
 * para impedir identificação indireta em turmas ou grupos pequenos.
 */
export const LIMITE_MINIMO_K_ANONIMATO = 5;

export function aplicarKAnonimato<T extends { total: number }>(
  itens: T[],
  minimo = LIMITE_MINIMO_K_ANONIMATO
): Array<T & { oculto_anonimato: boolean }> {
  return itens.map((item) => {
    if (item.total > 0 && item.total < minimo) {
      return {
        ...item,
        total: 0,
        oculto_anonimato: true,
      };
    }
    return {
      ...item,
      oculto_anonimato: false,
    };
  });
}

/**
 * Apuração eleitoral com detecção de empate e cálculo de percentuais sobre
 * votos válidos e votos totais.
 */
export interface ResultadoApuracao {
  totalVotos: number;
  votosValidos: number;
  votosBrancos: number;
  empateTecnico: boolean;
  vencedoraId: string | null;
  chapasOrdenadas: Array<{
    chapa_id: string;
    nome: string;
    numero: number | null;
    total_votos: number;
    percentual_validos: number;
    percentual_total: number;
    colocacao: number;
  }>;
}

export function calcularResultadoEleitoral(
  chapas: Array<{ chapa_id: string; nome: string; numero: number | null; total_votos: number }>,
  votosBrancos: number,
  desempateChapaId?: string | null
): ResultadoApuracao {
  const votosValidos = chapas.reduce((acc, c) => acc + c.total_votos, 0);
  const totalVotos = votosValidos + votosBrancos;

  const ordenadas = [...chapas].sort((a, b) => {
    if (b.total_votos !== a.total_votos) return b.total_votos - a.total_votos;
    if (desempateChapaId) {
      if (a.chapa_id === desempateChapaId) return -1;
      if (b.chapa_id === desempateChapaId) return 1;
    }
    return (a.numero || 0) - (b.numero || 0);
  });

  const empateTecnico =
    ordenadas.length >= 2 &&
    ordenadas[0].total_votos > 0 &&
    ordenadas[0].total_votos === ordenadas[1].total_votos &&
    !desempateChapaId;

  const chapasOrdenadas = ordenadas.map((c, idx) => ({
    ...c,
    percentual_validos:
      votosValidos > 0 ? Number(((c.total_votos / votosValidos) * 100).toFixed(1)) : 0,
    percentual_total:
      totalVotos > 0 ? Number(((c.total_votos / totalVotos) * 100).toFixed(1)) : 0,
    colocacao: idx + 1,
  }));

  return {
    totalVotos,
    votosValidos,
    votosBrancos,
    empateTecnico,
    vencedoraId:
      !empateTecnico && chapasOrdenadas.length > 0 && chapasOrdenadas[0].total_votos > 0
        ? chapasOrdenadas[0].chapa_id
        : desempateChapaId || null,
    chapasOrdenadas,
  };
}
