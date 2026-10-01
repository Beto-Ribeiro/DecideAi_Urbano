import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Criando aluno fictício no Supabase...");
    
    const fakeAluno = {
        ra: "123456789",
        digito_ra: "0",
        nome: "Aluno Fictício de Teste",
        data_nascimento: "01/01/2005",
        turma: "3 DS",
        situacao: "Ativo"
    };

    const { data, error } = await supabase
        .from('alunos')
        .upsert(fakeAluno, { onConflict: 'ra' });

    if (error) {
        console.error("Erro ao criar aluno:", error.message);
    } else {
        console.log("Aluno fictício criado com sucesso!");
        console.log("-----------------------------------------");
        console.log("DADOS PARA LOGIN:");
        console.log("RA: 123456789");
        console.log("Dígito: 0");
        console.log("-----------------------------------------");
    }
}

main();
