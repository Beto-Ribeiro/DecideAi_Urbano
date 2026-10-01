'use client';

import { useState, useEffect } from 'react';
import { loginAluno, submitVote, getChapas } from './actions';
import { ShieldCheck, User, Vote, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';

type Step = 'login' | 'confirmar' | 'votar' | 'sucesso';

export default function Home() {
  const [step, setStep] = useState<Step>('login');
  const [ra, setRa] = useState('');
  const [digito, setDigito] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [aluno, setAluno] = useState<any>(null);
  
  const [raca, setRaca] = useState('');
  const [genero, setGenero] = useState('');
  
  const [chapas, setChapas] = useState<any[]>([]);
  const [chapaId, setChapaId] = useState('');

  useEffect(() => {
    if (step === 'votar') {
      getChapas().then(data => setChapas(data));
    }
  }, [step]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await loginAluno(ra, digito);
    
    if (result.error) {
      setError(result.error);
    } else {
      setAluno(result.aluno);
      setStep('confirmar');
    }
    setLoading(false);
  };

  const handleConfirmar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!raca || !genero) {
      setError('Por favor, selecione sua raça e gênero.');
      return;
    }
    setError('');
    setStep('votar');
  };

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapaId) {
      setError('Por favor, selecione uma chapa.');
      return;
    }
    
    if (!confirm('Tem certeza do seu voto? Esta ação é irreversível e o voto é único.')) return;
    
    setError('');
    setLoading(true);
    
    const result = await submitVote(ra, aluno.nome, aluno.turma, raca, genero, chapaId, aluno.dataNascimento);
    
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setStep('sucesso');
      setLoading(false);
      
      // Toca o som da urna eleitoral
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 1800; // Frequência do bipe
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            const now = ctx.currentTime;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.05); // Fade in rápido (menor volume)
            gain.gain.setValueAtTime(0.2, now + 1.2); // Segura 1.2s
            gain.gain.linearRampToValueAtTime(0, now + 1.3); // Fade out
            
            osc.start(now);
            osc.stop(now + 1.4);
        }
      } catch(err) {
        console.error("Erro ao tocar som da urna", err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 sm:p-8 font-sans">
      
      <div className="w-full max-w-xl bg-white shadow-2xl rounded-3xl overflow-hidden border border-slate-100">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <Vote size={48} className="mb-4 text-blue-100" />
          <h1 className="text-3xl font-bold tracking-tight mb-2">Eleições Grêmio Estudantil</h1>
          <p className="text-blue-100 max-w-sm">Exerça seu direito ao voto de forma rápida e segura.</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-100 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {step === 'login' && (
            <form onSubmit={handleLogin} className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">RA do Aluno</label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Ex: 000123456789"
                      value={ra}
                      onChange={(e) => setRa(e.target.value)}
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Dígito"
                      maxLength={1}
                      value={digito}
                      onChange={(e) => setDigito(e.target.value)}
                      className="w-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-center"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <ShieldCheck size={14} /> Sistema com auditoria e voto secreto
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-4 rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
              >
                {loading ? 'Verificando...' : 'Acessar Votação'}
                {!loading && <ChevronRight size={18} />}
              </button>
            </form>
          )}

          {step === 'confirmar' && aluno && (
            <form onSubmit={handleConfirmar} className="space-y-6 animate-in slide-in-from-right-8 duration-300">
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">
                <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <User size={16} /> Confirme seus dados
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                    <span className="text-blue-600/70">Nome Completo</span>
                    <span className="font-semibold text-blue-900 text-right">{aluno.nome}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                    <span className="text-blue-600/70">Turma</span>
                    <span className="font-semibold text-blue-900 text-right">{aluno.turma}</span>
                  </div>
                  <div className="flex justify-between items-center pb-1">
                    <span className="text-blue-600/70">Data de Nascimento</span>
                    <span className="font-semibold text-blue-900 text-right">{aluno.dataNascimento}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Como você se autodeclara? (Raça/Cor)</label>
                  <select 
                    required
                    value={raca}
                    onChange={(e) => setRaca(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none"
                  >
                    <option value="" disabled>Selecione uma opção...</option>
                    <option value="Branco">Branco</option>
                    <option value="Preto">Preto</option>
                    <option value="Pardo">Pardo</option>
                    <option value="Asiatico">Asiático</option>
                    <option value="Indigena">Indígena</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Identidade de Gênero</label>
                  <select 
                    required
                    value={genero}
                    onChange={(e) => setGenero(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none"
                  >
                    <option value="" disabled>Selecione uma opção...</option>
                    <option value="Mulher Cis">Mulher Cis</option>
                    <option value="Homem Cis">Homem Cis</option>
                    <option value="Homem Trans">Homem Trans</option>
                    <option value="Mulher Trans">Mulher Trans</option>
                    <option value="Não Binario">Não Binário</option>
                    <option value="Genero Fluido">Gênero Fluido</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-200"
              >
                Confirmar e ir para Urna
              </button>
            </form>
          )}

          {step === 'votar' && (
            <form onSubmit={handleVote} className="space-y-6 animate-in slide-in-from-bottom-8 duration-300">
              <h3 className="text-xl font-bold text-slate-800 mb-6 text-center">Selecione sua Chapa</h3>
              
              <div className="space-y-4">
                {chapas.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">Carregando chapas disponíveis...</p>
                ) : (
                  chapas.map(chapa => (
                    <label 
                      key={chapa.id} 
                      className={`flex flex-col p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                        chapaId === chapa.id 
                          ? 'border-blue-600 bg-blue-50/50 shadow-md shadow-blue-100' 
                          : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start">
                        <input 
                          type="radio" 
                          name="chapa" 
                          value={chapa.id}
                          checked={chapaId === chapa.id}
                          onChange={() => setChapaId(chapa.id)}
                          className="w-5 h-5 text-blue-600 border-slate-300 focus:ring-blue-500 mr-4 mt-2"
                        />
                        <div className="flex-1 flex gap-4">
                          {chapa.logo_url ? (
                              <img src={chapa.logo_url} alt={`Logo ${chapa.nome}`} className="w-16 h-16 rounded-full object-cover border border-slate-200 shrink-0" />
                          ) : (
                              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl shrink-0">
                                  {chapa.nome.substring(0,2).toUpperCase()}
                              </div>
                          )}
                          <div className="flex-1">
                            <div className="font-bold text-xl text-slate-900 flex items-center gap-2">
                              {chapa.nome} 
                              {chapa.numero && <span className="text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md text-sm">Nº {chapa.numero}</span>}
                            </div>
                            {chapa.descricao && <div className="text-sm text-slate-500 mt-1">{chapa.descricao}</div>}
                            
                            {chapa.propostas_url && (
                                <a href={chapa.propostas_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors" onClick={e => e.stopPropagation()}>
                                    📄 Ver PDF de Propostas
                                </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {chapaId === chapa.id && chapa.integrantes && chapa.integrantes.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-blue-100 ml-9">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Integrantes da Chapa</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {chapa.integrantes.map((intg: any, idx: number) => (
                              <div key={idx} className="bg-white px-3 py-2 rounded-lg border border-slate-200 flex flex-col">
                                <span className="text-sm font-bold text-slate-800">{intg.nome}</span>
                                <div className="flex justify-between items-center mt-1">
                                  <span className="text-xs font-medium text-blue-600">{intg.cargo}</span>
                                  <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{intg.turma}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </label>
                  ))
                )}
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading || !chapaId}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-xl shadow-green-200 disabled:opacity-50 text-lg uppercase tracking-wider"
                >
                  {loading ? 'Registrando...' : 'Confirmar Voto'}
                </button>
                <p className="text-center text-xs text-slate-400 mt-3 flex justify-center items-center gap-1">
                  <ShieldCheck size={14} /> Voto criptografado e anônimo
                </p>
              </div>
            </form>
          )}

          {step === 'sucesso' && (
            <div className="text-center py-8 animate-in zoom-in duration-500">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 mb-6">
                <CheckCircle2 size={48} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Voto Registrado!</h2>
              <p className="text-slate-500 mb-8">Seu voto foi computado com sucesso e total sigilo.</p>
              
              <button
                onClick={() => window.location.reload()}
                className="text-blue-600 font-semibold hover:text-blue-800 transition-colors"
              >
                Voltar ao Início
              </button>
            </div>
          )}

        </div>
      </div>
      
      <div className="mt-8 text-slate-400 text-sm flex gap-4">
        <span>© 2026 Grêmio Estudantil</span>
        <span>•</span>
        <a href="/admin" className="hover:text-slate-600 transition-colors">Acesso Administrativo</a>
      </div>
    </div>
  );
}
