'use client';

import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Save,
  AlertCircle,
} from 'lucide-react';
import { ConfiguracaoEscola } from '@/lib/escola';
import { lerArquivoImportacao, ResultadoPreviewImportacao } from '@/lib/spreadsheet';
import {
  importarAlunosLoteAdminAction,
  salvarConfiguracaoEscolaAdminAction,
} from '@/server/actions';

interface AdminImportarTabProps {
  escola: ConfiguracaoEscola;
  onRefresh: () => void;
}

export function AdminImportarTab({ escola, onRefresh }: AdminImportarTabProps) {
  const [resultadoParse, setResultadoParse] =
    useState<ResultadoPreviewImportacao | null>(null);
  const [turmaPadrao, setTurmaPadrao] = useState('1ª SÉRIE A');
  const [importando, setImportando] = useState(false);
  const [salvandoEscola, setSalvandoEscola] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(
    null
  );

  // Estado de Configuração da Escola (configuracoes_escola)
  const [nome, setNome] = useState(escola.nome);
  const [nomeCurto, setNomeCurto] = useState(escola.nomeCurto);
  const [cidade, setCidade] = useState(escola.cidade);
  const [diretoriaEnsino, setDiretoriaEnsino] = useState(escola.diretoriaEnsino);
  const [textoBoasVindas] = useState(escola.textoBoasVindas);
  const [metaParticipacao, setMetaParticipacao] = useState(escola.metaParticipacao);
  const [direcaoNome, setDirecaoNome] = useState(escola.assinaturas.direcao.nome);
  const [direcaoCargo, setDirecaoCargo] = useState(escola.assinaturas.direcao.cargo);
  const [coordNome, setCoordNome] = useState(escola.assinaturas.coordenacao.nome);
  const [coordCargo, setCoordCargo] = useState(escola.assinaturas.coordenacao.cargo);
  const [comissaoNome, setComissaoNome] = useState(escola.assinaturas.comissao.nome);
  const [comissaoCargo, setComissaoCargo] = useState(escola.assinaturas.comissao.cargo);

  const handleSelecionarPlanilha = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMensagem(null);
    try {
      const parsed = await lerArquivoImportacao(file, turmaPadrao);
      setResultadoParse(parsed);
    } catch (err) {
      setMensagem({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao ler planilha.',
      });
    }
  };

  const handleConfirmarImportacao = async () => {
    if (!resultadoParse || resultadoParse.validos.length === 0) return;
    setImportando(true);
    setMensagem(null);
    try {
      const res = await importarAlunosLoteAdminAction(resultadoParse.validos);
      if (res.error) {
        setMensagem({ tipo: 'erro', texto: res.error });
      } else {
        setMensagem({
          tipo: 'ok',
          texto: `${res.importados} estudantes importados/atualizados com sucesso no banco de dados!`,
        });
        setResultadoParse(null);
        onRefresh();
      }
    } finally {
      setImportando(false);
    }
  };

  const handleSalvarEscola = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoEscola(true);
    setMensagem(null);
    try {
      const res = await salvarConfiguracaoEscolaAdminAction({
        nome,
        nome_curto: nomeCurto,
        cidade,
        diretoria_ensino: diretoriaEnsino,
        texto_boas_vindas: textoBoasVindas,
        meta_participacao: Number(metaParticipacao),
        direcao_nome: direcaoNome,
        direcao_cargo: direcaoCargo,
        coordenacao_nome: coordNome,
        coordenacao_cargo: coordCargo,
        comissao_nome: comissaoNome,
        comissao_cargo: comissaoCargo,
      });
      if (res.error) {
        setMensagem({ tipo: 'erro', texto: res.error });
      } else {
        setMensagem({
          tipo: 'ok',
          texto: 'Identidade institucional e assinaturas da escola atualizadas!',
        });
        onRefresh();
      }
    } finally {
      setSalvandoEscola(false);
    }
  };

  return (
    <div className="space-y-8">
      {mensagem && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            mensagem.tipo === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {mensagem.tipo === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{mensagem.texto}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensagem(null)}
            className="underline ml-4 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* 1. Importador de Alunos CSV / XLSX com Pré-visualização e Relatório de Erros */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#004ac6]" />
              Importação de Alunos via CSV ou XLSX (SED-SP)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Substitui os scripts antigos de terminal. Aceita planilhas CSV ou Excel (.xlsx) da Secretaria Escolar Digital com pré-visualização e validação por linha.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
              Turma Padrão (Caso a planilha não tenha coluna Turma)
            </label>
            <input
              type="text"
              value={turmaPadrao}
              onChange={(e) => setTurmaPadrao(e.target.value)}
              placeholder="Ex: 1ª SÉRIE A"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
            />
          </div>

          <div className="md:col-span-2">
            <label className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-[#004ac6]/40 bg-blue-50/40 dark:bg-blue-950/20 text-[#004ac6] dark:text-blue-400 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-blue-50 transition-colors">
              <Upload className="w-4 h-4" />
              Selecionar Arquivo .CSV ou .XLSX para Pré-Visualização
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleSelecionarPlanilha}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Pré-visualização e Relatório de Erros por Linha */}
        {resultadoParse && (
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-6 text-xs">
                <span>
                  Linhas Lidas: <strong>{resultadoParse.totalLinhasLidas}</strong>
                </span>
                <span className="text-emerald-600 font-bold">
                  Válidos para Importar: {resultadoParse.validos.length}
                </span>
                <span className="text-amber-600 font-bold">
                  Erros / Ignorados: {resultadoParse.erros.length}
                </span>
              </div>

              <button
                type="button"
                disabled={importando || resultadoParse.validos.length === 0}
                onClick={handleConfirmarImportacao}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {importando
                  ? 'Importando...'
                  : `Confirmar Importação (${resultadoParse.validos.length} alunos)`}
              </button>
            </div>

            {resultadoParse.erros.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 max-h-40 overflow-y-auto space-y-1">
                <div className="text-xs font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Relatório de Erros por Linha ({resultadoParse.erros.length})
                </div>
                {resultadoParse.erros.slice(0, 30).map((err, i) => (
                  <p key={i} className="text-[11px] font-mono text-amber-800 dark:text-amber-300">
                    • Linha {err.linha}: {err.motivo} ({err.ra || err.nome || 'Sem RA'})
                  </p>
                ))}
              </div>
            )}

            <div className="overflow-x-auto max-h-60 border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] font-extrabold uppercase text-slate-500">
                    <th className="py-2 px-3">RA</th>
                    <th className="py-2 px-3">Dígito (Mantido no BD)</th>
                    <th className="py-2 px-3">Nome do Aluno</th>
                    <th className="py-2 px-3">Turma</th>
                    <th className="py-2 px-3">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {resultadoParse.validos.slice(0, 15).map((a) => (
                    <tr key={a.ra}>
                      <td className="py-2 px-3 font-mono font-bold">{a.ra}</td>
                      <td className="py-2 px-3 font-mono text-slate-400">
                        {a.digito_ra || '—'}
                      </td>
                      <td className="py-2 px-3 font-semibold">{a.nome}</td>
                      <td className="py-2 px-3">{a.turma}</td>
                      <td className="py-2 px-3">{a.situacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 2. Configuração Institucional da Escola e Assinaturas da Ata/Certificados */}
      <form
        onSubmit={handleSalvarEscola}
        className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6"
      >
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#004ac6]" />
            Identidade Institucional & Assinaturas Oficiais (configuracoes_escola)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sobrescreve os dados padrão de <code className="font-mono">src/lib/escola.ts</code> nos cabeçalhos, rodapés, certificados e ata eleitoral.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Nome Completo da Escola
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Nome Curto
            </label>
            <input
              type="text"
              required
              value={nomeCurto}
              onChange={(e) => setNomeCurto(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Cidade
            </label>
            <input
              type="text"
              required
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Diretoria de Ensino
            </label>
            <input
              type="text"
              required
              value={diretoriaEnsino}
              onChange={(e) => setDiretoriaEnsino(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Meta de Participação (%)
            </label>
            <input
              type="number"
              min={10}
              max={100}
              value={metaParticipacao}
              onChange={(e) => setMetaParticipacao(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase text-[#004ac6]">
              1ª Assinatura (Direção)
            </span>
            <input
              type="text"
              value={direcaoNome}
              onChange={(e) => setDirecaoNome(e.target.value)}
              placeholder="Nome do(a) Diretor(a)"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
            />
            <input
              type="text"
              value={direcaoCargo}
              onChange={(e) => setDirecaoCargo(e.target.value)}
              placeholder="Cargo"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase text-[#004ac6]">
              2ª Assinatura (Coordenação)
            </span>
            <input
              type="text"
              value={coordNome}
              onChange={(e) => setCoordNome(e.target.value)}
              placeholder="Nome do(a) Coordenador(a)"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
            />
            <input
              type="text"
              value={coordCargo}
              onChange={(e) => setCoordCargo(e.target.value)}
              placeholder="Cargo"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase text-[#004ac6]">
              3ª Assinatura (Comissão Eleitoral)
            </span>
            <input
              type="text"
              value={comissaoNome}
              onChange={(e) => setComissaoNome(e.target.value)}
              placeholder="Nome da Comissão"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
            />
            <input
              type="text"
              value={comissaoCargo}
              onChange={(e) => setComissaoCargo(e.target.value)}
              placeholder="Cargo"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={salvandoEscola}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#004ac6] hover:bg-[#0037b0] text-white text-xs font-bold shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {salvandoEscola ? 'Salvando...' : 'Salvar Identidade e Assinaturas'}
          </button>
        </div>
      </form>
    </div>
  );
}
