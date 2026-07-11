import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;
import { PlanoContas, PlanoContasInput } from '@/types/planoContas';

// DB usa: conta_pai_id, aceita_lancamento. Mantemos app-facing como id_pai/analitica.
type DBRow = {
  id: string;
  codigo: string;
  nome: string;
  tipo: string | null;
  natureza: string | null;
  conta_pai_id: string | null;
  nivel: number;
  ativo: boolean;
  aceita_lancamento: boolean;
  empresa_representada_id: string;
  created_at: string;
  updated_at: string;
};

const transformToPlanoContas = (data: DBRow): PlanoContas => ({
  id: data.id,
  codigo: data.codigo,
  nome: data.nome,
  tipo: (data.tipo as 'RECEITA' | 'DESPESA') || 'RECEITA',
  id_pai: data.conta_pai_id || undefined,
  nivel: data.nivel,
  ativo: data.ativo,
  analitica: data.aceita_lancamento,
  created_at: data.created_at,
  updated_at: data.updated_at,
});

async function getEmpresaId(): Promise<string> {
  const { data, error } = await supabase.rpc('get_user_empresa_id');
  if (error) {
    console.error('[PlanoContas] Erro ao obter empresa do usuário:', error);
    throw new Error('Não foi possível identificar a empresa do usuário logado');
  }
  if (!data) {
    throw new Error('Usuário sem empresa vinculada. Configure o vínculo antes de continuar.');
  }
  return data as string;
}

function translateError(error: any, fallback: string): Error {
  const code = error?.code;
  const msg = error?.message || '';
  if (code === '23505' || /duplicate key|already exists/i.test(msg)) {
    return new Error('Já existe uma conta com este código nesta empresa');
  }
  if (code === '42501' || /row-level security|permission/i.test(msg)) {
    return new Error('Sem permissão para esta operação na empresa selecionada');
  }
  if (code === '23502') {
    return new Error('Dados obrigatórios ausentes para salvar a conta');
  }
  return new Error(`${fallback}: ${msg || 'erro desconhecido'}`);
}

export const planoContasService = {
  async getAll(): Promise<PlanoContas[]> {
    const { data, error } = await supabase
      .from('plano_contas')
      .select('*')
      .order('codigo');

    if (error) {
      console.error('[PlanoContas] Erro ao buscar contas:', error);
      throw error;
    }
    return (data as DBRow[] | null)?.map(transformToPlanoContas) || [];
  },

  async searchContasAnaliticas(searchTerm: string, tipo?: 'RECEITA' | 'DESPESA'): Promise<PlanoContas[]> {
    if (!searchTerm || searchTerm.length < 2) return [];

    let query = supabase
      .from('plano_contas')
      .select('*')
      .eq('aceita_lancamento', true)
      .eq('ativo', true);

    if (tipo) query = query.eq('tipo', tipo);

    const { data, error } = await query
      .or(`codigo.ilike.%${searchTerm}%,nome.ilike.%${searchTerm}%`)
      .order('codigo')
      .limit(50);

    if (error) {
      console.error('[PlanoContas] Erro na busca:', error);
      throw error;
    }
    return (data as DBRow[] | null)?.map(transformToPlanoContas) || [];
  },

  async create(input: PlanoContasInput): Promise<PlanoContas> {
    if (!input.nome?.trim()) throw new Error('Nome da conta é obrigatório');
    if (!input.tipo) throw new Error('Tipo da conta é obrigatório');

    const empresa_representada_id = await getEmpresaId();

    const codigo = await planoContasService.generateCode(input.id_pai, empresa_representada_id);
    const nivel = input.id_pai ? (await planoContasService.calculateLevel(input.id_pai)) + 1 : 1;
    if (nivel > 5) throw new Error('Máximo de 5 níveis permitido');

    const aceita_lancamento = input.analitica !== undefined ? input.analitica : Boolean(input.id_pai);

    const insertData = {
      empresa_representada_id,
      nome: input.nome.trim(),
      tipo: input.tipo,
      conta_pai_id: input.id_pai || null,
      codigo,
      nivel,
      ativo: input.ativo !== undefined ? input.ativo : true,
      aceita_lancamento,
    };

    const { data, error } = await supabase
      .from('plano_contas')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[PlanoContas] Erro ao criar:', error);
      throw translateError(error, 'Erro ao criar conta');
    }
    if (!data) throw new Error('Nenhum dado retornado após criação');
    return transformToPlanoContas(data);
  },

  async update(id: string, input: Partial<PlanoContasInput>): Promise<PlanoContas> {
    if (input.analitica === true) {
      const { data: filhos } = await supabase
        .from('plano_contas')
        .select('id')
        .eq('conta_pai_id', id);
      if (filhos && filhos.length > 0) {
        throw new Error('Conta com subcontas não pode ser definida como analítica');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (input.nome !== undefined) updateData.nome = input.nome.trim();
    if (input.tipo !== undefined) updateData.tipo = input.tipo;
    if (input.id_pai !== undefined) updateData.conta_pai_id = input.id_pai || null;
    if (input.ativo !== undefined) updateData.ativo = input.ativo;
    if (input.analitica !== undefined) updateData.aceita_lancamento = input.analitica;

    const { data, error } = await supabase
      .from('plano_contas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[PlanoContas] Erro ao atualizar:', error);
      throw translateError(error, 'Erro ao atualizar conta');
    }
    return transformToPlanoContas(data);
  },

  async delete(id: string): Promise<void> {
    const { data: filhos } = await supabase
      .from('plano_contas')
      .select('id')
      .eq('conta_pai_id', id);

    if (filhos && filhos.length > 0) {
      throw new Error('Não é possível excluir conta que possui subcontas vinculadas');
    }

    const { error } = await supabase
      .from('plano_contas')
      .delete()
      .eq('id', id);

    if (error) {
      throw translateError(error, 'Erro ao excluir conta');
    }
  },

  async generateCode(idPai?: string, empresaId?: string): Promise<string> {
    if (!idPai) {
      let q = supabase
        .from('plano_contas')
        .select('codigo')
        .is('conta_pai_id', null);
      if (empresaId) q = q.eq('empresa_representada_id', empresaId);
      const { data } = await q.order('codigo', { ascending: false }).limit(1);

      if (!data || data.length === 0) return '1';
      const lastCode = parseInt(data[0].codigo, 10);
      return Number.isFinite(lastCode) ? (lastCode + 1).toString() : '1';
    }

    const { data: pai } = await supabase
      .from('plano_contas')
      .select('codigo')
      .eq('id', idPai)
      .single();
    if (!pai) throw new Error('Conta pai não encontrada');

    const { data: filhos } = await supabase
      .from('plano_contas')
      .select('codigo')
      .eq('conta_pai_id', idPai)
      .order('codigo', { ascending: false })
      .limit(1);

    if (!filhos || filhos.length === 0) return `${pai.codigo}.1`;
    const lastChildCode = filhos[0].codigo as string;
    const lastChildNumber = parseInt(lastChildCode.split('.').pop() || '0', 10);
    return `${pai.codigo}.${lastChildNumber + 1}`;
  },

  async calculateLevel(idPai: string): Promise<number> {
    const { data } = await supabase
      .from('plano_contas')
      .select('nivel')
      .eq('id', idPai)
      .single();
    return data?.nivel || 0;
  },

  buildTree(contas: PlanoContas[]): PlanoContas[] {
    const contasMap = new Map<string, PlanoContas>();
    const roots: PlanoContas[] = [];

    contas.forEach(conta => {
      contasMap.set(conta.id, { ...conta, filhos: [] });
    });

    contas.forEach(conta => {
      const contaComFilhos = contasMap.get(conta.id)!;
      if (conta.id_pai) {
        const pai = contasMap.get(conta.id_pai);
        if (pai) {
          pai.filhos = pai.filhos || [];
          pai.filhos.push(contaComFilhos);
        } else {
          roots.push(contaComFilhos);
        }
      } else {
        roots.push(contaComFilhos);
      }
    });

    return roots;
  },
};
