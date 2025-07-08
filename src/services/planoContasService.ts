import { supabase } from '@/integrations/supabase/client';
import { PlanoContas, PlanoContasInput, SupabasePlanoContas } from '@/types/planoContas';

console.log('[PlanoContas] Service inicializado');

const transformToPlanoContas = (data: SupabasePlanoContas): PlanoContas => ({
  id: data.id,
  codigo: data.codigo,
  nome: data.nome,
  tipo: data.tipo as 'RECEITA' | 'DESPESA',
  id_pai: data.id_pai || undefined,
  nivel: data.nivel,
  ativo: data.ativo,
  analitica: data.analitica,
  created_at: data.created_at,
  updated_at: data.updated_at,
});

export const planoContasService = {
  async getAll(): Promise<PlanoContas[]> {
    console.log('[PlanoContas] Buscando todas as contas');
    const { data, error } = await supabase
      .from('plano_contas')
      .select('*')
      .order('codigo');

    if (error) {
      console.error('[PlanoContas] Erro ao buscar contas:', error);
      throw error;
    }

    const transformedData = data?.map(transformToPlanoContas) || [];
    console.log('[PlanoContas] Contas carregadas:', transformedData.length);
    return transformedData;
  },

  async searchContasAnaliticas(searchTerm: string, tipo?: 'RECEITA' | 'DESPESA'): Promise<PlanoContas[]> {
    console.log('[PlanoContas] Buscando contas analíticas com termo:', searchTerm, 'tipo:', tipo);
    
    if (!searchTerm || searchTerm.length < 2) {
      console.log('[PlanoContas] Termo muito curto, retornando array vazio');
      return [];
    }

    try {
      let query = supabase
        .from('plano_contas')
        .select('*')
        .eq('analitica', true)
        .eq('ativo', true);

      // Filtrar por tipo se fornecido
      if (tipo) {
        query = query.eq('tipo', tipo);
      }

      const { data, error } = await query
        .or(`codigo.ilike.%${searchTerm}%,nome.ilike.%${searchTerm}%`)
        .order('codigo')
        .limit(50);

      if (error) {
        console.error('[PlanoContas] Erro ao buscar contas analíticas:', error);
        throw error;
      }

      const transformedData = data?.map(transformToPlanoContas) || [];
      console.log('[PlanoContas] Contas analíticas encontradas:', transformedData.length, transformedData);
      return transformedData;
    } catch (error) {
      console.error('[PlanoContas] Erro na busca de contas analíticas:', error);
      throw error;
    }
  },

  async create(input: PlanoContasInput): Promise<PlanoContas> {
    console.log('[PlanoContas] Criando nova conta:', input);
    
    // Validação dos dados antes do envio
    if (!input.nome?.trim()) {
      throw new Error('Nome da conta é obrigatório');
    }

    if (!input.tipo) {
      throw new Error('Tipo da conta é obrigatório');
    }

    // Gerar código automático
    const codigo = await planoContasService.generateCode(input.id_pai);
    const nivel = input.id_pai ? await planoContasService.calculateLevel(input.id_pai) + 1 : 1;

    if (nivel > 5) {
      throw new Error('Máximo de 5 níveis permitido');
    }

    // Determinar se a conta é analítica
    // Contas com pai definido começam como analíticas (podem receber lançamentos)
    // Contas raiz começam como sintéticas (agrupadores)
    const analitica = input.analitica !== undefined ? input.analitica : Boolean(input.id_pai);

    const insertData = {
      nome: input.nome.trim(),
      tipo: input.tipo,
      id_pai: input.id_pai || null,
      codigo,
      nivel,
      ativo: input.ativo !== undefined ? input.ativo : true,
      analitica,
    };

    console.log('[PlanoContas] Dados para inserção:', insertData);

    const { data, error } = await supabase
      .from('plano_contas')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[PlanoContas] Erro ao criar conta:', error);
      throw new Error(`Erro ao criar conta: ${error.message}`);
    }

    if (!data) {
      throw new Error('Nenhum dado retornado após criação da conta');
    }

    const transformedData = transformToPlanoContas(data);
    console.log('[PlanoContas] Conta criada com sucesso:', transformedData);
    return transformedData;
  },

  async update(id: string, input: Partial<PlanoContasInput>): Promise<PlanoContas> {
    console.log('[PlanoContas] Atualizando conta:', id, input);
    
    // Validação para evitar transformar conta sintética em analítica se ela tiver filhos
    if (input.analitica === true) {
      const { data: filhos } = await supabase
        .from('plano_contas')
        .select('id')
        .eq('id_pai', id);

      if (filhos && filhos.length > 0) {
        throw new Error('Conta com subcontas não pode ser definida como analítica');
      }
    }

    const updateData = { ...input };
    if (updateData.nome) {
      updateData.nome = updateData.nome.trim();
    }

    const { data, error } = await supabase
      .from('plano_contas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[PlanoContas] Erro ao atualizar conta:', error);
      throw new Error(`Erro ao atualizar conta: ${error.message}`);
    }

    const transformedData = transformToPlanoContas(data);
    console.log('[PlanoContas] Conta atualizada:', transformedData);
    return transformedData;
  },

  async delete(id: string): Promise<void> {
    console.log('[PlanoContas] Verificando se conta pode ser excluída:', id);
    
    // Verificar se tem filhos
    const { data: filhos } = await supabase
      .from('plano_contas')
      .select('id')
      .eq('id_pai', id);

    if (filhos && filhos.length > 0) {
      throw new Error('Não é possível excluir conta que possui subcontas vinculadas');
    }

    const { error } = await supabase
      .from('plano_contas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[PlanoContas] Erro ao excluir conta:', error);
      throw new Error(`Erro ao excluir conta: ${error.message}`);
    }

    console.log('[PlanoContas] Conta excluída:', id);
  },

  async generateCode(idPai?: string): Promise<string> {
    if (!idPai) {
      // Buscar próximo código raiz
      const { data } = await supabase
        .from('plano_contas')
        .select('codigo')
        .is('id_pai', null)
        .order('codigo', { ascending: false })
        .limit(1);

      if (!data || data.length === 0) {
        return '1';
      }

      const lastCode = parseInt(data[0].codigo);
      return (lastCode + 1).toString();
    }

    // Buscar código do pai
    const { data: pai } = await supabase
      .from('plano_contas')
      .select('codigo')
      .eq('id', idPai)
      .single();

    if (!pai) {
      throw new Error('Conta pai não encontrada');
    }

    // Buscar último filho
    const { data: filhos } = await supabase
      .from('plano_contas')
      .select('codigo')
      .eq('id_pai', idPai)
      .order('codigo', { ascending: false })
      .limit(1);

    if (!filhos || filhos.length === 0) {
      return `${pai.codigo}.1`;
    }

    const lastChildCode = filhos[0].codigo;
    const lastChildNumber = parseInt(lastChildCode.split('.').pop() || '0');
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
    console.log('[PlanoContas] Construindo árvore hierárquica');
    
    const contasMap = new Map<string, PlanoContas>();
    const roots: PlanoContas[] = [];

    // Criar mapa de contas
    contas.forEach(conta => {
      contasMap.set(conta.id, { ...conta, filhos: [] });
    });

    // Construir hierarquia
    contas.forEach(conta => {
      const contaComFilhos = contasMap.get(conta.id)!;
      
      if (conta.id_pai) {
        const pai = contasMap.get(conta.id_pai);
        if (pai) {
          pai.filhos = pai.filhos || [];
          pai.filhos.push(contaComFilhos);
        }
      } else {
        roots.push(contaComFilhos);
      }
    });

    return roots;
  }
};
