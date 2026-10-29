import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  AlertTriangle,
  Award,
  CheckCircle2,
  ArrowLeft,
  Calendar,
  Building2,
} from 'lucide-react';
import {
  obterConfiguracaoEscolaAtual,
  verificarCertificadoPorCodigo,
} from '@/server/queries';
import { SchoolCrest, GovSpLogo } from '@/components/SchoolCrest';
import { CivicHeader, CivicFooter } from '@/components/CivicHeader';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Verificação Pública de Autenticidade de Certificado',
};

export default async function VerificarCertificadoPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const resultado = verificarCertificadoPorCodigo(codigo);
  const escola = resultado.escola || obterConfiguracaoEscolaAtual();

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9ff] dark:bg-slate-950 text-[#0b1c30] dark:text-slate-100">
      <CivicHeader
        escola={escola}
        subtitulo="Verificação Pública de Documentos Oficiais"
        badgeTexto={resultado.valido ? 'Documento Autêntico' : 'Código Não Localizado'}
        badgeCor={resultado.valido ? 'verde' : 'vermelho'}
        acoesDireita={
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Início
          </Link>
        }
      />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10">
        {resultado.valido && resultado.certificado && resultado.chapa && resultado.eleicao ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border-2 border-emerald-500/50 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <GovSpLogo logoPath={escola.logos.spEducacao} />
                <SchoolCrest
                  logoPath={escola.logos.escola}
                  nomeCurto={escola.nomeCurto}
                  size="md"
                />
              </div>

              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-black uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                Autenticidade Confirmada
              </span>
            </div>

            <div className="space-y-2 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Governo do Estado de São Paulo — Secretaria da Educação
              </p>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#004ac6] dark:text-blue-400">
                {escola.nomeCompleto}
              </h1>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {resultado.certificado.tipo === 'vitoria'
                  ? 'Certificado Oficial de Vitória Eleitoral e Posse Estudantil'
                  : 'Certificado Oficial de Participação Democrática e Cidadania'}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Código Único de Verificação
                  </span>
                  <span className="font-mono font-black text-sm text-[#004ac6] dark:text-blue-400">
                    {resultado.certificado.codigo_verificacao}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Data e Hora de Emissão
                  </span>
                  <span className="font-semibold flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(resultado.certificado.emitido_em).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Chapa Certificada
                  </span>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {resultado.chapa.nome} (Nº {resultado.chapa.numero})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Pleito Eleitoral Homologado
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {resultado.eleicao.nome}
                  </span>
                </div>
              </div>

              {resultado.chapa.integrantes.length > 0 && (
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                    Integrantes Nominados na Chapa
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {resultado.chapa.integrantes.map((i) => (
                      <span
                        key={i.id}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
                      >
                        {i.nome} ({i.cargo} • {i.turma})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  Unidade Escolar: {escola.nomeCompleto} ({escola.cidade} - {escola.uf})
                </span>
                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                  <Award className="w-3.5 h-3.5" />
                  Resultado Auditado: {resultado.votosChapa} votos ({resultado.percentualValidos}%)
                </span>
              </div>
            </div>

            <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                Este registro público contém apenas informações institucionais não sensíveis para fins de comprovação curricular e escolar.
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border-2 border-red-200 dark:border-red-900/60 shadow-lg text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Certificado Não Localizado
            </h1>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              O código <strong className="font-mono">{decodeURIComponent(codigo)}</strong> não consta na base de certificados emitidos pela Comissão Eleitoral da {escola.nomeCompleto}. Verifique se o endereço foi digitado corretamente.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#004ac6] text-white text-xs font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao Sistema Eleitoral
            </Link>
          </div>
        )}
      </main>

      <CivicFooter escola={escola} />
    </div>
  );
}
