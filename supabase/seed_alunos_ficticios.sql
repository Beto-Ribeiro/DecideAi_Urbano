-- ============================================================================
-- SEED SINTÉTICO PARA HOMOLOGAÇÃO E DEMONSTRAÇÃO (CONFORMIDADE LGPD)
-- Sistema DecideAI — E.E. Engenheiro Urbano Alves de Souza Pereira
-- Nota: Nenhum dado real de estudante é versionado no repositório público.
-- Todos os registros abaixo são fictícios e exclusivos para testes locais.
-- ============================================================================

BEGIN;

INSERT INTO public.alunos (ra, digito_ra, nome, uf_ra, data_nascimento, situacao, turma)
VALUES
  ('100000000001', '1', 'ESTUDANTE DEMONSTRACAO 01', 'SP', '10/03/2010', 'Ativo', '1 A'),
  ('100000000002', '2', 'ESTUDANTE DEMONSTRACAO 02', 'SP', '22/05/2010', 'Ativo', '1 A'),
  ('100000000003', '3', 'ESTUDANTE DEMONSTRACAO 03', 'SP', '14/07/2010', 'Ativo', '1 B'),
  ('100000000004', '4', 'ESTUDANTE DEMONSTRACAO 04', 'SP', '05/09/2009', 'Ativo', '2 A'),
  ('100000000005', '5', 'ESTUDANTE DEMONSTRACAO 05', 'SP', '18/11/2009', 'Ativo', '2 B'),
  ('100000000006', '6', 'ESTUDANTE DEMONSTRACAO 06', 'SP', '30/01/2009', 'Ativo', '2 DS'),
  ('100000000007', '7', 'ESTUDANTE DEMONSTRACAO 07', 'SP', '12/04/2008', 'Ativo', '3 A'),
  ('100000000008', '8', 'ESTUDANTE DEMONSTRACAO 08', 'SP', '25/06/2008', 'Ativo', '3 B'),
  ('100000000009', '9', 'ESTUDANTE DEMONSTRACAO 09', 'SP', '08/08/2008', 'Ativo', '3 DS'),
  ('100000000010', '0', 'ESTUDANTE DEMONSTRACAO 10', 'SP', '19/10/2009', 'Transferido', '2 A')
ON CONFLICT (ra) DO UPDATE SET
  digito_ra       = EXCLUDED.digito_ra,
  nome            = EXCLUDED.nome,
  uf_ra           = EXCLUDED.uf_ra,
  data_nascimento = EXCLUDED.data_nascimento,
  situacao        = EXCLUDED.situacao,
  turma           = EXCLUDED.turma;

COMMIT;
