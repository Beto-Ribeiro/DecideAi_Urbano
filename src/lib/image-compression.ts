export const MAX_IMAGE_BYTES = 300 * 1024; // 300 KB
export const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Comprime imagens no navegador para formato WebP com no máximo 300 KB antes do upload
 * para economizar Storage e banda do Supabase Free / Vercel Hobby.
 */
export async function comprimirImagemParaWebP(
  file: File,
  maxWidth = 800,
  maxBytes = MAX_IMAGE_BYTES
): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('O arquivo selecionado não é uma imagem válida.');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Não foi possível inicializar o compressor de imagem no navegador.'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.85;
      const tentarConverter = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Falha ao comprimir a imagem para WebP.'));
              return;
            }
            if (blob.size > maxBytes && quality > 0.35) {
              quality -= 0.12;
              tentarConverter();
              return;
            }
            const nomeBase = file.name.replace(/\.[^.]+$/, '');
            const webpFile = new File([blob], `${nomeBase}.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve(webpFile);
          },
          'image/webp',
          quality
        );
      };

      tentarConverter();
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Erro ao carregar a imagem para compressão.'));
    };

    img.src = url;
  });
}

/**
 * Valida se o documento de propostas é um PDF válido e não excede 5 MB.
 */
export function validarPdfPropostas(file: File): { valido: boolean; erro?: string } {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return {
      valido: false,
      erro: 'O documento de propostas deve estar em formato PDF (.pdf).',
    };
  }
  if (file.size > MAX_PDF_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valido: false,
      erro: `O arquivo PDF possui ${mb} MB e excede o limite gratuito de 5 MB.`,
    };
  }
  return { valido: true };
}
