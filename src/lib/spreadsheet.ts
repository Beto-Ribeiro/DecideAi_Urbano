import { AlunoRow } from './database.types';
import { normalizarRa } from './validations';

export interface ErroImportacaoAluno {
  linha: number;
  arquivo: string;
  ra?: string;
  nome?: string;
  motivo: string;
}

export interface ResultadoPreviewImportacao {
  validos: AlunoRow[];
  erros: ErroImportacaoAluno[];
  totalLinhasLidas: number;
  ativosCount: number;
  inativosCount: number;
  turmasDetectadas: string[];
}

/**
 * Extrai matriz de linhas/colunas de um arquivo .xlsx (OpenXML ZIP) usando Web DecompressionStream
 * sem dependências externas vulneráveis.
 */
async function parseXlsxBuffer(buffer: ArrayBuffer): Promise<string[][]> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const entries = new Map<string, Uint8Array>();

  let offset = 0;
  while (offset + 30 <= bytes.length) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) break; // Local file header signature

    const compression = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const fileNameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);

    const nameBytes = bytes.subarray(offset + 30, offset + 30 + fileNameLen);
    const fileName = new TextDecoder().decode(nameBytes);
    const dataStart = offset + 30 + fileNameLen + extraLen;
    const compressedData = bytes.subarray(dataStart, dataStart + compressedSize);

    if (
      fileName === 'xl/sharedStrings.xml' ||
      fileName === 'xl/worksheets/sheet1.xml'
    ) {
      if (compression === 0) {
        entries.set(fileName, compressedData);
      } else if (compression === 8 && typeof DecompressionStream !== 'undefined') {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        await writer.write(new Uint8Array(compressedData));
        await writer.close();
        const decompressedBuf = await new Response(ds.readable).arrayBuffer();
        entries.set(fileName, new Uint8Array(decompressedBuf));
      }
    }

    offset = dataStart + compressedSize;
  }

  const decoder = new TextDecoder('utf-8');
  const sharedStringsXml = entries.has('xl/sharedStrings.xml')
    ? decoder.decode(entries.get('xl/sharedStrings.xml'))
    : '';
  const sheetXml = entries.has('xl/worksheets/sheet1.xml')
    ? decoder.decode(entries.get('xl/worksheets/sheet1.xml'))
    : '';

  if (!sheetXml) {
    throw new Error('Planilha XLSX inválida ou sem aba principal (sheet1.xml).');
  }

  const sharedStrings: string[] = [];
  const siRegex = /<si[\s>][\s\S]*?<\/si>/g;
  let siMatch: RegExpExecArray | null;
  while ((siMatch = siRegex.exec(sharedStringsXml)) !== null) {
    const tMatches = siMatch[0].match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
    const text = tMatches
      .map((t) => t.replace(/<[^>]+>/g, ''))
      .join('');
    sharedStrings.push(decodeXmlEntities(text));
  }

  const rows: string[][] = [];
  const rowRegex = /<row[\s>][\s\S]*?<\/row>/g;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(sheetXml)) !== null) {
    const rowCells: string[] = [];
    const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowMatch[0])) !== null) {
      const attrs = cellMatch[1];
      const inner = cellMatch[2];
      const typeMatch = attrs.match(/\bt="([^"]+)"/);
      const cellType = typeMatch ? typeMatch[1] : '';
      const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
      const isMatch = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/);

      let val = '';
      if (cellType === 's' && vMatch) {
        const idx = parseInt(vMatch[1], 10);
        val = sharedStrings[idx] ?? '';
      } else if (isMatch) {
        val = decodeXmlEntities(isMatch[1]);
      } else if (vMatch) {
        val = decodeXmlEntities(vMatch[1]);
      }
      rowCells.push(val.trim());
    }
    if (rowCells.some((c) => c.length > 0)) {
      rows.push(rowCells);
    }
  }

  return rows;
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Converte texto CSV/TSV em matriz de células detectando automaticamente `;`, `,` ou `\t`.
 */
export function parseCsvTextToRows(text: string): string[][] {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  // Detecta delimitador predominante
  const sample = lines.slice(0, 5).join('\n');
  const semicolons = (sample.match(/;/g) || []).length;
  const commas = (sample.match(/,/g) || []).length;
  const tabs = (sample.match(/\t/g) || []).length;

  const delimiter = semicolons >= commas && semicolons >= tabs ? ';' : tabs > commas ? '\t' : ',';

  return lines.map((line) =>
    line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ''))
  );
}

/**
 * Processa matriz de células (de CSV ou XLSX) para extrair alunos com validação e relatório de erros.
 */
export function processarLinhasImportacao(
  rows: string[][],
  nomeArquivo: string,
  turmaPadrao?: string
): ResultadoPreviewImportacao {
  const turmaInferida =
    turmaPadrao?.trim() ||
    nomeArquivo
      .replace(/\.(csv|xlsx|txt)$/i, '')
      .trim() ||
    'Sem Turma';

  const validos: AlunoRow[] = [];
  const erros: ErroImportacaoAluno[] = [];
  const rasVistos = new Set<string>();

  // Encontrar linha de cabeçalho (padrão SED-SP ou genérico)
  let headerRowIdx = -1;
  let colMap = {
    ra: 2,
    digito: 3,
    nome: 1,
    uf: 4,
    nascimento: 5,
    situacao: 6,
    turma: -1,
  };

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const r = rows[i].map((c) => c.toLowerCase());
    const hasRa = r.some((c) => c === 'ra' || c.includes('r.a'));
    const hasNome = r.some((c) => c.includes('nome'));
    if (hasRa && hasNome) {
      headerRowIdx = i;
      colMap = {
        ra: r.findIndex((c) => c === 'ra' || c.startsWith('ra ') || c === 'r.a.'),
        digito: r.findIndex((c) => c.includes('dig')),
        nome: r.findIndex((c) => c.includes('nome')),
        uf: r.findIndex((c) => c.includes('uf')),
        nascimento: r.findIndex((c) => c.includes('nasc')),
        situacao: r.findIndex((c) => c.includes('situa') || c.includes('status')),
        turma: r.findIndex((c) => c.includes('turma') || c.includes('série') || c.includes('serie')),
      };
      break;
    }
  }

  const startRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
  let totalLinhasLidas = 0;

  for (let i = startRow; i < rows.length; i++) {
    const cols = rows[i];
    if (!cols || cols.length < 2) continue;

    // Ignorar linha de título "Lista de Alunos" da SED-SP
    if (cols[0]?.toLowerCase().includes('lista de alunos')) continue;

    totalLinhasLidas++;
    const rawRa = colMap.ra >= 0 ? cols[colMap.ra] || '' : '';
    const ra = normalizarRa(rawRa);
    const nome = (colMap.nome >= 0 ? cols[colMap.nome] || '' : '').trim();
    const digito = (colMap.digito >= 0 ? cols[colMap.digito] || '0' : '0').trim() || '0';
    const uf = (colMap.uf >= 0 ? cols[colMap.uf] || 'SP' : 'SP').trim() || 'SP';
    const nascimento = (colMap.nascimento >= 0 ? cols[colMap.nascimento] || '' : '').trim();
    const situacaoRaw = (colMap.situacao >= 0 ? cols[colMap.situacao] || 'Ativo' : 'Ativo').trim();
    const turma =
      (colMap.turma >= 0 && cols[colMap.turma] ? cols[colMap.turma].trim() : '') || turmaInferida;

    if (!ra || ra.length < 4) {
      erros.push({
        linha: i + 1,
        arquivo: nomeArquivo,
        ra: rawRa,
        nome,
        motivo: 'RA ausente ou com menos de 4 dígitos numéricos.',
      });
      continue;
    }

    if (!nome || nome.length < 3) {
      erros.push({
        linha: i + 1,
        arquivo: nomeArquivo,
        ra,
        nome,
        motivo: 'Nome do aluno ausente ou inválido.',
      });
      continue;
    }

    if (rasVistos.has(ra)) {
      erros.push({
        linha: i + 1,
        arquivo: nomeArquivo,
        ra,
        nome,
        motivo: 'RA duplicado no mesmo lote de importação.',
      });
      continue;
    }

    rasVistos.add(ra);
    const situacaoNormalizada =
      situacaoRaw.toLowerCase() === 'ativo' ? 'Ativo' : situacaoRaw || 'Inativo';

    validos.push({
      ra,
      digito_ra: digito,
      nome,
      uf_ra: uf,
      data_nascimento: nascimento || null,
      situacao: situacaoNormalizada,
      turma,
    });
  }

  const ativosCount = validos.filter((a) => a.situacao === 'Ativo').length;
  const inativosCount = validos.length - ativosCount;
  const turmasDetectadas = Array.from(new Set(validos.map((a) => a.turma))).sort();

  return {
    validos,
    erros,
    totalLinhasLidas,
    ativosCount,
    inativosCount,
    turmasDetectadas,
  };
}

export async function lerArquivoImportacao(
  file: File,
  turmaPadrao?: string
): Promise<ResultadoPreviewImportacao> {
  const isXlsx = file.name.toLowerCase().endsWith('.xlsx');
  if (isXlsx) {
    const buffer = await file.arrayBuffer();
    const rows = await parseXlsxBuffer(buffer);
    return processarLinhasImportacao(rows, file.name, turmaPadrao);
  } else {
    const buffer = await file.arrayBuffer();
    // Tenta UTF-8 primeiro; se houver caractere de substituição (\uFFFD), decodifica como windows-1252
    let text = new TextDecoder('utf-8').decode(buffer);
    if (text.includes('\uFFFD')) {
      text = new TextDecoder('windows-1252').decode(buffer);
    }
    const rows = parseCsvTextToRows(text);
    return processarLinhasImportacao(rows, file.name, turmaPadrao);
  }
}
