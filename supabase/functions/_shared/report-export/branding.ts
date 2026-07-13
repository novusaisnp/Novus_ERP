// Branding helper — resolve identidade visual do tenant para exports server-side.
// Sem APIs de browser. Fetch com timeout curto e cache em memória por execução.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

export interface BrandingLogo {
  bytes: Uint8Array;
  contentType: "image/png" | "image/jpeg";
  extension: "PNG" | "JPEG";
}

export interface Branding {
  companyName: string | null;
  primaryColor: string | null;
  logo: BrandingLogo | null;
}

const LOGO_FETCH_TIMEOUT_MS = 3000;
const MAX_LOGO_BYTES = 1_500_000; // 1.5MB — proteção contra abuso.

// Cache por execução (edge function). Evita múltiplos fetches da mesma URL.
const logoCache = new Map<string, BrandingLogo | null>();

function detectImageType(
  bytes: Uint8Array,
  contentTypeHeader: string | null,
): { contentType: BrandingLogo["contentType"]; extension: BrandingLogo["extension"] } | null {
  // PNG magic: 89 50 4E 47
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { contentType: "image/png", extension: "PNG" };
  }
  // JPEG magic: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: "image/jpeg", extension: "JPEG" };
  }
  const ct = (contentTypeHeader ?? "").toLowerCase();
  if (ct.includes("png")) return { contentType: "image/png", extension: "PNG" };
  if (ct.includes("jpeg") || ct.includes("jpg")) return { contentType: "image/jpeg", extension: "JPEG" };
  return null;
}

function isValidHttpUrl(raw: unknown): raw is string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) return false;
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function fetchLogoBytes(
  url: string,
  timeoutMs = LOGO_FETCH_TIMEOUT_MS,
): Promise<BrandingLogo | null> {
  if (!isValidHttpUrl(url)) return null;
  if (logoCache.has(url)) return logoCache.get(url) ?? null;

  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) {
      logoCache.set(url, null);
      return null;
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_LOGO_BYTES) {
      logoCache.set(url, null);
      return null;
    }
    const kind = detectImageType(buf, res.headers.get("content-type"));
    if (!kind) {
      logoCache.set(url, null);
      return null;
    }
    const logo: BrandingLogo = { bytes: buf, contentType: kind.contentType, extension: kind.extension };
    logoCache.set(url, logo);
    return logo;
  } catch {
    logoCache.set(url, null);
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Resolve branding para o usuário do schedule.
// Best-effort: usa a primeira empresa vinculada via user_roles.
// Nunca lança — retorna Branding com campos nulos em caso de erro.
export async function resolveBrandingForUser(
  client: SupabaseClient,
  userId: string,
): Promise<Branding> {
  const empty: Branding = { companyName: null, primaryColor: null, logo: null };
  try {
    const { data: rolesRow } = await client
      .from("user_roles")
      .select("empresa_representada_id")
      .eq("user_id", userId)
      .not("empresa_representada_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const empresaId = (rolesRow as { empresa_representada_id: string | null } | null)?.empresa_representada_id;
    if (!empresaId) return empty;

    const { data: emp } = await client
      .from("empresas_representadas")
      .select("nome,configuracoes")
      .eq("id", empresaId)
      .maybeSingle();

    if (!emp) return empty;
    const row = emp as { nome: string | null; configuracoes: Record<string, unknown> | null };
    const cfg = row.configuracoes ?? {};
    const logoUrl = typeof cfg.logo_url === "string" ? (cfg.logo_url as string) : null;
    const logoPath = typeof cfg.logo_path === "string" ? (cfg.logo_path as string) : null;
    const primaryColor = typeof cfg.primary_color === "string" ? (cfg.primary_color as string) : null;

    let logo: BrandingLogo | null = null;
    if (logoPath) {
      // Modal salva em Storage bucket privado 'empresa-logos' como logo_path.
      try {
        const { data: signed } = await client
          .storage
          .from("empresa-logos")
          .createSignedUrl(logoPath, 60);
        if (signed?.signedUrl) {
          logo = await fetchLogoBytes(signed.signedUrl);
        }
      } catch {
        logo = null;
      }
    }
    if (!logo && logoUrl) {
      logo = await fetchLogoBytes(logoUrl);
    }

    return {
      companyName: row.nome ?? null,
      primaryColor,
      logo,
    };
  } catch {
    return empty;
  }
}

export async function resolveBrandingForEmpresa(
  client: SupabaseClient,
  empresaId: string | null | undefined,
): Promise<Branding> {
  const empty: Branding = { companyName: null, primaryColor: null, logo: null };
  if (!empresaId) return empty;
  try {
    const { data: emp } = await client
      .from("empresas_representadas")
      .select("nome,configuracoes")
      .eq("id", empresaId)
      .maybeSingle();

    if (!emp) return empty;
    const row = emp as { nome: string | null; configuracoes: Record<string, unknown> | null };
    const cfg = row.configuracoes ?? {};
    const logoPath = typeof cfg.logo_path === "string" ? (cfg.logo_path as string) : null;
    const logoUrl = typeof cfg.logo_url === "string" ? (cfg.logo_url as string) : null;
    const primaryColor = typeof cfg.primary_color === "string" ? (cfg.primary_color as string) : null;

    let logo: BrandingLogo | null = null;
    if (logoPath) {
      try {
        const { data: signed } = await client.storage.from("empresa-logos").createSignedUrl(logoPath, 60);
        if (signed?.signedUrl) logo = await fetchLogoBytes(signed.signedUrl);
      } catch {
        logo = null;
      }
    }
    if (!logo && logoUrl) logo = await fetchLogoBytes(logoUrl);

    return { companyName: row.nome ?? null, primaryColor, logo };
  } catch {
    return empty;
  }
}

// Helper para testes: limpa cache.
export function _resetBrandingCacheForTests(): void {
  logoCache.clear();
}
