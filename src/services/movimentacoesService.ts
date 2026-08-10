import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type {
  TituloFinanceiro,
  LiquidacaoTitulo,
  EdicaoTitulo,
  CancelamentoTitulo,
  HistoricoMovimentacao
} from '@/types/movimentacoesFinanceiras';
import { getEmpresaAtivaIdOuFalha as getEmpresaIdAtual } from '@/lib/empresaAtiva';

export interface RateioTitulo {
  id: string;
  valor: number;
  descricao?: string | null;
  plano_conta?: { id: string; codigo: string; nome: string } | null;
  centro_custo?: { id: string; codigo: string; nome: string } | null;
}

export interface DocumentoTitulo {
  id: string;
  nome_original: string;
  tipo_arquivo?: string | null;
  categoria?: string | null;
  descricao?: string | null;
  tamanho_bytes?: number | null;
  upload_usuario_id?: string | null;
  created_at: string;
}

export const movimentacoesService = {
  // Liquidar/Baixar título
  async liquidarTitulo(dadosLiquidacao: LiquidacaoTitulo): Promise<void> {

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    const empresaId = await getEmpresaIdAtual();

    try {
      // 1. Criar registro de liquidação
      const { data: liquidacao, error: liquidacaoError } = await supabase
        .from('liquidacoes_titulos')
        .insert({
          empresa_representada_id: empresaId,
          data_liquidacao: dadosLiquidacao.data_pagamento,
          titulo_id: dadosLiquidacao.titulo_id,
          tipo_titulo: dadosLiquidacao.tipo_titulo,
          valor_pago: dadosLiquidacao.valor_pago,
          data_pagamento: dadosLiquidacao.data_pagamento,
          forma_pagamento: dadosLiquidacao.forma_pagamento,
          conta_bancaria_id: dadosLiquidacao.conta_bancaria_id,
          observacoes: dadosLiquidacao.observacoes,
          valor_original_titulo: dadosLiquidacao.valor_pago, // Assumindo liquidação total
          usuario_liquidacao_id: user.id,
        })
        .select()
        .single();

      if (liquidacaoError) throw liquidacaoError;

      // 2. Se há múltiplas baixas, inserir os registros
      if (dadosLiquidacao.multi_baixa && dadosLiquidacao.multi_baixa.length > 0) {
        const multiBaixas = dadosLiquidacao.multi_baixa.map(baixa => ({
          empresa_representada_id: empresaId,
          data_liquidacao: dadosLiquidacao.data_pagamento,
          valor_total: baixa.valor,
          liquidacao_principal_id: liquidacao.id,
          conta_bancaria_id: baixa.conta_bancaria_id,
          valor: baixa.valor,
          observacoes: baixa.observacoes,
        }));

        const { error: multiBaixaError } = await supabase
          .from('liquidacoes_multiplas')
          .insert(multiBaixas);

        if (multiBaixaError) throw multiBaixaError;
      }

      // 3. Atualizar status do título na tabela correspondente
      const { error: updateError } = dadosLiquidacao.tipo_titulo === 'CONTAS_RECEBER'
        ? await supabase
            .from('contas_receber')
            .update({
              status: 'RECEBIDA',
              data_recebimento: dadosLiquidacao.data_pagamento,
              valor_recebido: dadosLiquidacao.valor_pago,
            })
            .eq('id', dadosLiquidacao.titulo_id)
        : await supabase
            .from('contas_pagar')
            .update({
              status: 'PAGA',
              data_pagamento: dadosLiquidacao.data_pagamento,
            })
            .eq('id', dadosLiquidacao.titulo_id);

      if (updateError) throw updateError;

      // 4. Registrar no histórico
      await this.registrarHistorico({
        titulo_id: dadosLiquidacao.titulo_id,
        tipo_titulo: dadosLiquidacao.tipo_titulo,
        tipo_operacao: 'LIQUIDACAO',
        valor_movimentado: dadosLiquidacao.valor_pago,
        dados_novos: dadosLiquidacao,
        observacoes: `Título liquidado via ${dadosLiquidacao.forma_pagamento}`,
      });

    } catch (error) {
      console.error('[MovimentacoesService] Erro ao liquidar título:', error);
      throw new Error(`Erro ao liquidar título: ${error.message}`);
    }
  },

  // Estornar título
  async estornarTitulo(dados: { titulo_id: string; tipo_titulo: string; motivo: string }): Promise<void> {
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    try {
      // 1. Marcar liquidação como estornada
      const { error: estornoError } = await supabase
        .from('liquidacoes_titulos')
        .update({
          estornado: true,
          data_estorno: new Date().toISOString(),
          motivo_estorno: dados.motivo,
          usuario_estorno_id: user.id,
        })
        .eq('titulo_id', dados.titulo_id)
        .eq('tipo_titulo', dados.tipo_titulo)
        .eq('estornado', false);

      if (estornoError) throw estornoError;

      // 2. Reverter status do título para ABERTA
      const { error: updateError } = dados.tipo_titulo === 'CONTAS_RECEBER'
        ? await supabase
            .from('contas_receber')
            .update({ status: 'ABERTA', data_recebimento: null, valor_recebido: 0 })
            .eq('id', dados.titulo_id)
        : await supabase
            .from('contas_pagar')
            .update({ status: 'ABERTA', data_pagamento: null })
            .eq('id', dados.titulo_id);

      if (updateError) throw updateError;

      // 3. Registrar no histórico
      await this.registrarHistorico({
        titulo_id: dados.titulo_id,
        tipo_titulo: dados.tipo_titulo,
        tipo_operacao: 'ESTORNO',
        dados_novos: dados,
        observacoes: `Título estornado: ${dados.motivo}`,
      });

    } catch (error) {
      console.error('[MovimentacoesService] Erro ao estornar título:', error);
      throw new Error(`Erro ao estornar título: ${error.message}`);
    }
  },

  // Editar título
  async editarTitulo(dadosEdicao: EdicaoTitulo): Promise<void> {

    try {
      const tabelaTitulo = dadosEdicao.tipo_titulo === 'CONTAS_PAGAR' ? 'contas_pagar' : 'contas_receber';

      const { error: updateError } = await supabase
        .from(tabelaTitulo)
        .update(dadosEdicao.dados_novos)
        .eq('id', dadosEdicao.titulo_id);

      if (updateError) throw updateError;

      // Registrar no histórico
      await this.registrarHistorico({
        titulo_id: dadosEdicao.titulo_id,
        tipo_titulo: dadosEdicao.tipo_titulo,
        tipo_operacao: 'EDICAO',
        dados_anteriores: dadosEdicao.dados_atuais,
        dados_novos: dadosEdicao.dados_novos,
        observacoes: dadosEdicao.motivo_edicao || 'Título editado',
      });

    } catch (error) {
      console.error('[MovimentacoesService] Erro ao editar título:', error);
      throw new Error(`Erro ao editar título: ${error.message}`);
    }
  },

  // Cancelar título
  async cancelarTitulo(dadosCancelamento: CancelamentoTitulo): Promise<void> {

    try {
      const tabelaTitulo = dadosCancelamento.tipo_titulo === 'CONTAS_PAGAR' ? 'contas_pagar' : 'contas_receber';

      const { error: updateError } = await supabase
        .from(tabelaTitulo)
        .update({ status: 'CANCELADA' })
        .eq('id', dadosCancelamento.titulo_id);

      if (updateError) throw updateError;

      // Registrar no histórico
      await this.registrarHistorico({
        titulo_id: dadosCancelamento.titulo_id,
        tipo_titulo: dadosCancelamento.tipo_titulo,
        tipo_operacao: 'CANCELAMENTO',
        dados_novos: dadosCancelamento,
        observacoes: `Título cancelado: ${dadosCancelamento.motivo_cancelamento}`,
      });

    } catch (error) {
      console.error('[MovimentacoesService] Erro ao cancelar título:', error);
      throw new Error(`Erro ao cancelar título: ${error.message}`);
    }
  },

  // Buscar histórico de movimentações
  async getHistoricoMovimentacoes(tituloId: string, tipoTitulo: string): Promise<HistoricoMovimentacao[]> {

    try {
      const { data, error } = await supabase
        .from('historico_movimentacoes_financeiras')
        .select('*')
        .eq('titulo_id', tituloId)
        .eq('tipo_titulo', tipoTitulo)
        .order('data_operacao', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        titulo_id: item.titulo_id,
        tipo_titulo: item.tipo_titulo as 'CONTAS_PAGAR' | 'CONTAS_RECEBER',
        tipo_movimentacao: item.tipo_operacao as 'LIQUIDACAO' | 'ESTORNO' | 'EDICAO' | 'CANCELAMENTO',
        dados_anteriores: item.dados_anteriores,
        dados_novos: item.dados_novos,
        valor_movimentado: item.valor_movimentado,
        data_movimentacao: item.data_operacao,
        usuario_id: item.usuario_id,
        usuario_nome: item.usuario_nome,
        ip_origem: item.ip_origem as string,
        observacoes: item.observacoes,
        created_at: item.created_at,
      }));
    } catch (error) {
      console.error('[MovimentacoesService] Erro ao buscar histórico:', error);
      throw new Error(`Erro ao buscar histórico: ${error.message}`);
    }
  },

  // Buscar rateios do título
  async getRateiosTitulo(tituloId: string, tipoTitulo: string): Promise<RateioTitulo[]> {

    try {
      if (tipoTitulo === 'CONTAS_PAGAR') {
        
        const { data, error } = await supabase
          .from('rateios_contas_pagar')
          .select(`
            *,
            plano_conta:plano_contas(id, codigo, nome),
            centro_custo:centros_custo(id, codigo, nome)
          `)
          .eq('conta_pagar_id', tituloId);

        
        if (error) {
          console.error('[MovimentacoesService] Erro na consulta:', error);
          throw error;
        }
        
        return (data || []) as unknown as RateioTitulo[];
      }

      // Para contas a receber, por enquanto retorna array vazio
      // TODO: Implementar rateios para contas a receber se necessário
      return [];
    } catch (error) {
      console.error('[MovimentacoesService] Erro ao buscar rateios:', error);
      throw new Error(`Erro ao buscar rateios: ${error.message}`);
    }
  },

  // Buscar documentos do título
  async getDocumentosTitulo(tituloId: string, tipoTitulo: string): Promise<DocumentoTitulo[]> {

    try {
      const { data, error } = await supabase
        .from('documentos_titulos_financeiros')
        .select('*')
        .eq('titulo_id', tituloId)
        .eq('tipo_titulo', tipoTitulo)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as DocumentoTitulo[];
    } catch (error) {
      console.error('[MovimentacoesService] Erro ao buscar documentos:', error);
      throw new Error(`Erro ao buscar documentos: ${error.message}`);
    }
  },

  // Upload de documento
  async uploadDocumento(dados: {
    titulo_id: string;
    tipo_titulo: string;
    arquivo: File;
    categoria?: string;
    descricao?: string;
  }): Promise<void> {
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    const empresaId = await getEmpresaIdAtual();

    try {
      // 1. Upload do arquivo para storage (implementar quando storage estiver configurado)
      // Por enquanto, simular URL
      const nomeArquivo = `${Date.now()}_${dados.arquivo.name}`;
      const urlArquivo = `documents/${dados.tipo_titulo}/${dados.titulo_id}/${nomeArquivo}`;

      // 2. Registrar documento na base
      const { error: insertError } = await supabase
        .from('documentos_titulos_financeiros')
        .insert({
          empresa_representada_id: empresaId,
          titulo_id: dados.titulo_id,
          tipo_titulo: dados.tipo_titulo,
          nome_arquivo: nomeArquivo,
          nome_original: dados.arquivo.name,
          tipo_arquivo: dados.arquivo.type,
          tamanho_bytes: dados.arquivo.size,
          url_arquivo: urlArquivo,
          categoria: dados.categoria || 'OUTROS',
          descricao: dados.descricao,
          upload_usuario_id: user.id,
        });

      if (insertError) throw insertError;

    } catch (error) {
      console.error('[MovimentacoesService] Erro ao fazer upload:', error);
      throw new Error(`Erro ao enviar documento: ${error.message}`);
    }
  },

  // Deletar documento
  async deleteDocumento(documentoId: string): Promise<void> {

    try {
      const { error } = await supabase
        .from('documentos_titulos_financeiros')
        .update({ ativo: false })
        .eq('id', documentoId);

      if (error) throw error;

    } catch (error) {
      console.error('[MovimentacoesService] Erro ao remover documento:', error);
      throw new Error(`Erro ao remover documento: ${error.message}`);
    }
  },

  // Registrar no histórico (função auxiliar)
  async registrarHistorico(dados: {
    titulo_id: string;
    tipo_titulo: string;
    tipo_operacao: string;
    dados_anteriores?: unknown;
    dados_novos?: unknown;
    valor_movimentado?: number;
    observacoes?: string;
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const empresaId = await getEmpresaIdAtual();
    const tabelaOrigem = dados.tipo_titulo === 'CONTAS_PAGAR' ? 'contas_pagar' : 'contas_receber';

    const { error } = await supabase
      .from('historico_movimentacoes_financeiras')
      .insert({
        empresa_representada_id: empresaId,
        acao: dados.tipo_operacao,
        registro_id: dados.titulo_id,
        tabela_origem: tabelaOrigem,
        titulo_id: dados.titulo_id,
        tipo_titulo: dados.tipo_titulo,
        tipo_operacao: dados.tipo_operacao,
        dados_anteriores: dados.dados_anteriores as Json,
        dados_novos: dados.dados_novos as Json,
        valor_movimentado: dados.valor_movimentado,
        usuario_id: user?.id,
        usuario_nome: user?.email,
        observacoes: dados.observacoes,
      });

    if (error) {
      console.error('[MovimentacoesService] Erro ao registrar histórico:', error);
    }
  },
};