'use client';

import { useState } from 'react';
import { adminLogin, adminLogout, addChapa, deleteChapa, resetElection, toggleElectionStatus } from '../actions';
import { supabase } from '@/lib/supabase';
import { Lock, LogOut, BarChart3, Users, Award, PlusCircle, X, Trash2, RefreshCw, Power, LayoutDashboard, Search, CheckCircle2, XCircle, Vote, FileText, Download, Building2 } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#2563eb', '#16a34a', '#eab308', '#dc2626', '#9333ea', '#db2777', '#f97316'];
const TURMA_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];

export default function AdminClient({ isAuthenticated, initialStats }: { isAuthenticated: boolean, initialStats: any }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Tab State
    const [activeTab, setActiveTab] = useState<'dashboard' | 'eleitores' | 'chapas'>('dashboard');
    
    // Modal nova chapa
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [novaChapa, setNovaChapa] = useState({ nome: '', numero: '', descricao: '' });
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [propostasFile, setPropostasFile] = useState<File | null>(null);
    const [integrantes, setIntegrantes] = useState<{nome: string, cargo: string, turma: string}[]>([]);
    
    // Form handlers
    const addIntegrante = () => setIntegrantes([...integrantes, {nome: '', cargo: '', turma: ''}]);
    const updateIntegrante = (index: number, field: string, value: string) => {
        const newIntegrantes = [...integrantes];
        newIntegrantes[index] = { ...newIntegrantes[index], [field]: value };
        setIntegrantes(newIntegrantes);
    };
    const removeIntegrante = (index: number) => {
        setIntegrantes(integrantes.filter((_, i) => i !== index));
    };

    // Modal Aluno Detalhes
    const [selectedAluno, setSelectedAluno] = useState<any>(null);
    
    // Status local da eleição
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

        let logoUrl = null;
        let propostasUrl = null;

        try {
            if (logoFile) {
                const ext = logoFile.name.split('.').pop();
                const path = `logos/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
                const { error: uploadError } = await supabase.storage.from('chapas').upload(path, logoFile);
                if (!uploadError) {
                    logoUrl = supabase.storage.from('chapas').getPublicUrl(path).data.publicUrl;
                }
            }
            if (propostasFile) {
                const ext = propostasFile.name.split('.').pop();
                const path = `propostas/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
                const { error: uploadError } = await supabase.storage.from('chapas').upload(path, propostasFile);
                if (!uploadError) {
                    propostasUrl = supabase.storage.from('chapas').getPublicUrl(path).data.publicUrl;
                }
            }

            const numeroParsed = novaChapa.numero ? parseInt(novaChapa.numero) : null;
            const res = await addChapa(novaChapa.nome, numeroParsed, novaChapa.descricao, logoUrl, propostasUrl, integrantes);
            
            if (res.error) {
                alert(res.error);
                setLoading(false);
            } else {
                setIsModalOpen(false);
                window.location.reload();
            }
        } catch (err) {
            console.error(err);
            alert("Erro ao fazer upload dos arquivos.");
            setLoading(false);
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
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
                    <div className="flex justify-center mb-6">
                        <div className="bg-slate-100 p-4 rounded-full">
                            <Lock size={32} className="text-slate-700" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-center text-slate-800 mb-8">Acesso Restrito</h2>
                    {error && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">{error}</div>}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input type="password" placeholder="Senha de administrador" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800" required />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-200">
                            {loading ? 'Entrando...' : 'Acessar Painel'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }
    
    const { chapas, votos, alunosVotaram, todosAlunos } = initialStats || { chapas: [], votos: [], alunosVotaram: [], todosAlunos: [] };
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    
    const totalVotos = votos?.length || 0;
    
    // Process Dashboard Data
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
    
    // Genero Chart
    const generoMap = votos?.reduce((acc: any, v: any) => {
        acc[v.genero] = (acc[v.genero] || 0) + 1;
        return acc;
    }, {});
    const generoData = Object.keys(generoMap || {}).map(key => ({ name: key, value: generoMap[key] }));

    // Idade Chart
    const idadesPorChapaData = chapas?.map((chapa: any) => {
        const votosChapa = votos?.filter((v: any) => v.chapa_id === chapa.id && v.idade) || [];
        let somaIdade = 0;
        votosChapa.forEach((v: any) => somaIdade += v.idade);
        const mediaIdade = votosChapa.length > 0 ? parseFloat((somaIdade / votosChapa.length).toFixed(1)) : 0;
        return { name: chapa.nome, "Idade Média": mediaIdade };
    });

    // Turmas por Chapa (Stacked Bar)
    const turmasUnicas = Array.from(new Set(votos?.map((v: any) => v.turma) as string[]));
    const turmasPorChapaData = chapas?.map((chapa: any) => {
        const votosChapa = votos?.filter((v: any) => v.chapa_id === chapa.id) || [];
        const obj: any = { name: chapa.nome };
        votosChapa.forEach((v: any) => {
            obj[v.turma] = (obj[v.turma] || 0) + 1;
        });
        return obj;
    });

    const chartDataChapas = votosPorChapa?.map((c: any) => ({
        name: c.nome,
        Votos: c.totalVotos
    }));

    // Eleitores Data Processing
    const listAlunos = todosAlunos?.map((a: any) => {
        const votedRecord = alunosVotaram?.find((av: any) => av.ra === a.ra);
        return {
            ...a,
            hasVoted: !!votedRecord,
            votedAt: votedRecord ? votedRecord.created_at : null
        };
    }) || [];

    const filteredAlunos = listAlunos.filter((a: any) => {
        const matchName = a.nome.toLowerCase().includes(searchTerm.toLowerCase()) || a.ra.includes(searchTerm);
        if (statusFilter === 'voted') return matchName && a.hasVoted;
        if (statusFilter === 'pending') return matchName && !a.hasVoted;
        return matchName;
    });

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col hidden md:flex sticky top-0 h-screen">
                <div className="p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Vote size={24} className="text-blue-500" /> DecideAI
                    </h2>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <button 
                        onClick={() => setActiveTab('dashboard')} 
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <LayoutDashboard size={20} /> Dashboard
                    </button>
                    <button 
                        onClick={() => setActiveTab('eleitores')} 
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'eleitores' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <Users size={20} /> Eleitores
                    </button>
                    <button 
                        onClick={() => setActiveTab('chapas')} 
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'chapas' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <Building2 size={20} /> Chapas
                    </button>
                </nav>
                <div className="p-4 border-t border-slate-800">
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors bg-slate-800 px-4 py-3 rounded-xl text-sm font-medium">
                        <LogOut size={18} /> Sair do Painel
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
                
                {/* Mobile Menu */}
                <div className="md:hidden flex gap-2 mb-6 overflow-x-auto pb-2">
                    <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'}`}>Dashboard</button>
                    <button onClick={() => setActiveTab('eleitores')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${activeTab === 'eleitores' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'}`}>Eleitores</button>
                    <button onClick={() => setActiveTab('chapas')} className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${activeTab === 'chapas' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'}`}>Chapas</button>
                    <button onClick={handleLogout} className="px-4 py-2 rounded-lg font-medium whitespace-nowrap bg-red-100 text-red-600 ml-auto">Sair</button>
                </div>

                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Header Top Actions */}
                    <header className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">
                                {activeTab === 'dashboard' ? 'Dashboard Geral' : activeTab === 'eleitores' ? 'Gestão de Eleitores' : 'Gestão de Chapas'}
                            </h1>
                            <p className="text-slate-500 text-sm mt-1">Status: <strong className={statusEleicao === 'ativa' ? 'text-green-600 uppercase' : 'text-red-600 uppercase'}>{statusEleicao}</strong></p>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-4 sm:mt-0 items-center">
                            <button onClick={handleToggleStatus} className={`flex items-center gap-2 text-white transition-colors px-4 py-2 rounded-lg text-sm font-medium ${statusEleicao === 'ativa' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'}`}>
                                <Power size={16} /> {statusEleicao === 'ativa' ? 'Finalizar Eleição' : 'Reabrir Eleição'}
                            </button>
                            <button onClick={handleResetElection} className="flex items-center gap-2 text-red-600 hover:text-white bg-red-50 hover:bg-red-600 transition-colors px-4 py-2 rounded-lg text-sm font-medium">
                                <RefreshCw size={16} /> Nova Eleição
                            </button>
                        </div>
                    </header>

                    {activeTab === 'dashboard' && (
                        <>
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

                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                                {/* Votos Bar Chart */}
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col h-[400px]">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                                        <BarChart3 size={20} className="text-blue-600" /> Total de Votos
                                    </h3>
                                    <div className="flex-1 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartDataChapas} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                                <Bar dataKey="Votos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Salas por chapa - Stacked */}
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col h-[400px]">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">Salas que mais votaram em cada chapa</h3>
                                    <div className="flex-1 w-full">
                                        {turmasUnicas.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={turmasPorChapaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                                                    {turmasUnicas.map((turma, index) => (
                                                        <Bar key={turma} dataKey={turma} stackId="a" fill={TURMA_COLORS[index % TURMA_COLORS.length]} />
                                                    ))}
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem dados suficientes</div>
                                        )}
                                    </div>
                                </div>

                                {/* Genero Pie Chart */}
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col h-[400px]">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">Distribuição por Gênero</h3>
                                    <div className="flex-1 w-full">
                                        {generoData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={generoData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                                                        {generoData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
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
                                
                                {/* Idade Media Bar Chart */}
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col h-[400px]">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">Idade Média dos Eleitores</h3>
                                    <div className="flex-1 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={idadesPorChapaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                                <Bar dataKey="Idade Média" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'eleitores' && (
                        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Users size={24} className="text-blue-600" /> Relatório de Eleitores
                                </h3>
                                
                                <div className="flex gap-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input 
                                            type="text" 
                                            placeholder="Buscar RA ou Nome" 
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64 text-sm bg-slate-50"
                                        />
                                    </div>
                                    <select 
                                        value={statusFilter} 
                                        onChange={e => setStatusFilter(e.target.value)}
                                        className="px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-slate-50"
                                    >
                                        <option value="all">Todos</option>
                                        <option value="voted">Já Votaram</option>
                                        <option value="pending">Não Votaram</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-slate-500 text-sm">
                                            <th className="pb-3 px-4 font-semibold">RA</th>
                                            <th className="pb-3 px-4 font-semibold">Nome</th>
                                            <th className="pb-3 px-4 font-semibold">Turma</th>
                                            <th className="pb-3 px-4 font-semibold">Status do Voto</th>
                                            <th className="pb-3 px-4 font-semibold">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {filteredAlunos.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-slate-400">Nenhum aluno encontrado</td>
                                            </tr>
                                        ) : (
                                            filteredAlunos.map((aluno: any) => (
                                                <tr key={aluno.ra} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                    <td className="py-3 px-4 text-slate-500">{aluno.ra}</td>
                                                    <td className="py-3 px-4 font-medium text-slate-800">{aluno.nome}</td>
                                                    <td className="py-3 px-4">
                                                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">{aluno.turma}</span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {aluno.hasVoted ? (
                                                            <span className="flex items-center gap-1 text-green-600 text-xs font-semibold bg-green-50 w-fit px-2 py-1 rounded-md">
                                                                <CheckCircle2 size={14} /> Votou
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-slate-400 text-xs font-semibold bg-slate-100 w-fit px-2 py-1 rounded-md">
                                                                <XCircle size={14} /> Pendente
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <button onClick={() => setSelectedAluno(aluno)} className="text-blue-600 hover:underline text-xs font-semibold">
                                                            Ver Detalhes
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 text-sm text-slate-500">
                                Mostrando {filteredAlunos.length} de {listAlunos.length} alunos
                            </div>
                        </div>
                    )}

                    {activeTab === 'chapas' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Building2 size={24} className="text-blue-600" /> Chapas Cadastradas
                                </h2>
                                <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shadow-lg shadow-blue-200">
                                    <PlusCircle size={18} /> Adicionar Chapa
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {votosPorChapa?.length === 0 ? (
                                    <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-slate-100">
                                        <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
                                        <h3 className="text-lg font-bold text-slate-700 mb-1">Nenhuma Chapa Cadastrada</h3>
                                        <p className="text-slate-500">Cadastre a primeira chapa para dar início às eleições.</p>
                                    </div>
                                ) : (
                                    votosPorChapa?.map((chapa: any) => (
                                        <div key={chapa.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                                            <div className="p-6 flex-1">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-4">
                                                        {chapa.logo_url ? (
                                                            <img src={chapa.logo_url} alt={`Logo ${chapa.nome}`} className="w-16 h-16 rounded-full object-cover border border-slate-200" />
                                                        ) : (
                                                            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                                                                {chapa.nome.substring(0,2).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <h3 className="font-bold text-lg text-slate-800">{chapa.nome}</h3>
                                                            {chapa.numero && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Nº {chapa.numero}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {chapa.descricao && (
                                                    <p className="text-slate-500 text-sm mb-4 line-clamp-3">{chapa.descricao}</p>
                                                )}

                                                <div className="space-y-2 mb-4">
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Integrantes ({chapa.integrantes?.length || 0})</h4>
                                                    {chapa.integrantes && chapa.integrantes.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {chapa.integrantes.slice(0, 3).map((integ: any, idx: number) => (
                                                                <div key={idx} className="text-sm flex justify-between">
                                                                    <span className="text-slate-700 font-medium truncate max-w-[120px]">{integ.nome}</span>
                                                                    <div className="flex gap-2">
                                                                        <span className="text-slate-500 text-xs bg-slate-100 px-1.5 rounded">{integ.cargo}</span>
                                                                        <span className="text-slate-500 text-xs bg-slate-100 px-1.5 rounded">{integ.turma}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {chapa.integrantes.length > 3 && (
                                                                <p className="text-xs text-blue-500 mt-1">+{chapa.integrantes.length - 3} integrantes...</p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-slate-400">Nenhum integrante cadastrado.</p>
                                                    )}
                                                </div>

                                                {chapa.propostas_url && (
                                                    <a href={chapa.propostas_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline">
                                                        <FileText size={16} /> Ver arquivo de propostas
                                                    </a>
                                                )}
                                            </div>
                                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                                                <div className="text-sm font-semibold text-slate-600">
                                                    Votos: {chapa.totalVotos}
                                                </div>
                                                <button onClick={() => handleDeleteChapa(chapa.id, chapa.nome)} className="text-red-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Excluir Chapa">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal de Adicionar Chapa */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <h3 className="text-lg font-bold text-slate-800">Cadastrar Nova Chapa</h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddChapa} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nome da Chapa *</label>
                                    <input type="text" required value={novaChapa.nome} onChange={e => setNovaChapa({...novaChapa, nome: e.target.value})} className="w-full text-slate-800 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Número (Opcional)</label>
                                    <input type="number" value={novaChapa.numero} onChange={e => setNovaChapa({...novaChapa, numero: e.target.value})} className="w-full text-slate-800 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição Breve</label>
                                    <textarea rows={2} value={novaChapa.descricao} onChange={e => setNovaChapa({...novaChapa, descricao: e.target.value})} className="w-full text-slate-800 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Logo da Chapa (Imagem)</label>
                                    <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Arquivo de Propostas (PDF, DOC)</label>
                                    <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={e => setPropostasFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-semibold text-slate-700">Integrantes da Chapa</label>
                                    <button type="button" onClick={addIntegrante} className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                        <PlusCircle size={14} /> Adicionar
                                    </button>
                                </div>
                                {integrantes.length === 0 ? (
                                    <p className="text-sm text-slate-400 italic">Nenhum integrante adicionado. Clique acima para adicionar.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {integrantes.map((intg, idx) => (
                                            <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-200">
                                                <input type="text" placeholder="Nome Completo" value={intg.nome} onChange={e => updateIntegrante(idx, 'nome', e.target.value)} required className="flex-1 min-w-0 text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 outline-none" />
                                                <input type="text" placeholder="Cargo (Ex: Pres)" value={intg.cargo} onChange={e => updateIntegrante(idx, 'cargo', e.target.value)} required className="w-24 text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 outline-none" />
                                                <input type="text" placeholder="Turma (Ex: 3A)" value={intg.turma} onChange={e => updateIntegrante(idx, 'turma', e.target.value)} required className="w-24 text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 outline-none" />
                                                <button type="button" onClick={() => removeIntegrante(idx)} className="text-red-400 hover:text-red-600 p-1">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-200">
                                    {loading ? 'Fazendo Upload e Salvando...' : 'Salvar Nova Chapa'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Detalhes do Aluno */}
            {selectedAluno && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
                        <div className="bg-slate-50 p-6 flex justify-between items-start border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg leading-tight">{selectedAluno.nome}</h3>
                                <p className="text-slate-500 text-sm mt-1">RA: {selectedAluno.ra}</p>
                            </div>
                            <button onClick={() => setSelectedAluno(null)} className="text-slate-400 hover:text-slate-600 bg-white p-1.5 rounded-full shadow-sm"><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-4 text-sm">
                            <div className="flex justify-between border-b border-slate-50 pb-2">
                                <span className="text-slate-500">Turma</span>
                                <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{selectedAluno.turma}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-50 pb-2">
                                <span className="text-slate-500">Nascimento</span>
                                <span className="font-semibold text-slate-800">{selectedAluno.data_nascimento}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-50 pb-2">
                                <span className="text-slate-500">Situação</span>
                                <span className="font-semibold text-green-600">{selectedAluno.situacao}</span>
                            </div>
                            <div className="flex justify-between pt-2">
                                <span className="text-slate-500">Status do Voto</span>
                                {selectedAluno.hasVoted ? (
                                    <div className="text-right">
                                        <span className="font-semibold text-green-600 flex items-center gap-1 justify-end"><CheckCircle2 size={14}/> Realizado</span>
                                        <span className="text-xs text-slate-400 mt-1 block">
                                            {new Date(selectedAluno.votedAt).toLocaleString('pt-BR')}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="font-semibold text-slate-400 flex items-center gap-1"><XCircle size={14}/> Pendente</span>
                                )}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                            <button onClick={() => setSelectedAluno(null)} className="text-sm font-semibold text-blue-600 hover:underline">Fechar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
