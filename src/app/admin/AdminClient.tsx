'use client';

import { useState } from 'react';
import { adminLogin, adminLogout, addChapa } from '../actions';
import { Lock, LogOut, BarChart3, Users, Award, PlusCircle, X } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#2563eb', '#16a34a', '#eab308', '#dc2626', '#9333ea', '#db2777', '#f97316'];

export default function AdminClient({ isAuthenticated, initialStats }: { isAuthenticated: boolean, initialStats: any }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Estados para o modal de Nova Chapa
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [novaChapa, setNovaChapa] = useState({ nome: '', numero: '', descricao: '' });
    
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

    const handleAddChapa = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const numeroParsed = novaChapa.numero ? parseInt(novaChapa.numero) : null;
        const res = await addChapa(novaChapa.nome, numeroParsed, novaChapa.descricao);
        if (res.error) {
            alert(res.error);
        } else {
            setIsModalOpen(false);
            window.location.reload(); // Recarrega para buscar os novos dados
        }
        setLoading(false);
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
    
    const { chapas, votos, alunosVotaram } = initialStats || { chapas: [], votos: [], alunosVotaram: [] };
    const [searchTerm, setSearchTerm] = useState('');
    const [turmaFilter, setTurmaFilter] = useState('');
    
    const totalVotos = votos?.length || 0;
    
    // Processamento de dados para Chapas
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

    // Dados para o Gráfico de Pizza (Gênero geral)
    const generoMap = votos?.reduce((acc: any, v: any) => {
        acc[v.genero] = (acc[v.genero] || 0) + 1;
        return acc;
    }, {});
    const generoData = Object.keys(generoMap || {}).map(key => ({ name: key, value: generoMap[key] }));

    // Dados para o Gráfico de Barras (Chapas)
    const chartDataChapas = votosPorChapa?.map((c: any) => ({
        name: c.nome,
        Votos: c.totalVotos
    }));

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                
                <header className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Painel de Eleições</h1>
                        <p className="text-slate-500 text-sm mt-1">Total de votos computados: <strong className="text-slate-800">{totalVotos}</strong></p>
                    </div>
                    <div className="flex gap-4 mt-4 sm:mt-0">
                        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700 transition-colors px-4 py-2 rounded-lg text-sm font-medium">
                            <PlusCircle size={16} /> Nova Chapa
                        </button>
                        <button onClick={handleLogout} className="flex items-center gap-2 text-slate-600 hover:text-red-600 transition-colors bg-slate-100 px-4 py-2 rounded-lg text-sm font-medium">
                            <LogOut size={16} /> Sair
                        </button>
                    </div>
                </header>
                
                {vencedor && vencedor.totalVotos > 0 && (
                    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-900/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-16 bg-white opacity-10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between relative z-10 gap-6">
                            <div>
                                <h2 className="text-blue-100 font-semibold mb-2 flex items-center gap-2 uppercase tracking-widest text-sm">
                                    <Award size={18} /> {isEmpate ? 'Empate Atual' : 'Chapa Liderando'}
                                </h2>
                                <h3 className="text-4xl font-bold mb-2">{vencedor.nome}</h3>
                                <div className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl mt-2">
                                    <span className="text-2xl font-bold">{vencedor.porcentagem}%</span>
                                    <div className="w-px h-8 bg-white/30"></div>
                                    <span className="text-sm text-blue-50">{vencedor.totalVotos} votos de {totalVotos}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Gráficos */}
                    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 space-y-8">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <BarChart3 size={20} className="text-blue-600" /> Votos por Chapa
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartDataChapas} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                    <Bar dataKey="Votos" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 pt-6 border-t border-slate-100 flex items-center gap-2">
                            Distribuição por Gênero
                        </h3>
                        <div className="h-64 w-full">
                            {generoData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={generoData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {generoData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem dados suficientes</div>
                            )}
                        </div>
                    </div>
                    
                    {/* Lista de Alunos Votantes */}
                    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 flex flex-col h-[750px]">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 shrink-0">
                            <Users size={20} className="text-blue-600" /> Alunos que Votaram ({alunosVotaram?.length})
                        </h3>
                        
                        <div className="flex flex-col sm:flex-row gap-3 mb-6 shrink-0">
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
                                className="sm:w-32 px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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

            {/* Modal de Adicionar Chapa */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800">Cadastrar Nova Chapa</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddChapa} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Nome da Chapa *</label>
                                <input 
                                    type="text" 
                                    required
                                    value={novaChapa.nome}
                                    onChange={e => setNovaChapa({...novaChapa, nome: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Número (Opcional)</label>
                                <input 
                                    type="number" 
                                    value={novaChapa.numero}
                                    onChange={e => setNovaChapa({...novaChapa, numero: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição</label>
                                <textarea 
                                    rows={3}
                                    value={novaChapa.descricao}
                                    onChange={e => setNovaChapa({...novaChapa, descricao: e.target.value})}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    placeholder="Propostas, integrantes..."
                                />
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-70"
                                >
                                    {loading ? 'Salvando...' : 'Salvar Chapa'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
