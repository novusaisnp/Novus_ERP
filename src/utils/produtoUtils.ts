import { Produto, SupabaseProduto } from '@/types/produto';

export const produtoUtils = {
  transformSupabaseToProduto(item: SupabaseProduto & { deleted_at?: string | null }): Produto {
    return {
      id: item.id,
      nome: item.nome,
      descricao: item.descricao ?? '',
      codigo: item.codigo ?? null,
      categoria_id: item.categoria_id ?? null,
      peso: item.peso ?? undefined,
      altura: item.altura ?? undefined,
      largura: item.largura ?? undefined,
      comprimento: item.comprimento ?? undefined,
      preco_custo: item.preco_custo ?? undefined,
      preco_venda: item.preco_venda ?? 0,
      margem_lucro: item.margem_lucro ?? undefined,
      imagem_url: item.imagem_url ?? '',
      ncm: item.ncm ?? '',
      cest: item.cest ?? '',
      estoque_atual: item.estoque_atual ?? 0,
      estoque_minimo: item.estoque_minimo ?? 0,
      estoque_maximo: item.estoque_maximo ?? undefined,
      controla_estoque: item.controla_estoque ?? false,
      ativo: item.ativo !== false,
      created_at: item.created_at ? new Date(item.created_at) : undefined,
      updated_at: item.updated_at ? new Date(item.updated_at) : undefined,
    };
  },

  calcularMargemLucro(precoCompra: number, precoVenda: number): number {
    if (!precoCompra || precoCompra <= 0) return 0;
    return ((precoVenda - precoCompra) / precoCompra) * 100;
  },

  calcularPrecoVenda(precoCompra: number, margemLucro: number): number {
    if (!precoCompra || precoCompra <= 0) return 0;
    return precoCompra * (1 + margemLucro / 100);
  },

  validarProduto(produto: Produto): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!produto.nome?.trim()) errors.push('Nome do produto é obrigatório');
    if (!produto.preco_venda || produto.preco_venda <= 0) errors.push('Preço de venda deve ser maior que zero');
    if (produto.peso && produto.peso < 0) errors.push('Peso não pode ser negativo');
    if (produto.altura && produto.altura < 0) errors.push('Altura não pode ser negativa');
    if (produto.largura && produto.largura < 0) errors.push('Largura não pode ser negativa');
    if (produto.comprimento && produto.comprimento < 0) errors.push('Comprimento não pode ser negativo');
    if (produto.estoque_minimo && produto.estoque_minimo < 0) errors.push('Estoque mínimo não pode ser negativo');
    if (produto.estoque_atual && produto.estoque_atual < 0) errors.push('Estoque atual não pode ser negativo');

    return { isValid: errors.length === 0, errors };
  },

  formatarPreco(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  },

  formatarPeso(peso: number): string {
    return `${peso.toFixed(2)} kg`;
  },

  formatarDimensoes(altura?: number, largura?: number, comprimento?: number): string {
    const dimensoes = [altura, largura, comprimento].filter((d): d is number => !!d && d > 0);
    if (dimensoes.length === 0) return '';
    return `${dimensoes.join(' x ')} cm`;
  },

  getErrorMessage(error: { code?: string; constraint?: string; message?: string }): string {
    console.error('[Produtos] Erro capturado:', error);
    if (error.code === '23505') return 'Já existe um produto com estes dados.';
    if (error.code === '23503') return 'Dados de referência inválidos.';
    return 'Não foi possível salvar os dados do produto.';
  },
};
