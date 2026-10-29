export interface AssinaturaInstitucional {
  nome: string;
  cargo: string;
  registro?: string;
}

export interface ConfiguracaoEscola {
  nome: string;
  nomeCompleto: string;
  nomeCurto: string;
  cidade: string;
  uf: string;
  diretoriaEnsino: string;
  secretaria: string;
  textoBoasVindas: string;
  metaParticipacao: number; // percentual ex: 60
  logos: {
    escola: string;
    spEducacao: string;
    escolaPlaceholder: boolean;
    spEducacaoPlaceholder: boolean;
  };
  assinaturas: {
    direcao: AssinaturaInstitucional;
    coordenacao: AssinaturaInstitucional;
    comissao: AssinaturaInstitucional;
  };
}

export type IdentidadeEscola = ConfiguracaoEscola;

export const ESCOLA_DEFAULT: ConfiguracaoEscola = {
  nome: 'E.E. Engenheiro Urbano Alves de Souza Pereira',
  nomeCompleto: 'E.E. Engenheiro Urbano Alves de Souza Pereira',
  nomeCurto: 'E.E. Urbano',
  cidade: 'Taubaté',
  uf: 'SP',
  diretoriaEnsino: 'Diretoria de Ensino - Região de Taubaté',
  secretaria: 'Governo do Estado de São Paulo • Secretaria da Educação (SEDUC-SP)',
  textoBoasVindas:
    'Sistema Oficial de Votação Eletrônica Auditável do Grêmio Estudantil da E.E. Engenheiro Urbano Alves de Souza Pereira.',
  metaParticipacao: 60,
  logos: {
    escola: '/brand/logo-escola.png',
    spEducacao: '/brand/logo-sp-educacao.png',
    escolaPlaceholder: false,
    spEducacaoPlaceholder: true,
  },
  assinaturas: {
    direcao: {
      nome: 'Direção Escolar',
      cargo: 'Diretor(a) de Escola • E.E. Eng. Urbano Alves de Souza Pereira',
      registro: 'SEDUC-SP',
    },
    coordenacao: {
      nome: 'Coordenação Pedagógica',
      cargo: 'Coordenador(a) de Gestão Pedagógica',
      registro: 'SEDUC-SP',
    },
    comissao: {
      nome: 'Comissão Eleitoral Discente',
      cargo: 'Presidência da Comissão Eleitoral do Grêmio Estudantil',
      registro: 'Conselho de Escola',
    },
  },
};

export const ESCOLA_IDENTIDADE_PADRAO = ESCOLA_DEFAULT;

export function mergeEscolaConfig(
  override?: Partial<{
    nome: string | null;
    nome_curto: string | null;
    cidade: string | null;
    diretoria_ensino: string | null;
    texto_boas_vindas: string | null;
    meta_participacao: number | null;
    assinaturas: {
      direcao?: Partial<AssinaturaInstitucional>;
      coordenacao?: Partial<AssinaturaInstitucional>;
      comissao?: Partial<AssinaturaInstitucional>;
    } | null;
  }> | null
): ConfiguracaoEscola {
  if (!override) return ESCOLA_DEFAULT;

  const nomeFinal = override.nome?.trim() || ESCOLA_DEFAULT.nome;

  return {
    ...ESCOLA_DEFAULT,
    nome: nomeFinal,
    nomeCompleto: nomeFinal,
    nomeCurto: override.nome_curto?.trim() || ESCOLA_DEFAULT.nomeCurto,
    cidade: override.cidade?.trim() || ESCOLA_DEFAULT.cidade,
    diretoriaEnsino: override.diretoria_ensino?.trim() || ESCOLA_DEFAULT.diretoriaEnsino,
    textoBoasVindas: override.texto_boas_vindas?.trim() || ESCOLA_DEFAULT.textoBoasVindas,
    metaParticipacao:
      typeof override.meta_participacao === 'number'
        ? override.meta_participacao
        : ESCOLA_DEFAULT.metaParticipacao,
    assinaturas: {
      direcao: {
        ...ESCOLA_DEFAULT.assinaturas.direcao,
        ...(override.assinaturas?.direcao || {}),
      },
      coordenacao: {
        ...ESCOLA_DEFAULT.assinaturas.coordenacao,
        ...(override.assinaturas?.coordenacao || {}),
      },
      comissao: {
        ...ESCOLA_DEFAULT.assinaturas.comissao,
        ...(override.assinaturas?.comissao || {}),
      },
    },
  };
}
