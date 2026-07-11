
export interface Produto {
  id?: string;
  nome: string;
  descricao?: string;
  codigo_barras?: string;
  categoria?: string;
  categoria_id?: string | null;

  unidade_medida?: string;
  peso?: number;
  altura?: number;
  largura?: number;
  comprimento?: number;
  variacoes?: ProdutoVariacao[];
  preco_compra?: number;
  preco_venda: number;
  margem_lucro?: number;
  imagem?: string;
  ncm?: string;
  cst_csosn?: string;
  cfop?: string;
  cest?: string;
  ficha_tecnica?: string;
  modo_preparo?: string;
  codigo_delivery?: string;
  estoque_atual?: number;
  estoque_minimo?: number;
  custo_total?: number;
  ativo?: boolean;
  created_at?: Date;
  updated_at?: Date;
  fornecedores?: ProdutoFornecedor[];
}

export interface ProdutoVariacao {
  id?: string;
  tipo: string; // cor, tamanho, etc.
  valor: string;
  preco_adicional?: number;
  codigo_barras?: string;
  ativo?: boolean;
}

export interface ProdutoFornecedor {
  id?: string;
  produto_id?: string;
  fornecedor_id: string;
  fornecedor_nome?: string;
  codigo_fornecedor: string;
  descricao_fornecedor?: string;
  unidade_compra: string;
  fator_conversao: number;
  preco_compra: number;
  preco_ultima_compra?: number;
  data_ultima_compra?: Date;
  lead_time_dias?: number;
  pedido_minimo?: number;
  agrupamento?: string; // pacote, caixa, etc.
  observacoes?: string;
  ativo?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface SupabaseProduto {
  id: string;
  nome: string;
  descricao?: string | null;
  codigo_barras?: string | null;
  categoria?: string | null;
  categoria_id?: string | null;

  unidade_medida?: string | null;
  peso?: number | null;
  altura?: number | null;
  largura?: number | null;
  comprimento?: number | null;
  variacoes?: any;
  preco_compra?: number | null;
  preco_venda: number;
  margem_lucro?: number | null;
  imagem?: string | null;
  ncm?: string | null;
  cst_csosn?: string | null;
  cfop?: string | null;
  cest?: string | null;
  ficha_tecnica?: string | null;
  modo_preparo?: string | null;
  codigo_delivery?: string | null;
  estoque_atual?: number | null;
  estoque_minimo?: number | null;
  custo_total?: number | null;
  ativo: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface SupabaseProdutoFornecedor {
  id: string;
  produto_id: string;
  fornecedor_id: string;
  codigo_fornecedor: string;
  descricao_fornecedor?: string | null;
  unidade_compra: string;
  fator_conversao: number;
  preco_compra: number;
  preco_ultima_compra?: number | null;
  data_ultima_compra?: string | null;
  lead_time_dias?: number | null;
  pedido_minimo?: number | null;
  agrupamento?: string | null;
  observacoes?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at?: string | null;
}
