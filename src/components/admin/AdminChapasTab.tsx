'use client';

import React, { useState } from 'react';
import {
  Plus,
  Edit3,
  CheckCircle2,
  EyeOff,
  Archive,
  KeyRound,
  Search,
  Upload,
  Trash2,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { ChapaCompleta, StatusChapa } from '@/lib/database.types';
import { EIXOS_PROPOSTAS } from '@/lib/validations';
import { comprimirImagemParaWebP, validarPdfPropostas } from '@/lib/image-compression';
import {
  salvarChapaAdminAction,
  alterarStatusChapaAdminAction,
  arquivarOuExcluirChapaAdminAction,
  gerenciarCredencialChapaAdminAction,
  buscarAlunoPorRaAdminAction,
  uploadArquivoChapaAdminAction,
} from '@/server/actions';

interface AdminChapasTabProps {
  chapas: ChapaCompleta[];
  onRefresh: () => void;
}

interface PropostaDraft {
  eixo: string;
  titulo: string;
  descricao: string;
}

interface IntegranteDraft {
  aluno_ra: string;
  nome: string;
  cargo: string;
  turma: string;
  foto_url: string | null;
}

function gerarSenhaForteCliente(tamanho = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  const arr = new Uint32Array(tamanho);
  window.crypto.getRandomValues(arr);
  return Array.from(arr, (v) => chars[v % chars.length]).join('');
}

export function AdminChapasTab({ chapas, onRefresh }: AdminChapasTabProps) {
  const [modoFormulario, setModoFormulario] = useState(false);
  const [etapaWizard, setEtapaWizard] = useState<1 | 2 | 3 | 4>(1);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(
    null
  );

  // Estado do formulário em 4 etapas
  const [idEdicao, setIdEdicao] = useState<string | undefined>(undefined);
  const [nome, setNome] = useState('');
  const [numero, setNumero] = useState('01');
  const [slogan, setSlogan] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cor, setCor] = useState('#004ac6');
  const [status, setStatus] = useState<StatusChapa>('aprovada');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [propostasUrl, setPropostasUrl] = useState<string | null>(null);
  const [uploadingArquivo, setUploadingArquivo] = useState(false);

  // Etapa 2: Propostas por eixo
  const [propostas, setPropostas] = useState<PropostaDraft[]>([
    { eixo: 'Educação', titulo: '', descricao: '' },
  ]);

  // Etapa 3: Integrantes com busca por RA
  const [integrantes, setIntegrantes] = useState<IntegranteDraft[]>([
    { aluno_ra: '', nome: '', cargo: 'Presidente', turma: '', foto_url: null },
  ]);
  const [buscandoRaIdx, setBuscandoRaIdx] = useState<number | null>(null);

  // Etapa 4: Acesso do Portal da Chapa (somente leitura)
  const [acessoUsuario, setAcessoUsuario] = useState('');
  const [acessoSenha, setAcessoSenha] = useState('');
  const [copiado, setCopiado] = useState(false);

  // Modal de redefinição rápida de acesso
  const [modalCredencialChapa, setModalCredencialChapa] = useState<ChapaCompleta | null>(
    null
  );
  const [credUsuario, setCredUsuario] = useState('');
  const [credNovaSenha, setCredNovaSenha] = useState('');
  const [credAtivo, setCredAtivo] = useState(true);

  const iniciarNovaChapa = () => {
    setIdEdicao(undefined);
    setNome('');
    setNumero(String(chapas.length + 1).padStart(2, '0'));
    setSlogan('');
    setDescricao('');
    setCor('#004ac6');
    setStatus('aprovada');
    setLogoUrl(null);
    setPropostasUrl(null);
    setPropostas([{ eixo: 'Educação', titulo: '', descricao: '' }]);
    setIntegrantes([
      { aluno_ra: '', nome: '', cargo: 'Presidente', turma: '', foto_url: null },
      { aluno_ra: '', nome: '', cargo: 'Vice-Presidente', turma: '', foto_url: null },
    ]);
    setAcessoUsuario(`chapa${String(chapas.length + 1).padStart(2, '0')}`);
    setAcessoSenha(gerarSenhaForteCliente(10));
    setEtapaWizard(1);
    setModoFormulario(true);
    setMensagem(null);
  };

  const iniciarEdicaoChapa = (c: ChapaCompleta) => {
    setIdEdicao(c.id);
    setNome(c.nome);
    setNumero(String(c.numero || '01').padStart(2, '0'));
    setSlogan(c.slogan || '');
    setDescricao(c.descricao || '');
    setCor(c.cor || '#004ac6');
    setStatus(c.status);
    setLogoUrl(c.logo_url);
    setPropostasUrl(c.propostas_url);
    setPropostas(
      c.propostas.length > 0
        ? c.propostas.map((p) => ({
            eixo: p.eixo,
            titulo: p.titulo,
            descricao: p.descricao,
          }))
        : [{ eixo: 'Educação', titulo: '', descricao: '' }]
    );
    setIntegrantes(
      c.integrantes.length > 0
        ? c.integrantes.map((i) => ({
            aluno_ra: i.aluno_ra || '',
            nome: i.nome,
            cargo: i.cargo,
            turma: i.turma,
            foto_url: i.foto_url,
          }))
        : [{ aluno_ra: '', nome: '', cargo: 'Presidente', turma: '', foto_url: null }]
    );
    setAcessoUsuario(c.acesso?.usuario || '');
    setAcessoSenha('');
    setEtapaWizard(1);
    setModoFormulario(true);
    setMensagem(null);
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingArquivo(true);
    setMensagem(null);
    try {
      const comprimido = await comprimirImagemParaWebP(file, 600);
      const fd = new FormData();
      fd.append('file', comprimido);
      fd.append('tipo', 'logo');
      const res = await uploadArquivoChapaAdminAction(fd);
      if (res.error) {
        setMensagem({ tipo: 'erro', texto: res.error });
      } else if (res.url) {
        setLogoUrl(res.url);
        setMensagem({
          tipo: 'ok',
          texto: `Logo comprimido para WebP (${Math.round(comprimido.size / 1024)} KB) com sucesso!`,
        });
      }
    } catch (err) {
      setMensagem({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao comprimir imagem.',
      });
    } finally {
      setUploadingArquivo(false);
    }
  };

  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const valid = validarPdfPropostas(file);
    if (!valid.valido) {
      setMensagem({ tipo: 'erro', texto: valid.erro || 'PDF inválido.' });
      return;
    }
    setUploadingArquivo(true);
    setMensagem(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('tipo', 'propostas');
      const res = await uploadArquivoChapaAdminAction(fd);
      if (res.error) {
        setMensagem({ tipo: 'erro', texto: res.error });
      } else if (res.url) {
        setPropostasUrl(res.url);
        setMensagem({ tipo: 'ok', texto: 'Documento PDF de propostas anexado!' });
      }
    } finally {
      setUploadingArquivo(false);
    }
  };

  const handleBuscarAlunoPorRa = async (idx: number) => {
    const raBusca = integrantes[idx]?.aluno_ra;
    if (!raBusca) return;
    setBuscandoRaIdx(idx);
    try {
      const res = await buscarAlunoPorRaAdminAction(raBusca);
      if (res.encontrado && res.aluno) {
        const novos = [...integrantes];
        novos[idx] = {
          ...novos[idx],
          aluno_ra: res.aluno.ra,
          nome: res.aluno.nome,
          turma: res.aluno.turma,
        };
        setIntegrantes(novos);
      } else {
        setMensagem({
          tipo: 'erro',
          texto: `RA "${raBusca}" não encontrado no banco de alunos. Você pode preencher nome e turma manualmente.`,
        });
      }
    } finally {
      setBuscandoRaIdx(null);
    }
  };

  const handleSalvarChapa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setMensagem(null);
    try {
      const payload = {
        id: idEdicao,
        nome,
        numero,
        slogan,
        descricao,
        cor,
        status,
        logo_url: logoUrl,
        propostas_url: propostasUrl,
        propostas: propostas.filter((p) => p.titulo.trim() && p.descricao.trim()),
        integrantes: integrantes.filter((i) => i.nome.trim() && i.cargo.trim()),
        acessoUsuario: acessoUsuario.trim() || undefined,
        acessoSenha: acessoSenha.trim() || undefined,
      };
      const res = await salvarChapaAdminAction(payload);
      if (res.error) {
        setMensagem({ tipo: 'erro', texto: res.error });
      } else {
        setModoFormulario(false);
        setMensagem({
          tipo: 'ok',
          texto: `Chapa "${nome}" salva e homologada com sucesso!`,
        });
        onRefresh();
      }
    } finally {
      setSalvando(false);
    }
  };

  const handleAlterarStatus = async (chapaId: string, novoStatus: StatusChapa) => {
    const res = await alterarStatusChapaAdminAction(chapaId, novoStatus);
    if (res.error) {
      setMensagem({ tipo: 'erro', texto: res.error });
    } else {
      setMensagem({
        tipo: 'ok',
        texto: `Status da chapa atualizado para "${novoStatus.toUpperCase()}".`,
      });
      onRefresh();
    }
  };

  const handleArquivarOuExcluir = async (chapaId: string) => {
    const res = await arquivarOuExcluirChapaAdminAction(chapaId);
    if (res.error) {
      setMensagem({ tipo: 'erro', texto: res.error });
    } else {
      setMensagem({ tipo: 'ok', texto: res.message || 'Operação concluída.' });
      onRefresh();
    }
  };

  const abrirModalCredencial = (c: ChapaCompleta) => {
    setModalCredencialChapa(c);
    setCredUsuario(c.acesso?.usuario || `chapa${c.numero || '01'}`);
    setCredNovaSenha('');
    setCredAtivo(c.acesso ? c.acesso.ativo : true);
  };

  const salvarCredencialRapida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCredencialChapa) return;
    const res = await gerenciarCredencialChapaAdminAction({
      chapaId: modalCredencialChapa.id,
      usuario: credUsuario,
      novaSenha: credNovaSenha.trim() || undefined,
      ativo: credAtivo,
    });
    if (res.error) {
      setMensagem({ tipo: 'erro', texto: res.error });
    } else {
      setModalCredencialChapa(null);
      setMensagem({
        tipo: 'ok',
        texto: `Credenciais do Portal da Chapa "${modalCredencialChapa.nome}" atualizadas (hash bcrypt)!`,
      });
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Cabeçalho */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Gestão de Chapas & Credenciais do Portal da Chapa
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastro exclusivo pela Comissão Eleitoral. O portal da chapa (/chapa) é 100% somente leitura e usa senha com hash bcrypt.
          </p>
        </div>
        {!modoFormulario && (
          <button
            type="button"
            onClick={iniciarNovaChapa}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#004ac6] hover:bg-[#0037b0] text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Nova Chapa
          </button>
        )}
      </div>

      {/* Formulário em 4 Etapas (Wizard) */}
      {modoFormulario && (
        <form
          onSubmit={handleSalvarChapa}
          className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border-2 border-[#004ac6]/30 shadow-xl space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#004ac6] dark:text-blue-400">
                {idEdicao ? 'Editando Chapa Existente' : 'Novo Registro Eleitoral'}
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {nome || 'Nova Chapa Estudantil'}
              </h3>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {[
                { n: 1, label: '1. Identidade' },
                { n: 2, label: '2. Propostas' },
                { n: 3, label: '3. Integrantes (RA)' },
                { n: 4, label: '4. Acesso (/chapa)' },
              ].map((step) => (
                <button
                  key={step.n}
                  type="button"
                  onClick={() => setEtapaWizard(step.n as 1 | 2 | 3 | 4)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    etapaWizard === step.n
                      ? 'bg-[#004ac6] text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60'
                  }`}
                >
                  {step.label}
                </button>
              ))}
            </div>
          </div>

          {/* ETAPA 1: Identidade e Arquivos */}
          {etapaWizard === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                  Nome Oficial da Chapa *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Chapa Voz Ativa Urbano"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                    Número (2-3 díg) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    value={numero}
                    onChange={(e) => setNumero(e.target.value.replace(/\D/g, ''))}
                    placeholder="01"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                    Cor Cívica
                  </label>
                  <input
                    type="color"
                    value={cor}
                    onChange={(e) => setCor(e.target.value)}
                    className="w-full h-10 rounded-xl cursor-pointer border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                    Status Inicial
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusChapa)}
                    className="w-full px-2.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  >
                    <option value="aprovada">Aprovada (Na Urna)</option>
                    <option value="rascunho">Rascunho</option>
                    <option value="oculta">Oculta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                  Slogan da Campanha
                </label>
                <input
                  type="text"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  placeholder="Ex: União, Esporte e Cultura para toda a E.E. Urbano!"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                  Resumo / Apresentação Geral
                </label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Breve síntese da visão da chapa"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                />
              </div>

              {/* Upload de Logo WebP e PDF de Propostas */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold block">
                    Logo da Chapa (WebP Automático ≤ 300 KB)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {logoUrl ? 'Imagem carregada e otimizada' : 'Opcional (comprimido no navegador)'}
                  </span>
                </div>
                <label className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer hover:bg-slate-100 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingArquivo ? 'Enviando...' : 'Escolher Imagem'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadLogo}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold block">
                    Programa Oficial em PDF (Máx. 5 MB)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {propostasUrl ? 'Documento PDF anexado' : 'Exibido na aba Documentos do eleitor'}
                  </span>
                </div>
                <label className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer hover:bg-slate-100 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  {uploadingArquivo ? 'Enviando...' : 'Anexar PDF'}
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleUploadPdf}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* ETAPA 2: Propostas por Eixo */}
          {etapaWizard === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Cadastre as propostas estruturadas por eixo temático (Cultura, Esporte, Educação, Infraestrutura, Convivência).
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setPropostas([
                      ...propostas,
                      { eixo: 'Cultura', titulo: '', descricao: '' },
                    ])
                  }
                  className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#004ac6] dark:text-blue-400 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Proposta
                </button>
              </div>

              {propostas.map((prop, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-3 items-start"
                >
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Eixo Temático
                    </label>
                    <select
                      value={prop.eixo}
                      onChange={(e) => {
                        const n = [...propostas];
                        n[idx].eixo = e.target.value;
                        setPropostas(n);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    >
                      {EIXOS_PROPOSTAS.map((ex) => (
                        <option key={ex} value={ex}>
                          {ex}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Título da Proposta
                    </label>
                    <input
                      type="text"
                      value={prop.titulo}
                      onChange={(e) => {
                        const n = [...propostas];
                        n[idx].titulo = e.target.value;
                        setPropostas(n);
                      }}
                      placeholder="Ex: Torneio Interclasses Semestral"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>

                  <div className="md:col-span-2 flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Descrição Detalhada
                      </label>
                      <input
                        type="text"
                        value={prop.descricao}
                        onChange={(e) => {
                          const n = [...propostas];
                          n[idx].descricao = e.target.value;
                          setPropostas(n);
                        }}
                        placeholder="Como será realizada na escola"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                      />
                    </div>
                    {propostas.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setPropostas(propostas.filter((_, i) => i !== idx))
                        }
                        className="p-2 rounded-xl text-red-600 hover:bg-red-50 cursor-pointer"
                        title="Remover proposta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ETAPA 3: Integrantes com Busca por RA */}
          {etapaWizard === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Digite o RA do estudante e clique na lupa para preencher automaticamente Nome e Turma a partir do cadastro da E.E. Urbano.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setIntegrantes([
                      ...integrantes,
                      { aluno_ra: '', nome: '', cargo: 'Secretário(a)', turma: '', foto_url: null },
                    ])
                  }
                  className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#004ac6] dark:text-blue-400 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Integrante
                </button>
              </div>

              {integrantes.map((intg, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
                >
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      RA (Busca Automática)
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={intg.aluno_ra}
                        onChange={(e) => {
                          const n = [...integrantes];
                          n[idx].aluno_ra = e.target.value;
                          setIntegrantes(n);
                        }}
                        placeholder="Ex: 112645569"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleBuscarAlunoPorRa(idx)}
                        disabled={buscandoRaIdx === idx}
                        className="px-3 py-2 rounded-xl bg-[#004ac6] text-white text-xs font-bold cursor-pointer"
                        title="Buscar RA no cadastro de alunos"
                      >
                        <Search className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Nome do Estudante *
                    </label>
                    <input
                      type="text"
                      value={intg.nome}
                      onChange={(e) => {
                        const n = [...integrantes];
                        n[idx].nome = e.target.value;
                        setIntegrantes(n);
                      }}
                      placeholder="Nome completo"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Cargo no Grêmio *
                    </label>
                    <input
                      type="text"
                      value={intg.cargo}
                      onChange={(e) => {
                        const n = [...integrantes];
                        n[idx].cargo = e.target.value;
                        setIntegrantes(n);
                      }}
                      placeholder="Ex: Presidente, Tesoureiro"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Turma *
                      </label>
                      <input
                        type="text"
                        value={intg.turma}
                        onChange={(e) => {
                          const n = [...integrantes];
                          n[idx].turma = e.target.value;
                          setIntegrantes(n);
                        }}
                        placeholder="Ex: 3ª SÉRIE A"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                      />
                    </div>
                    {integrantes.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setIntegrantes(integrantes.filter((_, i) => i !== idx))
                        }
                        className="p-2 rounded-xl text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ETAPA 4: Credenciais de Acesso ao Portal da Chapa (/chapa) */}
          {etapaWizard === 4 && (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-start gap-3">
                <KeyRound className="w-5 h-5 text-[#004ac6] mt-0.5" />
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Credenciais do Portal da Chapa (Acesso Somente Leitura em /chapa)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    A chapa NÃO pode se cadastrar nem editar dados. Apenas o administrador cria e redefine este acesso. A senha é armazenada exclusivamente como hash criptográfico (bcryptjs).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                    Usuário da Chapa (Único)
                  </label>
                  <input
                    type="text"
                    value={acessoUsuario}
                    onChange={(e) =>
                      setAcessoUsuario(e.target.value.toLowerCase().replace(/\s+/g, ''))
                    }
                    placeholder="Ex: chapa01_urbano"
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                    Senha de Acesso {idEdicao ? '(Deixe em branco para manter a atual)' : '*'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={acessoSenha}
                      onChange={(e) => setAcessoSenha(e.target.value)}
                      placeholder="Senha forte gerada"
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setAcessoSenha(gerarSenhaForteCliente(12))}
                      className="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-[#004ac6] dark:text-blue-400 text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Gerar Forte
                    </button>
                    {acessoSenha && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `Portal da Chapa DecideAI (${nome || 'Chapa'})\nURL: ${window.location.origin}/chapa\nUsuário: ${acessoUsuario}\nSenha: ${acessoSenha}`
                          );
                          setCopiado(true);
                          setTimeout(() => setCopiado(false), 2000);
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiado ? 'Copiado' : 'Copiar'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rodapé do Wizard */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setModoFormulario(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>

            <div className="flex items-center gap-2">
              {etapaWizard > 1 && (
                <button
                  type="button"
                  onClick={() => setEtapaWizard((etapaWizard - 1) as 1 | 2 | 3 | 4)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer"
                >
                  ← Etapa Anterior
                </button>
              )}
              {etapaWizard < 4 ? (
                <button
                  type="button"
                  onClick={() => setEtapaWizard((etapaWizard + 1) as 1 | 2 | 3 | 4)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                >
                  Próxima Etapa →
                </button>
              ) : null}
              <button
                type="submit"
                disabled={salvando}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                {salvando ? 'Salvando...' : 'Salvar Chapa Completa'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Lista de Chapas Cadastradas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {chapas.map((c) => (
          <div
            key={c.id}
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-4"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-sm"
                    style={{ backgroundColor: c.cor || '#004ac6' }}
                  >
                    {c.numero}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {c.nome}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          c.status === 'aprovada'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : c.status === 'arquivada'
                            ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {c.slogan || 'Sem slogan cadastrado'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => iniciarEdicaoChapa(c)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer"
                  title="Editar Chapa"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                    Propostas
                  </span>
                  <span className="font-extrabold">{c.propostas.length} registradas</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                    Integrantes
                  </span>
                  <span className="font-extrabold">{c.integrantes.length} membros</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                    Portal /chapa
                  </span>
                  <span className="font-mono font-bold text-[11px]">
                    {c.acesso ? (
                      <span className={c.acesso.ativo ? 'text-emerald-600' : 'text-red-500'}>
                        @{c.acesso.usuario} ({c.acesso.ativo ? 'Ativo' : 'Inativo'})
                      </span>
                    ) : (
                      'Sem acesso'
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações Administrativas da Chapa */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-1.5">
                {c.status !== 'aprovada' && (
                  <button
                    type="button"
                    onClick={() => handleAlterarStatus(c.id, 'aprovada')}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                  </button>
                )}
                {c.status !== 'oculta' && (
                  <button
                    type="button"
                    onClick={() => handleAlterarStatus(c.id, 'oculta')}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <EyeOff className="w-3.5 h-3.5" /> Ocultar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => abrirModalCredencial(c)}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#004ac6] dark:text-blue-400 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Credencial /chapa
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleArquivarOuExcluir(c.id)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-red-600 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                title="Arquiva se tiver votos computados; exclui se tiver 0 votos"
              >
                <Archive className="w-3.5 h-3.5" /> Arquivar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Rápido de Credencial do Portal da Chapa */}
      {modalCredencialChapa && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={salvarCredencialRapida}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-2 text-[#004ac6]">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Credencial do Portal — {modalCredencialChapa.nome}
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Redefina o usuário, gere uma nova senha forte ou desative o acesso somente-leitura desta chapa.
            </p>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">Usuário</label>
              <input
                type="text"
                required
                value={credUsuario}
                onChange={(e) => setCredUsuario(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                Nova Senha (Opcional para redefinir)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={credNovaSenha}
                  onChange={(e) => setCredNovaSenha(e.target.value)}
                  placeholder="Nova senha forte"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold"
                />
                <button
                  type="button"
                  onClick={() => setCredNovaSenha(gerarSenhaForteCliente(12))}
                  className="px-3 py-2 rounded-xl bg-blue-50 text-[#004ac6] text-xs font-bold shrink-0 cursor-pointer"
                >
                  Gerar
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={credAtivo}
                onChange={(e) => setCredAtivo(e.target.checked)}
                className="rounded"
              />
              <span>Acesso habilitado para login em /chapa</span>
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setModalCredencialChapa(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#004ac6] text-white text-xs font-bold cursor-pointer"
              >
                Salvar Acesso
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
