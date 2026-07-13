import type { ReportBranding } from './reportExportShared';

export interface ResolvedReportLogo {
  dataUrl: string;
  base64: string;
  extension: 'png' | 'jpeg';
  width: number;
  height: number;
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const detectExtension = (bytes: Uint8Array, contentType: string | null): 'png' | 'jpeg' | null => {
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  const normalized = (contentType ?? '').toLowerCase();
  if (normalized.includes('png')) return 'png';
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpeg';
  return null;
};

const readImageSize = (dataUrl: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth || 1, height: image.naturalHeight || 1 });
    image.onerror = () => reject(new Error('invalid_logo_image'));
    image.src = dataUrl;
  });

const convertImageToPng = async (sourceUrl: string): Promise<ResolvedReportLogo | null> => {
  try {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('logo_image_load_failed'));
      image.src = sourceUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(image.naturalWidth, 1);
    canvas.height = Math.max(image.naturalHeight, 1);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    return {
      dataUrl,
      base64: dataUrl.split(',')[1] ?? '',
      extension: 'png',
      width: canvas.width,
      height: canvas.height,
    };
  } catch {
    return null;
  }
};

export const normalizeReportColor = (raw: string | null | undefined): [number, number, number] | null => {
  if (!raw) return null;
  const match = /^#?([0-9a-fA-F]{6})$/.exec(raw.trim());
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
};

export const resolveReportLogo = async (branding: ReportBranding | null | undefined): Promise<ResolvedReportLogo | null> => {
  const url = branding?.logoUrl;
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_LOGO_BYTES) return null;

    const bytes = new Uint8Array(buffer);
    const extension = detectExtension(bytes, response.headers.get('content-type'));
    if (!extension) {
      return convertImageToPng(url);
    }

    const contentType = extension === 'png' ? 'image/png' : 'image/jpeg';
    const base64 = arrayBufferToBase64(buffer);
    const dataUrl = `data:${contentType};base64,${base64}`;
    const size = await readImageSize(dataUrl);
    return { dataUrl, base64, extension, ...size };
  } catch {
    return null;
  }
};

export const getLogoRenderSize = (logo: ResolvedReportLogo, maxWidth: number, maxHeight: number): { width: number; height: number } => {
  const ratio = Math.min(maxWidth / logo.width, maxHeight / logo.height, 1);
  return {
    width: Math.max(1, logo.width * ratio),
    height: Math.max(1, logo.height * ratio),
  };
};