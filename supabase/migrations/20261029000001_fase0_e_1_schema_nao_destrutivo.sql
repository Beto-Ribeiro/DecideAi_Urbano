-- ============================================================================
-- MIGRAÇÃO FASE 0 & FASE 1 (NÃO-DESTRUTIVA / ADITIVA + SEGURANÇA RLS + RPC)
-- Sistema DecideAI — E.E. Engenheiro Urbano Alves de Souza Pereira
-- ============================================================================

BEGIN;

-- 1. Configurações da Escola
CREATE TABLE IF NOT EXISTS public.configuracoes_escola (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    nome TEXT NOT NULL DEFAULT 'E.E. Engenheiro Urbano Alves de Souza Pereira',
    nome_curto TEXT NOT NULL DEFAULT 'E.E. Urbano',
    cidade TEXT NOT NULL DEFAULT 'Taubaté',
    diretoria_ensino TEXT NOT NULL DEFAULT 'Diretoria de Ensino - Região de Taubaté',
    assinaturas JSONB NOT NULL DEFAULT '{
      "direcao": {"nome": "Direção Escolar", "cargo": "Diretor(a) de Escola", "registro": "SEDUC-SP"},
      "coordenacao": {"nome": "Coordenação Pedagógica", "cargo": "Coordenador(a) de Gestão Pedagógica", "registro": "SEDUC-SP"},
      "comissao": {"nome": "Comissão Eleitoral Discente", "cargo": "Presidência da Comissão Eleitoral", "registro": "Conselho de Escola"}
    }'::jsonb,
    texto_boas_vindas TEXT NOT NULL DEFAULT 'Exerça seu direito ao voto de forma rápida, segura e 100% anônima.',
    meta_participacao NUMERIC(5,2) NOT NULL DEFAULT 60.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.configuracoes_escola (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 2. Eleições
CREATE TABLE IF NOT EXISTS public.eleicoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'agendada', 'aberta', 'encerrada', 'arquivada')),
    abre_em TIMESTAMPTZ,
    encerra_em TIMESTAMPTZ,
    resultado_publicado BOOLEAN NOT NULL DEFAULT false,
    mostrar_parcial_para_chapas BOOLEAN NOT NULL DEFAULT false,
    desempate_chapa_id UUID,
    desempate_justificativa TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Criar eleição padrão a partir da tabela legada configuracoes se não houver nenhuma
DO $$
DECLARE
    v_eleicao_id UUID;
    v_old_status TEXT := 'ativa';
BEGIN
    SELECT id INTO v_eleicao_id FROM public.eleicoes ORDER BY created_at DESC LIMIT 1;
    IF v_eleicao_id IS NULL THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'configuracoes') THEN
            SELECT status INTO v_old_status FROM public.configuracoes WHERE id = 1;
        END IF;

        INSERT INTO public.eleicoes (nome, status, resultado_publicado, mostrar_parcial_para_chapas)
        VALUES (
            'Eleição Grêmio Estudantil 2026',
            CASE WHEN v_old_status = 'finalizada' THEN 'encerrada' ELSE 'aberta' END,
            CASE WHEN v_old_status = 'finalizada' THEN true ELSE false END,
            false
        )
        RETURNING id INTO v_eleicao_id;
    END IF;
END $$;

-- 3. Evolução da tabela chapas
ALTER TABLE public.chapas ADD COLUMN IF NOT EXISTS eleicao_id UUID REFERENCES public.eleicoes(id) ON DELETE RESTRICT;
ALTER TABLE public.chapas ADD COLUMN IF NOT EXISTS slogan TEXT;
ALTER TABLE public.chapas ADD COLUMN IF NOT EXISTS cor TEXT NOT NULL DEFAULT '#1D4ED8';
ALTER TABLE public.chapas ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'aprovada' CHECK (status IN ('rascunho', 'aprovada', 'oculta', 'arquivada'));
ALTER TABLE public.chapas ADD COLUMN IF NOT EXISTS redes_sociais JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Vincular chapas existentes à eleição atual
UPDATE public.chapas
SET eleicao_id = (SELECT id FROM public.eleicoes ORDER BY created_at DESC LIMIT 1)
WHERE eleicao_id IS NULL;

-- 4. Acessos do Portal da Chapa (somente leitura, gerenciados pelo admin)
CREATE TABLE IF NOT EXISTS public.chapa_acessos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapa_id UUID NOT NULL REFERENCES public.chapas(id) ON DELETE CASCADE,
    usuario TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT true,
    ultimo_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Integrantes das Chapas
CREATE TABLE IF NOT EXISTS public.chapa_integrantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapa_id UUID NOT NULL REFERENCES public.chapas(id) ON DELETE CASCADE,
    aluno_ra TEXT REFERENCES public.alunos(ra) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    cargo TEXT NOT NULL,
    turma TEXT NOT NULL,
    foto_url TEXT,
    ordem INTEGER NOT NULL DEFAULT 0
);

-- Migrar integrantes do JSONB legado de chapas para chapa_integrantes (idempotente)
DO $$
DECLARE
    r RECORD;
    elem JSONB;
    idx INTEGER;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'chapas' AND column_name = 'integrantes'
    ) THEN
        FOR r IN SELECT id, integrantes FROM public.chapas WHERE integrantes IS NOT NULL AND jsonb_typeof(integrantes) = 'array' LOOP
            IF NOT EXISTS (SELECT 1 FROM public.chapa_integrantes WHERE chapa_id = r.id) THEN
                idx := 0;
                FOR elem IN SELECT * FROM jsonb_array_elements(r.integrantes) LOOP
                    INSERT INTO public.chapa_integrantes (chapa_id, nome, cargo, turma, ordem)
                    VALUES (
                        r.id,
                        COALESCE(elem->>'nome', 'Integrante'),
                        COALESCE(elem->>'cargo', 'Membro'),
                        COALESCE(elem->>'turma', '-'),
                        idx
                    );
                    idx := idx + 1;
                END LOOP;
            END IF;
        END LOOP;
    END IF;
END $$;

-- 6. Propostas das Chapas por Eixo
CREATE TABLE IF NOT EXISTS public.chapa_propostas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapa_id UUID NOT NULL REFERENCES public.chapas(id) ON DELETE CASCADE,
    eixo TEXT NOT NULL DEFAULT 'Geral',
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0
);

-- 7. Participações (substitui alunos_votaram com PK composta por eleicao_id, ra)
CREATE TABLE IF NOT EXISTS public.participacoes (
    eleicao_id UUID NOT NULL REFERENCES public.eleicoes(id) ON DELETE RESTRICT,
    ra TEXT NOT NULL,
    nome TEXT NOT NULL,
    turma TEXT NOT NULL,
    protocolo TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (eleicao_id, ra)
);

-- Migrar alunos_votaram existentes para participacoes
DO $$
DECLARE
    v_eleicao_id UUID;
BEGIN
    SELECT id INTO v_eleicao_id FROM public.eleicoes ORDER BY created_at DESC LIMIT 1;
    IF v_eleicao_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'alunos_votaram'
    ) THEN
        INSERT INTO public.participacoes (eleicao_id, ra, nome, turma, protocolo, created_at)
        SELECT
            v_eleicao_id,
            av.ra,
            av.nome,
            av.turma,
            'URB-' || EXTRACT(YEAR FROM av.created_at)::TEXT || '-' || UPPER(SUBSTRING(md5(av.ra || av.created_at::TEXT) FROM 1 FOR 10)),
            av.created_at
        FROM public.alunos_votaram av
        ON CONFLICT (eleicao_id, ra) DO NOTHING;
    END IF;
END $$;

-- 8. Evolução da tabela votos (Garantia de Sigilo Absoluto)
ALTER TABLE public.votos ADD COLUMN IF NOT EXISTS eleicao_id UUID REFERENCES public.eleicoes(id) ON DELETE RESTRICT;
ALTER TABLE public.votos ALTER COLUMN chapa_id DROP NOT NULL;
ALTER TABLE public.votos ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'valido' CHECK (tipo IN ('valido', 'branco'));
ALTER TABLE public.votos ADD COLUMN IF NOT EXISTS serie TEXT NOT NULL DEFAULT 'Não informada';
ALTER TABLE public.votos ADD COLUMN IF NOT EXISTS faixa_etaria TEXT NOT NULL DEFAULT 'Não informada';

-- Vincular votos existentes à eleição atual e limpar metadados identificáveis (ip, user_agent)
UPDATE public.votos
SET eleicao_id = (SELECT id FROM public.eleicoes ORDER BY created_at DESC LIMIT 1)
WHERE eleicao_id IS NULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'votos' AND column_name = 'ip') THEN
        UPDATE public.votos SET ip = NULL WHERE ip IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'votos' AND column_name = 'user_agent') THEN
        UPDATE public.votos SET user_agent = NULL WHERE user_agent IS NOT NULL;
    END IF;
END $$;

-- Impedir exclusão de chapa se houver votos vinculados
ALTER TABLE public.votos DROP CONSTRAINT IF EXISTS votos_chapa_id_fkey;
ALTER TABLE public.votos
    ADD CONSTRAINT votos_chapa_id_fkey
    FOREIGN KEY (chapa_id) REFERENCES public.chapas(id) ON DELETE RESTRICT;

-- Regra de consistência entre tipo de voto e chapa_id (sem voto nulo!)
ALTER TABLE public.votos DROP CONSTRAINT IF EXISTS votos_tipo_chapa_check;
ALTER TABLE public.votos
    ADD CONSTRAINT votos_tipo_chapa_check
    CHECK (
        (tipo = 'branco' AND chapa_id IS NULL) OR
        (tipo = 'valido' AND chapa_id IS NOT NULL)
    );

-- 9. Rate Limiting (tentativas_login) e Auditoria (log_auditoria)
CREATE TABLE IF NOT EXISTS public.tentativas_login (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chave TEXT NOT NULL, -- ex: 'ip:1.2.3.4', 'ra:123456', 'admin:1.2.3.4', 'chapa:usr'
    escopo TEXT NOT NULL CHECK (escopo IN ('eleitor_ra', 'eleitor_ip', 'ra_inexistente_ip', 'admin', 'chapa')),
    sucesso BOOLEAN NOT NULL DEFAULT false,
    bloqueado_ate TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tentativas_login_chave_created ON public.tentativas_login (chave, created_at DESC);

CREATE TABLE IF NOT EXISTS public.log_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ator TEXT NOT NULL, -- 'admin', 'sistema', 'chapa:<usuario>', 'mesa_eleitoral'
    acao TEXT NOT NULL,
    detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_log_auditoria_created ON public.log_auditoria (created_at DESC);

-- 10. Certificados Oficiais
CREATE TABLE IF NOT EXISTS public.certificados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eleicao_id UUID NOT NULL REFERENCES public.eleicoes(id) ON DELETE RESTRICT,
    chapa_id UUID NOT NULL REFERENCES public.chapas(id) ON DELETE RESTRICT,
    tipo TEXT NOT NULL CHECK (tipo IN ('vitoria', 'participacao')),
    codigo_verificacao TEXT NOT NULL UNIQUE,
    emitido_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    emitido_por TEXT NOT NULL DEFAULT 'Comissão Eleitoral • E.E. Urbano'
);

-- ============================================================================
-- FUNÇÃO AUXILIAR DE EXTRAÇÃO DE SÉRIE A PARTIR DA TURMA
-- ============================================================================
CREATE OR REPLACE FUNCTION public.extrair_serie(p_turma TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    t TEXT := UPPER(TRIM(COALESCE(p_turma, '')));
BEGIN
    IF t LIKE '6%' THEN RETURN '6º Ano EF';
    ELSIF t LIKE '7%' THEN RETURN '7º Ano EF';
    ELSIF t LIKE '8%' THEN RETURN '8º Ano EF';
    ELSIF t LIKE '9%' THEN RETURN '9º Ano EF';
    ELSIF t LIKE '1%' THEN RETURN '1ª Série EM';
    ELSIF t LIKE '2%' THEN RETURN '2ª Série EM';
    ELSIF t LIKE '3%' THEN RETURN '3ª Série EM';
    ELSE RETURN 'Outras Turmas';
    END IF;
END;
$$;

-- ============================================================================
-- RPC ATÔMICA: registrar_voto (SECURITY DEFINER)
-- Garante elegibilidade, eleição aberta, unicidade por PK (eleicao_id, ra) e
-- gravação simultânea de participação e voto anônimo na mesma transação.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.registrar_voto(
    p_ra TEXT,
    p_chapa_id UUID DEFAULT NULL,
    p_voto_branco BOOLEAN DEFAULT false,
    p_raca TEXT DEFAULT 'Prefiro não informar',
    p_genero TEXT DEFAULT 'Prefiro não informar',
    p_faixa_etaria TEXT DEFAULT 'Não informada'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_eleicao RECORD;
    v_aluno RECORD;
    v_chapa RECORD;
    v_protocolo TEXT;
    v_serie TEXT;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    -- 1. Localizar eleição ativa e validar janela de horário em tempo real
    SELECT * INTO v_eleicao
    FROM public.eleicoes
    WHERE status IN ('aberta', 'agendada')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_eleicao IS NULL THEN
        RETURN jsonb_build_object('error', 'Não há eleição aberta no momento.', 'code', 'ELEICAO_FECHADA');
    END IF;

    IF v_eleicao.status = 'agendada' AND (v_eleicao.abre_em IS NULL OR v_now < v_eleicao.abre_em) THEN
        RETURN jsonb_build_object('error', 'A eleição ainda não foi iniciada.', 'code', 'ELEICAO_AGENDADA');
    END IF;

    IF v_eleicao.abre_em IS NOT NULL AND v_now < v_eleicao.abre_em THEN
        RETURN jsonb_build_object('error', 'A eleição ainda não atingiu o horário de abertura.', 'code', 'ELEICAO_AGENDADA');
    END IF;

    IF v_eleicao.encerra_em IS NOT NULL AND v_now > v_eleicao.encerra_em THEN
        RETURN jsonb_build_object('error', 'O horário de votação já foi encerrado.', 'code', 'ELEICAO_ENCERRADA');
    END IF;

    -- 2. Validar aluno pelo RA (sem exigir dígito)
    SELECT * INTO v_aluno
    FROM public.alunos
    WHERE ra = TRIM(p_ra);

    IF v_aluno IS NULL THEN
        RETURN jsonb_build_object('error', 'RA não localizado no cadastro escolar.', 'code', 'RA_INEXISTENTE');
    END IF;

    IF LOWER(TRIM(v_aluno.situacao)) <> 'ativo' THEN
        RETURN jsonb_build_object('error', 'Matrícula consta como inativa ou transferida.', 'code', 'ALUNO_INATIVO');
    END IF;

    -- 3. Validar opção de voto (apenas chapas aprovadas da eleição ou branco)
    IF p_voto_branco THEN
        p_chapa_id := NULL;
    ELSE
        IF p_chapa_id IS NULL THEN
            RETURN jsonb_build_object('error', 'Selecione uma chapa aprovada ou Voto em Branco.', 'code', 'VOTO_INVALIDO');
        END IF;

        SELECT * INTO v_chapa
        FROM public.chapas
        WHERE id = p_chapa_id
          AND eleicao_id = v_eleicao.id
          AND status = 'aprovada';

        IF v_chapa IS NULL THEN
            RETURN jsonb_build_object('error', 'Chapa inválida ou não homologada para esta eleição.', 'code', 'CHAPA_INVALIDA');
        END IF;
    END IF;

    -- 4. Gerar protocolo de participação (NÃO tem qualquer relação com a chapa escolhida)
    v_protocolo := 'URB-' || EXTRACT(YEAR FROM v_now)::TEXT || '-' ||
                   UPPER(SUBSTRING(encode(gen_random_bytes(6), 'hex') FROM 1 FOR 8));

    -- 5. Inserir participação (PK eleicao_id + ra bloqueia voto duplo mesmo concorrente!)
    BEGIN
        INSERT INTO public.participacoes (eleicao_id, ra, nome, turma, protocolo, created_at)
        VALUES (v_eleicao.id, v_aluno.ra, v_aluno.nome, v_aluno.turma, v_protocolo, v_now);
    EXCEPTION WHEN unique_violation THEN
        RETURN jsonb_build_object('error', 'Este RA já registrou voto nesta eleição.', 'code', 'JA_VOTOU');
    END;

    -- 6. Inserir voto 100% anônimo (sem RA, sem IP, sem User-Agent, sem timestamp correlacionável)
    v_serie := public.extrair_serie(v_aluno.turma);

    INSERT INTO public.votos (
        eleicao_id,
        chapa_id,
        tipo,
        turma,
        serie,
        raca,
        genero,
        faixa_etaria
    ) VALUES (
        v_eleicao.id,
        p_chapa_id,
        CASE WHEN p_voto_branco THEN 'branco' ELSE 'valido' END,
        v_aluno.turma,
        v_serie,
        COALESCE(NULLIF(TRIM(p_raca), ''), 'Prefiro não informar'),
        COALESCE(NULLIF(TRIM(p_genero), ''), 'Prefiro não informar'),
        COALESCE(NULLIF(TRIM(p_faixa_etaria), ''), 'Não informada')
    );

    RETURN jsonb_build_object(
        'success', true,
        'protocolo', v_protocolo,
        'eleicao_id', v_eleicao.id,
        'registrado_em', v_now
    );
END;
$$;

-- ============================================================================
-- VIEWS DE AGREGAÇÃO NO BANCO (Evita baixar todos os votos para o cliente)
-- ============================================================================

-- 1. Apuração por Chapa e Brancos
CREATE OR REPLACE VIEW public.vw_apuracao_chapas AS
SELECT
    e.id AS eleicao_id,
    c.id AS chapa_id,
    c.nome AS chapa_nome,
    c.numero AS chapa_numero,
    c.slogan AS chapa_slogan,
    c.cor AS chapa_cor,
    c.logo_url AS chapa_logo_url,
    c.status AS chapa_status,
    COUNT(v.id)::INTEGER AS total_votos
FROM public.eleicoes e
JOIN public.chapas c ON c.eleicao_id = e.id AND c.status IN ('aprovada', 'arquivada')
LEFT JOIN public.votos v ON v.chapa_id = c.id AND v.eleicao_id = e.id AND v.tipo = 'valido'
GROUP BY e.id, c.id, c.nome, c.numero, c.slogan, c.cor, c.logo_url, c.status;

-- 2. Resumo de Votos da Eleição (Válidos, Brancos, Total e Participações para Integridade)
CREATE OR REPLACE VIEW public.vw_resumo_eleicao AS
SELECT
    e.id AS eleicao_id,
    e.nome AS eleicao_nome,
    e.status AS eleicao_status,
    COUNT(v.id)::INTEGER AS total_votos,
    COUNT(v.id) FILTER (WHERE v.tipo = 'valido')::INTEGER AS votos_validos,
    COUNT(v.id) FILTER (WHERE v.tipo = 'branco')::INTEGER AS votos_brancos,
    (SELECT COUNT(*)::INTEGER FROM public.participacoes p WHERE p.eleicao_id = e.id) AS total_participacoes,
    (SELECT COUNT(*)::INTEGER FROM public.alunos a WHERE LOWER(TRIM(a.situacao)) = 'ativo') AS total_eleitores_aptos
FROM public.eleicoes e
LEFT JOIN public.votos v ON v.eleicao_id = e.id
GROUP BY e.id, e.nome, e.status;

-- 3. Participação por Turma e Série
CREATE OR REPLACE VIEW public.vw_participacao_turmas AS
SELECT
    e.id AS eleicao_id,
    a.turma,
    public.extrair_serie(a.turma) AS serie,
    COUNT(DISTINCT a.ra)::INTEGER AS total_aptos,
    COUNT(DISTINCT p.ra)::INTEGER AS total_votaram,
    ROUND(
        CASE WHEN COUNT(DISTINCT a.ra) > 0
             THEN (COUNT(DISTINCT p.ra)::NUMERIC / COUNT(DISTINCT a.ra)::NUMERIC) * 100
             ELSE 0
        END, 1
    ) AS percentual_participacao
FROM public.eleicoes e
CROSS JOIN (SELECT ra, turma FROM public.alunos WHERE LOWER(TRIM(situacao)) = 'ativo') a
LEFT JOIN public.participacoes p ON p.eleicao_id = e.id AND p.ra = a.ra
GROUP BY e.id, a.turma;

-- 4. Evolução de Votos por Hora (a partir de participacoes truncadas para hora)
CREATE OR REPLACE VIEW public.vw_votos_por_hora AS
SELECT
    eleicao_id,
    date_trunc('hour', created_at) AS hora,
    COUNT(*)::INTEGER AS total_votos
FROM public.participacoes
GROUP BY eleicao_id, date_trunc('hour', created_at)
ORDER BY hora ASC;

-- 5. Votos por Chapa, Turma e Série
CREATE OR REPLACE VIEW public.vw_votos_chapa_turma AS
SELECT
    eleicao_id,
    chapa_id,
    tipo,
    turma,
    serie,
    COUNT(*)::INTEGER AS total_votos
FROM public.votos
GROUP BY eleicao_id, chapa_id, tipo, turma, serie;

-- 6. Perfil Demográfico Agregado
CREATE OR REPLACE VIEW public.vw_perfil_demografico AS
SELECT
    eleicao_id,
    chapa_id,
    raca,
    genero,
    faixa_etaria,
    serie,
    COUNT(*)::INTEGER AS total_votos
FROM public.votos
GROUP BY eleicao_id, chapa_id, raca, genero, faixa_etaria, serie;

-- ============================================================================
-- SEGURANÇA RLS (FECHAR TUDO PARA CHAVE ANON, EXPOR APENAS O PÚBLICO SEGURO)
-- ============================================================================

ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapa_acessos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapa_integrantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapa_propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eleicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tentativas_login ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_escola ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas inseguras
DROP POLICY IF EXISTS "Permitir leitura de alunos para todos" ON public.alunos;
DROP POLICY IF EXISTS "Permitir inserção de alunos" ON public.alunos;
DROP POLICY IF EXISTS "Permitir atualização de alunos" ON public.alunos;
DROP POLICY IF EXISTS "Permitir leitura de chapas para todos" ON public.chapas;
DROP POLICY IF EXISTS "Permitir atualizar chapas" ON public.chapas;
DROP POLICY IF EXISTS "Permitir inserção de alunos_votaram" ON public.alunos_votaram;
DROP POLICY IF EXISTS "Permitir leitura de alunos_votaram" ON public.alunos_votaram;
DROP POLICY IF EXISTS "Permitir delecao de alunos_votaram" ON public.alunos_votaram;
DROP POLICY IF EXISTS "Permitir inserção de votos" ON public.votos;
DROP POLICY IF EXISTS "Permitir leitura de votos" ON public.votos;
DROP POLICY IF EXISTS "Permitir delecao de votos" ON public.votos;
DROP POLICY IF EXISTS "Permitir leitura de configuracoes" ON public.configuracoes;
DROP POLICY IF EXISTS "Permitir update de configuracoes" ON public.configuracoes;

-- Políticas públicas de SOMENTE LEITURA para dados não sensíveis
DROP POLICY IF EXISTS "Leitura publica de configuracoes_escola" ON public.configuracoes_escola;
CREATE POLICY "Leitura publica de configuracoes_escola"
    ON public.configuracoes_escola FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Leitura publica de eleicoes" ON public.eleicoes;
CREATE POLICY "Leitura publica de eleicoes"
    ON public.eleicoes FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Leitura publica apenas de chapas aprovadas" ON public.chapas;
CREATE POLICY "Leitura publica apenas de chapas aprovadas"
    ON public.chapas FOR SELECT
    USING (status = 'aprovada');

DROP POLICY IF EXISTS "Leitura publica de integrantes de chapas aprovadas" ON public.chapa_integrantes;
CREATE POLICY "Leitura publica de integrantes de chapas aprovadas"
    ON public.chapa_integrantes FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.chapas c WHERE c.id = chapa_integrantes.chapa_id AND c.status = 'aprovada'));

DROP POLICY IF EXISTS "Leitura publica de propostas de chapas aprovadas" ON public.chapa_propostas;
CREATE POLICY "Leitura publica de propostas de chapas aprovadas"
    ON public.chapa_propostas FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.chapas c WHERE c.id = chapa_propostas.chapa_id AND c.status = 'aprovada'));

DROP POLICY IF EXISTS "Leitura publica de certificados para verificacao" ON public.certificados;
CREATE POLICY "Leitura publica de certificados para verificacao"
    ON public.certificados FOR SELECT
    USING (true);

-- Storage: leitura pública do bucket 'chapas', escrita restrita ao service_role (Server Actions)
DROP POLICY IF EXISTS "Permitir insert publico chapas bucket" ON storage.objects;
DROP POLICY IF EXISTS "Permitir update publico chapas bucket" ON storage.objects;
DROP POLICY IF EXISTS "Permitir delete publico chapas bucket" ON storage.objects;

COMMIT;
