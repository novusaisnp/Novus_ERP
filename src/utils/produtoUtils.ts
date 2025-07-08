
import { Produto, SupabaseProduto } from '@/types/produto';

export const produtoUtils = {
  transformSupabaseToProduto(item: SupabaseProduto): Produto {
    return {
      id: item.id,
      nome: item.nome,
      descricao: item.descricao || '',
      codigo_barras: item.codigo_barras || '',
      categoria: item.categoria || '',
      unidade_medida: item.unidade_medida || 'UN',
      peso: item.peso || undefined,
      altura: item.altura || undefined,
      largura: item.largura || undefined,
      comprimento: item.comprimento || undefined,
      variacoes: item.variacoes || [],
      preco_compra: item.preco_compra || undefined,
      preco_venda: item.preco_venda,
      margem_lucro: item.margem_lucro || undefined,
      imagem: item.imagem || '',
      ncm: item.ncm || '',
      cst_csosn: item.cst_csosn || '',
      cfop: item.cfop || '',
      cest: item.cest || '',
      ficha_tecnica: item.ficha_tecnica || '',
      modo_preparo: item.modo_preparo || '',
      codigo_delivery: item.codigo_delivery || '',
      estoque_atual: item.estoque_atual || 0,
      estoque_minimo: item.estoque_minimo || 0,
      custo_total: item.custo_total || undefined,
      ativo: item.ativo !== false,
      created_at: new Date(item.created_at),
      updated_at: item.updated_at ? new Date(item.updated_at) : undefined
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

  validarCodigoBarras(codigo: string): boolean {
    if (!codigo) return true; // Campo opcional
    
    // Remove caracteres não numéricos
    const numerico = codigo.replace(/\D/g, '');
    
    // Verifica se tem 8, 12, 13 ou 14 dígitos (formatos mais comuns)
    const tamanhos = [8, 12, 13, 14];
    return tamanhos.includes(numerico.length);
  },

  validarProduto(produto: Produto): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!produto.nome?.trim()) {
      errors.push('Nome do produto é obrigatório');
    }

    if (!produto.preco_venda || produto.preco_venda <= 0) {
      errors.push('Preço de venda deve ser maior que zero');
    }

    if (produto.codigo_barras && !produtoUtils.validarCodigoBarras(produto.codigo_barras)) {
      errors.push('Código de barras inválido');
    }

    if (produto.peso && produto.peso < 0) {
      errors.push('Peso não pode ser negativo');
    }

    if (produto.altura && produto.altura < 0) {
      errors.push('Altura não pode ser negativa');
    }

    if (produto.largura && produto.largura < 0) {
      errors.push('Largura não pode ser negativa');
    }

    if (produto.comprimento && produto.comprimento < 0) {
      errors.push('Comprimento não pode ser negativo');
    }

    if (produto.estoque_minimo && produto.estoque_minimo < 0) {
      errors.push('Estoque mínimo não pode ser negativo');
    }

    if (produto.estoque_atual && produto.estoque_atual < 0) {
      errors.push('Estoque atual não pode ser negativo');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  formatarPreco(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  },

  formatarPeso(peso: number): string {
    return `${peso.toFixed(2)} kg`;
  },

  formatarDimensoes(altura?: number, largura?: number, comprimento?: number): string {
    const dimensoes = [altura, largura, comprimento].filter(d => d && d > 0);
    if (dimensoes.length === 0) return '';
    return `${dimensoes.join(' x ')} cm`;
  },

  getErrorMessage(error: any): string {
    console.error('[Produtos] Erro capturado:', error);
    
    if (error.code === '23505') {
      if (error.constraint?.includes('codigo_barras')) {
        return 'Já existe um produto com este código de barras.';
      }
      return 'Já existe um produto com estes dados.';
    } else if (error.code === '23503') {
      return 'Dados de referência inválidos.';
    } else if (error.message?.includes('duplicate key')) {
      return 'Código de barras já está em uso por outro produto.';
    } else {
      return 'Não foi possível salvar os dados do produto.';
    }
  }
};
