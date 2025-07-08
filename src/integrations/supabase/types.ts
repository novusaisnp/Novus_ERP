export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agencias_bancarias: {
        Row: {
          ativo: boolean
          banco_id: string
          created_at: string
          deleted_at: string | null
          descricao: string
          endereco: Json | null
          id: string
          numero_agencia: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          banco_id: string
          created_at?: string
          deleted_at?: string | null
          descricao: string
          endereco?: Json | null
          id?: string
          numero_agencia: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          banco_id?: string
          created_at?: string
          deleted_at?: string | null
          descricao?: string
          endereco?: Json | null
          id?: string
          numero_agencia?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agencias_bancarias_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
        ]
      }
      bancos: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          deleted_at: string | null
          id: string
          nome: string
          pais: string
          sigla: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome: string
          pais?: string
          sigla?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome?: string
          pais?: string
          sigla?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      beneficios_vinculados: {
        Row: {
          ativo: boolean | null
          codigo: string
          colaborador_id: string
          created_at: string | null
          desconto_folha: boolean | null
          descricao: string
          id: string
          percentual_desconto: number | null
          tipo: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          colaborador_id: string
          created_at?: string | null
          desconto_folha?: boolean | null
          descricao: string
          id?: string
          percentual_desconto?: number | null
          tipo: string
          updated_at?: string | null
          valor: number
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          colaborador_id?: string
          created_at?: string | null
          desconto_folha?: boolean | null
          descricao?: string
          id?: string
          percentual_desconto?: number | null
          tipo?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "beneficios_vinculados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      cargos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          salario_base: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          salario_base?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          salario_base?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      categorias_produtos: {
        Row: {
          ativo: boolean
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          regras_tributacao: Json | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          regras_tributacao?: Json | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          regras_tributacao?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      centros_custo: {
        Row: {
          ativo: boolean
          codigo: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          apelido: string | null
          atividade_principal: string | null
          ativo: boolean | null
          cnae: string | null
          contato_empresa: Json | null
          contatos: Json | null
          cpf_cnpj: string | null
          created_at: string | null
          dados_pessoais: Json | null
          data_fundacao: string | null
          data_nascimento: string | null
          documentos: Json | null
          email: string | null
          emails: Json | null
          endereco: Json | null
          external_id: string | null
          forma_atuacao: string | null
          id: string
          nome: string
          nome_fantasia: string | null
          qualificacao_fiscal: Json | null
          rg: string | null
          setor_id: string | null
          site: string | null
          source_system: string | null
          sync_metadata: Json | null
          telefone: string | null
          telefones: Json | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          apelido?: string | null
          atividade_principal?: string | null
          ativo?: boolean | null
          cnae?: string | null
          contato_empresa?: Json | null
          contatos?: Json | null
          cpf_cnpj?: string | null
          created_at?: string | null
          dados_pessoais?: Json | null
          data_fundacao?: string | null
          data_nascimento?: string | null
          documentos?: Json | null
          email?: string | null
          emails?: Json | null
          endereco?: Json | null
          external_id?: string | null
          forma_atuacao?: string | null
          id?: string
          nome: string
          nome_fantasia?: string | null
          qualificacao_fiscal?: Json | null
          rg?: string | null
          setor_id?: string | null
          site?: string | null
          source_system?: string | null
          sync_metadata?: Json | null
          telefone?: string | null
          telefones?: Json | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          apelido?: string | null
          atividade_principal?: string | null
          ativo?: boolean | null
          cnae?: string | null
          contato_empresa?: Json | null
          contatos?: Json | null
          cpf_cnpj?: string | null
          created_at?: string | null
          dados_pessoais?: Json | null
          data_fundacao?: string | null
          data_nascimento?: string | null
          documentos?: Json | null
          email?: string | null
          emails?: Json | null
          endereco?: Json | null
          external_id?: string | null
          forma_atuacao?: string | null
          id?: string
          nome?: string
          nome_fantasia?: string | null
          qualificacao_fiscal?: Json | null
          rg?: string | null
          setor_id?: string | null
          site?: string | null
          source_system?: string | null
          sync_metadata?: Json | null
          telefone?: string | null
          telefones?: Json | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores: {
        Row: {
          cargo_id: string | null
          cpf: string
          created_at: string | null
          data_admissao: string
          data_demissao: string | null
          data_nascimento: string
          departamento_id: string | null
          email: string | null
          empresa_representada_id: string
          endereco: Json | null
          id: string
          nome_completo: string
          regime_contratacao: string
          rg: string | null
          salario_base: number | null
          situacao: boolean | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          cargo_id?: string | null
          cpf: string
          created_at?: string | null
          data_admissao: string
          data_demissao?: string | null
          data_nascimento: string
          departamento_id?: string | null
          email?: string | null
          empresa_representada_id: string
          endereco?: Json | null
          id?: string
          nome_completo: string
          regime_contratacao: string
          rg?: string | null
          salario_base?: number | null
          situacao?: boolean | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          cargo_id?: string | null
          cpf?: string
          created_at?: string | null
          data_admissao?: string
          data_demissao?: string | null
          data_nascimento?: string
          departamento_id?: string | null
          email?: string | null
          empresa_representada_id?: string
          endereco?: Json | null
          id?: string
          nome_completo?: string
          regime_contratacao?: string
          rg?: string | null
          salario_base?: number | null
          situacao?: boolean | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_bancarias: {
        Row: {
          agencia_id: string | null
          ativo: boolean
          configuracoes: Json | null
          conta_cofre: boolean
          cpf_cnpj_titular: string
          created_at: string
          data_abertura: string
          data_encerramento: string | null
          deleted_at: string | null
          descricao_conta: string | null
          digito_verificador: string
          id: string
          limite_credito: number | null
          limite_disponivel: number | null
          numero_conta: string
          observacoes: string | null
          saldo_atual: number
          saldo_inicial: number
          status: string
          tipo_conta: string
          titular: string
          updated_at: string
        }
        Insert: {
          agencia_id?: string | null
          ativo?: boolean
          configuracoes?: Json | null
          conta_cofre?: boolean
          cpf_cnpj_titular: string
          created_at?: string
          data_abertura: string
          data_encerramento?: string | null
          deleted_at?: string | null
          descricao_conta?: string | null
          digito_verificador: string
          id?: string
          limite_credito?: number | null
          limite_disponivel?: number | null
          numero_conta: string
          observacoes?: string | null
          saldo_atual?: number
          saldo_inicial?: number
          status?: string
          tipo_conta: string
          titular: string
          updated_at?: string
        }
        Update: {
          agencia_id?: string | null
          ativo?: boolean
          configuracoes?: Json | null
          conta_cofre?: boolean
          cpf_cnpj_titular?: string
          created_at?: string
          data_abertura?: string
          data_encerramento?: string | null
          deleted_at?: string | null
          descricao_conta?: string | null
          digito_verificador?: string
          id?: string
          limite_credito?: number | null
          limite_disponivel?: number | null
          numero_conta?: string
          observacoes?: string | null
          saldo_atual?: number
          saldo_inicial?: number
          status?: string
          tipo_conta?: string
          titular?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_bancarias_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_pagar: {
        Row: {
          anexos: Json | null
          ativo: boolean
          centro_custo_id: string | null
          conta_origem_id: string | null
          created_at: string
          data_competencia: string | null
          data_emissao: string
          data_vencimento: string
          descricao: string
          fornecedor_id: string | null
          id: string
          numero_documento: string
          numero_parcela: number | null
          observacoes: string | null
          periodicidade: string | null
          plano_conta_id: string | null
          recorrente: boolean
          situacao: string
          tags: Json | null
          total_parcelas: number | null
          updated_at: string
          valor_atual: number
          valor_original: number
        }
        Insert: {
          anexos?: Json | null
          ativo?: boolean
          centro_custo_id?: string | null
          conta_origem_id?: string | null
          created_at?: string
          data_competencia?: string | null
          data_emissao: string
          data_vencimento: string
          descricao: string
          fornecedor_id?: string | null
          id?: string
          numero_documento: string
          numero_parcela?: number | null
          observacoes?: string | null
          periodicidade?: string | null
          plano_conta_id?: string | null
          recorrente?: boolean
          situacao?: string
          tags?: Json | null
          total_parcelas?: number | null
          updated_at?: string
          valor_atual?: number
          valor_original?: number
        }
        Update: {
          anexos?: Json | null
          ativo?: boolean
          centro_custo_id?: string | null
          conta_origem_id?: string | null
          created_at?: string
          data_competencia?: string | null
          data_emissao?: string
          data_vencimento?: string
          descricao?: string
          fornecedor_id?: string | null
          id?: string
          numero_documento?: string
          numero_parcela?: number | null
          observacoes?: string | null
          periodicidade?: string | null
          plano_conta_id?: string | null
          recorrente?: boolean
          situacao?: string
          tags?: Json | null
          total_parcelas?: number | null
          updated_at?: string
          valor_atual?: number
          valor_original?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_plano_conta_id_fkey"
            columns: ["plano_conta_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          cliente_id: string | null
          contrato_id: string | null
          created_at: string
          data_emissao: string
          data_pagamento: string | null
          data_vencimento: string
          forma_pagamento: string | null
          id: string
          numero_documento: string
          observacoes: string | null
          situacao: string
          source_system: string | null
          sync_metadata: Json | null
          updated_at: string
          valor_desconto: number | null
          valor_original: number
          valor_pago: number | null
          venda_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          contrato_id?: string | null
          created_at?: string
          data_emissao: string
          data_pagamento?: string | null
          data_vencimento: string
          forma_pagamento?: string | null
          id?: string
          numero_documento: string
          observacoes?: string | null
          situacao?: string
          source_system?: string | null
          sync_metadata?: Json | null
          updated_at?: string
          valor_desconto?: number | null
          valor_original: number
          valor_pago?: number | null
          venda_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          contrato_id?: string | null
          created_at?: string
          data_emissao?: string
          data_pagamento?: string | null
          data_vencimento?: string
          forma_pagamento?: string | null
          id?: string
          numero_documento?: string
          observacoes?: string | null
          situacao?: string
          source_system?: string | null
          sync_metadata?: Json | null
          updated_at?: string
          valor_desconto?: number | null
          valor_original?: number
          valor_pago?: number | null
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string
          id: string
          numero_contrato: string
          observacoes: string | null
          responsavel: string | null
          servicos: Json | null
          source_system: string | null
          status: string
          sync_metadata: Json | null
          updated_at: string
          valor_mensal: number | null
          valor_total: number | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          id?: string
          numero_contrato: string
          observacoes?: string | null
          responsavel?: string | null
          servicos?: Json | null
          source_system?: string | null
          status?: string
          sync_metadata?: Json | null
          updated_at?: string
          valor_mensal?: number | null
          valor_total?: number | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          numero_contrato?: string
          observacoes?: string | null
          responsavel?: string | null
          servicos?: Json | null
          source_system?: string | null
          status?: string
          sync_metadata?: Json | null
          updated_at?: string
          valor_mensal?: number | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      departamentos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          empresa_representada_id: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          empresa_representada_id?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          empresa_representada_id?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departamentos_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      descontos_padrao: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          descricao: string
          id: string
          percentual: number | null
          tabela_progressiva: Json | null
          tipo: string
          updated_at: string | null
          valor: number | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          descricao: string
          id?: string
          percentual?: number | null
          tabela_progressiva?: Json | null
          tipo: string
          updated_at?: string | null
          valor?: number | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          descricao?: string
          id?: string
          percentual?: number | null
          tabela_progressiva?: Json | null
          tipo?: string
          updated_at?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      documentos_titulos_financeiros: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          descricao: string | null
          id: string
          nome_arquivo: string
          nome_original: string
          tamanho_bytes: number
          tipo_arquivo: string
          tipo_titulo: string
          titulo_id: string
          updated_at: string
          upload_usuario_id: string | null
          url_arquivo: string
          versao: number
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome_arquivo: string
          nome_original: string
          tamanho_bytes: number
          tipo_arquivo: string
          tipo_titulo: string
          titulo_id: string
          updated_at?: string
          upload_usuario_id?: string | null
          url_arquivo: string
          versao?: number
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome_arquivo?: string
          nome_original?: string
          tamanho_bytes?: number
          tipo_arquivo?: string
          tipo_titulo?: string
          titulo_id?: string
          updated_at?: string
          upload_usuario_id?: string | null
          url_arquivo?: string
          versao?: number
        }
        Relationships: []
      }
      empresa_responsavel: {
        Row: {
          cnpj: string
          contatos: Json
          created_at: string | null
          endereco: Json
          id: string
          nome_fantasia: string
          nome_responsavel: string
          razao_social: string
          updated_at: string | null
        }
        Insert: {
          cnpj: string
          contatos: Json
          created_at?: string | null
          endereco: Json
          id?: string
          nome_fantasia: string
          nome_responsavel: string
          razao_social: string
          updated_at?: string | null
        }
        Update: {
          cnpj?: string
          contatos?: Json
          created_at?: string | null
          endereco?: Json
          id?: string
          nome_fantasia?: string
          nome_responsavel?: string
          razao_social?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      empresas_representadas: {
        Row: {
          ativa: boolean | null
          cnpj: string
          configuracao_nf: Json
          created_at: string | null
          empresa_responsavel_id: string | null
          endereco: Json
          id: string
          logomarca: Json | null
          nome_fantasia: string
          qualificacao_fiscal: Json
          razao_social: string
          updated_at: string | null
        }
        Insert: {
          ativa?: boolean | null
          cnpj: string
          configuracao_nf: Json
          created_at?: string | null
          empresa_responsavel_id?: string | null
          endereco: Json
          id?: string
          logomarca?: Json | null
          nome_fantasia: string
          qualificacao_fiscal: Json
          razao_social: string
          updated_at?: string | null
        }
        Update: {
          ativa?: boolean | null
          cnpj?: string
          configuracao_nf?: Json
          created_at?: string | null
          empresa_responsavel_id?: string | null
          endereco?: Json
          id?: string
          logomarca?: Json | null
          nome_fantasia?: string
          qualificacao_fiscal?: Json
          razao_social?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_representadas_empresa_responsavel_id_fkey"
            columns: ["empresa_responsavel_id"]
            isOneToOne: false
            referencedRelation: "empresa_responsavel"
            referencedColumns: ["id"]
          },
        ]
      }
      folha_pagamento: {
        Row: {
          adicionais: number | null
          beneficios: number | null
          colaborador_id: string
          competencia: string
          created_at: string | null
          descontos: number | null
          encargos: number | null
          horas_extras: number | null
          id: string
          observacoes: string | null
          salario_base: number | null
          status: string | null
          total_bruto: number | null
          total_liquido: number | null
          updated_at: string | null
        }
        Insert: {
          adicionais?: number | null
          beneficios?: number | null
          colaborador_id: string
          competencia: string
          created_at?: string | null
          descontos?: number | null
          encargos?: number | null
          horas_extras?: number | null
          id?: string
          observacoes?: string | null
          salario_base?: number | null
          status?: string | null
          total_bruto?: number | null
          total_liquido?: number | null
          updated_at?: string | null
        }
        Update: {
          adicionais?: number | null
          beneficios?: number | null
          colaborador_id?: string
          competencia?: string
          created_at?: string | null
          descontos?: number | null
          encargos?: number | null
          horas_extras?: number | null
          id?: string
          observacoes?: string | null
          salario_base?: number | null
          status?: string | null
          total_bruto?: number | null
          total_liquido?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folha_pagamento_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          anexos_pf: Json | null
          anexos_pj: Json | null
          atividade_principal: string | null
          ativo: boolean | null
          capital_social: number | null
          cnae: string | null
          cnpj: string | null
          contato_principal: Json | null
          cpf: string | null
          created_at: string | null
          dados_bancarios: Json | null
          data_fundacao: string | null
          data_nascimento: string | null
          email: string | null
          endereco: Json | null
          endereco_correspondencia: Json | null
          horario_atendimento: string | null
          id: string
          nome_completo: string | null
          nome_fantasia: string | null
          orgao_emissor_rg: string | null
          portfolio_anexo: string | null
          prazo_entrega_habitual: string | null
          qualificacao_fiscal: Json | null
          razao_social: string
          referencias_comerciais: string | null
          referencias_pessoais: string | null
          responsavel_preenchimento: Json | null
          rg: string | null
          telefone: string | null
          telefones: Json | null
          tipo_pessoa: string | null
          updated_at: string | null
          usar_endereco_principal_correspondencia: boolean | null
        }
        Insert: {
          anexos_pf?: Json | null
          anexos_pj?: Json | null
          atividade_principal?: string | null
          ativo?: boolean | null
          capital_social?: number | null
          cnae?: string | null
          cnpj?: string | null
          contato_principal?: Json | null
          cpf?: string | null
          created_at?: string | null
          dados_bancarios?: Json | null
          data_fundacao?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: Json | null
          endereco_correspondencia?: Json | null
          horario_atendimento?: string | null
          id?: string
          nome_completo?: string | null
          nome_fantasia?: string | null
          orgao_emissor_rg?: string | null
          portfolio_anexo?: string | null
          prazo_entrega_habitual?: string | null
          qualificacao_fiscal?: Json | null
          razao_social: string
          referencias_comerciais?: string | null
          referencias_pessoais?: string | null
          responsavel_preenchimento?: Json | null
          rg?: string | null
          telefone?: string | null
          telefones?: Json | null
          tipo_pessoa?: string | null
          updated_at?: string | null
          usar_endereco_principal_correspondencia?: boolean | null
        }
        Update: {
          anexos_pf?: Json | null
          anexos_pj?: Json | null
          atividade_principal?: string | null
          ativo?: boolean | null
          capital_social?: number | null
          cnae?: string | null
          cnpj?: string | null
          contato_principal?: Json | null
          cpf?: string | null
          created_at?: string | null
          dados_bancarios?: Json | null
          data_fundacao?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: Json | null
          endereco_correspondencia?: Json | null
          horario_atendimento?: string | null
          id?: string
          nome_completo?: string | null
          nome_fantasia?: string | null
          orgao_emissor_rg?: string | null
          portfolio_anexo?: string | null
          prazo_entrega_habitual?: string | null
          qualificacao_fiscal?: Json | null
          razao_social?: string
          referencias_comerciais?: string | null
          referencias_pessoais?: string | null
          responsavel_preenchimento?: Json | null
          rg?: string | null
          telefone?: string | null
          telefones?: Json | null
          tipo_pessoa?: string | null
          updated_at?: string | null
          usar_endereco_principal_correspondencia?: boolean | null
        }
        Relationships: []
      }
      historico_movimentacoes_financeiras: {
        Row: {
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          data_operacao: string
          id: string
          ip_origem: unknown | null
          metadados: Json | null
          observacoes: string | null
          tipo_operacao: string
          tipo_titulo: string
          titulo_id: string
          usuario_id: string | null
          usuario_nome: string | null
          valor_movimentado: number | null
        }
        Insert: {
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          data_operacao?: string
          id?: string
          ip_origem?: unknown | null
          metadados?: Json | null
          observacoes?: string | null
          tipo_operacao: string
          tipo_titulo: string
          titulo_id: string
          usuario_id?: string | null
          usuario_nome?: string | null
          valor_movimentado?: number | null
        }
        Update: {
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          data_operacao?: string
          id?: string
          ip_origem?: unknown | null
          metadados?: Json | null
          observacoes?: string | null
          tipo_operacao?: string
          tipo_titulo?: string
          titulo_id?: string
          usuario_id?: string | null
          usuario_nome?: string | null
          valor_movimentado?: number | null
        }
        Relationships: []
      }
      integracoes_ponto: {
        Row: {
          ativo: boolean | null
          configuracao: Json
          created_at: string | null
          formato_arquivo: string | null
          id: string
          mapeamento_campos: Json | null
          nome: string
          tipo: string
          token_api: string | null
          updated_at: string | null
          url_api: string | null
        }
        Insert: {
          ativo?: boolean | null
          configuracao?: Json
          created_at?: string | null
          formato_arquivo?: string | null
          id?: string
          mapeamento_campos?: Json | null
          nome: string
          tipo: string
          token_api?: string | null
          updated_at?: string | null
          url_api?: string | null
        }
        Update: {
          ativo?: boolean | null
          configuracao?: Json
          created_at?: string | null
          formato_arquivo?: string | null
          id?: string
          mapeamento_campos?: Json | null
          nome?: string
          tipo?: string
          token_api?: string | null
          updated_at?: string | null
          url_api?: string | null
        }
        Relationships: []
      }
      liquidacoes_multiplas: {
        Row: {
          conta_bancaria_id: string
          created_at: string
          id: string
          liquidacao_principal_id: string
          observacoes: string | null
          valor: number
        }
        Insert: {
          conta_bancaria_id: string
          created_at?: string
          id?: string
          liquidacao_principal_id: string
          observacoes?: string | null
          valor: number
        }
        Update: {
          conta_bancaria_id?: string
          created_at?: string
          id?: string
          liquidacao_principal_id?: string
          observacoes?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "liquidacoes_multiplas_liquidacao_principal_id_fkey"
            columns: ["liquidacao_principal_id"]
            isOneToOne: false
            referencedRelation: "liquidacoes_titulos"
            referencedColumns: ["id"]
          },
        ]
      }
      liquidacoes_titulos: {
        Row: {
          conta_bancaria_destino_id: string | null
          conta_bancaria_id: string | null
          created_at: string
          data_estorno: string | null
          data_pagamento: string
          desconto_concedido: number | null
          estornado: boolean
          forma_pagamento: string
          id: string
          juros_pagos: number | null
          liquidacao_completa: boolean
          motivo_estorno: string | null
          multa_paga: number | null
          numero_documento_baixa: string | null
          observacoes: string | null
          tipo_titulo: string
          titulo_id: string
          updated_at: string
          usuario_estorno_id: string | null
          usuario_liquidacao_id: string | null
          valor_original_titulo: number
          valor_pago: number
          valor_restante: number
        }
        Insert: {
          conta_bancaria_destino_id?: string | null
          conta_bancaria_id?: string | null
          created_at?: string
          data_estorno?: string | null
          data_pagamento: string
          desconto_concedido?: number | null
          estornado?: boolean
          forma_pagamento: string
          id?: string
          juros_pagos?: number | null
          liquidacao_completa?: boolean
          motivo_estorno?: string | null
          multa_paga?: number | null
          numero_documento_baixa?: string | null
          observacoes?: string | null
          tipo_titulo: string
          titulo_id: string
          updated_at?: string
          usuario_estorno_id?: string | null
          usuario_liquidacao_id?: string | null
          valor_original_titulo: number
          valor_pago: number
          valor_restante?: number
        }
        Update: {
          conta_bancaria_destino_id?: string | null
          conta_bancaria_id?: string | null
          created_at?: string
          data_estorno?: string | null
          data_pagamento?: string
          desconto_concedido?: number | null
          estornado?: boolean
          forma_pagamento?: string
          id?: string
          juros_pagos?: number | null
          liquidacao_completa?: boolean
          motivo_estorno?: string | null
          multa_paga?: number | null
          numero_documento_baixa?: string | null
          observacoes?: string | null
          tipo_titulo?: string
          titulo_id?: string
          updated_at?: string
          usuario_estorno_id?: string | null
          usuario_liquidacao_id?: string | null
          valor_original_titulo?: number
          valor_pago?: number
          valor_restante?: number
        }
        Relationships: []
      }
      localizacoes_estoque: {
        Row: {
          ativo: boolean
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      modalidade_api_vinculo: {
        Row: {
          ativo: boolean
          codigo_externo: string | null
          created_at: string
          deleted_at: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo_externo?: string | null
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo_externo?: string | null
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      modalidade_caixas: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          id: string
          indica_boleto: boolean
          indica_cartao_credito: boolean
          nome: string
          sigla: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          indica_boleto?: boolean
          indica_cartao_credito?: boolean
          nome: string
          sigla: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          indica_boleto?: boolean
          indica_cartao_credito?: boolean
          nome?: string
          sigla?: string
          updated_at?: string
        }
        Relationships: []
      }
      natureza_caixas: {
        Row: {
          ativo: boolean
          baixa: boolean
          baixa_pendente: boolean
          conta_convenio: boolean
          created_at: string
          deleted_at: string | null
          forma_nota_fiscal: boolean
          gera_troco: boolean
          id: string
          informa_valor_pago: boolean
          mostra_troco: boolean
          nome: string
          pagamento_online: boolean
          sigla: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          baixa?: boolean
          baixa_pendente?: boolean
          conta_convenio?: boolean
          created_at?: string
          deleted_at?: string | null
          forma_nota_fiscal?: boolean
          gera_troco?: boolean
          id?: string
          informa_valor_pago?: boolean
          mostra_troco?: boolean
          nome: string
          pagamento_online?: boolean
          sigla: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          baixa?: boolean
          baixa_pendente?: boolean
          conta_convenio?: boolean
          created_at?: string
          deleted_at?: string | null
          forma_nota_fiscal?: boolean
          gera_troco?: boolean
          id?: string
          informa_valor_pago?: boolean
          mostra_troco?: boolean
          nome?: string
          pagamento_online?: boolean
          sigla?: string
          updated_at?: string
        }
        Relationships: []
      }
      perfis: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          permissoes: Json
          sistema: boolean | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          permissoes: Json
          sistema?: boolean | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          permissoes?: Json
          sistema?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      plano_contas: {
        Row: {
          analitica: boolean
          ativo: boolean
          codigo: string
          created_at: string
          id: string
          id_pai: string | null
          nivel: number
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          analitica?: boolean
          ativo?: boolean
          codigo: string
          created_at?: string
          id?: string
          id_pai?: string | null
          nivel: number
          nome: string
          tipo: string
          updated_at?: string
        }
        Update: {
          analitica?: boolean
          ativo?: boolean
          codigo?: string
          created_at?: string
          id?: string
          id_pai?: string | null
          nivel?: number
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_contas_id_pai_fkey"
            columns: ["id_pai"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_pagamento: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          id: string
          nome_plano: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome_plano: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome_plano?: string
          updated_at?: string
        }
        Relationships: []
      }
      produto_fornecedores: {
        Row: {
          agrupamento: string | null
          ativo: boolean
          codigo_fornecedor: string
          created_at: string | null
          data_ultima_compra: string | null
          descricao_fornecedor: string | null
          fator_conversao: number
          fornecedor_id: string
          id: string
          lead_time_dias: number | null
          observacoes: string | null
          pedido_minimo: number | null
          preco_compra: number
          preco_ultima_compra: number | null
          produto_id: string
          unidade_compra: string
          updated_at: string | null
        }
        Insert: {
          agrupamento?: string | null
          ativo?: boolean
          codigo_fornecedor: string
          created_at?: string | null
          data_ultima_compra?: string | null
          descricao_fornecedor?: string | null
          fator_conversao?: number
          fornecedor_id: string
          id?: string
          lead_time_dias?: number | null
          observacoes?: string | null
          pedido_minimo?: number | null
          preco_compra: number
          preco_ultima_compra?: number | null
          produto_id: string
          unidade_compra?: string
          updated_at?: string | null
        }
        Update: {
          agrupamento?: string | null
          ativo?: boolean
          codigo_fornecedor?: string
          created_at?: string | null
          data_ultima_compra?: string | null
          descricao_fornecedor?: string | null
          fator_conversao?: number
          fornecedor_id?: string
          id?: string
          lead_time_dias?: number | null
          observacoes?: string | null
          pedido_minimo?: number | null
          preco_compra?: number
          preco_ultima_compra?: number | null
          produto_id?: string
          unidade_compra?: string
          updated_at?: string | null
        }
        Relationships: [
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
          ativo: boolean | null
          categoria: string | null
          cest: string | null
          cfop: string | null
          codigo_barras: string | null
          codigo_delivery: string | null
          comprimento: number | null
          created_at: string | null
          cst_csosn: string | null
          custo_total: number | null
          descricao: string | null
          estoque_atual: number | null
          estoque_minimo: number | null
          ficha_tecnica: string | null
          id: string
          imagem: string | null
          largura: number | null
          margem_lucro: number | null
          modo_preparo: string | null
          ncm: string | null
          nome: string
          peso: number | null
          preco_compra: number | null
          preco_venda: number
          unidade_medida: string | null
          updated_at: string | null
          variacoes: Json | null
        }
        Insert: {
          altura?: number | null
          ativo?: boolean | null
          categoria?: string | null
          cest?: string | null
          cfop?: string | null
          codigo_barras?: string | null
          codigo_delivery?: string | null
          comprimento?: number | null
          created_at?: string | null
          cst_csosn?: string | null
          custo_total?: number | null
          descricao?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          ficha_tecnica?: string | null
          id?: string
          imagem?: string | null
          largura?: number | null
          margem_lucro?: number | null
          modo_preparo?: string | null
          ncm?: string | null
          nome: string
          peso?: number | null
          preco_compra?: number | null
          preco_venda: number
          unidade_medida?: string | null
          updated_at?: string | null
          variacoes?: Json | null
        }
        Update: {
          altura?: number | null
          ativo?: boolean | null
          categoria?: string | null
          cest?: string | null
          cfop?: string | null
          codigo_barras?: string | null
          codigo_delivery?: string | null
          comprimento?: number | null
          created_at?: string | null
          cst_csosn?: string | null
          custo_total?: number | null
          descricao?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          ficha_tecnica?: string | null
          id?: string
          imagem?: string | null
          largura?: number | null
          margem_lucro?: number | null
          modo_preparo?: string | null
          ncm?: string | null
          nome?: string
          peso?: number | null
          preco_compra?: number | null
          preco_venda?: number
          unidade_medida?: string | null
          updated_at?: string | null
          variacoes?: Json | null
        }
        Relationships: []
      }
      rateios_contas_pagar: {
        Row: {
          centro_custo_id: string | null
          conta_pagar_id: string
          created_at: string
          descricao: string | null
          id: string
          percentual: number
          plano_conta_id: string
          updated_at: string
          valor: number
        }
        Insert: {
          centro_custo_id?: string | null
          conta_pagar_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          percentual?: number
          plano_conta_id: string
          updated_at?: string
          valor?: number
        }
        Update: {
          centro_custo_id?: string | null
          conta_pagar_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          percentual?: number
          plano_conta_id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "rateios_contas_pagar_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rateios_contas_pagar_conta_pagar_id_fkey"
            columns: ["conta_pagar_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rateios_contas_pagar_plano_conta_id_fkey"
            columns: ["plano_conta_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_ponto: {
        Row: {
          colaborador_id: string
          created_at: string | null
          data_ponto: string
          entrada_manha: string | null
          horas_extras: number | null
          horas_trabalhadas: number | null
          id: string
          observacoes: string | null
          origem: string | null
          saida_almoco: string | null
          saida_tarde: string | null
          updated_at: string | null
          volta_almoco: string | null
        }
        Insert: {
          colaborador_id: string
          created_at?: string | null
          data_ponto: string
          entrada_manha?: string | null
          horas_extras?: number | null
          horas_trabalhadas?: number | null
          id?: string
          observacoes?: string | null
          origem?: string | null
          saida_almoco?: string | null
          saida_tarde?: string | null
          updated_at?: string | null
          volta_almoco?: string | null
        }
        Update: {
          colaborador_id?: string
          created_at?: string | null
          data_ponto?: string
          entrada_manha?: string | null
          horas_extras?: number | null
          horas_trabalhadas?: number | null
          id?: string
          observacoes?: string | null
          origem?: string | null
          saida_almoco?: string | null
          saida_tarde?: string | null
          updated_at?: string | null
          volta_almoco?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          preco: number
          tempo_execucao: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          preco: number
          tempo_execucao?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          preco?: number
          tempo_execucao?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      setores_empresa: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          descricao: string
          id: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          descricao: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          descricao?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          created_at: string
          data_payload: Json | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          operation_type: string
          processed_at: string | null
          record_id: string
          retry_count: number | null
          source_system: string
          status: string
          table_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_payload?: Json | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          operation_type: string
          processed_at?: string | null
          record_id: string
          retry_count?: number | null
          source_system: string
          status?: string
          table_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_payload?: Json | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          operation_type?: string
          processed_at?: string | null
          record_id?: string
          retry_count?: number | null
          source_system?: string
          status?: string
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sync_queue: {
        Row: {
          attempts: number | null
          created_at: string
          id: string
          last_error: string | null
          max_attempts: number | null
          operation_type: string
          payload: Json
          priority: number | null
          scheduled_for: string
          status: string
          table_name: string
          updated_at: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          operation_type: string
          payload: Json
          priority?: number | null
          scheduled_for?: string
          status?: string
          table_name: string
          updated_at?: string
        }
        Update: {
          attempts?: number | null
          created_at?: string
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          operation_type?: string
          payload?: Json
          priority?: number | null
          scheduled_for?: string
          status?: string
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tamanhos_produtos: {
        Row: {
          ativo: boolean
          created_at: string | null
          descricao: string
          id: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          descricao: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          descricao?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      unidades_medida: {
        Row: {
          ativo: boolean
          created_at: string | null
          id: string
          nome: string
          sigla: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          id?: string
          nome: string
          sigla: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          id?: string
          nome?: string
          sigla?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          ativo: boolean | null
          colaborador_id: string | null
          cpf: string
          created_at: string | null
          email: string
          empresa_representada_id: string | null
          id: string
          nome_completo: string
          perfil_id: string
          ultimo_login: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          colaborador_id?: string | null
          cpf: string
          created_at?: string | null
          email: string
          empresa_representada_id?: string | null
          id?: string
          nome_completo: string
          perfil_id: string
          ultimo_login?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          colaborador_id?: string | null
          cpf?: string
          created_at?: string | null
          email?: string
          empresa_representada_id?: string | null
          id?: string
          nome_completo?: string
          perfil_id?: string
          ultimo_login?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      vencimentos_padrao: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          descricao: string
          id: string
          incide_fgts: boolean | null
          incide_inss: boolean | null
          incide_irrf: boolean | null
          percentual: number | null
          tipo: string
          updated_at: string | null
          valor: number | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          descricao: string
          id?: string
          incide_fgts?: boolean | null
          incide_inss?: boolean | null
          incide_irrf?: boolean | null
          percentual?: number | null
          tipo: string
          updated_at?: string | null
          valor?: number | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          descricao?: string
          id?: string
          incide_fgts?: boolean | null
          incide_inss?: boolean | null
          incide_irrf?: boolean | null
          percentual?: number | null
          tipo?: string
          updated_at?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      vendas: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_venda: string
          forma_pagamento: string | null
          id: string
          itens: Json
          numero_venda: string
          observacoes: string | null
          source_system: string | null
          status: string
          sync_metadata: Json | null
          updated_at: string
          valor_acrescimo: number | null
          valor_desconto: number | null
          valor_total: number
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_venda: string
          forma_pagamento?: string | null
          id?: string
          itens?: Json
          numero_venda: string
          observacoes?: string | null
          source_system?: string | null
          status?: string
          sync_metadata?: Json | null
          updated_at?: string
          valor_acrescimo?: number | null
          valor_desconto?: number | null
          valor_total: number
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_venda?: string
          forma_pagamento?: string | null
          id?: string
          itens?: Json
          numero_venda?: string
          observacoes?: string | null
          source_system?: string | null
          status?: string
          sync_metadata?: Json | null
          updated_at?: string
          valor_acrescimo?: number | null
          valor_desconto?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_configs: {
        Row: {
          active: boolean
          created_at: string
          events: Json
          id: string
          rate_limit: number | null
          target_system: string
          timeout_seconds: number | null
          updated_at: string
          webhook_secret: string
          webhook_url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          events?: Json
          id?: string
          rate_limit?: number | null
          target_system: string
          timeout_seconds?: number | null
          updated_at?: string
          webhook_secret: string
          webhook_url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          events?: Json
          id?: string
          rate_limit?: number | null
          target_system?: string
          timeout_seconds?: number | null
          updated_at?: string
          webhook_secret?: string
          webhook_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_sync_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_audit_trail: {
        Args: { p_tabela_nome: string; p_registro_id: string }
        Returns: {
          id: string
          operacao: string
          dados_antigos: Json
          dados_novos: Json
          created_at: string
          origem: string
          usuario_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
