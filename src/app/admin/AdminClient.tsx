'use client';

import { useState } from 'react';
import { adminLogin, adminLogout, addChapa, deleteChapa, resetElection, toggleElectionStatus } from '../actions';
import { Lock, LogOut, BarChart3, Users, Award, PlusCircle, X, Trash2, RefreshCw, Power } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#2563eb', '#16a34a', '#eab308', '#dc2626', '#9333ea', '#db2777', '#f97316'];

export default function AdminClient({ isAuthenticated, initialStats }: { isAuthenticated: boolean, initialStats: any }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Modal nova chapa
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [novaChapa, setNovaChapa] = useState({ nome: '', numero: '', descricao: '' });
    
    // Status local da eleição para update otimista
    const [statusEleicao, setStatusEleicao] = useState(initialStats?.status || 'ativa');
    
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
            setLoading(false);
        } else {
            setIsModalOpen(false);
            window.location.reload();
        }
    };
    
    const handleDeleteChapa = async (id: string, nome: string) => {
        if(confirm(`Tem certeza que deseja EXCLUIR a chapa "${nome}"? Essa ação não pode ser desfeita e apagará os votos associados a ela.`)) {
            const res = await deleteChapa(id);
            if(res.error) alert(res.error);
            else window.location.reload();
        }
    };

    const handleResetElection = async () => {
        if(confirm(`ATENÇÃO! Tem certeza que deseja ZERAR A ELEIÇÃO? Isso apagará TODOS os votos, TODOS os alunos que já votaram e TODAS as chapas! O banco de dados de alunos continuará intacto.`)) {
            if(confirm(`Você tem ABSOLUTA CERTEZA? Essa ação é IRREVERSÍVEL!`)) {
                setLoading(true);
                const res = await resetElection();
                if(res.error) alert(res.error);
                else window.location.reload();
                setLoading(false);
            }
        }
    };

    const handleToggleStatus = async () => {
        const acao = statusEleicao === 'ativa' ? 'FINALIZAR' : 'REABRIR';
        if(confirm(`Deseja ${acao} a eleição?`)) {
            const res = await toggleElectionStatus(statusEleicao);
            if(res.error) alert(res.error);
            else setStatusEleicao(res.status);
        }
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
                    {error && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">{error}</div>}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input type="password" placeholder="Senha de administrador" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none text-slate-800" required />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl transition-all">
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
    
    const votosPorChapa = chapas?.map((chapa: any) => {
        const votosChapa = votos?.filter((v: any) => v.chapa_id === chapa.id) || [];
        return {
            ...chapa,
            totalVotos: votosChapa.length,
            porcentagem: totalVotos > 0 ? ((votosChapa.length / totalVotos) * 100).toFixed(1) : 0,
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

    const generoMap = votos?.reduce((acc: any, v: any) => {
        acc[v.genero] = (acc[v.genero] || 0) + 1;
        return acc;
    }, {});
    const generoData = Object.keys(generoMap || {}).map(key => ({ name: key, value: generoMap[key] }));

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
                        <p className="text-slate-500 text-sm mt-1">Status: <strong className={statusEleicao === 'ativa' ? 'text-green-600 uppercase' : 'text-red-600 uppercase'}>{statusEleicao}</strong></p>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-4 sm:mt-0 items-center">
                        <button onClick={handleToggleStatus} className={`flex items-center gap-2 text-white transition-colors px-4 py-2 rounded-lg text-sm font-medium ${statusEleicao === 'ativa' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'}`}>
                            <Power size={16} /> {statusEleicao === 'ativa' ? 'Finalizar Eleição' : 'Reabrir Eleição'}
                        </button>
                        <button onClick={handleResetElection} className="flex items-center gap-2 text-white bg-red-600 hover:bg-red-700 transition-colors px-4 py-2 rounded-lg text-sm font-medium">
                            <RefreshCw size={16} /> Nova Eleição
                        </button>
                        <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
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
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Lista de Chapas e Ações */}
                    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 lg:col-span-1 flex flex-col h-[600px]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">Chapas</h3>
                            <button onClick={() => setIsModalOpen(true)} className="text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 text-sm font-medium">
                                <PlusCircle size={16} /> Adicionar
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                            {votosPorChapa?.length === 0 ? (
                                <p className="text-slate-400 text-sm text-center py-4">Nenhuma chapa cadastrada.</p>
                            ) : (
                                votosPorChapa?.map((chapa: any) => (
                                    <div key={chapa.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center group">
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{chapa.nome}</p>
                                            <p className="text-xs text-slate-500">{chapa.totalVotos} votos</p>
                                        </div>
                                        <button onClick={() => handleDeleteChapa(chapa.id, chapa.nome)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" title="Excluir Chapa">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Gráficos */}
                    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 space-y-8 lg:col-span-2 flex flex-col justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
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
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-slate-800 pt-6 border-t border-slate-100 flex items-center gap-2 mb-4">
                                Distribuição por Gênero
                            </h3>
                            <div className="h-48 w-full">
                                {generoData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={generoData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                                {generoData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                            <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem dados suficientes</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800">Cadastrar Nova Chapa</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddChapa} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Nome da Chapa *</label>
                                <input type="text" required value={novaChapa.nome} onChange={e => setNovaChapa({...novaChapa, nome: e.target.value})} className="w-full text-slate-800 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Número (Opcional)</label>
                                <input type="number" value={novaChapa.numero} onChange={e => setNovaChapa({...novaChapa, numero: e.target.value})} className="w-full text-slate-800 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição</label>
                                <textarea rows={3} value={novaChapa.descricao} onChange={e => setNovaChapa({...novaChapa, descricao: e.target.value})} className="w-full text-slate-800 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                            </div>
                            <div className="pt-4">
                                <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all">
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
