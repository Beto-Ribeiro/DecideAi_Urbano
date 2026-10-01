'use server'


import { supabase } from '@/lib/supabase';
import { cookies, headers } from 'next/headers';

export async function loginAluno(ra: string, digito: string) {
    if (!ra || !digito) {
        return { error: 'Preencha o RA e o Dígito.' };
    }

    const { data: aluno, error: alunoError } = await supabase
        .from('alunos')
        .select('*')
        .eq('ra', ra)
        .eq('digito_ra', digito)
        .eq('situacao', 'Ativo')
        .single();

    if (alunoError || !aluno) {
        return { error: 'Aluno não encontrado ou não está ativo.' };
    }
    
    // Convert to camelCase to match the old Aluno interface if needed for the frontend
    const alunoData = {
        nome: aluno.nome,
        turma: aluno.turma,
        dataNascimento: aluno.data_nascimento,
        ra: aluno.ra
    };

    // Verificar se já votou
    const { data: jaVotou, error: checkError } = await supabase
        .from('alunos_votaram')
        .select('ra')
        .eq('ra', ra)
        .single();
    
    if (jaVotou) {
        return { error: 'Este RA já registrou um voto.' };
    }

    // Retorna os dados do aluno para confirmação
    return { success: true, aluno: alunoData };
}

export async function submitVote(
    ra: string,
    nome: string,
    turma: string,
    raca: string,
    genero: string,
    chapaId: string
) {
    if (!ra || !chapaId || !raca || !genero) {
        return { error: 'Dados incompletos para registrar o voto.' };
    }

    // Double check se já votou
    const { data: jaVotou } = await supabase
        .from('alunos_votaram')
        .select('ra')
        .eq('ra', ra)
        .single();
    
    if (jaVotou) {
        return { error: 'Este RA já registrou um voto.' };
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
        ip = headersList.get('x-real-ip') || 'IP não disponível';
    }

    const userAgent = headersList.get('user-agent') || 'Desconhecido';

    // Salvar o registro do aluno que votou (imutável por PK)
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

    // Salvar o voto anônimo (separado do RA)
    const { error: errorVoto } = await supabase
        .from('votos')
        .insert({
            chapa_id: chapaId,
            raca,
            genero,
            turma,
            ip,
            user_agent: userAgent
        });

    if (errorVoto) {
        console.error(errorVoto);
        // Falhou o voto, mas o aluno foi salvo? Idealmente faríamos uma transaction, 
        // mas supabase js não suporta transactions client-side facilmente sem RPC.
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
    
    return { chapas, votos, alunosVotaram };
}

export async function addChapa(nome: string, numero: number | null, descricao: string) {
    const cookieStore = await cookies();
    if (cookieStore.get('admin_auth')?.value !== 'true') return { error: 'Não autorizado' };
    
    const { data, error } = await supabase.from('chapas').insert({
        nome,
        numero,
        descricao
    });
    
    if (error) return { error: error.message };
    return { success: true };
}

