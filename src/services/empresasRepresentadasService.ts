import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { EmpresaRepresentada } from '@/hooks/useEmpresasRepresentadas';


// Colunas reais da tabela empresas_representadas
const REAL_COLUMNS = [
  'nome', 'cnpj', 'email', 'telefone', 'endereco',
  'cidade', 'estado', 'cep', 'ativo', 'responsavel_id',
  'matriz_empresa_representada_id', 'limite_lancamento_retroativo_horas',
] as const;

function buildPayload(input: EmpresaRepresentada & Record<string, unknown>) {
  const incomingConfig =
    input.configuracoes && typeof input.configuracoes === 'object'
      ? { ...(input.configuracoes as Record<string, unknown>) }
      : {};

  const extras: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (k === 'id' || k === 'configuracoes' || k === 'created_at' || k === 'updated_at') continue;
    if ((REAL_COLUMNS as readonly string[]).includes(k)) continue;
    extras[k] = v;
  }

  const configuracoes = { ...incomingConfig, ...extras };

  const cnpjLimpo = input.cnpj ? String(input.cnpj).replace(/\D/g, '') : '';

  return {
    nome: input.nome,
    cnpj: cnpjLimpo || null,
    email: input.email || null,
    telefone: input.telefone || null,
    endereco: input.endereco || null,
    cidade: input.cidade || null,
    estado: input.estado || null,
    cep: input.cep || null,
    ativo: input.ativo ?? true,
    responsavel_id: input.responsavel_id || null,
    matriz_empresa_representada_id: input.matriz_empresa_representada_id || null,
    limite_lancamento_retroativo_horas:
      input.limite_lancamento_retroativo_horas === undefined
        ? 48
        : input.limite_lancamento_retroativo_horas,
    configuracoes: configuracoes as Json,
    updated_at: new Date().toISOString(),
  };
}

function hydrate(row: Record<string, unknown> | null): EmpresaRepresentada {
  if (!row) return row as unknown as EmpresaRepresentada;
  const c = (row.configuracoes && typeof row.configuracoes === 'object') ? row.configuracoes : {};
  return { ...c, ...row, configuracoes: c } as unknown as EmpresaRepresentada;
}

export const empresasRepresentadasService = {
  async list(): Promise<EmpresaRepresentada[]> {
    const { data, error } = await supabase
      .from('empresas_representadas')
      .select('*')
      .order('nome');
    if (error) throw error;
    return (data || []).map(hydrate);
  },

  async save(input: EmpresaRepresentada): Promise<EmpresaRepresentada> {
    const payload = buildPayload(input);
    if (input.id) {
      const { data, error } = await supabase
        .from('empresas_representadas')
        .update(payload)
        .eq('id', input.id)
        .select('*')
        .single();
      if (error) throw error;
      return hydrate(data);
    } else {
      const { data, error } = await supabase
        .from('empresas_representadas')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return hydrate(data);
    }
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('empresas_representadas').delete().eq('id', id);
    if (error) throw error;
  },

  async uploadLogo(folderKey: string, file: File): Promise<{ path: string }> {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${folderKey}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('empresa-logos')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    return { path };
  },

  async removeLogo(path: string): Promise<void> {
    if (!path) return;
    await supabase.storage.from('empresa-logos').remove([path]);
  },

  async uploadCertificado(folderKey: string, file: File): Promise<{ path: string; filename: string }> {
    const ext = (file.name.split('.').pop() || 'pfx').toLowerCase();
    const path = `${folderKey}/cert-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('empresa-certificados')
      .upload(path, file, { upsert: true, contentType: 'application/x-pkcs12' });
    if (error) throw error;
    return { path, filename: file.name };
  },

  async removeCertificado(path: string): Promise<void> {
    if (!path) return;
    await supabase.storage.from('empresa-certificados').remove([path]);
  },

  async getSignedUrl(bucket: 'empresa-logos' | 'empresa-certificados', path: string, expiresIn = 3600): Promise<string | null> {
    if (!path) return null;
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error) return null;
    return data?.signedUrl || null;
  },
};

