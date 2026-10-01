import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carrega as variáveis do .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltam as chaves do Supabase no arquivo .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface AlunoDB {
  ra: string;
  digito_ra: string;
  nome: string;
  uf_ra: string;
  data_nascimento: string;
  situacao: string;
  turma: string;
}

const getAlunosFromCSV = (filePath: string, turmaName: string): AlunoDB[] => {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');
  const alunos: AlunoDB[] = [];

  let startIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Nº de chamada;Nome do Aluno;RA')) {
      startIndex = i + 1;
      break;
    }
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(';');
    if (parts.length >= 7) {
      alunos.push({
        nome: parts[1].trim(),
        ra: parts[2].trim(),
        digito_ra: parts[3].trim(),
        uf_ra: parts[4].trim(),
        data_nascimento: parts[5].trim(),
        situacao: parts[6].trim(),
        turma: turmaName,
      });
    }
  }

  return alunos;
};

async function main() {
  const alunosDir = path.join(process.cwd(), 'Alunos');
  
  if (!fs.existsSync(alunosDir)) {
      console.error('Diretório Alunos não encontrado em: ', alunosDir);
      return;
  }

  const files = fs.readdirSync(alunosDir);
  let totalInseridos = 0;
  
  for (const file of files) {
    if (file.endsWith('.csv')) {
      const turmaName = file.replace('.csv', '').trim();
      const filePath = path.join(alunosDir, file);
      
      console.log(`Lendo arquivo: ${file} (Turma: ${turmaName})`);
      const alunos = getAlunosFromCSV(filePath, turmaName);
      
      console.log(`Encontrados ${alunos.length} alunos na turma ${turmaName}. Inserindo no Supabase...`);
      
      // Inserir em lotes (batch) de 1000
      const BATCH_SIZE = 1000;
      for (let i = 0; i < alunos.length; i += BATCH_SIZE) {
        const batch = alunos.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase.from('alunos').upsert(batch, { onConflict: 'ra' });
        
        if (error) {
            console.error(`Erro ao inserir lote da turma ${turmaName}:`, error.message);
        } else {
            totalInseridos += batch.length;
        }
      }
    }
  }
  
  console.log(`\nImportação concluída! Total de alunos inseridos/atualizados: ${totalInseridos}`);
}

main().catch(console.error);
