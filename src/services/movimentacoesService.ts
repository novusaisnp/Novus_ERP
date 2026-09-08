import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type {
  TituloFinanceiro,
  LiquidacaoTitulo,
  EdicaoTitulo,
  CancelamentoTitulo,
  HistoricoMovimentacao,
  LiquidacaoRegistrada,
  EstornoLiquidacao,
} from '@/types/movimentacoesFinanceiras';
import { getEmpresaAtivaIdOuFalha as getEmpresaIdAtual } from '@/lib/empresaAtiva';
import {
  AutorizacaoRequeridaError,
  exigeAutorizacao,
} from '@/services/autorizacaoFinanceiraService';

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
  url_arquivo: string;
  created_at: string;
}

/**
 * Mensagem legível de uma falha.
 *
 * O erro do PostgREST chega como objeto simples com `message`, não como `Error`. Testar só
 * por `instanceof Error` descartava justamente a mensagem do banco — a que diz qual regra
 * foi violada — e entregava "falha desconhecida" ao usuário.
 */
const mensagemDoErro = (erro: unknown): string => {
  if (erro instanceof Error) return erro.message;
  if (typeof erro === 'object' && erro !== null) {
    const { message } = erro as { message?: unknown };
    if (typeof message === 'string' && message) return message;
  }
  return 'falha desconhecida';
};

export const movimentacoesService = {
  // Liquidar/Baixar título
  async liquidarTitulo(dadosLiquidacao: LiquidacaoTitulo): Promise<void> {
    try {
      const { error } = await supabase.rpc('financeiro_liquidar_titulo', {
        p_titulo_id: dadosLiquidacao.titulo_id,
        p_tipo_titulo: dadosLiquidacao.tipo_titulo,
        p_valor: dadosLiquidacao.valor_pago,
        p_data_pagamento: dadosLiquidacao.data_pagamento,
        p_forma_pagamento: dadosLiquidacao.forma_pagamento,
        p_idempotency_key: dadosLiquidacao.idempotency_key,
        p_conta_bancaria_id: dadosLiquidacao.conta_bancaria_id,
        p_observacoes: dadosLiquidacao.observacoes,
        p_multi_baixa: (dadosLiquidacao.multi_baixa || []) as unknown as Json,
        p_ticket_autorizacao: dadosLiquidacao.ticket_autorizacao ?? null,
        p_juros: dadosLiquidacao.juros ?? 0,
        p_multa: dadosLiquidacao.multa ?? 0,
        p_desconto: dadosLiquidacao.desconto ?? 0,
      });
      if (error) throw error;
    } catch (error) {
      if (exigeAutorizacao(error)) throw new AutorizacaoRequeridaError('LIQUIDACAO_RETROATIVA');
      console.error('[MovimentacoesService] Erro ao liquidar título:', error);
      throw new Error(`Erro ao liquidar título: ${mensagemDoErro(error)}`);
    }
  },

  async getLiquidacoesTitulo(tituloId: string, tipoTitulo: string): Promise<LiquidacaoRegistrada[]> {
    const colunaLegada = tipoTitulo === 'CONTAS_PAGAR' ? 'conta_pagar_id' : 'conta_receber_id';
    const { data, error } = await supabase
      .from('liquidacoes_titulos')
      .select(`
        id, data_pagamento, data_liquidacao, valor_pago, forma_pagamento, observacoes,
        conta_bancaria_id
      `)
      .or(`titulo_id.eq.${tituloId},${colunaLegada}.eq.${tituloId}`)
      .eq('estornado', false)
      .eq('cancelada', false)
      .order('data_pagamento', { ascending: false });

    if (error) throw new Error(`Erro ao buscar liquidações: ${error.message}`);
    const contaIds = [...new Set((data || []).map((item) => item.conta_bancaria_id).filter(Boolean))] as string[];
    const { data: contas, error: contasError } = contaIds.length
      ? await supabase
          .from('contas_bancarias')
          .select('id, numero_conta, nome_titular')
          .in('id', contaIds)
      : { data: [], error: null };
    if (contasError) throw new Error(`Erro ao buscar contas das liquidações: ${contasError.message}`);
    const contasPorId = new Map((contas || []).map((conta) => [conta.id, conta]));

    return (data || []).map((item) => ({
      ...item,
      data_pagamento: item.data_pagamento || item.data_liquidacao,
      conta_bancaria: item.conta_bancaria_id ? contasPorId.get(item.conta_bancaria_id) : null,
    })) as unknown as LiquidacaoRegistrada[];
  },

  async estornarLiquidacao(dados: EstornoLiquidacao): Promise<void> {
    try {
      const { error } = await supabase.rpc('financeiro_estornar_liquidacao', {
        p_liquidacao_id: dados.liquidacao_id,
        p_motivo: dados.motivo,
        p_idempotency_key: dados.idempotency_key,
        p_ticket_autorizacao: dados.ticket_autorizacao ?? null,
        p_data_contabil: dados.data_contabil || null,
      });
      if (error) throw error;
    } catch (error) {
      if (exigeAutorizacao(error)) throw new AutorizacaoRequeridaError('ESTORNO');
      console.error('[MovimentacoesService] Erro ao estornar liquidação:', error);
      throw new Error(`Erro ao estornar liquidação: ${mensagemDoErro(error)}`);
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
      const { error } = await supabase.rpc('financeiro_cancelar_titulo', {
        p_titulo_id: dadosCancelamento.titulo_id,
        p_tipo_titulo: dadosCancelamento.tipo_titulo,
        p_motivo: dadosCancelamento.motivo_cancelamento,
        p_idempotency_key: dadosCancelamento.idempotency_key,
        p_ticket_autorizacao: dadosCancelamento.ticket_autorizacao ?? null,
      });
      if (error) throw error;
    } catch (error) {
      if (exigeAutorizacao(error)) throw new AutorizacaoRequeridaError('CANCELAMENTO');
      console.error('[MovimentacoesService] Erro ao cancelar título:', error);
      throw new Error(`Erro ao cancelar título: ${mensagemDoErro(error)}`);
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

  /**
   * Substitui o rateio contábil de um título sem tocar nos demais campos dele.
   *
   * Reusa `financeiro_salvar_titulo` com o payload de dados vazio: a RPC só monta o UPDATE
   * quando há coluna a alterar, então o título fica intacto e os rateios são trocados na
   * mesma transação — sem caminho de escrita novo e sem repetir a atomicidade.
   */
  async salvarRateios(
    tituloId: string,
    tipoTitulo: string,
    rateios: Array<{
      plano_conta_id?: string | null;
      centro_custo_id?: string | null;
      valor: number;
      percentual: number;
      descricao?: string | null;
    }>,
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('financeiro_salvar_titulo', {
        p_tipo_titulo: tipoTitulo,
        p_dados: {} as unknown as Json,
        p_rateios: rateios.map((r) => ({
          plano_conta_id: r.plano_conta_id || null,
          centro_custo_id: r.centro_custo_id || null,
          valor: r.valor,
          percentual: r.percentual,
          observacoes: r.descricao || null,
        })) as unknown as Json,
        p_titulo_id: tituloId,
        p_empresa_id: await getEmpresaIdAtual(),
      });
      if (error) throw error;
    } catch (error) {
      console.error('[MovimentacoesService] Erro ao salvar rateios:', error);
      throw new Error(
        `Erro ao salvar rateios: ${mensagemDoErro(error)}`,
      );
    }
  },

  // Buscar rateios do título
  async getRateiosTitulo(tituloId: string, tipoTitulo: string): Promise<RateioTitulo[]> {

    // Receber tem rateios reais (`rateios_contas_receber`) e o formulário os grava; antes
    // esta função devolvia sempre lista vazia para esse lado, então a aba de rateios de um
    // título a receber parecia sem rateio nenhum.
    const embeds = `
      *,
      plano_conta:plano_contas(id, codigo, nome),
      centro_custo:centros_custo(id, codigo, nome)
    `;

    try {
      // Os dois ramos são escritos por extenso porque o nome da tabela e o da coluna de
      // vínculo precisam ser literais para o cliente tipado do Supabase.
      const { data, error } =
        tipoTitulo === 'CONTAS_PAGAR'
          ? await supabase.from('rateios_contas_pagar').select(embeds).eq('conta_pagar_id', tituloId)
          : await supabase.from('rateios_contas_receber').select(embeds).eq('conta_receber_id', tituloId);

      if (error) {
        console.error('[MovimentacoesService] Erro na consulta:', error);
        throw error;
      }

      return (data || []) as unknown as RateioTitulo[];
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

  // Upload de documento — vai de verdade ao bucket privado 'financeiro-documentos'
  // (path <empresa_id>/<titulo_id>/<timestamp>_<nome>), antes gravava url_arquivo
  // simulada sem nunca enviar o arquivo (ver AUDITORIA_NOVA.md Bloco 3).
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
      const nomeArquivo = `${Date.now()}_${dados.arquivo.name}`;
      const storagePath = `${empresaId}/${dados.titulo_id}/${nomeArquivo}`;

      const { error: uploadError } = await supabase.storage
        .from('financeiro-documentos')
        .upload(storagePath, dados.arquivo, {
          contentType: dados.arquivo.type || undefined,
          upsert: false,
        });
      if (uploadError) throw uploadError;

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
          url_arquivo: storagePath,
          categoria: dados.categoria || 'OUTROS',
          descricao: dados.descricao,
          upload_usuario_id: user.id,
        });

      if (insertError) {
        // Registro falhou depois do upload ter ido — remove o arquivo órfão
        // em vez de deixar um objeto no bucket sem linha correspondente.
        await supabase.storage.from('financeiro-documentos').remove([storagePath]);
        throw insertError;
      }
    } catch (error) {
      console.error('[MovimentacoesService] Erro ao fazer upload:', error);
      throw new Error(`Erro ao enviar documento: ${error.message}`);
    }
  },

  // URL assinada (bucket privado) para visualizar/baixar um documento.
  // download:true força Content-Disposition: attachment no arquivo servido.
  async getDocumentoUrl(urlArquivo: string, options?: { download?: boolean }, expiresIn = 300): Promise<string> {
    const { data, error } = await supabase.storage
      .from('financeiro-documentos')
      .createSignedUrl(urlArquivo, expiresIn, options?.download ? { download: true } : undefined);
    if (error || !data?.signedUrl) {
      throw new Error(`Erro ao gerar link do documento: ${error?.message || 'falha desconhecida'}`);
    }
    return data.signedUrl;
  },

  // Deletar documento — remove o arquivo do storage e depois marca a linha
  // como inativa (mesma ordem do upload: some o arquivo primeiro só se a
  // baixa lógica no banco confirmar).
  async deleteDocumento(documentoId: string): Promise<void> {

    try {
      const { data: doc, error: fetchError } = await supabase
        .from('documentos_titulos_financeiros')
        .select('url_arquivo')
        .eq('id', documentoId)
        .single();
      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('documentos_titulos_financeiros')
        .update({ ativo: false })
        .eq('id', documentoId);
      if (error) throw error;

      if (doc?.url_arquivo) {
        const { error: removeError } = await supabase.storage
          .from('financeiro-documentos')
          .remove([doc.url_arquivo]);
        if (removeError) {
          console.error('[MovimentacoesService] Falha ao remover arquivo do storage:', removeError.message);
        }
      }
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
