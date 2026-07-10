
import type { ContaReceber, SupabaseContaReceber } from '@/types/contasReceber';

export const transformFromSupabase = (data: any): ContaReceber => {
  
  return {
    id: data.id,
    numero_documento: data.numero_documento,
    cliente_id: data.cliente_id,
    venda_id: data.venda_id,
    contrato_id: data.contrato_id,
    valor_original: Number(data.valor_original),
    valor_pago: data.valor_pago ? Number(data.valor_pago) : undefined,
    valor_desconto: data.valor_desconto ? Number(data.valor_desconto) : undefined,
    data_emissao: data.data_emissao,
    data_vencimento: data.data_vencimento,
    data_pagamento: data.data_pagamento,
    forma_pagamento: data.forma_pagamento,
    situacao: data.situacao as 'ABERTA' | 'RECEBIDA' | 'VENCIDA' | 'CANCELADA',
    observacoes: data.observacoes,
    source_system: data.source_system,
    sync_metadata: data.sync_metadata,
    created_at: data.created_at,
    updated_at: data.updated_at,
    // Relacionamentos - tratamento seguro para dados vazios
    cliente: data.cliente ? {
      id: data.cliente.id,
      nome: data.cliente.nome,
      cpf_cnpj: data.cliente.cpf_cnpj,
    } : undefined,
    venda: data.venda ? {
      id: data.venda.id,
      numero_pedido: data.venda.numero_venda, // Mapeando para manter compatibilidade
    } : undefined,
    contrato: data.contrato ? {
      id: data.contrato.id,
      numero_contrato: data.contrato.numero_contrato,
    } : undefined,
  };
};

export const transformToSupabase = (input: any) => {
  
  return {
    numero_documento: input.numero_documento,
    cliente_id: input.cliente_id || null,
    venda_id: input.venda_id || null,
    contrato_id: input.contrato_id || null,
    valor_original: Number(input.valor_original),
    valor_pago: input.valor_pago ? Number(input.valor_pago) : null,
    valor_desconto: input.valor_desconto ? Number(input.valor_desconto) : null,
    data_emissao: input.data_emissao,
    data_vencimento: input.data_vencimento,
    data_pagamento: input.data_pagamento || null,
    forma_pagamento: input.forma_pagamento || null,
    situacao: input.situacao || 'ABERTA',
    observacoes: input.observacoes || null,
    source_system: input.source_system || null,
    sync_metadata: input.sync_metadata || null,
  };
};
