import { describe, it, expect } from 'vitest';
import {
  normalizarRa,
  calcularFaixaEtaria,
  extrairSerieDaTurma,
  calcularStatusEfetivoEleicao,
  aplicarKAnonimato,
  calcularResultadoEleitoral,
  RegistrarVotoSchema,
  LoginEleitorSchema,
} from '@/lib/validations';
import { acquireVoteLock, releaseVoteLock } from '@/server/store';
import { parseCsvTextToRows, processarLinhasImportacao } from '@/lib/spreadsheet';

describe('Regras de Voto, Apuração, Desempate, K-Anonimato e Janela Eleitoral', () => {
  it('normaliza RA removendo caracteres não numéricos e espaços', () => {
    expect(normalizarRa('  000.112.645.569-SP ')).toBe('000112645569');
    expect(normalizarRa('114087746')).toBe('114087746');
  });

  it('valida login de eleitor somente com RA (sem exigir senha ou dígito)', () => {
    const ok = LoginEleitorSchema.safeParse({ ra: '112645569' });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.ra).toBe('112645569');
    }

    const curto = LoginEleitorSchema.safeParse({ ra: '12' });
    expect(curto.success).toBe(false);
  });

  it('garante ausência de voto nulo: aceita apenas chapa válida ou voto em branco', () => {
    const branco = RegistrarVotoSchema.safeParse({
      ra: '112645569',
      chapaId: null,
      votoBranco: true,
      raca: 'Prefiro não informar',
      genero: 'Prefiro não informar',
    });
    expect(branco.success).toBe(true);

    const valido = RegistrarVotoSchema.safeParse({
      ra: '112645569',
      chapaId: 'aaaa1111-1111-4111-8111-111111111111',
      votoBranco: false,
      raca: 'Parda',
      genero: 'Feminino',
    });
    expect(valido.success).toBe(true);

    const nuloInvalido = RegistrarVotoSchema.safeParse({
      ra: '112645569',
      chapaId: null,
      votoBranco: false,
      raca: 'Branca',
      genero: 'Masculino',
    });
    expect(nuloInvalido.success).toBe(false);
  });

  it('bloqueia duplo voto simultâneo do mesmo RA por trava atômica', () => {
    const eleicaoId = 'eleicao-teste-atomico';
    const ra = '000112645569';

    // Duas requisições concorrentes tentando adquirir o lock para o mesmo (eleicaoId, ra)
    const req1 = acquireVoteLock(eleicaoId, ra);
    const req2Simultanea = acquireVoteLock(eleicaoId, ra);

    expect(req1).toBe(true);
    expect(req2Simultanea).toBe(false);

    // Após o commit do voto da req1, novas tentativas continuam bloqueadas definitivamente
    releaseVoteLock(eleicaoId, ra, true);
    const req3Posterior = acquireVoteLock(eleicaoId, ra);
    expect(req3Posterior).toBe(false);
  });

  it('calcula janela de tempo da eleição em tempo real a cada requisição', () => {
    const agora = new Date('2026-10-29T12:00:00Z');

    expect(
      calcularStatusEfetivoEleicao(
        {
          status: 'agendada',
          abre_em: '2026-10-29T10:00:00Z',
          encerra_em: '2026-10-29T18:00:00Z',
        },
        agora
      )
    ).toBe('aberta');

    expect(
      calcularStatusEfetivoEleicao(
        {
          status: 'aberta',
          abre_em: '2026-10-29T08:00:00Z',
          encerra_em: '2026-10-29T11:59:00Z',
        },
        agora
      )
    ).toBe('encerrada');

    expect(
      calcularStatusEfetivoEleicao(
        {
          status: 'aberta',
          abre_em: '2026-10-29T15:00:00Z',
          encerra_em: '2026-10-29T20:00:00Z',
        },
        agora
      )
    ).toBe('agendada');
  });

  it('calcula apuração eleitoral, percentuais e detecta empate técnico e desempate', () => {
    const chapasEmpatadas = [
      { chapa_id: 'c1', nome: 'Chapa Voz Ativa', numero: 1, total_votos: 120 },
      { chapa_id: 'c2', nome: 'Chapa Futuro Urbano', numero: 2, total_votos: 120 },
      { chapa_id: 'c3', nome: 'Chapa União', numero: 3, total_votos: 60 },
    ];

    const semDesempate = calcularResultadoEleitoral(chapasEmpatadas, 20, null);
    expect(semDesempate.votosValidos).toBe(300);
    expect(semDesempate.totalVotos).toBe(320);
    expect(semDesempate.empateTecnico).toBe(true);
    expect(semDesempate.vencedoraId).toBeNull();
    expect(semDesempate.chapasOrdenadas[0].percentual_validos).toBe(40);

    const comDesempate = calcularResultadoEleitoral(chapasEmpatadas, 20, 'c2');
    expect(comDesempate.empateTecnico).toBe(false);
    expect(comDesempate.vencedoraId).toBe('c2');
    expect(comDesempate.chapasOrdenadas[0].chapa_id).toBe('c2');
    expect(comDesempate.chapasOrdenadas[0].colocacao).toBe(1);
  });

  it('aplica regra de k-anonimato ocultando recortes com menos de 5 votos', () => {
    const dados = [
      { categoria: 'Feminino', total: 42 },
      { categoria: 'Não-binário', total: 3 },
      { categoria: 'Outro', total: 0 },
    ];

    const anonimizado = aplicarKAnonimato(dados);
    expect(anonimizado[0].oculto_anonimato).toBe(false);
    expect(anonimizado[0].total).toBe(42);
    expect(anonimizado[1].oculto_anonimato).toBe(true);
    expect(anonimizado[1].total).toBe(0);
    expect(anonimizado[2].oculto_anonimato).toBe(false);
    expect(anonimizado[2].total).toBe(0);
  });

  it('extrai série escolar e calcula faixa etária sem expor data de nascimento', () => {
    expect(extrairSerieDaTurma('1ª SÉRIE A')).toBe('1ª Série EM');
    expect(extrairSerieDaTurma('3 B')).toBe('3ª Série EM');
    expect(extrairSerieDaTurma('9º ANO C')).toBe('9º Ano EF');

    const ref = new Date('2026-06-15T12:00:00Z');
    expect(calcularFaixaEtaria('10/03/2010', ref)).toBe('15 a 16 anos');
    expect(calcularFaixaEtaria('01/01/2008', ref)).toBe('18 anos ou mais');
  });

  it('processa planilha CSV de alunos com relatório de erros por linha', () => {
    const csvSample = [
      'Nº de chamada;Nome do Aluno;RA;Dig. RA;UF RA;Data de Nascimento;Situação do Aluno',
      '1;ANA CLARA SILVA;000112645569;7;SP;12/04/2010;Ativo',
      '2;LINHA INVALIDA SEM RA;ABC;;SP;10/10/2010;Ativo',
    ].join('\n');

    const rows = parseCsvTextToRows(csvSample);
    const parsed = processarLinhasImportacao(rows, '1 A.csv');
    expect(parsed.validos).toHaveLength(1);
    expect(parsed.validos[0].ra).toBe('000112645569');
    expect(parsed.validos[0].turma).toBe('1 A');
    expect(parsed.erros).toHaveLength(1);
  });
});
