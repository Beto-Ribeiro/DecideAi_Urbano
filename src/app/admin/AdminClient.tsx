'use client';

import { useState } from 'react';
import { adminLogin, adminLogout, getDashboardStats } from '../actions';
import { Lock, LogOut, BarChart3, Users, Award, Eye, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminClient({ isAuthenticated, initialStats }: { isAuthenticated: boolean, initialStats: any }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Auth state can be managed by just refreshing the page after login
    
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        const res = await adminLogin(password);
        if (res.error) {
            setError(res.error);
            setLoading(false);
        } else {
            window.location.reload();
        }
    };
    
    const handleLogout = async () => {
        await adminLogout();
        window.location.reload();
    };
    
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
                    <div className="flex justify-center mb-6">
                        <div className="bg-slate-100 p-4 rounded-full">
                            <Lock size={32} className="text-slate-700" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-center text-slate-800 mb-8">Acesso Restrito</h2>
                    
                    {error && (
                        <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}
                    
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                placeholder="Senha de administrador"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl transition-all"
                        >
                            {loading ? 'Entrando...' : 'Acessar Painel'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }
    
    // Dashboard Logic
    const { chapas, votos, alunosVotaram } = initialStats || { chapas: [], votos: [], alunosVotaram: [] };
    const [searchTerm, setSearchTerm] = useState('');
    const [turmaFilter, setTurmaFilter] = useState('');
    
    const totalVotos = votos?.length || 0;
    
    // Cálculos
    const votosPorChapa = chapas?.map((chapa: any) => {
        const votosChapa = votos?.filter((v: any) => v.chapa_id === chapa.id) || [];
        return {
            ...chapa,
            totalVotos: votosChapa.length,
            porcentagem: totalVotos > 0 ? ((votosChapa.length / totalVotos) * 100).toFixed(1) : 0,
            votosBrutos: votosChapa
        };
    }).sort((a: any, b: any) => b.totalVotos - a.totalVotos);
    
    const vencedor = votosPorChapa?.[0];
    const isEmpate = votosPorChapa?.length > 1 && votosPorChapa[0].totalVotos === votosPorChapa[1].totalVotos && votosPorChapa[0].totalVotos > 0;
    
    const alunosFiltrados = alunosVotaram?.filter((a: any) => {
        const matchesName = a.nome.toLowerCase().includes(searchTerm.toLowerCase()) || a.ra.includes(searchTerm);
        const matchesTurma = turmaFilter ? a.turma === turmaFilter : true;
        return matchesName && matchesTurma;
    });

    const turmasUnicas = Array.from(new Set(alunosVotaram?.map((a: any) => a.turma) as string[]));

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-8">
                
                <header className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Painel de Eleições</h1>
                        <p className="text-slate-500 text-sm mt-1">Total de votos registrados: <strong className="text-slate-800">{totalVotos}</strong></p>
                    </div>
                    <button onClick={handleLogout} className="mt-4 sm:mt-0 flex items-center gap-2 text-slate-600 hover:text-red-600 transition-colors bg-slate-100 px-4 py-2 rounded-lg text-sm font-medium">
                        <LogOut size={16} /> Sair
                    </button>
                </header>
                
                {vencedor && vencedor.totalVotos > 0 && (
                    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-900/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-16 bg-white opacity-10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>
                        <div className="flex items-start justify-between relative z-10">
                            <div>
                                <h2 className="text-blue-100 font-semibold mb-2 flex items-center gap-2 uppercase tracking-widest text-sm">
                                    <Award size={18} /> {isEmpate ? 'Empate Atual' : 'Chapa Vencedora (Liderando)'}
                                </h2>
                                <h3 className="text-4xl font-bold mb-2">{vencedor.nome}</h3>
                                <p className="text-blue-100 mb-6 max-w-lg">{vencedor.descricao}</p>
                                <div className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                                    <span className="text-2xl font-bold">{vencedor.porcentagem}%</span>
                                    <div className="w-px h-8 bg-white/30"></div>
                                    <span className="text-sm text-blue-50">{vencedor.totalVotos} votos de {totalVotos}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <BarChart3 size={20} className="text-blue-600" /> Resultados por Chapa
                        </h3>
                        <div className="space-y-6">
                            {votosPorChapa?.map((chapa: any) => (
                                <div key={chapa.id}>
                                    <div className="flex justify-between mb-2">
                                        <span className="font-semibold text-slate-700">{chapa.nome}</span>
                                        <span className="font-bold text-slate-900">{chapa.totalVotos} votos ({chapa.porcentagem}%)</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-3">
                                        <div 
                                            className="bg-blue-600 h-3 rounded-full transition-all duration-1000"
                                            style={{ width: `${chapa.porcentagem}%` }}
                                        ></div>
                                    </div>
                                    
                                    {/* Sub-estatísticas simples: Genero */}
                                    {chapa.totalVotos > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                            {Array.from(new Set(chapa.votosBrutos.map((v:any) => v.genero))).map((g: any) => {
                                                const count = chapa.votosBrutos.filter((v:any) => v.genero === g).length;
                                                const perc = ((count / chapa.totalVotos) * 100).toFixed(0);
                                                return <span key={g} className="bg-slate-50 text-slate-500 px-2 py-1 rounded-md border border-slate-100">{g}: {perc}%</span>;
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col h-[500px]">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 shrink-0">
                            <Users size={20} className="text-blue-600" /> Alunos que Votaram
                        </h3>
                        
                        <div className="flex gap-3 mb-6 shrink-0">
                            <input 
                                type="text"
                                placeholder="Buscar RA ou Nome"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="flex-1 px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <select
                                value={turmaFilter}
                                onChange={e => setTurmaFilter(e.target.value)}
                                className="w-32 px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Turmas</option>
                                {turmasUnicas.map((t: string) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="space-y-2">
                                {alunosFiltrados?.length === 0 ? (
                                    <p className="text-center text-slate-400 py-4 text-sm">Nenhum aluno encontrado.</p>
                                ) : (
                                    alunosFiltrados?.map((aluno: any) => (
                                        <div key={aluno.ra} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                                            <div>
                                                <p className="font-semibold text-slate-800 text-sm">{aluno.nome}</p>
                                                <p className="text-xs text-slate-500">RA: {aluno.ra}</p>
                                            </div>
                                            <span className="bg-blue-50 text-blue-700 font-medium text-xs px-2.5 py-1 rounded-md">
                                                {aluno.turma}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
