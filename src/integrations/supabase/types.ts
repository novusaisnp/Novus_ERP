export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categorias_produtos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          empresa_representada_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_representada_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_representada_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_produtos_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      centros_custo: {
        Row: {
          ativo: boolean
          centro_pai_id: string | null
          codigo: string | null
          created_at: string
          descricao: string | null
          empresa_representada_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          centro_pai_id?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          empresa_representada_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          centro_pai_id?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          empresa_representada_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "centros_custo_centro_pai_id_fkey"
            columns: ["centro_pai_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centros_custo_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          bairro: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          cpf: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          email_secundario: string | null
          empresa_representada_id: string
          estado: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          limite_credito: number | null
          logradouro: string | null
          nome: string
          nome_fantasia: string | null
          numero: string | null
          observacoes: string | null
          razao_social: string | null
          rg: string | null
          telefone: string | null
          telefone_secundario: string | null
          tipo_pessoa: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          email_secundario?: string | null
          empresa_representada_id: string
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          limite_credito?: number | null
          logradouro?: string | null
          nome: string
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          razao_social?: string | null
          rg?: string | null
          telefone?: string | null
          telefone_secundario?: string | null
          tipo_pessoa?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          email_secundario?: string | null
          empresa_representada_id?: string
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          limite_credito?: number | null
          logradouro?: string | null
          nome?: string
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          razao_social?: string | null
          rg?: string | null
          telefone?: string | null
          telefone_secundario?: string | null
          tipo_pessoa?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      descontos_padrao: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          empresa_representada_id: string
          id: string
          nome: string
          obrigatorio: boolean
          ordem: number
          percentual: number | null
          referencia: string | null
          tipo: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_representada_id: string
          id?: string
          nome: string
          obrigatorio?: boolean
          ordem?: number
          percentual?: number | null
          referencia?: string | null
          tipo?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_representada_id?: string
          id?: string
          nome?: string
          obrigatorio?: boolean
          ordem?: number
          percentual?: number | null
          referencia?: string | null
          tipo?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "descontos_padrao_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_responsavel: {
        Row: {
          cnpj: string | null
          configuracoes: Json
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          logo_url: string | null
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          configuracoes?: Json
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          configuracoes?: Json
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      empresas_representadas: {
        Row: {
          ativo: boolean
          cep: string | null
          cidade: string | null
          cnpj: string | null
          configuracoes: Json
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          configuracoes?: Json
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          configuracoes?: Json
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          agencia: string | null
          ativo: boolean
          bairro: string | null
          banco: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          conta: string | null
          cpf: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          email_secundario: string | null
          empresa_representada_id: string
          estado: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          logradouro: string | null
          nome: string
          nome_fantasia: string | null
          numero: string | null
          observacoes: string | null
          pix: string | null
          prazo_entrega: number | null
          razao_social: string | null
          telefone: string | null
          tipo_conta: string | null
          tipo_pessoa: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean
          bairro?: string | null
          banco?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          conta?: string | null
          cpf?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          email_secundario?: string | null
          empresa_representada_id: string
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          logradouro?: string | null
          nome: string
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          pix?: string | null
          prazo_entrega?: number | null
          razao_social?: string | null
          telefone?: string | null
          tipo_conta?: string | null
          tipo_pessoa?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          agencia?: string | null
          ativo?: boolean
          bairro?: string | null
          banco?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          conta?: string | null
          cpf?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          email_secundario?: string | null
          empresa_representada_id?: string
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          logradouro?: string | null
          nome?: string
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          pix?: string | null
          prazo_entrega?: number | null
          razao_social?: string | null
          telefone?: string | null
          tipo_conta?: string | null
          tipo_pessoa?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      localizacoes_estoque: {
        Row: {
          ativo: boolean
          corredor: string | null
          created_at: string
          descricao: string | null
          empresa_representada_id: string
          id: string
          nome: string
          posicao: string | null
          prateleira: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          corredor?: string | null
          created_at?: string
          descricao?: string | null
          empresa_representada_id: string
          id?: string
          nome: string
          posicao?: string | null
          prateleira?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          corredor?: string | null
          created_at?: string
          descricao?: string | null
          empresa_representada_id?: string
          id?: string
          nome?: string
          posicao?: string | null
          prateleira?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "localizacoes_estoque_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      modalidade_api_vinculo: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          empresa_representada_id: string
          endpoint: string | null
          headers: Json
          id: string
          metodo: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_representada_id: string
          endpoint?: string | null
          headers?: Json
          id?: string
          metodo?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_representada_id?: string
          endpoint?: string | null
          headers?: Json
          id?: string
          metodo?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modalidade_api_vinculo_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      modalidade_caixas: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          empresa_representada_id: string
          id: string
          nome: string
          ordem: number
          tipo: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_representada_id: string
          id?: string
          nome: string
          ordem?: number
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_representada_id?: string
          id?: string
          nome?: string
          ordem?: number
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modalidade_caixas_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      natureza_caixas: {
        Row: {
          ativo: boolean
          centro_custo_id: string | null
          codigo: string | null
          created_at: string
          descricao: string | null
          empresa_representada_id: string
          id: string
          nome: string
          ordem: number
          permite_estorno: boolean
          plano_conta_id: string | null
          requer_documento: boolean
          tipo: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          centro_custo_id?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          empresa_representada_id: string
          id?: string
          nome: string
          ordem?: number
          permite_estorno?: boolean
          plano_conta_id?: string | null
          requer_documento?: boolean
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          centro_custo_id?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          empresa_representada_id?: string
          id?: string
          nome?: string
          ordem?: number
          permite_estorno?: boolean
          plano_conta_id?: string | null
          requer_documento?: boolean
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "natureza_caixas_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "natureza_caixas_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "natureza_caixas_plano_conta_id_fkey"
            columns: ["plano_conta_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          created_at: string
          email: string | null
          empresa_representada_id: string | null
          id: string
          nome: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          empresa_representada_id?: string | null
          id?: string
          nome?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          empresa_representada_id?: string | null
          id?: string
          nome?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_contas: {
        Row: {
          aceita_lancamento: boolean
          ativo: boolean
          codigo: string
          conta_pai_id: string | null
          created_at: string
          empresa_representada_id: string
          id: string
          natureza: string | null
          nivel: number
          nome: string
          tipo: string | null
          updated_at: string
        }
        Insert: {
          aceita_lancamento?: boolean
          ativo?: boolean
          codigo: string
          conta_pai_id?: string | null
          created_at?: string
          empresa_representada_id: string
          id?: string
          natureza?: string | null
          nivel?: number
          nome: string
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          aceita_lancamento?: boolean
          ativo?: boolean
          codigo?: string
          conta_pai_id?: string | null
          created_at?: string
          empresa_representada_id?: string
          id?: string
          natureza?: string | null
          nivel?: number
          nome?: string
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_contas_conta_pai_id_fkey"
            columns: ["conta_pai_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_contas_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_pagamento: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          empresa_representada_id: string
          id: string
          intervalo_dias: number
          nome: string
          numero_parcelas: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_representada_id: string
          id?: string
          intervalo_dias?: number
          nome: string
          numero_parcelas?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_representada_id?: string
          id?: string
          intervalo_dias?: number
          nome?: string
          numero_parcelas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_pagamento_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_fornecedores: {
        Row: {
          ativo: boolean
          codigo_fornecedor: string | null
          created_at: string
          empresa_representada_id: string
          fornecedor_id: string
          id: string
          observacoes: string | null
          prazo_entrega: number | null
          preco_custo: number | null
          principal: boolean
          produto_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo_fornecedor?: string | null
          created_at?: string
          empresa_representada_id: string
          fornecedor_id: string
          id?: string
          observacoes?: string | null
          prazo_entrega?: number | null
          preco_custo?: number | null
          principal?: boolean
          produto_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo_fornecedor?: string | null
          created_at?: string
          empresa_representada_id?: string
          fornecedor_id?: string
          id?: string
          observacoes?: string | null
          prazo_entrega?: number | null
          preco_custo?: number | null
          principal?: boolean
          produto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_fornecedores_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_fornecedores_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          altura: number | null
          ativo: boolean
          categoria_id: string | null
          cest: string | null
          codigo: string | null
          comprimento: number | null
          controla_estoque: boolean
          created_at: string
          deleted_at: string | null
          descricao: string | null
          empresa_representada_id: string
          estoque_atual: number | null
          estoque_maximo: number | null
          estoque_minimo: number | null
          id: string
          imagem_url: string | null
          largura: number | null
          margem_lucro: number | null
          ncm: string | null
          nome: string
          origem_produto: string | null
          peso: number | null
          preco_custo: number | null
          preco_venda: number | null
          unidade_medida_id: string | null
          updated_at: string
        }
        Insert: {
          altura?: number | null
          ativo?: boolean
          categoria_id?: string | null
          cest?: string | null
          codigo?: string | null
          comprimento?: number | null
          controla_estoque?: boolean
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          empresa_representada_id: string
          estoque_atual?: number | null
          estoque_maximo?: number | null
          estoque_minimo?: number | null
          id?: string
          imagem_url?: string | null
          largura?: number | null
          margem_lucro?: number | null
          ncm?: string | null
          nome: string
          origem_produto?: string | null
          peso?: number | null
          preco_custo?: number | null
          preco_venda?: number | null
          unidade_medida_id?: string | null
          updated_at?: string
        }
        Update: {
          altura?: number | null
          ativo?: boolean
          categoria_id?: string | null
          cest?: string | null
          codigo?: string | null
          comprimento?: number | null
          controla_estoque?: boolean
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          empresa_representada_id?: string
          estoque_atual?: number | null
          estoque_maximo?: number | null
          estoque_minimo?: number | null
          id?: string
          imagem_url?: string | null
          largura?: number | null
          margem_lucro?: number | null
          ncm?: string | null
          nome?: string
          origem_produto?: string | null
          peso?: number | null
          preco_custo?: number | null
          preco_venda?: number | null
          unidade_medida_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_unidade_medida_id_fkey"
            columns: ["unidade_medida_id"]
            isOneToOne: false
            referencedRelation: "unidades_medida"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          ativo: boolean
          codigo: string | null
          created_at: string
          deleted_at: string | null
          descricao: string | null
          empresa_representada_id: string
          id: string
          nome: string
          preco: number | null
          unidade_medida_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo?: string | null
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          empresa_representada_id: string
          id?: string
          nome: string
          preco?: number | null
          unidade_medida_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string | null
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          empresa_representada_id?: string
          id?: string
          nome?: string
          preco?: number | null
          unidade_medida_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "servicos_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_unidade_medida_id_fkey"
            columns: ["unidade_medida_id"]
            isOneToOne: false
            referencedRelation: "unidades_medida"
            referencedColumns: ["id"]
          },
        ]
      }
      tamanhos_produtos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          empresa_representada_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_representada_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          empresa_representada_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tamanhos_produtos_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades_medida: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_representada_id: string
          id: string
          nome: string
          sigla: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_representada_id: string
          id?: string
          nome: string
          sigla: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_representada_id?: string
          id?: string
          nome?: string
          sigla?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_medida_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          empresa_representada_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa_representada_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          empresa_representada_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          empresa_representada_id: string | null
          id: string
          nome: string
          perfil_id: string | null
          ultimo_acesso: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          empresa_representada_id?: string | null
          id?: string
          nome: string
          perfil_id?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          empresa_representada_id?: string | null
          id?: string
          nome?: string
          perfil_id?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      vencimentos_padrao: {
        Row: {
          ativo: boolean
          competencia: string | null
          created_at: string
          descricao: string | null
          empresa_representada_id: string
          id: string
          nome: string
          ordem: number
          percentual: number | null
          referencia: string | null
          tipo: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          ativo?: boolean
          competencia?: string | null
          created_at?: string
          descricao?: string | null
          empresa_representada_id: string
          id?: string
          nome: string
          ordem?: number
          percentual?: number | null
          referencia?: string | null
          tipo?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          ativo?: boolean
          competencia?: string | null
          created_at?: string
          descricao?: string | null
          empresa_representada_id?: string
          id?: string
          nome?: string
          ordem?: number
          percentual?: number | null
          referencia?: string | null
          tipo?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vencimentos_padrao_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_empresa_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gerente" | "operador" | "visualizador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gerente", "operador", "visualizador"],
    },
  },
} as const
