export interface Produto {
  id?: string;
  nome: string;
  descricao?: string;
  codigo?: string | null;
  categoria?: string; // legacy texto (opcional, apenas leitura)
  categoria_id?: string | null;

  peso?: number;
  altura?: number;
  largura?: number;
  comprimento?: number;

  preco_custo?: number;
  preco_venda: number;
  margem_lucro?: number;

  imagem_url?: string;

  ncm?: string;
  cest?: string;
  origem_produto?: string;
  dados_fiscais?: ProdutoDadosFiscais;

  estoque_atual?: number;
  estoque_minimo?: number;
  estoque_maximo?: number;
  controla_estoque?: boolean;

  ativo?: boolean;
  created_at?: Date;
  updated_at?: Date;

  fornecedores?: ProdutoFornecedor[];
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
  agrupamento?: string;
  observacoes?: string;
  ativo?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface SupabaseProduto {
  id: string;
  nome: string;
  descricao?: string | null;
  codigo?: string | null;
  categoria_id?: string | null;
  peso?: number | null;
  altura?: number | null;
  largura?: number | null;
  comprimento?: number | null;
  preco_custo?: number | null;
  preco_venda: number;
  margem_lucro?: number | null;
  imagem_url?: string | null;
  ncm?: string | null;
  cest?: string | null;
  origem_produto?: string | null;
  dados_fiscais?: ProdutoDadosFiscais;
  estoque_atual?: number | null;
  estoque_minimo?: number | null;
  estoque_maximo?: number | null;
  controla_estoque?: boolean;
  ativo: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface ProdutoDadosFiscais {
  icms_situacao_tributaria: string;
  icms_aliquota: number;
  pis_situacao_tributaria: string;
  pis_aliquota: number;
  cofins_situacao_tributaria: string;
  cofins_aliquota: number;
  ibs_cbs_situacao_tributaria: string;
  ibs_cbs_classificacao_tributaria: string;
  ibs_uf_aliquota: number;
  ibs_mun_aliquota: number;
  cbs_aliquota: number;
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
