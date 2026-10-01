-- Tabela de Todos os Alunos (Importados do CSV)
CREATE TABLE public.alunos (
    ra TEXT PRIMARY KEY,
    digito_ra TEXT NOT NULL,
    nome TEXT NOT NULL,
    uf_ra TEXT,
    data_nascimento TEXT,
    situacao TEXT NOT NULL,
    turma TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura de alunos para todos" ON public.alunos FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de alunos" ON public.alunos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de alunos" ON public.alunos FOR UPDATE USING (true);

-- Tabela de Chapas
CREATE TABLE public.chapas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    numero INTEGER,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Registro de Alunos que Votaram (Garante que cada RA vote apenas uma vez e guarda quem votou)
CREATE TABLE public.alunos_votaram (
    ra TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    turma TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Votos Anônimos (Totalmente separada da tabela alunos_votaram para garantir o sigilo)
CREATE TABLE public.votos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chapa_id UUID REFERENCES public.chapas(id) NOT NULL,
    raca TEXT,
    genero TEXT,
    turma TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security) para permitir que a API (Next.js server-side) insira dados 
-- Como vamos usar o Supabase no lado do servidor com a chave de serviço (ou roles anônimos configurados),
-- é recomendado criar policies. Para simplificar no MVP e considerando que o acesso é Server-Side via Next.js
-- você pode manter as políticas abertas apenas para inserção e leitura autenticada, ou usar o service_role key no Next.js.

-- Políticas básicas de permissão para leitura e escrita pública (já que não há login)
-- AVISO: Em um ambiente de produção real, o ideal é que a inserção seja feita apenas pelo Backend (Next.js API route)
-- usando a chave SERVICE_ROLE, assim você pode desabilitar acesso público direto pelo frontend.

ALTER TABLE public.chapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alunos_votaram ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votos ENABLE ROW LEVEL SECURITY;

-- Permite leitura de chapas publicamente
CREATE POLICY "Permitir leitura de chapas para todos" ON public.chapas FOR SELECT USING (true);

-- Permite inserção de alunos que votaram e votos publicamente (via anon key)
CREATE POLICY "Permitir inserção de alunos_votaram" ON public.alunos_votaram FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir leitura de alunos_votaram" ON public.alunos_votaram FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de votos" ON public.votos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir leitura de votos" ON public.votos FOR SELECT USING (true);
CREATE POLICY "Permitir delecao de votos" ON public.votos FOR DELETE USING (true);
CREATE POLICY "Permitir delecao de alunos_votaram" ON public.alunos_votaram FOR DELETE USING (true);
CREATE POLICY "Permitir atualizar chapas" ON public.chapas FOR ALL USING (true);

-- Tabela de Configuracoes da Eleicao
CREATE TABLE IF NOT EXISTS public.configuracoes (
    id integer PRIMARY KEY DEFAULT 1,
    status text NOT NULL DEFAULT 'ativa'
);

INSERT INTO public.configuracoes (id, status) VALUES (1, 'ativa') ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura de configuracoes" ON public.configuracoes FOR SELECT USING (true);
CREATE POLICY "Permitir update de configuracoes" ON public.configuracoes FOR UPDATE USING (true);


-- Adiciona coluna idade na tabela votos
ALTER TABLE public.votos ADD COLUMN IF NOT EXISTS idade INTEGER;

