export type StatusEleicao = 'rascunho' | 'agendada' | 'aberta' | 'encerrada' | 'arquivada';
export type StatusChapa = 'rascunho' | 'aprovada' | 'oculta' | 'arquivada';
export type TipoVoto = 'valido' | 'branco';
export type TipoCertificado = 'vitoria' | 'participacao';
export type EscopoTentativaLogin = 'eleitor_ra' | 'eleitor_ip' | 'ra_inexistente_ip' | 'admin' | 'chapa';

export interface AlunoRow {
  ra: string;
  digito_ra: string;
  nome: string;
  uf_ra: string | null;
  data_nascimento: string | null;
  situacao: string;
  turma: string;
  created_at?: string;
}

export interface EleicaoRow {
  id: string;
  nome: string;
  status: StatusEleicao;
  abre_em: string | null;
  encerra_em: string | null;
  resultado_publicado: boolean;
  mostrar_parcial_para_chapas: boolean;
  desempate_chapa_id?: string | null;
  desempate_justificativa?: string | null;
  created_at: string;
}

export interface RedesSociaisChapa {
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  site?: string;
}

export interface ChapaRow {
  id: string;
  eleicao_id: string;
  nome: string;
  numero: number | null;
  slogan: string | null;
  descricao: string | null;
  cor: string;
  logo_url: string | null;
  propostas_url: string | null;
  status: StatusChapa;
  redes_sociais: RedesSociaisChapa;
  created_at: string;
}

export interface ChapaAcessoRow {
  id: string;
  chapa_id: string;
  usuario: string;
  senha_hash: string;
  ativo: boolean;
  ultimo_login: string | null;
  created_at?: string;
}

export interface ChapaIntegranteRow {
  id: string;
  chapa_id: string;
  aluno_ra: string | null;
  nome: string;
  cargo: string;
  turma: string;
  foto_url: string | null;
  ordem: number;
}

export interface ChapaPropostaRow {
  id: string;
  chapa_id: string;
  eixo: string;
  titulo: string;
  descricao: string;
  ordem: number;
}

export interface ChapaCompleta extends ChapaRow {
  integrantes: ChapaIntegranteRow[];
  propostas: ChapaPropostaRow[];
  acesso?: Omit<ChapaAcessoRow, 'senha_hash'> | null;
}

export interface ParticipacaoRow {
  eleicao_id: string;
  ra: string;
  nome: string;
  turma: string;
  protocolo: string;
  created_at: string;
}

export interface VotoRow {
  id: string;
  eleicao_id: string;
  chapa_id: string | null;
  tipo: TipoVoto;
  turma: string;
  serie: string;
  raca: string;
  genero: string;
  faixa_etaria: string;
}

export interface TentativaLoginRow {
  id: string;
  chave: string;
  escopo: EscopoTentativaLogin;
  sucesso: boolean;
  bloqueado_ate: string | null;
  created_at: string;
}

export interface LogAuditoriaRow {
  id: string;
  ator: string;
  acao: string;
  detalhes: Record<string, string | number | boolean | null>;
  created_at: string;
}

export interface CertificadoRow {
  id: string;
  eleicao_id: string;
  chapa_id: string;
  tipo: TipoCertificado;
  codigo_verificacao: string;
  emitido_em: string;
  emitido_por: string;
}

export interface ConfiguracoesEscolaRow {
  id: number;
  nome: string;
  nome_curto: string;
  cidade: string;
  diretoria_ensino: string;
  assinaturas: {
    direcao: { nome: string; cargo: string; registro?: string };
    coordenacao: { nome: string; cargo: string; registro?: string };
    comissao: { nome: string; cargo: string; registro?: string };
  };
  texto_boas_vindas: string;
  meta_participacao: number;
  updated_at?: string;
}

// Views agregadas
export interface ApuracaoChapaItem {
  chapa_id: string;
  nome: string;
  numero: number | null;
  slogan: string | null;
  cor: string;
  logo_url: string | null;
  status: StatusChapa;
  total_votos: number;
  percentual_total: number;
  percentual_validos: number;
  lideranca?: string;
}

export interface ParticipacaoTurmaItem {
  turma: string;
  serie: string;
  total_aptos: number;
  total_votaram: number;
  percentual_participacao: number;
}

export interface VotoPorHoraItem {
  hora: string; // ex: '08:00', '09:00'
  total_votos: number;
}

export interface VotoChapaPorTurmaItem {
  chapa_id: string | null;
  chapa_nome: string;
  turma: string;
  serie: string;
  total_votos: number; // se total da turma < 5, oculto por k-anonimato
  oculto_anonimato: boolean;
}

export interface RecorteDemograficoItem {
  categoria: string;
  total: number; // 0 quando oculto por < 5
  percentual: number;
  oculto_anonimato: boolean;
}

export interface RelatorioIntegridade {
  eleicao_id: string;
  total_participacoes: number;
  total_votos: number;
  votos_validos: number;
  votos_brancos: number;
  integro: boolean;
  duplicidades_ra: number;
  verificado_em: string;
  hash_resumo: string;
}
