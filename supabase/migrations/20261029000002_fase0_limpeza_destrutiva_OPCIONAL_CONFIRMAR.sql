-- ============================================================================
-- MIGRAÇÃO FASE 0 & 1 (PARTE 2: LIMPEZA DESTRUTIVA DE COLUNAS E TABELAS LEGADAS)
-- ATENÇÃO: Execute apenas APÓS confirmar que a migração 20261029000001 foi
-- aplicada e que os dados foram migrados com sucesso!
-- ============================================================================

BEGIN;

-- 1. Remover colunas de rastreamento de rede e horário exato da tabela votos (Garantia de Sigilo)
ALTER TABLE public.votos DROP COLUMN IF EXISTS ip;
ALTER TABLE public.votos DROP COLUMN IF EXISTS user_agent;
ALTER TABLE public.votos DROP COLUMN IF EXISTS created_at;
ALTER TABLE public.votos DROP COLUMN IF EXISTS idade;

-- 2. Remover coluna JSONB legada de integrantes (migrada para public.chapa_integrantes)
ALTER TABLE public.chapas DROP COLUMN IF EXISTS integrantes;

-- 3. Remover tabelas legadas substituídas por participacoes e eleicoes
DROP TABLE IF EXISTS public.alunos_votaram;
DROP TABLE IF EXISTS public.configuracoes;

COMMIT;
