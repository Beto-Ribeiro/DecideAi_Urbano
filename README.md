# DecideAI — Sistema Eleitoral do Grêmio Estudantil
**E.E. Engenheiro Urbano Alves de Souza Pereira (`E.E. Urbano` — Taubaté / SP)**

Sistema oficial, auditável, 100% gratuito e adequado à LGPD para eleições de chapas do Grêmio Estudantil da **E.E. Engenheiro Urbano Alves de Souza Pereira**, construído com **Next.js 16.3 (App Router)**, **React 19**, **Tailwind CSS 4** e **Supabase (PostgreSQL + Storage)**.

---

## 1. Visão Geral das Frentes e Segurança

### Fase 0: Segurança, Sigilo do Voto e Integridade
- **Sessões Assinadas (`jose` JWT + `bcryptjs`)**: A senha antiga hardcoded (`gremio2026`) foi removida do código. O painel administrativo (`/admin`) e o portal da chapa (`/chapa`) utilizam sessões independentes assinadas com JWT (`HS256`) em cookies `httpOnly`, `secure`, `sameSite: 'strict'` e expiração curta.
- **Segredo Absoluto do Voto**: A tabela `votos` não armazena `ra`, `ip`, `user_agent` nem `created_at`. É matematicamente impossível cruzar horário ou IP para identificar em quem um estudante votou.
- **Atomicidade e Unicidade (`registrar_voto`)**: Uma função transacional PostgreSQL (`SECURITY DEFINER`) + trava atômica em memória por `(eleicao_id, ra)` garante que o comparecimento (`participacoes`, PK `(eleicao_id, ra)`) e a cédula anônima (`votos`) sejam gravados juntos, impedindo duplo voto mesmo em requisições simultâneas.
- **RLS Estrito**: Todas as tabelas possuem Row Level Security ativado e fechado para acesso anônimo direto. Apenas chapas aprovadas permitem leitura pública; operações sensíveis passam exclusivamente pelo servidor com `SUPABASE_SERVICE_ROLE_KEY`.
- **Sem Voto Nulo**: As únicas opções de voto são chapas homologadas (`tipo = 'valido'`) ou voto em branco (`tipo = 'branco'`).

### Frente 1: Urna do Eleitor (`/`, `/urna`, `/resultados`)
- **Login Somente com RA (Sem Senha e Sem Dígito)**: O campo de dígito foi removido da interface (mantendo `digito_ra` no banco). O eleitor digita apenas o RA, visualiza a tela de confirmação (Nome, Turma, Data de Nascimento) com o botão **"Não sou eu"** (que registra alerta em `log_auditoria`), responde às perguntas demográficas opcionais com **"Prefiro não informar"** e aviso de anonimato.
- **Conheça as Chapas & Comparador**: Cards das chapas aprovadas, modal com abas (Propostas por Eixo, Integrantes e PDF), comparador lado a lado de até 3 chapas e favorita salva apenas no `localStorage`.
- **Urna, Protocolo e Adesivo "Eu Votei"**: Modal próprio de confirmação (sem `window.confirm`), som de urna com opção de silenciar, protocolo de participação sem revelar a chapa, bloqueio do botão voltar, reset automático para o próximo aluno, modo quiosque em `/urna` e geração do adesivo PNG **"Eu Votei"** no navegador com o selo circular branco da `E.E. Urbano`.

### Frente 2: Painel Administrativo (`/admin`)
- **Visão Geral**: 4 KPIs executivos, apuração por chapa via views SQL (sem baixar todos os votos para o cliente), fluxo por hora, participação por série e turma, meta de participação e polling leve a cada 12 segundos.
- **Eleitores**: Tabela paginada no servidor mostrando apenas se o aluno compareceu e quando, filtro por turma e status, exportação CSV e lista de chamada/pendentes em PDF.
- **Chapas**: Cadastro e edição em 4 etapas (Identidade, Propostas por Eixo, Integrantes com busca automática por RA, Credenciais do Portal da Chapa com gerador de senha forte). Upload de imagens com compressão WebP no navegador (`<= 300 KB`) e validação de PDF (`<= 5 MB`).
- **Controle da Eleição**: Janela de abertura/encerramento verificada a cada requisição, encerramento com confirmação em duas etapas (`ENCERRAR URNA`), tratamento regimental de empate, arquivamento seguro para iniciar nova eleição sem apagar histórico e expurgo LGPD de fim de ciclo.
- **Auditoria & Ata Oficial**: Verificação criptográfica de paridade (`participacoes == votos`), log de auditoria completo e emissão da **Ata Oficial da Eleição em PDF** no navegador.
- **Importação de Alunos**: Importador CSV/XLSX (padrão SED-SP) direto pelo painel com pré-visualização e relatório de erros por linha.

### Frente 3: Portal da Chapa (`/chapa` — Somente Leitura) e Certificados (`/verificar/[codigo]`)
- **Portal Somente Leitura**: Login exclusivo com usuário e senha criados pelo admin. Enquanto a eleição está aberta, exibe apenas o comparecimento geral da escola; após encerramento e publicação, libera colocação, votos por série e sala, perfil dos eleitores (ocultando recortes `< 5` votos por **k-anonimato**), destaques para a próxima gestão (com exportação PDF) e o **Certificado Oficial A4 Paisagem em PDF** (Vitória ou Participação Democrática) com QR Code para `/verificar/[codigo]`.

---

## 2. Logotipos Institucionais (`public/brand/`)

O sistema referencia os logotipos oficiais centralizados em `src/lib/escola.ts`:
- `public/brand/logo-escola.jpg`: Brasão circular preto e branco da **E.E. Engenheiro Urbano Alves de Souza Pereira** (exibido sempre dentro de um selo circular branco `#FFFFFF` para preservar contraste no modo escuro).
- `public/brand/logo-sp-educacao.png`: Logotipo oficial do **Governo do Estado de São Paulo / Secretaria da Educação**, utilizado na Ata e nos Certificados.

> **Nota**: Enquanto esses dois arquivos físicos não forem adicionados na pasta `public/brand/`, o sistema renderiza automaticamente **placeholders institucionais claramente identificados** na interface e nos PDFs, sem inventar ou desenhar logotipos falsos. Basta copiar os arquivos reais para `public/brand/logo-escola.jpg` e `public/brand/logo-sp-educacao.png` para que apareçam automaticamente.

---

## 3. Como Configurar e Rodar Localmente

1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Configurar variáveis de ambiente**:
   Copie o arquivo `.env.example` para `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Edite `.env.local` e preencha:
   - `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (chave secreta do Supabase — nunca exponha com `NEXT_PUBLIC_`)
   - `AUTH_JWT_SECRET` (string aleatória de 32+ bytes para assinar os cookies JWT)
   - `ADMIN_PASSWORD_HASH` (gere um hash bcrypt da sua nova senha administrativa ou defina `ADMIN_PASSWORD` em ambiente local).
   - **Importante**: Como a senha antiga (`gremio2026`) esteve exposta no histórico do Git, utilize uma senha forte totalmente nova em produção.

3. **Aplicar a Migração SQL no Supabase**:
   - No painel do Supabase (`SQL Editor`), execute o script não-destrutivo:
     `supabase/migrations/20261029000001_fase0_e_1_schema_nao_destrutivo.sql` (ou `supabase_schema.sql`).
   - *(Opcional)* Após conferir que todos os dados antigos foram migrados, e somente se desejar remover as colunas/tabelas legadas (`votos.ip`, `votos.user_agent`, `alunos_votaram`), execute `supabase/migrations/20261029000002_fase0_limpeza_destrutiva_OPCIONAL_CONFIRMAR.sql`.

4. **Executar em desenvolvimento**:
   ```bash
   npm run dev
   ```
   Acesse `http://localhost:3000`.

---

## 4. Como Acessar o Primeiro Admin e Cadastrar a Primeira Chapa

1. Acesse `http://localhost:3000/admin`.
2. Digite a senha definida em `ADMIN_PASSWORD` / `ADMIN_PASSWORD_HASH` (padrão de desenvolvimento local caso não configurada: `Urbano@Admin2026!`).
3. Na aba **"Importar Alunos & Escola"**, importe as planilhas `.csv` ou `.xlsx` das turmas (ou utilize as turmas já carregadas da pasta `Alunos/`) e revise os nomes e cargos de quem assina a Ata e os Certificados.
4. Na aba **"Chapas & Acessos"**, clique em **"Cadastrar Nova Chapa"**:
   - **Etapa 1**: Preencha Nome, Número, Slogan, Cor e envie a Logo (convertida automaticamente para WebP `<= 300 KB`) e o PDF de propostas (`<= 5 MB`).
   - **Etapa 2**: Cadastre as propostas por eixo temático.
   - **Etapa 3**: Digite o RA dos integrantes e clique na lupa para buscar Nome e Turma automaticamente.
   - **Etapa 4**: Defina o usuário da chapa (ex: `chapa01`), clique em **"Gerar Forte"** para criar a senha, clique em **"Copiar"** para entregá-la aos representantes da chapa e salve.
5. Na aba **"Controle da Eleição"**, defina o status como **Aberta** (ou configure a data/hora de abertura e encerramento automáticos).

---

## 5. Deploy Gratuito na Vercel Hobby + Supabase Free

- O arquivo `vercel.json` já configura um **Vercel Cron diário** (`0 9 * * *` — compatível com o limite gratuito do plano Hobby) que chama `/api/health`, realizando uma consulta leve ao Supabase para evitar a pausa automática após 7 dias de inatividade.
- Todos os PDFs (Certificados A4 Paisagem, Ata Oficial, Lista de Presença, Diagnóstico da Chapa) e o adesivo PNG "Eu Votei" são gerados **100% no navegador do cliente**, sem consumir tempo de CPU ou memória das Serverless Functions da Vercel.

---

## 6. Testes Automatizados

- **Testes Unitários (Vitest)**:
  ```bash
  npm test
  ```
- **Testes E2E (Playwright)**:
  ```bash
  npm run test:e2e
  ```
