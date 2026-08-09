const MAX_DIM = 512;

/**
 * Normaliza uma imagem de logo antes do upload: reduz se maior que MAX_DIM,
 * centraliza em contain-fit num canvas quadrado transparente (nunca estica/
 * distorce a proporção original) e exporta como PNG.
 */
export async function normalizeLogoFile(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = MAX_DIM;
  canvas.height = MAX_DIM;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, Math.round((MAX_DIM - w) / 2), Math.round((MAX_DIM - h) / 2), w, h);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 0.92));
  if (!blob) return file;
  return new File([blob], 'logo.png', { type: 'image/png' });
}
