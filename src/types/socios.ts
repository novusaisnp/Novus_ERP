export type TipoSocio = 'SOCIO' | 'REPRESENTANTE_LEGAL' | 'PROCURADOR';

export interface SocioRepresentante {
  id?: string;
  empresa_representada_id: string;
  nome: string;
  cpf?: string | null;
  email?: string | null;
  telefone?: string | null;
  tipo: TipoSocio;
  participacao_percentual?: number | null;
  cargo_societario?: string | null;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export const TIPO_SOCIO_LABEL: Record<TipoSocio, string> = {
  SOCIO: 'Sócio',
  REPRESENTANTE_LEGAL: 'Representante Legal',
  PROCURADOR: 'Procurador',
};
