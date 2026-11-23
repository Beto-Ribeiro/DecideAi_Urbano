'use client';

import { useState } from 'react';
import { ShieldCheck, Landmark } from 'lucide-react';
import { ESCOLA_DEFAULT } from '@/lib/escola';

interface SchoolCrestProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  logoPath?: string;
  nomeCurto?: string;
}

const SIZE_CLASSES: Record<NonNullable<SchoolCrestProps['size']>, string> = {
  sm: 'w-11 h-11 p-1',
  md: 'w-14 h-14 p-1.5',
  lg: 'w-20 h-20 p-2',
  xl: 'w-28 h-28 p-2.5',
};

/**
 * Selo Circular Branco Protetor para o Brasão Oficial da E.E. Engenheiro Urbano Alves de Souza Pereira.
 * Mantém fundo branco puro (#FFFFFF) mesmo no modo escuro para preservar o contraste do brasão P&B.
 * Caso public/brand/logo-escola.jpg não exista no projeto, exibe um placeholder claramente marcado.
 */
export function SchoolCrest({ size = 'md', className = '' }: SchoolCrestProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`rounded-full bg-white text-slate-900 shadow-md ring-2 ring-blue-600/20 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden select-none ${SIZE_CLASSES[size]} ${className}`}
      title={`Brasão Oficial — ${ESCOLA_DEFAULT.nome} (public/brand/logo-escola.jpg)`}
    >
      {!imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ESCOLA_DEFAULT.logos.escola}
          alt={`Brasão Oficial ${ESCOLA_DEFAULT.nome}`}
          className="w-full h-full object-contain rounded-full"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center leading-none p-0.5">
          <ShieldCheck
            className={
              size === 'sm'
                ? 'w-4 h-4 text-blue-700'
                : size === 'md'
                ? 'w-5 h-5 text-blue-700'
                : 'w-6 h-6 text-blue-700'
            }
          />
          <span className="text-[7px] font-extrabold uppercase tracking-tighter text-blue-900 mt-0.5">
            E.E. URBANO
          </span>
          {size !== 'sm' && (
            <span className="text-[6px] font-mono text-amber-700 bg-amber-100 px-1 rounded mt-0.5">
              PLACEHOLDER
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Logotipo Oficial do Governo do Estado de São Paulo / Secretaria da Educação (public/brand/logo-sp-educacao.png).
 * Usado no Certificado Oficial e na Ata Eleitoral. Exibe placeholder claramente marcado caso o arquivo não exista.
 */
export function GovSpLogo({ size = 'md', className = '' }: SchoolCrestProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`rounded-full bg-slate-100 text-blue-900 shadow-sm border border-slate-300 flex items-center justify-center shrink-0 overflow-hidden select-none ${SIZE_CLASSES[size]} ${className}`}
      title="Logotipo Governo do Estado de São Paulo / Educação (public/brand/logo-sp-educacao.png)"
    >
      {!imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ESCOLA_DEFAULT.logos.spEducacao}
          alt="Governo do Estado de São Paulo - Secretaria da Educação"
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center leading-none p-0.5">
          <Landmark className="w-5 h-5 text-blue-800" />
          <span className="text-[7px] font-extrabold uppercase tracking-tighter text-slate-800 mt-0.5">
            SEDUC-SP
          </span>
          {size !== 'sm' && (
            <span className="text-[6px] font-mono text-amber-800 bg-amber-100 px-1 rounded mt-0.5">
              PLACEHOLDER
            </span>
          )}
        </div>
      )}
    </div>
  );
}
