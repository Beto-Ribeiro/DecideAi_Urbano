import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { ConfiguracaoEscola } from './escola';
import {
  ApuracaoChapaItem,
  ChapaCompleta,
  EleicaoRow,
  ParticipacaoTurmaItem,
  RelatorioIntegridade,
  TipoCertificado,
} from './database.types';

async function tryLoadImageAsDataUrl(src: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch(src, { method: 'GET' });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Gera o Certificado Oficial em PDF (A4 Paisagem, 297x210mm) no navegador.
 */
export async function gerarCertificadoOficialPdf(params: {
  escola: ConfiguracaoEscola;
  eleicao: EleicaoRow;
  chapa: ChapaCompleta;
  tipo: TipoCertificado;
  votosChapa: number;
  percentualValidos: number;
  totalVotosEleicao: number;
  colocacao: number;
  codigoVerificacao: string;
  originUrl: string;
}): Promise<void> {
  const {
    escola,
    eleicao,
    chapa,
    tipo,
    votosChapa,
    percentualValidos,
    totalVotosEleicao,
    colocacao,
    codigoVerificacao,
    originUrl,
  } = params;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Fundo e Moldura Dupla Institucional
  doc.setFillColor(250, 248, 255);
  doc.rect(0, 0, 297, 210, 'F');

  doc.setDrawColor(0, 55, 176); // #0037B0 Primary
  doc.setLineWidth(1.5);
  doc.rect(8, 8, 281, 194);

  doc.setDrawColor(141, 75, 0); // #8D4B00 Tertiary Gold/Bronze
  doc.setLineWidth(0.5);
  doc.rect(11, 11, 275, 188);

  // Tentar carregar logotipos oficiais ou desenhar placeholder claramente marcado
  const logoSpData = await tryLoadImageAsDataUrl(escola.logos.spEducacao);
  const logoEscolaData = await tryLoadImageAsDataUrl(escola.logos.escola);

  // Selo Esquerdo: Governo do Estado de SP / SEDUC
  doc.setFillColor(242, 243, 255);
  doc.setDrawColor(196, 197, 215);
  doc.circle(32, 30, 13, 'FD');
  if (logoSpData) {
    doc.addImage(logoSpData, 'PNG', 21, 19, 22, 22);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(0, 55, 176);
    doc.text('PLACEHOLDER', 32, 27, { align: 'center' });
    doc.text('LOGO SEDUC-SP', 32, 31, { align: 'center' });
    doc.setFontSize(5.5);
    doc.text('logo-sp-educacao.png', 32, 35, { align: 'center' });
  }

  // Selo Direito: Brasão Oficial E.E. Urbano em disco circular branco
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0, 55, 176);
  doc.circle(265, 30, 13, 'FD');
  if (logoEscolaData) {
    doc.addImage(logoEscolaData, 'JPEG', 254, 19, 22, 22);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(0, 55, 176);
    doc.text('PLACEHOLDER', 265, 27, { align: 'center' });
    doc.text('BRASÃO ESCOLA', 265, 31, { align: 'center' });
    doc.setFontSize(5.5);
    doc.text('logo-escola.jpg', 265, 35, { align: 'center' });
  }

  // Cabeçalho Centralizado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(67, 70, 85);
  doc.text(escola.secretaria.toUpperCase(), 148.5, 21, { align: 'center' });

  doc.setFontSize(15);
  doc.setTextColor(0, 55, 176);
  doc.text(escola.nome.toUpperCase(), 148.5, 29, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(67, 70, 85);
  doc.text(`${escola.diretoriaEnsino} • Comissão Eleitoral do Grêmio Estudantil`, 148.5, 35, {
    align: 'center',
  });

  // Faixa de Título do Certificado
  doc.setFillColor(226, 231, 255);
  doc.rect(20, 45, 257, 16, 'F');

  doc.setFont('times', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(0, 55, 176);
  const tituloCertificado =
    tipo === 'vitoria'
      ? 'CERTIFICADO OFICIAL DE VITÓRIA E POSSE ELEITORAL'
      : 'CERTIFICADO OFICIAL DE PARTICIPAÇÃO DEMOCRÁTICA';
  doc.text(tituloCertificado, 148.5, 55.5, { align: 'center' });

  // Texto Solene
  doc.setFont('times', 'normal');
  doc.setFontSize(11.5);
  doc.setTextColor(19, 27, 46);

  const dataFormatada = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const numeroTexto = chapa.numero ? ` (Nº ${chapa.numero})` : '';
  const textoSolene =
    tipo === 'vitoria'
      ? `A Direção Escolar, a Coordenação Pedagógica e a Comissão Eleitoral da ${escola.nome} certificam que a chapa "${chapa.nome.toUpperCase()}"${numeroTexto} sagrou-se VENCEDORA (1º Lugar) na ${eleicao.nome}, obtendo ${votosChapa} votos (${percentualValidos}% dos votos válidos de um total de ${totalVotosEleicao} votos registrados) em escrutínio eletrônico direto, secreto e auditado pelo sistema DecideAI.`
      : `A Direção Escolar, a Coordenação Pedagógica e a Comissão Eleitoral da ${escola.nome} certificam e congratulam a chapa "${chapa.nome.toUpperCase()}"${numeroTexto} pela exemplar participação democrática (${colocacao}º Lugar • ${votosChapa} votos / ${percentualValidos}% dos votos válidos) na ${eleicao.nome}, fortalecendo o protagonismo juvenil e a cidadania estudantil.`;

  const linhasSolenes = doc.splitTextToSize(textoSolene, 245);
  doc.text(linhasSolenes, 148.5, 70, { align: 'center' });

  // Quadro de Integrantes da Chapa
  doc.setFillColor(242, 243, 255);
  doc.setDrawColor(196, 197, 215);
  doc.roundedRect(20, 90, 257, 50, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 55, 176);
  doc.text(
    `QUADRO NOMINAL DE INTEGRANTES — ${chapa.nome.toUpperCase()}${chapa.slogan ? ` ("${chapa.slogan}")` : ''}`,
    25,
    97
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(19, 27, 46);

  const integrantes = chapa.integrantes || [];
  if (integrantes.length === 0) {
    doc.text('Representação estudantil homologada junto à Comissão Eleitoral.', 25, 106);
  } else {
    const colWidth = 82;
    integrantes.slice(0, 12).forEach((intg, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 25 + col * colWidth;
      const y = 105 + row * 8.5;
      const textoIntg = `• ${intg.cargo}: ${intg.nome} (${intg.turma})`;
      doc.text(textoIntg.substring(0, 46), x, y);
    });
  }

  // Local e Data
  doc.setFont('times', 'italic');
  doc.setFontSize(10.5);
  doc.setTextColor(67, 70, 85);
  doc.text(`${escola.cidade} - ${escola.uf}, ${dataFormatada}.`, 148.5, 149, { align: 'center' });

  // Assinaturas
  doc.setDrawColor(116, 118, 134);
  doc.setLineWidth(0.3);

  // Assinatura 1: Direção
  doc.line(25, 170, 95, 170);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(19, 27, 46);
  doc.text(escola.assinaturas.direcao.nome, 60, 175, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(67, 70, 85);
  doc.text(escola.assinaturas.direcao.cargo, 60, 179.5, { align: 'center' });

  // Assinatura 2: Coordenação
  doc.line(110, 170, 180, 170);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(19, 27, 46);
  doc.text(escola.assinaturas.coordenacao.nome, 145, 175, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(67, 70, 85);
  doc.text(escola.assinaturas.coordenacao.cargo, 145, 179.5, { align: 'center' });

  // Assinatura 3: Comissão Eleitoral
  doc.line(192, 170, 245, 170);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(19, 27, 46);
  doc.text(escola.assinaturas.comissao.nome, 218.5, 175, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(67, 70, 85);
  doc.text(escola.assinaturas.comissao.cargo, 218.5, 179.5, { align: 'center' });

  // QR Code apontando para /verificar/[codigo]
  const urlVerificacao = `${originUrl.replace(/\/$/, '')}/verificar/${encodeURIComponent(codigoVerificacao)}`;
  const qrDataUrl = await QRCode.toDataURL(urlVerificacao, {
    width: 160,
    margin: 1,
    color: { dark: '#0037B0', light: '#FFFFFF' },
  });
  doc.addImage(qrDataUrl, 'PNG', 252, 152, 26, 26);

  // Rodapé de Verificação
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 55, 176);
  doc.text(
    `CÓDIGO DE VERIFICAÇÃO PÚBLICA: ${codigoVerificacao}  |  VERIFIQUE EM: ${urlVerificacao}`,
    20,
    193
  );

  doc.save(`Certificado_${tipo}_${chapa.nome.replace(/\s+/g, '_')}_${escola.nomeCurto.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Gera a Ata Eleitoral Oficial em PDF (A4 Retrato) com os dados e logos da escola.
 */
export async function gerarAtaEleitoralPdf(params: {
  escola: ConfiguracaoEscola;
  eleicao: EleicaoRow;
  apuracao: ApuracaoChapaItem[];
  integridade: RelatorioIntegridade;
  participacaoTurmas: ParticipacaoTurmaItem[];
  totalAptos: number;
}): Promise<void> {
  const { escola, eleicao, apuracao, integridade, participacaoTurmas, totalAptos } = params;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const logoSpData = await tryLoadImageAsDataUrl(escola.logos.spEducacao);
  const logoEscolaData = await tryLoadImageAsDataUrl(escola.logos.escola);

  // Cabeçalho
  if (logoSpData) {
    doc.addImage(logoSpData, 'PNG', 15, 12, 18, 18);
  } else {
    doc.setDrawColor(180, 180, 195);
    doc.rect(15, 12, 18, 18);
    doc.setFontSize(5);
    doc.text('PLACEHOLDER', 24, 20, { align: 'center' });
    doc.text('SEDUC-SP', 24, 23, { align: 'center' });
  }

  if (logoEscolaData) {
    doc.addImage(logoEscolaData, 'JPEG', 177, 12, 18, 18);
  } else {
    doc.setDrawColor(0, 55, 176);
    doc.circle(186, 21, 9);
    doc.setFontSize(5);
    doc.text('PLACEHOLDER', 186, 20, { align: 'center' });
    doc.text('E.E. URBANO', 186, 23, { align: 'center' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(67, 70, 85);
  doc.text(escola.secretaria.toUpperCase(), 105, 16, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(0, 55, 176);
  doc.text(escola.nome.toUpperCase(), 105, 22, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(67, 70, 85);
  doc.text(`ATA OFICIAL DE APURAÇÃO E AUDITORIA — ${eleicao.nome.toUpperCase()}`, 105, 28, {
    align: 'center',
  });

  doc.setDrawColor(0, 55, 176);
  doc.setLineWidth(0.5);
  doc.line(15, 33, 195, 33);

  // Corpo formal da Ata
  const agoraStr = new Date().toLocaleString('pt-BR');
  const percComparecimento =
    totalAptos > 0 ? ((integridade.total_participacoes / totalAptos) * 100).toFixed(1) : '0.0';

  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(19, 27, 46);

  const paragrafoIntro = `Na sede da ${escola.nome}, localizada no município de ${escola.cidade} - ${escola.uf}, a Comissão Eleitoral Discente e a Equipe Gestora reuniram-se em ${agoraStr} para lavrar a presente Ata Oficial referente à "${eleicao.nome}" (Status: ${eleicao.status.toUpperCase()}), realizada por meio do sistema eletrônico auditável DecideAI.`;
  doc.text(doc.splitTextToSize(paragrafoIntro, 180), 15, 42);

  // Quadro Resumo de Quórum e Integridade
  doc.setFillColor(242, 243, 255);
  doc.roundedRect(15, 58, 180, 32, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 55, 176);
  doc.text('1. SÍNTESE DO COLÉGIO ELEITORAL E INTEGRIDADE CRIPTOGRÁFICA', 20, 65);

  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(19, 27, 46);
  doc.text(`• Estudantes Aptos no Censo Escolar: ${totalAptos}`, 20, 72);
  doc.text(
    `• Participações Registradas (Assinaturas na Urna): ${integridade.total_participacoes} (${percComparecimento}%)`,
    20,
    77
  );
  doc.text(
    `• Votos Computados na Urna: ${integridade.total_votos} (Válidos: ${integridade.votos_validos} | Brancos: ${integridade.votos_brancos})`,
    20,
    82
  );
  doc.text(
    `• Auditoria de Paridade (Participações == Votos): ${integridade.integro ? 'ÍNTEGRO (OK)' : 'DIVERGÊNCIA'} | Hash: ${integridade.hash_resumo}`,
    20,
    87
  );

  // Quadro de Votos por Chapa
  let y = 100;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 55, 176);
  doc.text('2. RESULTADO DA APURAÇÃO POR CHAPA CONCORRENTE', 15, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(19, 27, 46);

  apuracao.forEach((c, idx) => {
    doc.text(
      `${idx + 1}º Lugar — ${c.nome}${c.numero ? ` (Nº ${c.numero})` : ''}: ${c.total_votos} votos (${c.percentual_validos}% dos válidos / ${c.percentual_total}% do total)`,
      18,
      y
    );
    y += 6;
  });

  doc.text(`• Votos em Branco: ${integridade.votos_brancos} votos (Não há voto nulo conforme regimento)`, 18, y);
  y += 10;

  // Participação por Turma
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 55, 176);
  doc.text('3. PARTICIPAÇÃO POR TURMA (RESUMO)', 15, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(19, 27, 46);

  participacaoTurmas.slice(0, 18).forEach((t, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    doc.text(
      `Turma ${t.turma}: ${t.total_votaram}/${t.total_aptos} (${t.percentual_participacao}%)`,
      18 + col * 90,
      y + row * 5
    );
  });

  // Assinaturas no rodapé da Ata
  const sigY = 255;
  doc.setDrawColor(116, 118, 134);
  doc.line(18, sigY, 72, sigY);
  doc.line(78, sigY, 132, sigY);
  doc.line(138, sigY, 192, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(escola.assinaturas.direcao.nome, 45, sigY + 5, { align: 'center' });
  doc.text(escola.assinaturas.coordenacao.nome, 105, sigY + 5, { align: 'center' });
  doc.text(escola.assinaturas.comissao.nome, 165, sigY + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(escola.assinaturas.direcao.cargo, 45, sigY + 9, { align: 'center' });
  doc.text(escola.assinaturas.coordenacao.cargo, 105, sigY + 9, { align: 'center' });
  doc.text(escola.assinaturas.comissao.cargo, 165, sigY + 9, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Documento gerado eletronicamente no navegador pelo Sistema DecideAI • ${escola.nome}`,
    105,
    285,
    { align: 'center' }
  );

  doc.save(`Ata_Eleitoral_${escola.nomeCurto.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Gera lista de eleitores / pendentes em PDF no navegador (sem jamais revelar o voto).
 */
export function gerarListaEleitoresPdf(params: {
  escola: ConfiguracaoEscola;
  titulo: string;
  eleitores: Array<{
    ra: string;
    nome: string;
    turma: string;
    votou: boolean;
    votou_em: string | null;
  }>;
}): void {
  const { escola, titulo, eleitores } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 55, 176);
  doc.text(escola.nome.toUpperCase(), 15, 15);

  doc.setFontSize(9.5);
  doc.setTextColor(19, 27, 46);
  doc.text(`${titulo} — Total listado: ${eleitores.length}`, 15, 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Sigilo Eleitoral Garantido (Art. 14 CF/88): Este relatório informa exclusivamente o comparecimento.',
    15,
    26
  );

  let y = 34;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(19, 27, 46);
  doc.text('RA', 15, y);
  doc.text('ESTUDANTE', 48, y);
  doc.text('TURMA', 138, y);
  doc.text('STATUS', 162, y);
  doc.line(15, y + 1.5, 195, y + 1.5);
  y += 6;

  doc.setFont('helvetica', 'normal');
  eleitores.forEach((el) => {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(el.ra, 15, y);
    doc.text(el.nome.substring(0, 44), 48, y);
    doc.text(el.turma, 138, y);
    doc.text(el.votou ? 'VOTOU' : 'PENDENTE', 162, y);
    y += 5;
  });

  doc.save(`Relatorio_Eleitores_${escola.nomeCurto.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Gera o Adesivo "Eu Votei" em PNG no navegador com o selo circular branco e brasão da escola.
 */
export async function baixarAdesivoEuVoteiPng(params: {
  escola: ConfiguracaoEscola;
  nomeEleicao: string;
  protocolo: string;
}): Promise<string> {
  const { escola, nomeEleicao, protocolo } = params;
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível');

  // Gradiente Cívico Azul/Índigo -> Verde
  const grad = ctx.createLinearGradient(0, 0, 1080, 1350);
  grad.addColorStop(0, '#0037B0');
  grad.addColorStop(0.55, '#1D4ED8');
  grad.addColorStop(1, '#006D30');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1350);

  // Círculos decorativos suaves
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.beginPath();
  ctx.arc(920, 180, 320, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(140, 1180, 280, 0, Math.PI * 2);
  ctx.fill();

  // Selo Circular Branco Protetor para o Brasão da Escola
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(540, 330, 145, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#92F5A4';
  ctx.lineWidth = 8;
  ctx.stroke();

  // Tentar desenhar logo-escola.jpg se existir, senão desenhar brasão placeholder marcado
  const logoData = await tryLoadImageAsDataUrl(escola.logos.escola);
  if (logoData) {
    const img = new Image();
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = logoData;
    });
    ctx.save();
    ctx.beginPath();
    ctx.arc(540, 330, 130, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, 410, 200, 260, 260);
    ctx.restore();
  } else {
    ctx.fillStyle = '#0037B0';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BRASÃO OFICIAL', 540, 315);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(escola.nomeCurto.toUpperCase(), 540, 350);
    ctx.font = '18px monospace';
    ctx.fillStyle = '#64748B';
    ctx.fillText('[logo-escola.jpg]', 540, 385);
  }

  // Título Principal "EU VOTEI!"
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.font = '900 112px sans-serif';
  ctx.fillText('EU VOTEI!', 540, 640);

  // Subtítulo da Eleição
  ctx.fillStyle = '#92F5A4';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(nomeEleicao.toUpperCase(), 540, 715);

  // Nome Completo da Escola
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(escola.nome, 540, 790);

  // Pílula de Protocolo Auditado
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.beginPath();
  ctx.roundRect(190, 880, 700, 130, 32);
  ctx.fill();

  ctx.fillStyle = '#DCE1FF';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('PROTOCOLO DE PARTICIPAÇÃO AUDITADO', 540, 930);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 34px monospace';
  ctx.fillText(protocolo, 540, 982);

  // Rodapé
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '26px sans-serif';
  ctx.fillText('Democracia Estudantil • Voto 100% Secreto • DecideAI', 540, 1240);

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `Eu_Votei_${escola.nomeCurto.replace(/\s+/g, '_')}.png`;
  link.click();
  return dataUrl;
}

/**
 * Exporta o Diagnóstico e Análise para a Próxima Gestão em PDF (Portal da Chapa).
 */
export function gerarDiagnosticoChapaPdf(params: {
  escola: ConfiguracaoEscola;
  eleicaoNome: string;
  chapaNome: string;
  colocacao: number;
  votosChapa: number;
  percentualValidos: number;
  destaques: string[];
  votosPorSerie: Array<{ serie: string; votosChapa: number; totalSerie: number; percentual: number }>;
}): void {
  const { escola, eleicaoNome, chapaNome, colocacao, votosChapa, percentualValidos, destaques, votosPorSerie } =
    params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 55, 176);
  doc.text(escola.nome.toUpperCase(), 15, 16);

  doc.setFontSize(10);
  doc.setTextColor(19, 27, 46);
  doc.text(`DIAGNÓSTICO PÓS-ELEITORAL PARA A GESTÃO — ${chapaNome.toUpperCase()}`, 15, 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${eleicaoNome} • Resultado: ${colocacao}º Lugar com ${votosChapa} votos (${percentualValidos}% dos válidos)`,
    15,
    29
  );
  doc.line(15, 32, 195, 32);

  let y = 40;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 55, 176);
  doc.text('1. DESTAQUES E RECOMENDAÇÕES PARA A PRÓXIMA GESTÃO', 15, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(19, 27, 46);
  destaques.forEach((d) => {
    const linhas = doc.splitTextToSize(`• ${d}`, 175);
    doc.text(linhas, 18, y);
    y += linhas.length * 5.5 + 2;
  });

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 55, 176);
  doc.text('2. DESEMPENHO AGREGADO POR SÉRIE ESCOLAR', 15, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(19, 27, 46);
  votosPorSerie.forEach((s) => {
    doc.text(
      `• ${s.serie}: ${s.votosChapa} votos de ${s.totalSerie} na série (${s.percentual}%)`,
      18,
      y
    );
    y += 6;
  });

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Relatório analítico agregado (respeitando k-anonimato >= 5) • ${escola.nome}`,
    105,
    285,
    { align: 'center' }
  );

  doc.save(`Analise_Gestao_${chapaNome.replace(/\s+/g, '_')}.pdf`);
}

