'use server'


import { supabase } from '@/lib/supabase';
import { cookies, headers } from 'next/headers';

export async function loginAluno(ra: string, digito: string) {
    if (!ra || !digito) {
        return { error: 'Preencha o RA e o DÃ­gito.' };
    }

    const { data: config } = await supabase.from('configuracoes').select('status').eq('id', 1).single();
    if (config?.status === 'finalizada') {
        return { error: 'Eleição encerrada! Não é mais possível votar.' };
    }

    const { data: aluno, error: alunoError } = await supabase
        .from('alunos')
        .select('*')
        .eq('ra', ra)
        .eq('digito_ra', digito)
        .eq('situacao', 'Ativo')
        .single();

    if (alunoError || !aluno) {
        return { error: 'Aluno nÃ£o encontrado ou nÃ£o estÃ¡ ativo.' };
    }
    
    // Convert to camelCase to match the old Aluno interface if needed for the frontend
    const alunoData = {
        nome: aluno.nome,
        turma: aluno.turma,
        dataNascimento: aluno.data_nascimento,
        ra: aluno.ra
    };

    // Verificar se jÃ¡ votou
    const { data: jaVotou, error: checkError } = await supabase
        .from('alunos_votaram')
        .select('ra')
        .eq('ra', ra)
        .single();
    
    if (jaVotou) {
        return { error: 'Este RA jÃ¡ registrou um voto.' };
    }

    // Retorna os dados do aluno para confirmaÃ§Ã£o
    return { success: true, aluno: alunoData };
}

export async function submitVote(
    ra: string,
    nome: string,
    turma: string,
    raca: string,
    genero: string,
    chapaId: string,
    dataNascimento?: string
) {
    if (!ra || !chapaId || !raca || !genero) {
        return { error: 'Dados incompletos para registrar o voto.' };
    }

    // Double check se jÃ¡ votou
    const { data: jaVotou } = await supabase
        .from('alunos_votaram')
        .select('ra')
        .eq('ra', ra)
        .single();
    
    if (jaVotou) {
        return { error: 'Este RA jÃ¡ registrou um voto.' };
    }

    // Capturar IP e User Agent
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    let ip = '';
    
    if (forwardedFor) {
        // x-forwarded-for can be a comma-separated list of IPs.
        ip = forwardedFor.split(',')[0].trim();
    } else {
        // Fallback for getting IP if x-forwarded-for is not present
        ip = headersList.get('x-real-ip') || 'IP nÃ£o disponÃ­vel';
    }

    const userAgent = headersList.get('user-agent') || 'Desconhecido';

    // Salvar o registro do aluno que votou (imutÃ¡vel por PK)
    const { error: errorAluno } = await supabase
        .from('alunos_votaram')
        .insert({
            ra,
            nome,
            turma
        });
        
    if (errorAluno) {
        console.error(errorAluno);
        return { error: 'Erro ao registrar aluno. Tente novamente.' };
    }

    // Calculate age
    let idade = null;
    if (dataNascimento) {
        const parts = dataNascimento.split('/');
        if (parts.length === 3) {
            const birth = new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));
            const today = new Date();
            idade = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                idade--;
            }
        }
    }

    // Salvar o voto anÃ´nimo (separado do RA)
    const { error: errorVoto } = await supabase
        .from('votos')
        .insert({
            chapa_id: chapaId,
            raca,
            genero,
            turma,
            idade,
            ip,
            user_agent: userAgent
        });

    if (errorVoto) {
        console.error(errorVoto);
        // Falhou o voto, mas o aluno foi salvo? Idealmente farÃ­amos uma transaction, 
        // mas supabase js nÃ£o suporta transactions client-side facilmente sem RPC.
        // Vamos considerar sucesso se gravou aluno, para evitar duplo voto.
    }

    return { success: true };
}

export async function getChapas() {
    const { data, error } = await supabase.from('chapas').select('*').order('created_at', { ascending: true });
    if (error) {
        console.error(error);
        return [];
    }
    return data;
}

export async function adminLogin(password: string) {
    if (password === 'decide014266w10@') {
        const cookieStore = await cookies();
        cookieStore.set('admin_auth', 'true', { secure: process.env.NODE_ENV === 'production', httpOnly: true, path: '/' });
        return { success: true };
    }
    return { error: 'Senha incorreta' };
}

export async function adminLogout() {
    const cookieStore = await cookies();
    cookieStore.delete('admin_auth');
}

export async function getDashboardStats() {
    const { data: chapas } = await supabase.from('chapas').select('*');
    const { data: votos } = await supabase.from('votos').select('*');
    const { data: alunosVotaram } = await supabase.from('alunos_votaram').select('*');
    const { data: config } = await supabase.from('configuracoes').select('status').eq('id', 1).single();
    
    // Obter todos os alunos para cruzar quem não votou
    const { data: todosAlunos } = await supabase.from('alunos').select('ra, nome, turma, data_nascimento, situacao').eq('situacao', 'Ativo');
    
    return { chapas, votos, alunosVotaram, status: config?.status || 'ativa', todosAlunos };
}

export async function addChapa(nome: string, numero: number | null, descricao: string) {
    const cookieStore = await cookies();
    if (cookieStore.get('admin_auth')?.value !== 'true') return { error: 'NÃ£o autorizado' };
    
    const { data, error } = await supabase.from('chapas').insert({
        nome,
        numero,
        descricao
    });
    
    if (error) return { error: error.message };
    return { success: true };
}


export async function deleteChapa(id: string) {
    const cookieStore = await cookies();
    if (cookieStore.get('admin_auth')?.value !== 'true') return { error: 'Não autorizado' };
    
    const { error } = await supabase.from('chapas').delete().eq('id', id);
    if (error) return { error: error.message };
    return { success: true };
}

export async function resetElection() {
    const cookieStore = await cookies();
    if (cookieStore.get('admin_auth')?.value !== 'true') return { error: 'Não autorizado' };
    
    // Delete all votes first
    await supabase.from('votos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    // Delete all alunos_votaram
    await supabase.from('alunos_votaram').delete().neq('ra', 'invalid');
    // Delete all chapas
    await supabase.from('chapas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Reset status para ativa
    await supabase.from('configuracoes').update({ status: 'ativa' }).eq('id', 1);
    
    return { success: true };
}

export async function toggleElectionStatus(currentStatus: string) {
    const cookieStore = await cookies();
    if (cookieStore.get('admin_auth')?.value !== 'true') return { error: 'Não autorizado' };
    
    const newStatus = currentStatus === 'ativa' ? 'finalizada' : 'ativa';
    const { error } = await supabase.from('configuracoes').update({ status: newStatus }).eq('id', 1);
    if (error) return { error: error.message };
    return { success: true, status: newStatus };
}

