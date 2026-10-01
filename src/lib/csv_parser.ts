import fs from 'fs';
import path from 'path';

export interface Aluno {
  numeroChamada: string;
  nome: string;
  ra: string;
  digitoRa: string;
  ufRa: string;
  dataNascimento: string;
  situacao: string;
  turma: string;
}

const getAlunosFromCSV = (filePath: string, turmaName: string): Aluno[] => {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');
  const alunos: Aluno[] = [];

  // Pular o cabeçalho inicial e encontrar a linha de colunas
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
        numeroChamada: parts[0].trim(),
        nome: parts[1].trim(),
        ra: parts[2].trim(),
        digitoRa: parts[3].trim(),
        ufRa: parts[4].trim(),
        dataNascimento: parts[5].trim(),
        situacao: parts[6].trim(),
        turma: turmaName,
      });
    }
  }

  return alunos;
};

export const findAlunoByRa = (ra: string, digito: string): Aluno | null => {
  const alunosDir = path.join(process.cwd(), 'Alunos');
  
  if (!fs.existsSync(alunosDir)) {
      console.error('Diretório Alunos não encontrado');
      return null;
  }

  const files = fs.readdirSync(alunosDir);
  
  for (const file of files) {
    if (file.endsWith('.csv')) {
      const turmaName = file.replace('.csv', '').trim();
      const filePath = path.join(alunosDir, file);
      
      const alunos = getAlunosFromCSV(filePath, turmaName);
      
      const found = alunos.find(a => a.ra === ra && a.digitoRa === digito && a.situacao === 'Ativo');
      if (found) {
        return found;
      }
    }
  }
  
  return null;
};
