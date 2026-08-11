import type { Json } from '@/integrations/supabase/types';
import type { CampoPersonalizado } from '@/types/campoPersonalizado';

type CampoExibivel = Pick<CampoPersonalizado, 'chave' | 'rotulo' | 'tipo' | 'obrigatorio'> & { opcoes?: string[] | null };

export function camposExtrasPreenchidos(campos: CampoExibivel[], valores: Record<string, Json | undefined>) {
  return campos.every((campo) => {
    if (!campo.obrigatorio) return true;
    const valor = valores[campo.chave];
    return campo.tipo === 'booleano' ? valor === true : valor !== undefined && valor !== null && valor !== '';
  });
}
export function formatarCampoExtra(tipo: CampoPersonalizado['tipo'], valor: Json | undefined) {
  if (valor === undefined || valor === null || valor === '') return '-';
  if (tipo === 'booleano') return valor === true ? 'Sim' : 'Não';
  if (tipo === 'data' && typeof valor === 'string') {
    return new Date(`${valor}T00:00:00`).toLocaleDateString('pt-BR');
  }
  if (tipo === 'numero' && typeof valor === 'number') return new Intl.NumberFormat('pt-BR').format(valor);
  return String(valor);
}
