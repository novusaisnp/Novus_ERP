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
    PostgrestVersion: "14.15"
  }
  centelha: {
    Tables: {
      licencas: {
        Row: {
          contrato_id: string
          created_at: string
          id: string
          responsavel_id: string
          satelite_id: string
          status: string
          tenant_ref: string | null
          updated_at: string
        }
        Insert: {
          contrato_id: string
          created_at?: string
          id?: string
          responsavel_id: string
          satelite_id: string
          status?: string
          tenant_ref?: string | null
          updated_at?: string
        }
        Update: {
          contrato_id?: string
          created_at?: string
          id?: string
          responsavel_id?: string
          satelite_id?: string
          status?: string
          tenant_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "licencas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licencas_satelite_id_fkey"
            columns: ["satelite_id"]
            isOneToOne: false
            referencedRelation: "satelites"
            referencedColumns: ["id"]
          },
        ]
      }
      owners: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
        }
        Relationships: []
      }
      responsaveis: {
        Row: {
          cliente_billing_id: string | null
          cnpj: string | null
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          cliente_billing_id?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          cliente_billing_id?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      satelites: {
        Row: {
          ativo: boolean
          base_url: string
          codigo: string
          created_at: string
          id: string
          nome: string
          provisioning_secret: string
        }
        Insert: {
          ativo?: boolean
          base_url: string
          codigo: string
          created_at?: string
          id?: string
          nome: string
          provisioning_secret: string
        }
        Update: {
          ativo?: boolean
          base_url?: string
          codigo?: string
          created_at?: string
          id?: string
          nome?: string
          provisioning_secret?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agencias_bancarias: {
        Row: {
          ativo: boolean | null
          banco_id: string
          created_at: string
          deleted_at: string | null
          descricao: string | null
          digito: string | null
          email: string | null
          empresa_representada_id: string
          endereco: Json | null
          id: string
          nome: string | null
          numero: string
          numero_agencia: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          banco_id: string
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          digito?: string | null
          email?: string | null
          empresa_representada_id: string
          endereco?: Json | null
          id?: string
          nome?: string | null
          numero: string
          numero_agencia?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          banco_id?: string
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          digito?: string | null
          email?: string | null
          empresa_representada_id?: string
          endereco?: Json | null
          id?: string
          nome?: string | null
          numero?: string
          numero_agencia?: string | null
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
          {
            foreignKeyName: "agencias_bancarias_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      autorizacoes_financeiras: {
        Row: {
          acao: string
          autorizador_user_id: string
          consumido_em: string | null
          consumido_ref: string | null
          contexto: Json
          criado_em: string
          empresa_representada_id: string
          expira_em: string
          id: string
          justificativa: string
          solicitante_user_id: string
          ticket: string
        }
        Insert: {
          acao: string
          autorizador_user_id: string
          consumido_em?: string | null
          consumido_ref?: string | null
          contexto?: Json
          criado_em?: string
          empresa_representada_id: string
          expira_em: string
          id?: string
          justificativa: string
          solicitante_user_id: string
          ticket?: string
        }
        Update: {
          acao?: string
          autorizador_user_id?: string
          consumido_em?: string | null
          consumido_ref?: string | null
          contexto?: Json
          criado_em?: string
          empresa_representada_id?: string
          expira_em?: string
          id?: string
          justificativa?: string
          solicitante_user_id?: string
          ticket?: string
        }
        Relationships: [
          {
            foreignKeyName: "autorizacoes_financeiras_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      banco_conciliacao_log: {
        Row: {
          acao: string
          created_at: string
          empresa_representada_id: string
          id: string
          movimentacao_bancaria_id: string | null
          movimentacao_extrato_id: string | null
          snapshot: Json | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          empresa_representada_id: string
          id?: string
          movimentacao_bancaria_id?: string | null
          movimentacao_extrato_id?: string | null
          snapshot?: Json | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          empresa_representada_id?: string
          id?: string
          movimentacao_bancaria_id?: string | null
          movimentacao_extrato_id?: string | null
          snapshot?: Json | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      banco_extratos_importados: {
        Row: {
          conta_bancaria_id: string
          created_at: string
          created_by: string | null
          data_final: string | null
          data_inicial: string | null
          deleted_at: string | null
          empresa_representada_id: string
          erro_mensagem: string | null
          formato: string
          hash_arquivo: string
          id: string
          nome_arquivo: string
          saldo_final: number | null
          saldo_inicial: number | null
          status: string
          storage_path: string | null
          total_lancamentos: number
          updated_at: string
        }
        Insert: {
          conta_bancaria_id: string
          created_at?: string
          created_by?: string | null
          data_final?: string | null
          data_inicial?: string | null
          deleted_at?: string | null
          empresa_representada_id: string
          erro_mensagem?: string | null
          formato: string
          hash_arquivo: string
          id?: string
          nome_arquivo: string
          saldo_final?: number | null
          saldo_inicial?: number | null
          status?: string
          storage_path?: string | null
          total_lancamentos?: number
          updated_at?: string
        }
        Update: {
          conta_bancaria_id?: string
          created_at?: string
          created_by?: string | null
          data_final?: string | null
          data_inicial?: string | null
          deleted_at?: string | null
          empresa_representada_id?: string
          erro_mensagem?: string | null
          formato?: string
          hash_arquivo?: string
          id?: string
          nome_arquivo?: string
          saldo_final?: number | null
          saldo_inicial?: number | null
          status?: string
          storage_path?: string | null
          total_lancamentos?: number
          updated_at?: string
        }
        Relationships: []
      }
      banco_movimentacoes_extrato: {
        Row: {
          conciliado_em: string | null
          conciliado_por: string | null
          conta_bancaria_id: string
          created_at: string
          data_movimento: string
          descricao: string
          documento: string | null
          empresa_representada_id: string
          extrato_importado_id: string
          fit_id: string | null
          grupo_conciliacao_id: string | null
          historico: string | null
          id: string
          movimentacao_bancaria_id: string | null
          regra_id: string | null
          score_match: number | null
          status_conciliacao: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          conciliado_em?: string | null
          conciliado_por?: string | null
          conta_bancaria_id: string
          created_at?: string
          data_movimento: string
          descricao: string
          documento?: string | null
          empresa_representada_id: string
          extrato_importado_id: string
          fit_id?: string | null
          grupo_conciliacao_id?: string | null
          historico?: string | null
          id?: string
          movimentacao_bancaria_id?: string | null
          regra_id?: string | null
          score_match?: number | null
          status_conciliacao?: string
          tipo: string
          updated_at?: string
          valor: number
        }
        Update: {
          conciliado_em?: string | null
          conciliado_por?: string | null
          conta_bancaria_id?: string
          created_at?: string
          data_movimento?: string
          descricao?: string
          documento?: string | null
          empresa_representada_id?: string
          extrato_importado_id?: string
          fit_id?: string | null
          grupo_conciliacao_id?: string | null
          historico?: string | null
          id?: string
          movimentacao_bancaria_id?: string | null
          regra_id?: string | null
          score_match?: number | null
          status_conciliacao?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      banco_regras_conciliacao: {
        Row: {
          ativa: boolean
          centro_custo_id: string | null
          contraparte_id: string | null
          contraparte_tipo: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          empresa_representada_id: string
          id: string
          natureza_id: string | null
          nome: string
          observacoes: string | null
          padrao: string | null
          plano_conta_id: string | null
          prioridade: number
          tipo: string
          tolerancia_dias: number
          tolerancia_valor: number
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          centro_custo_id?: string | null
          contraparte_id?: string | null
          contraparte_tipo?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          empresa_representada_id: string
          id?: string
          natureza_id?: string | null
          nome: string
          observacoes?: string | null
          padrao?: string | null
          plano_conta_id?: string | null
          prioridade?: number
          tipo: string
          tolerancia_dias?: number
          tolerancia_valor?: number
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          centro_custo_id?: string | null
          contraparte_id?: string | null
          contraparte_tipo?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          empresa_representada_id?: string
          id?: string
          natureza_id?: string | null
          nome?: string
          observacoes?: string | null
          padrao?: string | null
          plano_conta_id?: string | null
          prioridade?: number
          tipo?: string
          tolerancia_dias?: number
          tolerancia_valor?: number
          updated_at?: string
        }
        Relationships: []
      }
      bancos: {
        Row: {
          ativo: boolean | null
          codigo: string | null
          created_at: string
          deleted_at: string | null
          empresa_representada_id: string
          id: string
          ispb: string | null
          logo_url: string | null
          nome: string
          nome_curto: string | null
          pais: string
          sigla: string | null
          site: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          codigo?: string | null
          created_at?: string
          deleted_at?: string | null
          empresa_representada_id: string
          id?: string
          ispb?: string | null
          logo_url?: string | null
          nome: string
          nome_curto?: string | null
          pais?: string
          sigla?: string | null
          site?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          codigo?: string | null
          created_at?: string
          deleted_at?: string | null
          empresa_representada_id?: string
          id?: string
          ispb?: string | null
          logo_url?: string | null
          nome?: string
          nome_curto?: string | null
          pais?: string
          sigla?: string | null
          site?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bancos_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficios_vinculados: {
        Row: {
          ativo: boolean | null
          colaborador_id: string
          created_at: string | null
          desconta_folha: boolean | null
          empresa_paga: boolean | null
          empresa_representada_id: string
          fim_vigencia: string | null
          id: string
          inicio_vigencia: string | null
          nome: string
          observacoes: string | null
          percentual: number | null
          tipo: string | null
          updated_at: string | null
          valor: number | null
        }
        Insert: {
          ativo?: boolean | null
          colaborador_id: string
          created_at?: string | null
          desconta_folha?: boolean | null
          empresa_paga?: boolean | null
          empresa_representada_id: string
          fim_vigencia?: string | null
          id?: string
          inicio_vigencia?: string | null
          nome: string
          observacoes?: string | null
          percentual?: number | null
          tipo?: string | null
          updated_at?: string | null
          valor?: number | null
        }
        Update: {
          ativo?: boolean | null
          colaborador_id?: string
          created_at?: string | null
          desconta_folha?: boolean | null
          empresa_paga?: boolean | null
          empresa_representada_id?: string
          fim_vigencia?: string | null
          id?: string
          inicio_vigencia?: string | null
          nome?: string
          observacoes?: string | null
          percentual?: number | null
          tipo?: string | null
          updated_at?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "beneficios_vinculados_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficios_vinculados_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      cargos: {
        Row: {
          ativo: boolean | null
          cbo: string | null
          created_at: string | null
          departamento_id: string | null
          descricao: string | null
          empresa_representada_id: string
          id: string
          nivel: string | null
          nome: string
          salario_base: number | null
          setor_id: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cbo?: string | null
          created_at?: string | null
          departamento_id?: string | null
          descricao?: string | null
          empresa_representada_id: string
          id?: string
          nivel?: string | null
          nome: string
          salario_base?: number | null
          setor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cbo?: string | null
          created_at?: string | null
          departamento_id?: string | null
          descricao?: string | null
          empresa_representada_id?: string
          id?: string
          nivel?: string | null
          nome?: string
          salario_base?: number | null
          setor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cargos_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargos_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargos_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_produtos: {
        Row: {
          ativo: boolean
          centro_custo_despesa_id: string | null
          centro_custo_id: string | null
          created_at: string
          descricao: string | null
          empresa_representada_id: string
          id: string
          natureza_despesa_id: string | null
          natureza_receita_id: string | null
          nome: string
          plano_conta_despesa_id: string | null
          plano_conta_receita_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          centro_custo_despesa_id?: string | null
          centro_custo_id?: string | null
          created_at?: string
          descricao?: string | null
          empresa_representada_id: string
          id?: string
          natureza_despesa_id?: string | null
          natureza_receita_id?: string | null
          nome: string
          plano_conta_despesa_id?: string | null
          plano_conta_receita_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          centro_custo_despesa_id?: string | null
          centro_custo_id?: string | null
          created_at?: string
          descricao?: string | null
          empresa_representada_id?: string
          id?: string
          natureza_despesa_id?: string | null
          natureza_receita_id?: string | null
          nome?: string
          plano_conta_despesa_id?: string | null
          plano_conta_receita_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_produtos_centro_custo_despesa_id_fkey"
            columns: ["centro_custo_despesa_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorias_produtos_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorias_produtos_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorias_produtos_natureza_despesa_id_fkey"
            columns: ["natureza_despesa_id"]
            isOneToOne: false
            referencedRelation: "naturezas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorias_produtos_natureza_receita_id_fkey"
            columns: ["natureza_receita_id"]
            isOneToOne: false
            referencedRelation: "naturezas_receita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorias_produtos_plano_conta_despesa_id_fkey"
            columns: ["plano_conta_despesa_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorias_produtos_plano_conta_receita_id_fkey"
            columns: ["plano_conta_receita_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      campos_personalizados: {
        Row: {
          ativo: boolean
          chave: string
          created_at: string
          empresa_representada_id: string
          entidade: string
          id: string
          obrigatorio: boolean
          opcoes: Json | null
          ordem: number
          rotulo: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          chave: string
          created_at?: string
          empresa_representada_id: string
          entidade?: string
          id?: string
          obrigatorio?: boolean
          opcoes?: Json | null
          ordem?: number
          rotulo: string
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          chave?: string
          created_at?: string
          empresa_representada_id?: string
          entidade?: string
          id?: string
          obrigatorio?: boolean
          opcoes?: Json | null
          ordem?: number
          rotulo?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campos_personalizados_empresa_representada_id_fkey"
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
      cfop: {
        Row: {
          aplicacao: string | null
          ativo: boolean
          categoria: string | null
          codigo: string
          created_at: string
          descricao: string
          destino: string
          id: string
          tipo: string
        }
        Insert: {
          aplicacao?: string | null
          ativo?: boolean
          categoria?: string | null
          codigo: string
          created_at?: string
          descricao: string
          destino: string
          id?: string
          tipo: string
        }
        Update: {
          aplicacao?: string | null
          ativo?: boolean
          categoria?: string | null
          codigo?: string
          created_at?: string
          descricao?: string
          destino?: string
          id?: string
          tipo?: string
        }
        Relationships: []
      }
      cliente_modalidades_bloqueadas: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          empresa_representada_id: string
          id: string
          modalidade_id: string
          motivo: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          empresa_representada_id: string
          id?: string
          modalidade_id: string
          motivo?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          empresa_representada_id?: string
          id?: string
          modalidade_id?: string
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_modalidades_bloqueadas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_modalidades_bloqueadas_modalidade_id_fkey"
            columns: ["modalidade_id"]
            isOneToOne: false
            referencedRelation: "modalidades_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_politica_pagamento: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          dias_max_atraso: number | null
          empresa_representada_id: string
          id: string
          limite_crediario: number
          limite_utilizado: number
          motivo_bloqueio: string | null
          permite_crediario: boolean
          status: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          dias_max_atraso?: number | null
          empresa_representada_id: string
          id?: string
          limite_crediario?: number
          limite_utilizado?: number
          motivo_bloqueio?: string | null
          permite_crediario?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          dias_max_atraso?: number | null
          empresa_representada_id?: string
          id?: string
          limite_crediario?: number
          limite_utilizado?: number
          motivo_bloqueio?: string | null
          permite_crediario?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_politica_pagamento_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: true
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_fiscais: {
        Row: {
          aliquota_cofins_padrao: number
          aliquota_icms_padrao: number
          aliquota_ipi_padrao: number
          aliquota_iss_padrao: number
          aliquota_pis_padrao: number
          ambiente: string
          ativo: boolean
          certificado_digital: string | null
          created_at: string
          empresa_representada_id: string
          id: string
          numero_ultimo_nfce: number
          numero_ultimo_nfe: number
          regime_tributario: string
          senha_certificado: string | null
          serie_nfce: string
          serie_nfe: string
          updated_at: string
        }
        Insert: {
          aliquota_cofins_padrao?: number
          aliquota_icms_padrao?: number
          aliquota_ipi_padrao?: number
          aliquota_iss_padrao?: number
          aliquota_pis_padrao?: number
          ambiente?: string
          ativo?: boolean
          certificado_digital?: string | null
          created_at?: string
          empresa_representada_id: string
          id?: string
          numero_ultimo_nfce?: number
          numero_ultimo_nfe?: number
          regime_tributario: string
          senha_certificado?: string | null
          serie_nfce?: string
          serie_nfe?: string
          updated_at?: string
        }
        Update: {
          aliquota_cofins_padrao?: number
          aliquota_icms_padrao?: number
          aliquota_ipi_padrao?: number
          aliquota_iss_padrao?: number
          aliquota_pis_padrao?: number
          ambiente?: string
          ativo?: boolean
          certificado_digital?: string | null
          created_at?: string
          empresa_representada_id?: string
          id?: string
          numero_ultimo_nfce?: number
          numero_ultimo_nfe?: number
          regime_tributario?: string
          senha_certificado?: string | null
          serie_nfce?: string
          serie_nfe?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_fiscais_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: true
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_bancarias: {
        Row: {
          agencia_id: string | null
          ativo: boolean | null
          banco_id: string | null
          configuracoes: Json | null
          conta_cofre: boolean
          cor: string | null
          cpf_cnpj_titular: string | null
          created_at: string
          data_abertura: string
          data_encerramento: string | null
          data_saldo_inicial: string | null
          deleted_at: string | null
          descricao: string | null
          digito: string | null
          empresa_representada_id: string
          icone: string | null
          id: string
          limite_cheque_especial: number | null
          limite_credito: number | null
          nome_titular: string | null
          numero_conta: string
          observacoes: string | null
          permite_transferencia: boolean | null
          principal: boolean | null
          saldo_atual: number | null
          saldo_inicial: number | null
          status: string
          tipo_conta: string | null
          updated_at: string
        }
        Insert: {
          agencia_id?: string | null
          ativo?: boolean | null
          banco_id?: string | null
          configuracoes?: Json | null
          conta_cofre?: boolean
          cor?: string | null
          cpf_cnpj_titular?: string | null
          created_at?: string
          data_abertura?: string
          data_encerramento?: string | null
          data_saldo_inicial?: string | null
          deleted_at?: string | null
          descricao?: string | null
          digito?: string | null
          empresa_representada_id: string
          icone?: string | null
          id?: string
          limite_cheque_especial?: number | null
          limite_credito?: number | null
          nome_titular?: string | null
          numero_conta: string
          observacoes?: string | null
          permite_transferencia?: boolean | null
          principal?: boolean | null
          saldo_atual?: number | null
          saldo_inicial?: number | null
          status?: string
          tipo_conta?: string | null
          updated_at?: string
        }
        Update: {
          agencia_id?: string | null
          ativo?: boolean | null
          banco_id?: string | null
          configuracoes?: Json | null
          conta_cofre?: boolean
          cor?: string | null
          cpf_cnpj_titular?: string | null
          created_at?: string
          data_abertura?: string
          data_encerramento?: string | null
          data_saldo_inicial?: string | null
          deleted_at?: string | null
          descricao?: string | null
          digito?: string | null
          empresa_representada_id?: string
          icone?: string | null
          id?: string
          limite_cheque_especial?: number | null
          limite_credito?: number | null
          nome_titular?: string | null
          numero_conta?: string
          observacoes?: string | null
          permite_transferencia?: boolean | null
          principal?: boolean | null
          saldo_atual?: number | null
          saldo_inicial?: number | null
          status?: string
          tipo_conta?: string | null
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
          {
            foreignKeyName: "contas_bancarias_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_bancarias_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_pagar: {
        Row: {
          cancelamento_idempotency_key: string | null
          centro_custo_id: string | null
          created_at: string
          data_cancelamento: string | null
          data_competencia: string | null
          data_emissao: string | null
          data_pagamento: string | null
          data_vencimento: string
          deleted_at: string | null
          descricao: string
          empresa_representada_id: string
          fornecedor_id: string | null
          id: string
          motivo_cancelamento: string | null
          natureza_id: string | null
          numero_documento: string | null
          numero_parcela: number | null
          observacoes: string | null
          origem_recorrencia_id: string | null
          periodicidade: string | null
          plano_conta_id: string | null
          plano_pagamento_id: string | null
          recorrente: boolean
          status: string | null
          total_parcelas: number | null
          updated_at: string
          usuario_cancelamento_id: string | null
          valor_desconto: number | null
          valor_juros: number | null
          valor_multa: number | null
          valor_original: number
          valor_pago: number | null
        }
        Insert: {
          cancelamento_idempotency_key?: string | null
          centro_custo_id?: string | null
          created_at?: string
          data_cancelamento?: string | null
          data_competencia?: string | null
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          deleted_at?: string | null
          descricao: string
          empresa_representada_id: string
          fornecedor_id?: string | null
          id?: string
          motivo_cancelamento?: string | null
          natureza_id?: string | null
          numero_documento?: string | null
          numero_parcela?: number | null
          observacoes?: string | null
          origem_recorrencia_id?: string | null
          periodicidade?: string | null
          plano_conta_id?: string | null
          plano_pagamento_id?: string | null
          recorrente?: boolean
          status?: string | null
          total_parcelas?: number | null
          updated_at?: string
          usuario_cancelamento_id?: string | null
          valor_desconto?: number | null
          valor_juros?: number | null
          valor_multa?: number | null
          valor_original: number
          valor_pago?: number | null
        }
        Update: {
          cancelamento_idempotency_key?: string | null
          centro_custo_id?: string | null
          created_at?: string
          data_cancelamento?: string | null
          data_competencia?: string | null
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          deleted_at?: string | null
          descricao?: string
          empresa_representada_id?: string
          fornecedor_id?: string | null
          id?: string
          motivo_cancelamento?: string | null
          natureza_id?: string | null
          numero_documento?: string | null
          numero_parcela?: number | null
          observacoes?: string | null
          origem_recorrencia_id?: string | null
          periodicidade?: string | null
          plano_conta_id?: string | null
          plano_pagamento_id?: string | null
          recorrente?: boolean
          status?: string | null
          total_parcelas?: number | null
          updated_at?: string
          usuario_cancelamento_id?: string | null
          valor_desconto?: number | null
          valor_juros?: number | null
          valor_multa?: number | null
          valor_original?: number
          valor_pago?: number | null
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
            foreignKeyName: "contas_pagar_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_natureza_id_fkey"
            columns: ["natureza_id"]
            isOneToOne: false
            referencedRelation: "natureza_caixas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_origem_recorrencia_id_fkey"
            columns: ["origem_recorrencia_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_plano_conta_id_fkey"
            columns: ["plano_conta_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_plano_pagamento_id_fkey"
            columns: ["plano_pagamento_id"]
            isOneToOne: false
            referencedRelation: "planos_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          cancelamento_idempotency_key: string | null
          centro_custo_id: string | null
          cliente_id: string | null
          created_at: string
          created_by: string | null
          data_cancelamento: string | null
          data_competencia: string | null
          data_emissao: string | null
          data_recebimento: string | null
          data_vencimento: string
          deleted_at: string | null
          descricao: string
          empresa_representada_id: string
          externo_id: string | null
          hash_classificacao: string | null
          hash_payload: string | null
          id: string
          idempotency_key: string | null
          motivo_cancelamento: string | null
          natureza_id: string | null
          numero_documento: string | null
          numero_parcela: number | null
          observacoes: string | null
          origem_canal: string | null
          origem_recorrencia_id: string | null
          origem_sistema: string | null
          periodicidade: string | null
          plano_conta_id: string | null
          plano_pagamento_id: string | null
          recorrente: boolean
          status: string | null
          total_parcelas: number | null
          updated_at: string
          usuario_cancelamento_id: string | null
          valor_desconto: number | null
          valor_juros: number | null
          valor_multa: number | null
          valor_original: number
          valor_recebido: number | null
          venda_id: string | null
          venda_pagamento_id: string | null
          venda_pagamento_parcela_id: string | null
        }
        Insert: {
          cancelamento_idempotency_key?: string | null
          centro_custo_id?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_cancelamento?: string | null
          data_competencia?: string | null
          data_emissao?: string | null
          data_recebimento?: string | null
          data_vencimento: string
          deleted_at?: string | null
          descricao: string
          empresa_representada_id: string
          externo_id?: string | null
          hash_classificacao?: string | null
          hash_payload?: string | null
          id?: string
          idempotency_key?: string | null
          motivo_cancelamento?: string | null
          natureza_id?: string | null
          numero_documento?: string | null
          numero_parcela?: number | null
          observacoes?: string | null
          origem_canal?: string | null
          origem_recorrencia_id?: string | null
          origem_sistema?: string | null
          periodicidade?: string | null
          plano_conta_id?: string | null
          plano_pagamento_id?: string | null
          recorrente?: boolean
          status?: string | null
          total_parcelas?: number | null
          updated_at?: string
          usuario_cancelamento_id?: string | null
          valor_desconto?: number | null
          valor_juros?: number | null
          valor_multa?: number | null
          valor_original: number
          valor_recebido?: number | null
          venda_id?: string | null
          venda_pagamento_id?: string | null
          venda_pagamento_parcela_id?: string | null
        }
        Update: {
          cancelamento_idempotency_key?: string | null
          centro_custo_id?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_cancelamento?: string | null
          data_competencia?: string | null
          data_emissao?: string | null
          data_recebimento?: string | null
          data_vencimento?: string
          deleted_at?: string | null
          descricao?: string
          empresa_representada_id?: string
          externo_id?: string | null
          hash_classificacao?: string | null
          hash_payload?: string | null
          id?: string
          idempotency_key?: string | null
          motivo_cancelamento?: string | null
          natureza_id?: string | null
          numero_documento?: string | null
          numero_parcela?: number | null
          observacoes?: string | null
          origem_canal?: string | null
          origem_recorrencia_id?: string | null
          origem_sistema?: string | null
          periodicidade?: string | null
          plano_conta_id?: string | null
          plano_pagamento_id?: string | null
          recorrente?: boolean
          status?: string | null
          total_parcelas?: number | null
          updated_at?: string
          usuario_cancelamento_id?: string | null
          valor_desconto?: number | null
          valor_juros?: number | null
          valor_multa?: number | null
          valor_original?: number
          valor_recebido?: number | null
          venda_id?: string | null
          venda_pagamento_id?: string | null
          venda_pagamento_parcela_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_natureza_id_fkey"
            columns: ["natureza_id"]
            isOneToOne: false
            referencedRelation: "natureza_caixas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_origem_recorrencia_id_fkey"
            columns: ["origem_recorrencia_id"]
            isOneToOne: false
            referencedRelation: "contas_receber"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_plano_conta_id_fkey"
            columns: ["plano_conta_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_plano_pagamento_id_fkey"
            columns: ["plano_pagamento_id"]
            isOneToOne: false
            referencedRelation: "planos_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_venda_pagamento_id_fkey"
            columns: ["venda_pagamento_id"]
            isOneToOne: false
            referencedRelation: "venda_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_venda_pagamento_parcela_id_fkey"
            columns: ["venda_pagamento_parcela_id"]
            isOneToOne: false
            referencedRelation: "venda_pagamento_parcelas"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          arquivo_url: string | null
          centro_custo_id: string | null
          cliente_id: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          deleted_at: string | null
          descricao: string | null
          dia_vencimento: number | null
          empresa_representada_id: string
          externo_id: string | null
          gera_financeiro: boolean | null
          hash_payload: string | null
          id: string
          idempotency_key: string | null
          natureza_receita_id: string | null
          numero_contrato: string | null
          observacoes: string | null
          origem_canal: string | null
          origem_sistema: string | null
          plano_conta_receita_id: string | null
          plano_pagamento_id: string | null
          renovacao_automatica: boolean | null
          status: string | null
          tipo: string | null
          titulo: string
          updated_at: string
          valor_mensal: number | null
          valor_total: number | null
        }
        Insert: {
          arquivo_url?: string | null
          centro_custo_id?: string | null
          cliente_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          deleted_at?: string | null
          descricao?: string | null
          dia_vencimento?: number | null
          empresa_representada_id: string
          externo_id?: string | null
          gera_financeiro?: boolean | null
          hash_payload?: string | null
          id?: string
          idempotency_key?: string | null
          natureza_receita_id?: string | null
          numero_contrato?: string | null
          observacoes?: string | null
          origem_canal?: string | null
          origem_sistema?: string | null
          plano_conta_receita_id?: string | null
          plano_pagamento_id?: string | null
          renovacao_automatica?: boolean | null
          status?: string | null
          tipo?: string | null
          titulo: string
          updated_at?: string
          valor_mensal?: number | null
          valor_total?: number | null
        }
        Update: {
          arquivo_url?: string | null
          centro_custo_id?: string | null
          cliente_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          deleted_at?: string | null
          descricao?: string | null
          dia_vencimento?: number | null
          empresa_representada_id?: string
          externo_id?: string | null
          gera_financeiro?: boolean | null
          hash_payload?: string | null
          id?: string
          idempotency_key?: string | null
          natureza_receita_id?: string | null
          numero_contrato?: string | null
          observacoes?: string | null
          origem_canal?: string | null
          origem_sistema?: string | null
          plano_conta_receita_id?: string | null
          plano_pagamento_id?: string | null
          renovacao_automatica?: boolean | null
          status?: string | null
          tipo?: string | null
          titulo?: string
          updated_at?: string
          valor_mensal?: number | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_natureza_receita_id_fkey"
            columns: ["natureza_receita_id"]
            isOneToOne: false
            referencedRelation: "naturezas_receita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_plano_conta_receita_id_fkey"
            columns: ["plano_conta_receita_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_plano_pagamento_id_fkey"
            columns: ["plano_pagamento_id"]
            isOneToOne: false
            referencedRelation: "planos_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      departamentos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          empresa_representada_id: string
          id: string
          nome: string
          responsavel_id: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          empresa_representada_id: string
          id?: string
          nome: string
          responsavel_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          empresa_representada_id?: string
          id?: string
          nome?: string
          responsavel_id?: string | null
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
          {
            foreignKeyName: "fk_departamentos_responsavel"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
        ]
      }
      descontos_padrao: {
        Row: {
          ativo: boolean
          codigo: string | null
          created_at: string
          descricao: string | null
          empresa_representada_id: string
          id: string
          nome: string
          obrigatorio: boolean
          ordem: number
          percentual: number | null
          referencia: string | null
          tabela_progressiva: Json | null
          tipo: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          ativo?: boolean
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          empresa_representada_id: string
          id?: string
          nome: string
          obrigatorio?: boolean
          ordem?: number
          percentual?: number | null
          referencia?: string | null
          tabela_progressiva?: Json | null
          tipo?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          ativo?: boolean
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          empresa_representada_id?: string
          id?: string
          nome?: string
          obrigatorio?: boolean
          ordem?: number
          percentual?: number | null
          referencia?: string | null
          tabela_progressiva?: Json | null
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
      documentos_movimentacoes_bancarias: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          descricao: string | null
          empresa_representada_id: string
          id: string
          movimentacao_id: string
          nome_arquivo: string
          nome_original: string | null
          tamanho_bytes: number | null
          tipo_arquivo: string | null
          updated_at: string
          url_arquivo: string
          usuario_upload_id: string | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          empresa_representada_id: string
          id?: string
          movimentacao_id: string
          nome_arquivo: string
          nome_original?: string | null
          tamanho_bytes?: number | null
          tipo_arquivo?: string | null
          updated_at?: string
          url_arquivo: string
          usuario_upload_id?: string | null
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          empresa_representada_id?: string
          id?: string
          movimentacao_id?: string
          nome_arquivo?: string
          nome_original?: string | null
          tamanho_bytes?: number | null
          tipo_arquivo?: string | null
          updated_at?: string
          url_arquivo?: string
          usuario_upload_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_movimentacoes_bancarias_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_movimentacoes_bancarias_movimentacao_id_fkey"
            columns: ["movimentacao_id"]
            isOneToOne: false
            referencedRelation: "movimentacoes_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_titulos_financeiros: {
        Row: {
          ativo: boolean
          categoria: string | null
          conta_pagar_id: string | null
          conta_receber_id: string | null
          created_at: string
          descricao: string | null
          empresa_representada_id: string
          id: string
          nome_arquivo: string
          nome_original: string | null
          tamanho_bytes: number | null
          tipo_arquivo: string | null
          tipo_titulo: string | null
          titulo_id: string | null
          upload_usuario_id: string | null
          url_arquivo: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          conta_pagar_id?: string | null
          conta_receber_id?: string | null
          created_at?: string
          descricao?: string | null
          empresa_representada_id: string
          id?: string
          nome_arquivo: string
          nome_original?: string | null
          tamanho_bytes?: number | null
          tipo_arquivo?: string | null
          tipo_titulo?: string | null
          titulo_id?: string | null
          upload_usuario_id?: string | null
          url_arquivo: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          conta_pagar_id?: string | null
          conta_receber_id?: string | null
          created_at?: string
          descricao?: string | null
          empresa_representada_id?: string
          id?: string
          nome_arquivo?: string
          nome_original?: string | null
          tamanho_bytes?: number | null
          tipo_arquivo?: string | null
          tipo_titulo?: string | null
          titulo_id?: string | null
          upload_usuario_id?: string | null
          url_arquivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_titulos_financeiros_conta_pagar_id_fkey"
            columns: ["conta_pagar_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_titulos_financeiros_conta_receber_id_fkey"
            columns: ["conta_receber_id"]
            isOneToOne: false
            referencedRelation: "contas_receber"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_titulos_financeiros_empresa_representada_id_fkey"
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
          centro_custo_default_id: string | null
          centro_custo_despesa_default_id: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          configuracoes: Json
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          natureza_despesa_default_id: string | null
          natureza_receita_default_id: string | null
          nome: string
          plano_conta_despesa_default_id: string | null
          plano_conta_receita_default_id: string | null
          responsavel_id: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          centro_custo_default_id?: string | null
          centro_custo_despesa_default_id?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          configuracoes?: Json
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          natureza_despesa_default_id?: string | null
          natureza_receita_default_id?: string | null
          nome: string
          plano_conta_despesa_default_id?: string | null
          plano_conta_receita_default_id?: string | null
          responsavel_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          centro_custo_default_id?: string | null
          centro_custo_despesa_default_id?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          configuracoes?: Json
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          natureza_despesa_default_id?: string | null
          natureza_receita_default_id?: string | null
          nome?: string
          plano_conta_despesa_default_id?: string | null
          plano_conta_receita_default_id?: string | null
          responsavel_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_representadas_centro_custo_default_id_fkey"
            columns: ["centro_custo_default_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_representadas_centro_custo_despesa_default_id_fkey"
            columns: ["centro_custo_despesa_default_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_representadas_natureza_despesa_default_id_fkey"
            columns: ["natureza_despesa_default_id"]
            isOneToOne: false
            referencedRelation: "naturezas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_representadas_natureza_receita_default_id_fkey"
            columns: ["natureza_receita_default_id"]
            isOneToOne: false
            referencedRelation: "naturezas_receita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_representadas_plano_conta_despesa_default_id_fkey"
            columns: ["plano_conta_despesa_default_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_representadas_plano_conta_receita_default_id_fkey"
            columns: ["plano_conta_receita_default_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      entidade_dados_colaborador: {
        Row: {
          carga_horaria: number | null
          cargo_id: string | null
          ctps: string | null
          data_admissao: string | null
          data_demissao: string | null
          departamento_id: string | null
          entidade_id: string
          escolaridade: string | null
          estado_civil: string | null
          foto_url: string | null
          pis: string | null
          regime_trabalho: string | null
          salario: number | null
          serie_ctps: string | null
          setor_id: string | null
          sexo: string | null
          tipo_contrato: string | null
        }
        Insert: {
          carga_horaria?: number | null
          cargo_id?: string | null
          ctps?: string | null
          data_admissao?: string | null
          data_demissao?: string | null
          departamento_id?: string | null
          entidade_id: string
          escolaridade?: string | null
          estado_civil?: string | null
          foto_url?: string | null
          pis?: string | null
          regime_trabalho?: string | null
          salario?: number | null
          serie_ctps?: string | null
          setor_id?: string | null
          sexo?: string | null
          tipo_contrato?: string | null
        }
        Update: {
          carga_horaria?: number | null
          cargo_id?: string | null
          ctps?: string | null
          data_admissao?: string | null
          data_demissao?: string | null
          departamento_id?: string | null
          entidade_id?: string
          escolaridade?: string | null
          estado_civil?: string | null
          foto_url?: string | null
          pis?: string | null
          regime_trabalho?: string | null
          salario?: number | null
          serie_ctps?: string | null
          setor_id?: string | null
          sexo?: string | null
          tipo_contrato?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entidade_dados_colaborador_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entidade_dados_colaborador_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entidade_dados_colaborador_entidade_id_fkey"
            columns: ["entidade_id"]
            isOneToOne: true
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entidade_dados_colaborador_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      entidade_dependencias: {
        Row: {
          ativo: boolean
          bloqueia_exclusao: boolean
          coluna_fk: string
          created_at: string
          entidade_pai: string
          label: string
          on_delete: string
          soft_delete_col: string | null
          tabela_filha: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bloqueia_exclusao?: boolean
          coluna_fk: string
          created_at?: string
          entidade_pai: string
          label: string
          on_delete?: string
          soft_delete_col?: string | null
          tabela_filha: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bloqueia_exclusao?: boolean
          coluna_fk?: string
          created_at?: string
          entidade_pai?: string
          label?: string
          on_delete?: string
          soft_delete_col?: string | null
          tabela_filha?: string
          updated_at?: string
        }
        Relationships: []
      }
      entidade_id_map: {
        Row: {
          entidade_id: string
          id_origem: string
          tabela_origem: string
        }
        Insert: {
          entidade_id: string
          id_origem: string
          tabela_origem: string
        }
        Update: {
          entidade_id?: string
          id_origem?: string
          tabela_origem?: string
        }
        Relationships: [
          {
            foreignKeyName: "entidade_id_map_entidade_id_fkey"
            columns: ["entidade_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
        ]
      }
      entidade_papeis: {
        Row: {
          ativado_em: string
          ativo: boolean
          cargo_societario: string | null
          desativado_em: string | null
          empresa_representada_id: string
          entidade_id: string
          id: string
          papel: string
          participacao_percentual: number | null
        }
        Insert: {
          ativado_em?: string
          ativo?: boolean
          cargo_societario?: string | null
          desativado_em?: string | null
          empresa_representada_id: string
          entidade_id: string
          id?: string
          papel: string
          participacao_percentual?: number | null
        }
        Update: {
          ativado_em?: string
          ativo?: boolean
          cargo_societario?: string | null
          desativado_em?: string | null
          empresa_representada_id?: string
          entidade_id?: string
          id?: string
          papel?: string
          participacao_percentual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "entidade_papeis_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entidade_papeis_entidade_id_fkey"
            columns: ["entidade_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entidade_papeis_papel_fkey"
            columns: ["papel"]
            isOneToOne: false
            referencedRelation: "papeis_catalogo"
            referencedColumns: ["codigo"]
          },
        ]
      }
      entidades: {
        Row: {
          agencia: string | null
          apelido: string | null
          atividade_principal: string | null
          ativo: boolean
          bairro: string | null
          banco: string | null
          celular: string | null
          campos_extras: Json
          cep: string | null
          cidade: string | null
          cnae: string | null
          cnpj: string | null
          complemento: string | null
          conta: string | null
          contato_empresa: Json | null
          contatos: Json | null
          cpf: string | null
          created_at: string
          dados_pessoais: Json | null
          data_fundacao: string | null
          data_nascimento: string | null
          deleted_at: string | null
          documentos: Json | null
          email: string | null
          email_secundario: string | null
          empresa_representada_id: string
          estado: string | null
          externo_id: string | null
          forma_atuacao: string | null
          hash_payload: string | null
          id: string
          idempotency_key: string | null
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          limite_credito: number | null
          logradouro: string | null
          nome: string
          nome_fantasia: string | null
          numero: string | null
          observacoes: string | null
          origem_canal: string | null
          origem_sistema: string | null
          pix: string | null
          prazo_entrega: number | null
          qualificacao_fiscal: Json | null
          razao_social: string | null
          rg: string | null
          setor_id: string | null
          site: string | null
          telefone: string | null
          telefone_secundario: string | null
          tipo_conta: string | null
          tipo_pessoa: string
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          agencia?: string | null
          apelido?: string | null
          atividade_principal?: string | null
          ativo?: boolean
          bairro?: string | null
          banco?: string | null
          celular?: string | null
          campos_extras?: Json
          cep?: string | null
          cidade?: string | null
          cnae?: string | null
          cnpj?: string | null
          complemento?: string | null
          conta?: string | null
          contato_empresa?: Json | null
          contatos?: Json | null
          cpf?: string | null
          created_at?: string
          dados_pessoais?: Json | null
          data_fundacao?: string | null
          data_nascimento?: string | null
          deleted_at?: string | null
          documentos?: Json | null
          email?: string | null
          email_secundario?: string | null
          empresa_representada_id: string
          estado?: string | null
          externo_id?: string | null
          forma_atuacao?: string | null
          hash_payload?: string | null
          id?: string
          idempotency_key?: string | null
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          limite_credito?: number | null
          logradouro?: string | null
          nome: string
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          origem_canal?: string | null
          origem_sistema?: string | null
          pix?: string | null
          prazo_entrega?: number | null
          qualificacao_fiscal?: Json | null
          razao_social?: string | null
          rg?: string | null
          setor_id?: string | null
          site?: string | null
          telefone?: string | null
          telefone_secundario?: string | null
          tipo_conta?: string | null
          tipo_pessoa: string
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          agencia?: string | null
          apelido?: string | null
          atividade_principal?: string | null
          ativo?: boolean
          bairro?: string | null
          banco?: string | null
          celular?: string | null
          campos_extras?: Json
          cep?: string | null
          cidade?: string | null
          cnae?: string | null
          cnpj?: string | null
          complemento?: string | null
          conta?: string | null
          contato_empresa?: Json | null
          contatos?: Json | null
          cpf?: string | null
          created_at?: string
          dados_pessoais?: Json | null
          data_fundacao?: string | null
          data_nascimento?: string | null
          deleted_at?: string | null
          documentos?: Json | null
          email?: string | null
          email_secundario?: string | null
          empresa_representada_id?: string
          estado?: string | null
          externo_id?: string | null
          forma_atuacao?: string | null
          hash_payload?: string | null
          id?: string
          idempotency_key?: string | null
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          limite_credito?: number | null
          logradouro?: string | null
          nome?: string
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          origem_canal?: string | null
          origem_sistema?: string | null
          pix?: string | null
          prazo_entrega?: number | null
          qualificacao_fiscal?: Json | null
          razao_social?: string | null
          rg?: string | null
          setor_id?: string | null
          site?: string | null
          telefone?: string | null
          telefone_secundario?: string | null
          tipo_conta?: string | null
          tipo_pessoa?: string
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entidades_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entidades_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_inventario_itens: {
        Row: {
          created_at: string
          custo_unitario: number
          diferenca: number | null
          empresa_representada_id: string
          id: string
          inventario_id: string
          observacoes: string | null
          produto_id: string
          saldo_contado: number
          saldo_sistema: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          custo_unitario?: number
          diferenca?: number | null
          empresa_representada_id: string
          id?: string
          inventario_id: string
          observacoes?: string | null
          produto_id: string
          saldo_contado?: number
          saldo_sistema?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          custo_unitario?: number
          diferenca?: number | null
          empresa_representada_id?: string
          id?: string
          inventario_id?: string
          observacoes?: string | null
          produto_id?: string
          saldo_contado?: number
          saldo_sistema?: number
          updated_at?: string
        }
        Relationships: []
      }
      estoque_inventarios: {
        Row: {
          codigo: string
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string
          deleted_at: string | null
          empresa_representada_id: string
          id: string
          localizacao_id: string | null
          observacoes: string | null
          responsavel_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          deleted_at?: string | null
          empresa_representada_id: string
          id?: string
          localizacao_id?: string | null
          observacoes?: string | null
          responsavel_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          deleted_at?: string | null
          empresa_representada_id?: string
          id?: string
          localizacao_id?: string | null
          observacoes?: string | null
          responsavel_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      estoque_movimentacoes: {
        Row: {
          created_at: string
          created_by: string | null
          custo_unitario: number
          data_movimento: string
          deleted_at: string | null
          documento_ref: string | null
          empresa_representada_id: string
          id: string
          inventario_id: string | null
          localizacao_destino_id: string | null
          localizacao_origem_id: string | null
          observacoes: string | null
          produto_id: string
          quantidade: number
          tipo: string
          updated_at: string
          venda_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custo_unitario?: number
          data_movimento?: string
          deleted_at?: string | null
          documento_ref?: string | null
          empresa_representada_id: string
          id?: string
          inventario_id?: string | null
          localizacao_destino_id?: string | null
          localizacao_origem_id?: string | null
          observacoes?: string | null
          produto_id: string
          quantidade: number
          tipo: string
          updated_at?: string
          venda_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custo_unitario?: number
          data_movimento?: string
          deleted_at?: string | null
          documento_ref?: string | null
          empresa_representada_id?: string
          id?: string
          inventario_id?: string | null
          localizacao_destino_id?: string | null
          localizacao_origem_id?: string | null
          observacoes?: string | null
          produto_id?: string
          quantidade?: number
          tipo?: string
          updated_at?: string
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_estoque_mov_inventario"
            columns: ["inventario_id"]
            isOneToOne: false
            referencedRelation: "estoque_inventarios"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_saldos: {
        Row: {
          custo_medio: number
          empresa_representada_id: string
          id: string
          localizacao_id: string
          produto_id: string
          quantidade: number
          updated_at: string
        }
        Insert: {
          custo_medio?: number
          empresa_representada_id: string
          id?: string
          localizacao_id: string
          produto_id: string
          quantidade?: number
          updated_at?: string
        }
        Update: {
          custo_medio?: number
          empresa_representada_id?: string
          id?: string
          localizacao_id?: string
          produto_id?: string
          quantidade?: number
          updated_at?: string
        }
        Relationships: []
      }
      fiscal_certificados: {
        Row: {
          ativo: boolean
          cn_subject: string | null
          created_at: string
          deleted_at: string | null
          empresa_representada_id: string
          id: string
          senha_secret_ref: string
          storage_path: string
          thumbprint: string | null
          updated_at: string
          uploaded_by: string | null
          valido_ate: string | null
          valido_de: string | null
        }
        Insert: {
          ativo?: boolean
          cn_subject?: string | null
          created_at?: string
          deleted_at?: string | null
          empresa_representada_id: string
          id?: string
          senha_secret_ref: string
          storage_path: string
          thumbprint?: string | null
          updated_at?: string
          uploaded_by?: string | null
          valido_ate?: string | null
          valido_de?: string | null
        }
        Update: {
          ativo?: boolean
          cn_subject?: string | null
          created_at?: string
          deleted_at?: string | null
          empresa_representada_id?: string
          id?: string
          senha_secret_ref?: string
          storage_path?: string
          thumbprint?: string | null
          updated_at?: string
          uploaded_by?: string | null
          valido_ate?: string | null
          valido_de?: string | null
        }
        Relationships: []
      }
      fiscal_configuracoes: {
        Row: {
          ambiente: string
          ativo: boolean
          certificado_cnpj: string | null
          certificado_secret_ref: string | null
          certificado_validade: string | null
          cnpj_emitente: string | null
          created_at: string
          created_by: string | null
          csc_id: string | null
          csc_token_secret_ref: string | null
          deleted_at: string | null
          emissoes_mes: number
          empresa_representada_id: string
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          observacoes: string | null
          provedor: string
          proximo_numero_nfce: number | null
          proximo_numero_nfe: number | null
          regime_tributario: string
          serie_nfce: number | null
          serie_nfe: number | null
          updated_at: string
        }
        Insert: {
          ambiente?: string
          ativo?: boolean
          certificado_cnpj?: string | null
          certificado_secret_ref?: string | null
          certificado_validade?: string | null
          cnpj_emitente?: string | null
          created_at?: string
          created_by?: string | null
          csc_id?: string | null
          csc_token_secret_ref?: string | null
          deleted_at?: string | null
          emissoes_mes?: number
          empresa_representada_id: string
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          observacoes?: string | null
          provedor?: string
          proximo_numero_nfce?: number | null
          proximo_numero_nfe?: number | null
          regime_tributario?: string
          serie_nfce?: number | null
          serie_nfe?: number | null
          updated_at?: string
        }
        Update: {
          ambiente?: string
          ativo?: boolean
          certificado_cnpj?: string | null
          certificado_secret_ref?: string | null
          certificado_validade?: string | null
          cnpj_emitente?: string | null
          created_at?: string
          created_by?: string | null
          csc_id?: string | null
          csc_token_secret_ref?: string | null
          deleted_at?: string | null
          emissoes_mes?: number
          empresa_representada_id?: string
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          observacoes?: string | null
          provedor?: string
          proximo_numero_nfce?: number | null
          proximo_numero_nfe?: number | null
          regime_tributario?: string
          serie_nfce?: number | null
          serie_nfe?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_configuracoes_empresa_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: true
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_documentos_eletronicos: {
        Row: {
          ambiente: string
          chave_acesso: string | null
          cliente_id: string | null
          codigo_status_sefaz: string | null
          created_at: string
          created_by: string | null
          danfe_url: string | null
          data_autorizacao: string | null
          data_emissao: string
          deleted_at: string | null
          empresa_representada_id: string
          fornecedor_id: string | null
          id: string
          idempotency_key: string | null
          modelo: number | null
          motivo_rejeicao: string | null
          natureza_operacao_id: string | null
          numero: number | null
          observacoes: string | null
          payload_provedor: Json | null
          pdf_danfe_url: string | null
          protocolo_autorizacao: string | null
          provedor_id_externo: string | null
          provider: string | null
          provider_ref: string | null
          serie: number
          status: string
          tentativas: number
          tipo: string
          ultima_tentativa_at: string | null
          updated_at: string
          valor_cofins: number
          valor_desconto: number
          valor_frete: number
          valor_icms: number
          valor_icms_st: number
          valor_ipi: number
          valor_outras_despesas: number
          valor_pis: number
          valor_produtos: number
          valor_total: number
          venda_id: string | null
          xml_url: string | null
        }
        Insert: {
          ambiente?: string
          chave_acesso?: string | null
          cliente_id?: string | null
          codigo_status_sefaz?: string | null
          created_at?: string
          created_by?: string | null
          danfe_url?: string | null
          data_autorizacao?: string | null
          data_emissao?: string
          deleted_at?: string | null
          empresa_representada_id: string
          fornecedor_id?: string | null
          id?: string
          idempotency_key?: string | null
          modelo?: number | null
          motivo_rejeicao?: string | null
          natureza_operacao_id?: string | null
          numero?: number | null
          observacoes?: string | null
          payload_provedor?: Json | null
          pdf_danfe_url?: string | null
          protocolo_autorizacao?: string | null
          provedor_id_externo?: string | null
          provider?: string | null
          provider_ref?: string | null
          serie?: number
          status?: string
          tentativas?: number
          tipo: string
          ultima_tentativa_at?: string | null
          updated_at?: string
          valor_cofins?: number
          valor_desconto?: number
          valor_frete?: number
          valor_icms?: number
          valor_icms_st?: number
          valor_ipi?: number
          valor_outras_despesas?: number
          valor_pis?: number
          valor_produtos?: number
          valor_total?: number
          venda_id?: string | null
          xml_url?: string | null
        }
        Update: {
          ambiente?: string
          chave_acesso?: string | null
          cliente_id?: string | null
          codigo_status_sefaz?: string | null
          created_at?: string
          created_by?: string | null
          danfe_url?: string | null
          data_autorizacao?: string | null
          data_emissao?: string
          deleted_at?: string | null
          empresa_representada_id?: string
          fornecedor_id?: string | null
          id?: string
          idempotency_key?: string | null
          modelo?: number | null
          motivo_rejeicao?: string | null
          natureza_operacao_id?: string | null
          numero?: number | null
          observacoes?: string | null
          payload_provedor?: Json | null
          pdf_danfe_url?: string | null
          protocolo_autorizacao?: string | null
          provedor_id_externo?: string | null
          provider?: string | null
          provider_ref?: string | null
          serie?: number
          status?: string
          tentativas?: number
          tipo?: string
          ultima_tentativa_at?: string | null
          updated_at?: string
          valor_cofins?: number
          valor_desconto?: number
          valor_frete?: number
          valor_icms?: number
          valor_icms_st?: number
          valor_ipi?: number
          valor_outras_despesas?: number
          valor_pis?: number
          valor_produtos?: number
          valor_total?: number
          venda_id?: string | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_documentos_cliente_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_documentos_empresa_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_documentos_venda_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_documentos_eletronicos_itens: {
        Row: {
          cest: string | null
          cfop: string | null
          cofins_aliquota: number | null
          cofins_cst: string | null
          cofins_valor: number | null
          created_at: string
          descricao: string
          documento_id: string
          empresa_representada_id: string
          icms_aliquota: number | null
          icms_base: number | null
          icms_cst: string | null
          icms_st_aliquota: number | null
          icms_st_base: number | null
          icms_st_valor: number | null
          icms_valor: number | null
          id: string
          informacoes_adicionais: string | null
          ipi_aliquota: number | null
          ipi_cst: string | null
          ipi_valor: number | null
          ncm: string | null
          ordem: number
          origem_mercadoria: string | null
          pis_aliquota: number | null
          pis_cst: string | null
          pis_valor: number | null
          produto_id: string | null
          quantidade: number
          servico_id: string | null
          unidade: string | null
          updated_at: string
          valor_desconto: number
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          cest?: string | null
          cfop?: string | null
          cofins_aliquota?: number | null
          cofins_cst?: string | null
          cofins_valor?: number | null
          created_at?: string
          descricao: string
          documento_id: string
          empresa_representada_id: string
          icms_aliquota?: number | null
          icms_base?: number | null
          icms_cst?: string | null
          icms_st_aliquota?: number | null
          icms_st_base?: number | null
          icms_st_valor?: number | null
          icms_valor?: number | null
          id?: string
          informacoes_adicionais?: string | null
          ipi_aliquota?: number | null
          ipi_cst?: string | null
          ipi_valor?: number | null
          ncm?: string | null
          ordem?: number
          origem_mercadoria?: string | null
          pis_aliquota?: number | null
          pis_cst?: string | null
          pis_valor?: number | null
          produto_id?: string | null
          quantidade: number
          servico_id?: string | null
          unidade?: string | null
          updated_at?: string
          valor_desconto?: number
          valor_total: number
          valor_unitario: number
        }
        Update: {
          cest?: string | null
          cfop?: string | null
          cofins_aliquota?: number | null
          cofins_cst?: string | null
          cofins_valor?: number | null
          created_at?: string
          descricao?: string
          documento_id?: string
          empresa_representada_id?: string
          icms_aliquota?: number | null
          icms_base?: number | null
          icms_cst?: string | null
          icms_st_aliquota?: number | null
          icms_st_base?: number | null
          icms_st_valor?: number | null
          icms_valor?: number | null
          id?: string
          informacoes_adicionais?: string | null
          ipi_aliquota?: number | null
          ipi_cst?: string | null
          ipi_valor?: number | null
          ncm?: string | null
          ordem?: number
          origem_mercadoria?: string | null
          pis_aliquota?: number | null
          pis_cst?: string | null
          pis_valor?: number | null
          produto_id?: string | null
          quantidade?: number
          servico_id?: string | null
          unidade?: string | null
          updated_at?: string
          valor_desconto?: number
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_documentos_itens_documento_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "fiscal_documentos_eletronicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_documentos_itens_empresa_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_documentos_itens_produto_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_documentos_itens_produto_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_estoque_ruptura"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "fiscal_documentos_itens_servico_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_eventos: {
        Row: {
          created_at: string
          created_by: string | null
          documento_id: string
          empresa_representada_id: string
          id: string
          justificativa: string | null
          motivo_rejeicao: string | null
          payload_provedor: Json | null
          protocolo: string | null
          sequencia: number
          status: string
          tipo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          documento_id: string
          empresa_representada_id: string
          id?: string
          justificativa?: string | null
          motivo_rejeicao?: string | null
          payload_provedor?: Json | null
          protocolo?: string | null
          sequencia?: number
          status?: string
          tipo: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          documento_id?: string
          empresa_representada_id?: string
          id?: string
          justificativa?: string | null
          motivo_rejeicao?: string | null
          payload_provedor?: Json | null
          protocolo?: string | null
          sequencia?: number
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_eventos_documento_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "fiscal_documentos_eletronicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_eventos_empresa_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_provedor_credenciais: {
        Row: {
          ambiente: string
          api_key_secret_ref: string
          ativo: boolean
          base_url: string | null
          created_at: string
          deleted_at: string | null
          empresa_representada_id: string
          id: string
          provider: string
          updated_at: string
        }
        Insert: {
          ambiente: string
          api_key_secret_ref: string
          ativo?: boolean
          base_url?: string | null
          created_at?: string
          deleted_at?: string | null
          empresa_representada_id: string
          id?: string
          provider: string
          updated_at?: string
        }
        Update: {
          ambiente?: string
          api_key_secret_ref?: string
          ativo?: boolean
          base_url?: string | null
          created_at?: string
          deleted_at?: string | null
          empresa_representada_id?: string
          id?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      fiscal_sped_arquivos: {
        Row: {
          arquivo_url: string | null
          created_at: string
          created_by: string | null
          empresa_representada_id: string
          erro_mensagem: string | null
          hash_sha256: string | null
          id: string
          linhas_geradas: number | null
          periodo_fim: string
          periodo_ini: string
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          empresa_representada_id: string
          erro_mensagem?: string | null
          hash_sha256?: string | null
          id?: string
          linhas_geradas?: number | null
          periodo_fim: string
          periodo_ini: string
          status?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          empresa_representada_id?: string
          erro_mensagem?: string | null
          hash_sha256?: string | null
          id?: string
          linhas_geradas?: number | null
          periodo_fim?: string
          periodo_ini?: string
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_sped_empresa_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      folha_pagamento: {
        Row: {
          colaborador_id: string
          competencia: string
          created_at: string | null
          data_pagamento: string | null
          empresa_representada_id: string
          fgts: number | null
          id: string
          inss: number | null
          irrf: number | null
          observacoes: string | null
          salario_base: number
          salario_liquido: number | null
          status: string | null
          total_descontos: number | null
          total_vencimentos: number | null
          updated_at: string | null
        }
        Insert: {
          colaborador_id: string
          competencia: string
          created_at?: string | null
          data_pagamento?: string | null
          empresa_representada_id: string
          fgts?: number | null
          id?: string
          inss?: number | null
          irrf?: number | null
          observacoes?: string | null
          salario_base: number
          salario_liquido?: number | null
          status?: string | null
          total_descontos?: number | null
          total_vencimentos?: number | null
          updated_at?: string | null
        }
        Update: {
          colaborador_id?: string
          competencia?: string
          created_at?: string | null
          data_pagamento?: string | null
          empresa_representada_id?: string
          fgts?: number | null
          id?: string
          inss?: number | null
          irrf?: number | null
          observacoes?: string | null
          salario_base?: number
          salario_liquido?: number | null
          status?: string | null
          total_descontos?: number | null
          total_vencimentos?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folha_pagamento_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folha_pagamento_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_estoque_movimentacoes: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          empresa_representada_id: string
          id: string
          ip_origem: unknown
          movimentacao_id: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          empresa_representada_id: string
          id?: string
          ip_origem?: unknown
          movimentacao_id: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          empresa_representada_id?: string
          id?: string
          ip_origem?: unknown
          movimentacao_id?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      historico_movimentacoes_bancarias: {
        Row: {
          acao: string
          conta_bancaria_id: string | null
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          empresa_representada_id: string
          id: string
          ip_origem: unknown
          movimentacao_id: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          conta_bancaria_id?: string | null
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          empresa_representada_id: string
          id?: string
          ip_origem?: unknown
          movimentacao_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          conta_bancaria_id?: string | null
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          empresa_representada_id?: string
          id?: string
          ip_origem?: unknown
          movimentacao_id?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_movimentacoes_bancarias_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_movimentacoes_bancarias_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_movimentacoes_bancarias_movimentacao_id_fkey"
            columns: ["movimentacao_id"]
            isOneToOne: false
            referencedRelation: "movimentacoes_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_movimentacoes_financeiras: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          data_operacao: string
          empresa_representada_id: string
          id: string
          ip_origem: unknown
          observacoes: string | null
          registro_id: string
          tabela_origem: string
          tipo_operacao: string | null
          tipo_titulo: string | null
          titulo_id: string | null
          usuario_id: string | null
          usuario_nome: string | null
          valor_movimentado: number | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          data_operacao?: string
          empresa_representada_id: string
          id?: string
          ip_origem?: unknown
          observacoes?: string | null
          registro_id: string
          tabela_origem: string
          tipo_operacao?: string | null
          tipo_titulo?: string | null
          titulo_id?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
          valor_movimentado?: number | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          data_operacao?: string
          empresa_representada_id?: string
          id?: string
          ip_origem?: unknown
          observacoes?: string | null
          registro_id?: string
          tabela_origem?: string
          tipo_operacao?: string | null
          tipo_titulo?: string | null
          titulo_id?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
          valor_movimentado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_movimentacoes_financeira_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      integracoes_ponto: {
        Row: {
          ativo: boolean | null
          configuracoes: Json | null
          created_at: string | null
          empresa_representada_id: string
          endpoint: string | null
          id: string
          nome: string
          tipo: string | null
          token_autenticacao: string | null
          ultima_sincronizacao: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          configuracoes?: Json | null
          created_at?: string | null
          empresa_representada_id: string
          endpoint?: string | null
          id?: string
          nome: string
          tipo?: string | null
          token_autenticacao?: string | null
          ultima_sincronizacao?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          configuracoes?: Json | null
          created_at?: string | null
          empresa_representada_id?: string
          endpoint?: string | null
          id?: string
          nome?: string
          tipo?: string | null
          token_autenticacao?: string | null
          ultima_sincronizacao?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integracoes_ponto_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_venda: {
        Row: {
          acrescimo_item: number | null
          centro_custo_id: string | null
          created_at: string
          desconto_item: number | null
          descricao: string
          empresa_representada_id: string
          hash_classificacao: string | null
          id: string
          natureza_receita_id: string | null
          observacoes: string | null
          ordem: number | null
          plano_conta_id: string | null
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          regra_origem: string | null
          regra_versao: number | null
          servico_id: string | null
          tipo_item: string
          unidade: string | null
          updated_at: string
          valor_total_item: number | null
          venda_id: string
        }
        Insert: {
          acrescimo_item?: number | null
          centro_custo_id?: string | null
          created_at?: string
          desconto_item?: number | null
          descricao: string
          empresa_representada_id: string
          hash_classificacao?: string | null
          id?: string
          natureza_receita_id?: string | null
          observacoes?: string | null
          ordem?: number | null
          plano_conta_id?: string | null
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          regra_origem?: string | null
          regra_versao?: number | null
          servico_id?: string | null
          tipo_item: string
          unidade?: string | null
          updated_at?: string
          valor_total_item?: number | null
          venda_id: string
        }
        Update: {
          acrescimo_item?: number | null
          centro_custo_id?: string | null
          created_at?: string
          desconto_item?: number | null
          descricao?: string
          empresa_representada_id?: string
          hash_classificacao?: string | null
          id?: string
          natureza_receita_id?: string | null
          observacoes?: string | null
          ordem?: number | null
          plano_conta_id?: string | null
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          regra_origem?: string | null
          regra_versao?: number | null
          servico_id?: string | null
          tipo_item?: string
          unidade?: string | null
          updated_at?: string
          valor_total_item?: number | null
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_venda_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_venda_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_venda_natureza_receita_id_fkey"
            columns: ["natureza_receita_id"]
            isOneToOne: false
            referencedRelation: "naturezas_receita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_venda_plano_conta_id_fkey"
            columns: ["plano_conta_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_venda_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_venda_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_estoque_ruptura"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "itens_venda_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_venda_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      liquidacoes_multiplas: {
        Row: {
          conta_bancaria_id: string | null
          created_at: string
          data_liquidacao: string
          empresa_representada_id: string
          forma_pagamento: string | null
          id: string
          liquidacao_principal_id: string | null
          observacoes: string | null
          valor: number | null
          valor_total: number
        }
        Insert: {
          conta_bancaria_id?: string | null
          created_at?: string
          data_liquidacao: string
          empresa_representada_id: string
          forma_pagamento?: string | null
          id?: string
          liquidacao_principal_id?: string | null
          observacoes?: string | null
          valor?: number | null
          valor_total: number
        }
        Update: {
          conta_bancaria_id?: string | null
          created_at?: string
          data_liquidacao?: string
          empresa_representada_id?: string
          forma_pagamento?: string | null
          id?: string
          liquidacao_principal_id?: string | null
          observacoes?: string | null
          valor?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "liquidacoes_multiplas_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidacoes_multiplas_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
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
          cancelada: boolean | null
          cancelada_em: string | null
          centro_custo_id: string | null
          conta_bancaria_id: string | null
          conta_pagar_id: string | null
          conta_receber_id: string | null
          created_at: string
          data_estorno: string | null
          data_liquidacao: string
          data_pagamento: string | null
          empresa_representada_id: string
          estornado: boolean
          estorno_idempotency_key: string | null
          forma_pagamento: string | null
          historico: string | null
          id: string
          idempotency_key: string | null
          motivo_cancelamento: string | null
          motivo_estorno: string | null
          natureza_id: string | null
          numero_cheque: string | null
          observacoes: string | null
          plano_conta_id: string | null
          tipo_titulo: string | null
          titulo_id: string | null
          updated_at: string
          usuario_estorno_id: string | null
          usuario_liquidacao_id: string | null
          valor_desconto: number | null
          valor_juros: number | null
          valor_multa: number | null
          valor_original_titulo: number | null
          valor_pago: number
        }
        Insert: {
          cancelada?: boolean | null
          cancelada_em?: string | null
          centro_custo_id?: string | null
          conta_bancaria_id?: string | null
          conta_pagar_id?: string | null
          conta_receber_id?: string | null
          created_at?: string
          data_estorno?: string | null
          data_liquidacao: string
          data_pagamento?: string | null
          empresa_representada_id: string
          estornado?: boolean
          estorno_idempotency_key?: string | null
          forma_pagamento?: string | null
          historico?: string | null
          id?: string
          idempotency_key?: string | null
          motivo_cancelamento?: string | null
          motivo_estorno?: string | null
          natureza_id?: string | null
          numero_cheque?: string | null
          observacoes?: string | null
          plano_conta_id?: string | null
          tipo_titulo?: string | null
          titulo_id?: string | null
          updated_at?: string
          usuario_estorno_id?: string | null
          usuario_liquidacao_id?: string | null
          valor_desconto?: number | null
          valor_juros?: number | null
          valor_multa?: number | null
          valor_original_titulo?: number | null
          valor_pago: number
        }
        Update: {
          cancelada?: boolean | null
          cancelada_em?: string | null
          centro_custo_id?: string | null
          conta_bancaria_id?: string | null
          conta_pagar_id?: string | null
          conta_receber_id?: string | null
          created_at?: string
          data_estorno?: string | null
          data_liquidacao?: string
          data_pagamento?: string | null
          empresa_representada_id?: string
          estornado?: boolean
          estorno_idempotency_key?: string | null
          forma_pagamento?: string | null
          historico?: string | null
          id?: string
          idempotency_key?: string | null
          motivo_cancelamento?: string | null
          motivo_estorno?: string | null
          natureza_id?: string | null
          numero_cheque?: string | null
          observacoes?: string | null
          plano_conta_id?: string | null
          tipo_titulo?: string | null
          titulo_id?: string | null
          updated_at?: string
          usuario_estorno_id?: string | null
          usuario_liquidacao_id?: string | null
          valor_desconto?: number | null
          valor_juros?: number | null
          valor_multa?: number | null
          valor_original_titulo?: number | null
          valor_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "liquidacoes_titulos_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidacoes_titulos_conta_pagar_id_fkey"
            columns: ["conta_pagar_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidacoes_titulos_conta_receber_id_fkey"
            columns: ["conta_receber_id"]
            isOneToOne: false
            referencedRelation: "contas_receber"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidacoes_titulos_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidacoes_titulos_natureza_id_fkey"
            columns: ["natureza_id"]
            isOneToOne: false
            referencedRelation: "natureza_caixas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liquidacoes_titulos_plano_conta_id_fkey"
            columns: ["plano_conta_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
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
      lotes_movimentacoes: {
        Row: {
          cancelado_em: string | null
          created_at: string
          data_lancamento: string
          descricao: string | null
          descricao_lote: string | null
          empresa_representada_id: string
          id: string
          ip_origem: unknown
          motivo_cancelamento: string | null
          numero_lote: string | null
          quantidade_movimentacoes: number
          status: string | null
          tipo: string
          tipo_lote: string | null
          updated_at: string
          usuario_criacao_id: string | null
          valor_total: number | null
        }
        Insert: {
          cancelado_em?: string | null
          created_at?: string
          data_lancamento: string
          descricao?: string | null
          descricao_lote?: string | null
          empresa_representada_id: string
          id?: string
          ip_origem?: unknown
          motivo_cancelamento?: string | null
          numero_lote?: string | null
          quantidade_movimentacoes?: number
          status?: string | null
          tipo: string
          tipo_lote?: string | null
          updated_at?: string
          usuario_criacao_id?: string | null
          valor_total?: number | null
        }
        Update: {
          cancelado_em?: string | null
          created_at?: string
          data_lancamento?: string
          descricao?: string | null
          descricao_lote?: string | null
          empresa_representada_id?: string
          id?: string
          ip_origem?: unknown
          motivo_cancelamento?: string | null
          numero_lote?: string | null
          quantidade_movimentacoes?: number
          status?: string | null
          tipo?: string
          tipo_lote?: string | null
          updated_at?: string
          usuario_criacao_id?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lotes_movimentacoes_empresa_representada_id_fkey"
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
          codigo_externo: string | null
          created_at: string
          deleted_at: string | null
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
          codigo_externo?: string | null
          created_at?: string
          deleted_at?: string | null
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
          codigo_externo?: string | null
          created_at?: string
          deleted_at?: string | null
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
      modalidades_pagamento: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          deleted_at: string | null
          descricao: string | null
          exige_adquirente: boolean
          id: string
          liquidacao_imediata: boolean
          nome: string
          ordem: number
          permite_parcelamento: boolean
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          exige_adquirente?: boolean
          id?: string
          liquidacao_imediata?: boolean
          nome: string
          ordem?: number
          permite_parcelamento?: boolean
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          exige_adquirente?: boolean
          id?: string
          liquidacao_imediata?: boolean
          nome?: string
          ordem?: number
          permite_parcelamento?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      movimentacoes_bancarias: {
        Row: {
          ativo: boolean
          beneficiario_pagador: string | null
          centro_custo_id: string | null
          conciliado: boolean | null
          conta_bancaria_id: string
          conta_destino_id: string | null
          created_at: string
          created_by: string | null
          data_compensacao: string | null
          data_conciliacao: string | null
          data_estorno: string | null
          data_lancamento: string
          data_movimentacao: string | null
          deleted_at: string | null
          descricao: string
          documento_referencia: string | null
          empresa_representada_id: string
          estornado: boolean
          historico: string | null
          id: string
          ip_origem: unknown
          liquidacao_titulo_id: string | null
          lote_id: string | null
          motivo_estorno: string | null
          movimentacao_estorno_id: string | null
          movimentacao_extrato_id: string | null
          natureza_id: string | null
          numero_documento: string | null
          observacoes: string | null
          plano_conta_id: string | null
          saldo_anterior: number | null
          saldo_posterior: number | null
          status: string | null
          tipo: string
          tipo_movimentacao: string | null
          updated_at: string
          usuario_conciliacao_id: string | null
          usuario_criacao_id: string | null
          usuario_estorno_id: string | null
          valor: number
        }
        Insert: {
          ativo?: boolean
          beneficiario_pagador?: string | null
          centro_custo_id?: string | null
          conciliado?: boolean | null
          conta_bancaria_id: string
          conta_destino_id?: string | null
          created_at?: string
          created_by?: string | null
          data_compensacao?: string | null
          data_conciliacao?: string | null
          data_estorno?: string | null
          data_lancamento: string
          data_movimentacao?: string | null
          deleted_at?: string | null
          descricao: string
          documento_referencia?: string | null
          empresa_representada_id: string
          estornado?: boolean
          historico?: string | null
          id?: string
          ip_origem?: unknown
          liquidacao_titulo_id?: string | null
          lote_id?: string | null
          motivo_estorno?: string | null
          movimentacao_estorno_id?: string | null
          movimentacao_extrato_id?: string | null
          natureza_id?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          plano_conta_id?: string | null
          saldo_anterior?: number | null
          saldo_posterior?: number | null
          status?: string | null
          tipo: string
          tipo_movimentacao?: string | null
          updated_at?: string
          usuario_conciliacao_id?: string | null
          usuario_criacao_id?: string | null
          usuario_estorno_id?: string | null
          valor: number
        }
        Update: {
          ativo?: boolean
          beneficiario_pagador?: string | null
          centro_custo_id?: string | null
          conciliado?: boolean | null
          conta_bancaria_id?: string
          conta_destino_id?: string | null
          created_at?: string
          created_by?: string | null
          data_compensacao?: string | null
          data_conciliacao?: string | null
          data_estorno?: string | null
          data_lancamento?: string
          data_movimentacao?: string | null
          deleted_at?: string | null
          descricao?: string
          documento_referencia?: string | null
          empresa_representada_id?: string
          estornado?: boolean
          historico?: string | null
          id?: string
          ip_origem?: unknown
          liquidacao_titulo_id?: string | null
          lote_id?: string | null
          motivo_estorno?: string | null
          movimentacao_estorno_id?: string | null
          movimentacao_extrato_id?: string | null
          natureza_id?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          plano_conta_id?: string | null
          saldo_anterior?: number | null
          saldo_posterior?: number | null
          status?: string | null
          tipo?: string
          tipo_movimentacao?: string | null
          updated_at?: string
          usuario_conciliacao_id?: string | null
          usuario_criacao_id?: string | null
          usuario_estorno_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_bancarias_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_conta_destino_id_fkey"
            columns: ["conta_destino_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_liquidacao_titulo_id_fkey"
            columns: ["liquidacao_titulo_id"]
            isOneToOne: false
            referencedRelation: "liquidacoes_titulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_movimentacao_estorno_id_fkey"
            columns: ["movimentacao_estorno_id"]
            isOneToOne: false
            referencedRelation: "movimentacoes_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_movimentacao_extrato_id_fkey"
            columns: ["movimentacao_extrato_id"]
            isOneToOne: false
            referencedRelation: "banco_movimentacoes_extrato"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_natureza_id_fkey"
            columns: ["natureza_id"]
            isOneToOne: false
            referencedRelation: "natureza_caixas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_plano_conta_id_fkey"
            columns: ["plano_conta_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
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
      natureza_operacao: {
        Row: {
          ativo: boolean
          calcula_icms: boolean
          calcula_ipi: boolean
          calcula_pis_cofins: boolean
          cfop_dentro_estado: string | null
          cfop_exterior: string | null
          cfop_fora_estado: string | null
          codigo: string
          created_at: string
          deleted_at: string | null
          descricao: string
          empresa_representada_id: string
          finalidade: string
          gera_duplicata: boolean
          id: string
          movimenta_estoque: boolean
          observacoes: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          calcula_icms?: boolean
          calcula_ipi?: boolean
          calcula_pis_cofins?: boolean
          cfop_dentro_estado?: string | null
          cfop_exterior?: string | null
          cfop_fora_estado?: string | null
          codigo: string
          created_at?: string
          deleted_at?: string | null
          descricao: string
          empresa_representada_id: string
          finalidade: string
          gera_duplicata?: boolean
          id?: string
          movimenta_estoque?: boolean
          observacoes?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          calcula_icms?: boolean
          calcula_ipi?: boolean
          calcula_pis_cofins?: boolean
          cfop_dentro_estado?: string | null
          cfop_exterior?: string | null
          cfop_fora_estado?: string | null
          codigo?: string
          created_at?: string
          deleted_at?: string | null
          descricao?: string
          empresa_representada_id?: string
          finalidade?: string
          gera_duplicata?: boolean
          id?: string
          movimenta_estoque?: boolean
          observacoes?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "natureza_operacao_cfop_dentro_estado_fkey"
            columns: ["cfop_dentro_estado"]
            isOneToOne: false
            referencedRelation: "cfop"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "natureza_operacao_cfop_exterior_fkey"
            columns: ["cfop_exterior"]
            isOneToOne: false
            referencedRelation: "cfop"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "natureza_operacao_cfop_fora_estado_fkey"
            columns: ["cfop_fora_estado"]
            isOneToOne: false
            referencedRelation: "cfop"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "natureza_operacao_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      naturezas_pagamento: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          deleted_at: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      naturezas_receita: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          descricao: string | null
          empresa_representada_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descricao?: string | null
          empresa_representada_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descricao?: string | null
          empresa_representada_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "naturezas_receita_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      ncm: {
        Row: {
          aliquota_ipi: number
          ativo: boolean
          categoria: string | null
          codigo: string
          created_at: string
          descricao: string
          id: string
          observacoes: string | null
          unidade: string | null
        }
        Insert: {
          aliquota_ipi?: number
          ativo?: boolean
          categoria?: string | null
          codigo: string
          created_at?: string
          descricao: string
          id?: string
          observacoes?: string | null
          unidade?: string | null
        }
        Update: {
          aliquota_ipi?: number
          ativo?: boolean
          categoria?: string | null
          codigo?: string
          created_at?: string
          descricao?: string
          id?: string
          observacoes?: string | null
          unidade?: string | null
        }
        Relationships: []
      }
      orcamentos_venda: {
        Row: {
          cliente_id: string | null
          created_at: string
          created_by: string | null
          data_emissao: string
          data_validade: string | null
          deleted_at: string | null
          empresa_representada_id: string
          id: string
          numero: string
          observacoes: string | null
          status: string
          tipo: string
          updated_at: string
          valor_total: number
          versao: number
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_validade?: string | null
          deleted_at?: string | null
          empresa_representada_id: string
          id?: string
          numero: string
          observacoes?: string | null
          status?: string
          tipo: string
          updated_at?: string
          valor_total?: number
          versao?: number
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_validade?: string | null
          deleted_at?: string | null
          empresa_representada_id?: string
          id?: string
          numero?: string
          observacoes?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_total?: number
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_venda_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_venda_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos_venda_itens: {
        Row: {
          created_at: string
          desconto: number
          descricao: string
          empresa_representada_id: string
          id: string
          observacoes: string | null
          orcamento_id: string
          ordem: number
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          servico_id: string | null
          tipo_item: string
          updated_at: string
          valor_total: number
        }
        Insert: {
          created_at?: string
          desconto?: number
          descricao: string
          empresa_representada_id: string
          id?: string
          observacoes?: string | null
          orcamento_id: string
          ordem?: number
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          servico_id?: string | null
          tipo_item: string
          updated_at?: string
          valor_total?: number
        }
        Update: {
          created_at?: string
          desconto?: number
          descricao?: string
          empresa_representada_id?: string
          id?: string
          observacoes?: string | null
          orcamento_id?: string
          ordem?: number
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          servico_id?: string | null
          tipo_item?: string
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_venda_itens_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos_venda"
            referencedColumns: ["id"]
          },
        ]
      }
      papeis_catalogo: {
        Row: {
          ativo: boolean
          codigo: string
          nome_exibicao: string
          tipo_pessoa_permitido: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          nome_exibicao: string
          tipo_pessoa_permitido: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          nome_exibicao?: string
          tipo_pessoa_permitido?: string
        }
        Relationships: []
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
      perfis_acesso: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          permissoes: Json
          sistema: boolean
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          permissoes?: Json
          sistema?: boolean
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          permissoes?: Json
          sistema?: boolean
          updated_at?: string
        }
        Relationships: []
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
          deleted_at: string | null
          desconto_avista_perc: number
          descricao: string | null
          dias_primeira_parcela: number
          empresa_representada_id: string
          id: string
          intervalo_dias: number
          juros_am: number
          modalidade_default_id: string | null
          multa_perc: number
          natureza_id: string | null
          nome: string
          numero_parcelas: number
          percentual_entrada: number
          qtd_parcelas: number
          tolerancia_arredondamento: number
          updated_at: string
          versao: number
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          desconto_avista_perc?: number
          descricao?: string | null
          dias_primeira_parcela?: number
          empresa_representada_id: string
          id?: string
          intervalo_dias?: number
          juros_am?: number
          modalidade_default_id?: string | null
          multa_perc?: number
          natureza_id?: string | null
          nome: string
          numero_parcelas?: number
          percentual_entrada?: number
          qtd_parcelas?: number
          tolerancia_arredondamento?: number
          updated_at?: string
          versao?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          desconto_avista_perc?: number
          descricao?: string | null
          dias_primeira_parcela?: number
          empresa_representada_id?: string
          id?: string
          intervalo_dias?: number
          juros_am?: number
          modalidade_default_id?: string | null
          multa_perc?: number
          natureza_id?: string | null
          nome?: string
          numero_parcelas?: number
          percentual_entrada?: number
          qtd_parcelas?: number
          tolerancia_arredondamento?: number
          updated_at?: string
          versao?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_pagamento_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_pagamento_modalidade_default_id_fkey"
            columns: ["modalidade_default_id"]
            isOneToOne: false
            referencedRelation: "modalidades_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_pagamento_natureza_id_fkey"
            columns: ["natureza_id"]
            isOneToOne: false
            referencedRelation: "naturezas_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      porta3_autorizacoes_excecao: {
        Row: {
          bloqueio_codigo: string
          cliente_id: string
          created_at: string
          empresa_representada_id: string
          id: string
          justificativa: string
          permissao_utilizada: string
          usuario_id: string
          valor_pretendido: number | null
        }
        Insert: {
          bloqueio_codigo: string
          cliente_id: string
          created_at?: string
          empresa_representada_id: string
          id?: string
          justificativa: string
          permissao_utilizada: string
          usuario_id: string
          valor_pretendido?: number | null
        }
        Update: {
          bloqueio_codigo?: string
          cliente_id?: string
          created_at?: string
          empresa_representada_id?: string
          id?: string
          justificativa?: string
          permissao_utilizada?: string
          usuario_id?: string
          valor_pretendido?: number | null
        }
        Relationships: []
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
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_fornecedores_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_fornecedores_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_estoque_ruptura"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      preferencias_listagem: {
        Row: {
          colunas_visiveis: Json
          created_at: string
          empresa_representada_id: string
          id: string
          tela: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          colunas_visiveis?: Json
          created_at?: string
          empresa_representada_id: string
          id?: string
          tela: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          colunas_visiveis?: Json
          created_at?: string
          empresa_representada_id?: string
          id?: string
          tela?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preferencias_listagem_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          altura: number | null
          ativo: boolean
          categoria_id: string | null
          centro_custo_id: string | null
          cest: string | null
          codigo: string | null
          comprimento: number | null
          controla_estoque: boolean
          created_at: string
          dados_fiscais: Json
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
          natureza_receita_id: string | null
          ncm: string | null
          nome: string
          origem_produto: string | null
          peso: number | null
          plano_conta_receita_id: string | null
          preco_custo: number | null
          preco_venda: number | null
          unidade_medida_id: string | null
          updated_at: string
        }
        Insert: {
          altura?: number | null
          ativo?: boolean
          categoria_id?: string | null
          centro_custo_id?: string | null
          cest?: string | null
          codigo?: string | null
          comprimento?: number | null
          controla_estoque?: boolean
          created_at?: string
          dados_fiscais?: Json
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
          natureza_receita_id?: string | null
          ncm?: string | null
          nome: string
          origem_produto?: string | null
          peso?: number | null
          plano_conta_receita_id?: string | null
          preco_custo?: number | null
          preco_venda?: number | null
          unidade_medida_id?: string | null
          updated_at?: string
        }
        Update: {
          altura?: number | null
          ativo?: boolean
          categoria_id?: string | null
          centro_custo_id?: string | null
          cest?: string | null
          codigo?: string | null
          comprimento?: number | null
          controla_estoque?: boolean
          created_at?: string
          dados_fiscais?: Json
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
          natureza_receita_id?: string | null
          ncm?: string | null
          nome?: string
          origem_produto?: string | null
          peso?: number | null
          plano_conta_receita_id?: string | null
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
            foreignKeyName: "produtos_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
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
            foreignKeyName: "produtos_natureza_receita_id_fkey"
            columns: ["natureza_receita_id"]
            isOneToOne: false
            referencedRelation: "naturezas_receita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_plano_conta_receita_id_fkey"
            columns: ["plano_conta_receita_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
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
      rateios_contas_pagar: {
        Row: {
          centro_custo_id: string | null
          conta_pagar_id: string
          created_at: string
          empresa_representada_id: string
          id: string
          observacoes: string | null
          percentual: number | null
          plano_conta_id: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          centro_custo_id?: string | null
          conta_pagar_id: string
          created_at?: string
          empresa_representada_id: string
          id?: string
          observacoes?: string | null
          percentual?: number | null
          plano_conta_id?: string | null
          updated_at?: string
          valor: number
        }
        Update: {
          centro_custo_id?: string | null
          conta_pagar_id?: string
          created_at?: string
          empresa_representada_id?: string
          id?: string
          observacoes?: string | null
          percentual?: number | null
          plano_conta_id?: string | null
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
            foreignKeyName: "rateios_contas_pagar_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
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
      rateios_contas_receber: {
        Row: {
          centro_custo_id: string | null
          conta_receber_id: string
          created_at: string
          empresa_representada_id: string
          id: string
          observacoes: string | null
          percentual: number | null
          plano_conta_id: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          centro_custo_id?: string | null
          conta_receber_id: string
          created_at?: string
          empresa_representada_id: string
          id?: string
          observacoes?: string | null
          percentual?: number | null
          plano_conta_id?: string | null
          updated_at?: string
          valor: number
        }
        Update: {
          centro_custo_id?: string | null
          conta_receber_id?: string
          created_at?: string
          empresa_representada_id?: string
          id?: string
          observacoes?: string | null
          percentual?: number | null
          plano_conta_id?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "rateios_contas_receber_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rateios_contas_receber_conta_receber_id_fkey"
            columns: ["conta_receber_id"]
            isOneToOne: false
            referencedRelation: "contas_receber"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rateios_contas_receber_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rateios_contas_receber_plano_conta_id_fkey"
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
          data_registro: string
          empresa_representada_id: string
          entrada_1: string | null
          entrada_2: string | null
          entrada_3: string | null
          horas_extras: number | null
          horas_falta: number | null
          id: string
          justificativa: string | null
          saida_1: string | null
          saida_2: string | null
          saida_3: string | null
          status: string | null
          total_horas: number | null
          updated_at: string | null
        }
        Insert: {
          colaborador_id: string
          created_at?: string | null
          data_registro: string
          empresa_representada_id: string
          entrada_1?: string | null
          entrada_2?: string | null
          entrada_3?: string | null
          horas_extras?: number | null
          horas_falta?: number | null
          id?: string
          justificativa?: string | null
          saida_1?: string | null
          saida_2?: string | null
          saida_3?: string | null
          status?: string | null
          total_horas?: number | null
          updated_at?: string | null
        }
        Update: {
          colaborador_id?: string
          created_at?: string | null
          data_registro?: string
          empresa_representada_id?: string
          entrada_1?: string | null
          entrada_2?: string | null
          entrada_3?: string | null
          horas_extras?: number | null
          horas_falta?: number | null
          id?: string
          justificativa?: string | null
          saida_1?: string | null
          saida_2?: string | null
          saida_3?: string | null
          status?: string | null
          total_horas?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_ponto_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ponto_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_classificacao_receita: {
        Row: {
          alvo_id: string | null
          alvo_tipo: string
          ativo: boolean
          categoria_id: string | null
          centro_custo_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          empresa_representada_id: string
          id: string
          natureza_receita_id: string | null
          plano_conta_id: string | null
          prioridade: number
          tipo_item: string | null
          updated_at: string
          versao: number
          vigencia_fim: string | null
          vigencia_ini: string | null
        }
        Insert: {
          alvo_id?: string | null
          alvo_tipo: string
          ativo?: boolean
          categoria_id?: string | null
          centro_custo_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          empresa_representada_id: string
          id?: string
          natureza_receita_id?: string | null
          plano_conta_id?: string | null
          prioridade?: number
          tipo_item?: string | null
          updated_at?: string
          versao?: number
          vigencia_fim?: string | null
          vigencia_ini?: string | null
        }
        Update: {
          alvo_id?: string | null
          alvo_tipo?: string
          ativo?: boolean
          categoria_id?: string | null
          centro_custo_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          empresa_representada_id?: string
          id?: string
          natureza_receita_id?: string | null
          plano_conta_id?: string | null
          prioridade?: number
          tipo_item?: string | null
          updated_at?: string
          versao?: number
          vigencia_fim?: string | null
          vigencia_ini?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regras_classificacao_receita_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regras_classificacao_receita_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regras_classificacao_receita_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regras_classificacao_receita_natureza_receita_id_fkey"
            columns: ["natureza_receita_id"]
            isOneToOne: false
            referencedRelation: "naturezas_receita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regras_classificacao_receita_plano_conta_id_fkey"
            columns: ["plano_conta_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      report_ops_alerts: {
        Row: {
          acknowledged_by: string | null
          created_at: string
          id: string
          kind: string
          payload: Json
          reason: string
          resolved_at: string | null
          severity: string
          updated_at: string
        }
        Insert: {
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          reason: string
          resolved_at?: string | null
          severity: string
          updated_at?: string
        }
        Update: {
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          reason?: string
          resolved_at?: string | null
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_ops_audit: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          id: string
          ip: unknown
          metadata: Json
          target_id: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          id?: string
          ip?: unknown
          metadata?: Json
          target_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          ip?: unknown
          metadata?: Json
          target_id?: string | null
        }
        Relationships: []
      }
      report_schedule_runs: {
        Row: {
          artifact_path: string | null
          artifact_prune_reason: string | null
          artifact_pruned_at: string | null
          attempt: number
          created_at: string
          delivery_message_id: string | null
          delivery_reason: string | null
          delivery_status: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          idempotency_key: string
          resign_count: number
          resigned_at: string | null
          resigned_by: string | null
          schedule_id: string
          signed_url: string | null
          signed_url_expires_at: string | null
          started_at: string
          status: Database["public"]["Enums"]["report_run_status"]
          user_id: string
        }
        Insert: {
          artifact_path?: string | null
          artifact_prune_reason?: string | null
          artifact_pruned_at?: string | null
          attempt?: number
          created_at?: string
          delivery_message_id?: string | null
          delivery_reason?: string | null
          delivery_status?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key: string
          resign_count?: number
          resigned_at?: string | null
          resigned_by?: string | null
          schedule_id: string
          signed_url?: string | null
          signed_url_expires_at?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["report_run_status"]
          user_id: string
        }
        Update: {
          artifact_path?: string | null
          artifact_prune_reason?: string | null
          artifact_pruned_at?: string | null
          attempt?: number
          created_at?: string
          delivery_message_id?: string | null
          delivery_reason?: string | null
          delivery_status?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key?: string
          resign_count?: number
          resigned_at?: string | null
          resigned_by?: string | null
          schedule_id?: string
          signed_url?: string | null
          signed_url_expires_at?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["report_run_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_schedule_runs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "report_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      report_schedules: {
        Row: {
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          enabled: boolean
          format: Database["public"]["Enums"]["report_export_format"]
          frequency: Database["public"]["Enums"]["report_schedule_frequency"]
          hour_utc: number
          id: string
          last_run_at: string | null
          name: string
          next_run_at: string
          recipients: string[]
          scope: Database["public"]["Enums"]["report_schedule_scope"]
          updated_at: string
          user_id: string
          view_state: Json
        }
        Insert: {
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          enabled?: boolean
          format: Database["public"]["Enums"]["report_export_format"]
          frequency: Database["public"]["Enums"]["report_schedule_frequency"]
          hour_utc: number
          id?: string
          last_run_at?: string | null
          name: string
          next_run_at: string
          recipients?: string[]
          scope: Database["public"]["Enums"]["report_schedule_scope"]
          updated_at?: string
          user_id: string
          view_state?: Json
        }
        Update: {
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          enabled?: boolean
          format?: Database["public"]["Enums"]["report_export_format"]
          frequency?: Database["public"]["Enums"]["report_schedule_frequency"]
          hour_utc?: number
          id?: string
          last_run_at?: string | null
          name?: string
          next_run_at?: string
          recipients?: string[]
          scope?: Database["public"]["Enums"]["report_schedule_scope"]
          updated_at?: string
          user_id?: string
          view_state?: Json
        }
        Relationships: []
      }
      servicos: {
        Row: {
          ativo: boolean
          centro_custo_id: string | null
          codigo: string | null
          created_at: string
          deleted_at: string | null
          descricao: string | null
          empresa_representada_id: string
          id: string
          natureza_receita_id: string | null
          nome: string
          plano_conta_receita_id: string | null
          preco: number | null
          unidade_medida_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          centro_custo_id?: string | null
          codigo?: string | null
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          empresa_representada_id: string
          id?: string
          natureza_receita_id?: string | null
          nome: string
          plano_conta_receita_id?: string | null
          preco?: number | null
          unidade_medida_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          centro_custo_id?: string | null
          codigo?: string | null
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          empresa_representada_id?: string
          id?: string
          natureza_receita_id?: string | null
          nome?: string
          plano_conta_receita_id?: string | null
          preco?: number | null
          unidade_medida_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "servicos_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_natureza_receita_id_fkey"
            columns: ["natureza_receita_id"]
            isOneToOne: false
            referencedRelation: "naturezas_receita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_plano_conta_receita_id_fkey"
            columns: ["plano_conta_receita_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
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
      setores_empresa: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          departamento_id: string | null
          descricao: string | null
          empresa_representada_id: string
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          departamento_id?: string | null
          descricao?: string | null
          empresa_representada_id: string
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          departamento_id?: string | null
          descricao?: string | null
          empresa_representada_id?: string
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "setores_empresa_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setores_empresa_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          created_at: string
          delivery_id: string | null
          destino: string | null
          empresa_representada_id: string | null
          id: string
          max_tentativas: number | null
          mensagem_erro: string | null
          origem: string | null
          payload_entrada: Json | null
          payload_saida: Json | null
          processado_em: string | null
          status: string | null
          tentativas: number | null
          tipo: string
        }
        Insert: {
          created_at?: string
          delivery_id?: string | null
          destino?: string | null
          empresa_representada_id?: string | null
          id?: string
          max_tentativas?: number | null
          mensagem_erro?: string | null
          origem?: string | null
          payload_entrada?: Json | null
          payload_saida?: Json | null
          processado_em?: string | null
          status?: string | null
          tentativas?: number | null
          tipo: string
        }
        Update: {
          created_at?: string
          delivery_id?: string | null
          destino?: string | null
          empresa_representada_id?: string | null
          id?: string
          max_tentativas?: number | null
          mensagem_erro?: string | null
          origem?: string | null
          payload_entrada?: Json | null
          payload_saida?: Json | null
          processado_em?: string | null
          status?: string | null
          tentativas?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_queue: {
        Row: {
          created_at: string
          empresa_representada_id: string | null
          erro_detalhes: string | null
          id: string
          max_tentativas: number | null
          payload: Json | null
          prioridade: number | null
          processado_em: string | null
          proxima_tentativa_em: string | null
          status: string | null
          tentativas: number | null
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_representada_id?: string | null
          erro_detalhes?: string | null
          id?: string
          max_tentativas?: number | null
          payload?: Json | null
          prioridade?: number | null
          processado_em?: string | null
          proxima_tentativa_em?: string | null
          status?: string | null
          tentativas?: number | null
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_representada_id?: string | null
          erro_detalhes?: string | null
          id?: string
          max_tentativas?: number | null
          payload?: Json | null
          prioridade?: number | null
          processado_em?: string | null
          proxima_tentativa_em?: string | null
          status?: string | null
          tentativas?: number | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_queue_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
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
      tributos: {
        Row: {
          aliquota: number
          ativo: boolean
          base_calculo: number
          created_at: string
          data_fim: string | null
          data_inicio: string
          deleted_at: string | null
          descricao: string
          empresa_representada_id: string
          id: string
          ncm_fim: string | null
          ncm_inicio: string | null
          observacoes: string | null
          regime_tributario: string | null
          subtipo: string | null
          tipo: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          aliquota?: number
          ativo?: boolean
          base_calculo?: number
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          deleted_at?: string | null
          descricao: string
          empresa_representada_id: string
          id?: string
          ncm_fim?: string | null
          ncm_inicio?: string | null
          observacoes?: string | null
          regime_tributario?: string | null
          subtipo?: string | null
          tipo: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          aliquota?: number
          ativo?: boolean
          base_calculo?: number
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          deleted_at?: string | null
          descricao?: string
          empresa_representada_id?: string
          id?: string
          ncm_fim?: string | null
          ncm_inicio?: string | null
          observacoes?: string | null
          regime_tributario?: string | null
          subtipo?: string | null
          tipo?: string
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tributos_empresa_representada_id_fkey"
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
          entidade_id: string | null
          id: string
          nome: string
          perfil_id: string | null
          pessoa_pendente: boolean
          ultimo_acesso: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          empresa_representada_id?: string | null
          entidade_id?: string | null
          id?: string
          nome: string
          perfil_id?: string | null
          pessoa_pendente?: boolean
          ultimo_acesso?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          empresa_representada_id?: string | null
          entidade_id?: string | null
          id?: string
          nome?: string
          perfil_id?: string | null
          pessoa_pendente?: boolean
          ultimo_acesso?: string | null
          updated_at?: string
          user_id?: string | null
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
            foreignKeyName: "usuarios_entidade_id_fkey"
            columns: ["entidade_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis_acesso"
            referencedColumns: ["id"]
          },
        ]
      }
      vencimentos_padrao: {
        Row: {
          ativo: boolean
          codigo: string | null
          competencia: string | null
          created_at: string
          descricao: string | null
          empresa_representada_id: string
          id: string
          incide_fgts: boolean
          incide_inss: boolean
          incide_irrf: boolean
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
          codigo?: string | null
          competencia?: string | null
          created_at?: string
          descricao?: string | null
          empresa_representada_id: string
          id?: string
          incide_fgts?: boolean
          incide_inss?: boolean
          incide_irrf?: boolean
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
          codigo?: string | null
          competencia?: string | null
          created_at?: string
          descricao?: string | null
          empresa_representada_id?: string
          id?: string
          incide_fgts?: boolean
          incide_inss?: boolean
          incide_irrf?: boolean
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
      venda_pagamento: {
        Row: {
          adquirente: string | null
          autorizacao_nsu: string | null
          bandeira: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          empresa_representada_id: string
          externo_id: string | null
          hash_payload: string | null
          id: string
          idempotency_key: string | null
          modalidade_id: string
          natureza_id: string | null
          operador_id: string | null
          origem_canal: string
          origem_sistema: string | null
          percentual_entrada: number
          plano_pagamento_id: string | null
          plano_snapshot: Json
          qtd_parcelas: number
          status: string
          updated_at: string
          valor_bruto: number
          valor_desconto: number
          valor_juros: number
          valor_liquido: number
          venda_id: string
        }
        Insert: {
          adquirente?: string | null
          autorizacao_nsu?: string | null
          bandeira?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          empresa_representada_id: string
          externo_id?: string | null
          hash_payload?: string | null
          id?: string
          idempotency_key?: string | null
          modalidade_id: string
          natureza_id?: string | null
          operador_id?: string | null
          origem_canal?: string
          origem_sistema?: string | null
          percentual_entrada?: number
          plano_pagamento_id?: string | null
          plano_snapshot?: Json
          qtd_parcelas?: number
          status?: string
          updated_at?: string
          valor_bruto: number
          valor_desconto?: number
          valor_juros?: number
          valor_liquido: number
          venda_id: string
        }
        Update: {
          adquirente?: string | null
          autorizacao_nsu?: string | null
          bandeira?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          empresa_representada_id?: string
          externo_id?: string | null
          hash_payload?: string | null
          id?: string
          idempotency_key?: string | null
          modalidade_id?: string
          natureza_id?: string | null
          operador_id?: string | null
          origem_canal?: string
          origem_sistema?: string | null
          percentual_entrada?: number
          plano_pagamento_id?: string | null
          plano_snapshot?: Json
          qtd_parcelas?: number
          status?: string
          updated_at?: string
          valor_bruto?: number
          valor_desconto?: number
          valor_juros?: number
          valor_liquido?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venda_pagamento_modalidade_id_fkey"
            columns: ["modalidade_id"]
            isOneToOne: false
            referencedRelation: "modalidades_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_pagamento_natureza_id_fkey"
            columns: ["natureza_id"]
            isOneToOne: false
            referencedRelation: "naturezas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_pagamento_plano_pagamento_id_fkey"
            columns: ["plano_pagamento_id"]
            isOneToOne: false
            referencedRelation: "planos_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_pagamento_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      venda_pagamento_parcelas: {
        Row: {
          created_at: string
          data_vencimento: string
          empresa_representada_id: string
          externo_id: string | null
          id: string
          is_entrada: boolean
          numero: number
          status: string
          updated_at: string
          valor: number
          valor_juros: number
          venda_pagamento_id: string
        }
        Insert: {
          created_at?: string
          data_vencimento: string
          empresa_representada_id: string
          externo_id?: string | null
          id?: string
          is_entrada?: boolean
          numero: number
          status?: string
          updated_at?: string
          valor: number
          valor_juros?: number
          venda_pagamento_id: string
        }
        Update: {
          created_at?: string
          data_vencimento?: string
          empresa_representada_id?: string
          externo_id?: string | null
          id?: string
          is_entrada?: boolean
          numero?: number
          status?: string
          updated_at?: string
          valor?: number
          valor_juros?: number
          venda_pagamento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venda_pagamento_parcelas_venda_pagamento_id_fkey"
            columns: ["venda_pagamento_id"]
            isOneToOne: false
            referencedRelation: "venda_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      venda_parcela_classificacao_receita: {
        Row: {
          centro_custo_id: string | null
          created_at: string
          created_by: string | null
          empresa_representada_id: string
          hash_classificacao: string
          id: string
          natureza_receita_id: string | null
          pct_rateado: number
          plano_conta_id: string
          regra_origem: string
          regra_versao: number
          valor_rateado: number
          venda_pagamento_parcela_id: string
        }
        Insert: {
          centro_custo_id?: string | null
          created_at?: string
          created_by?: string | null
          empresa_representada_id: string
          hash_classificacao: string
          id?: string
          natureza_receita_id?: string | null
          pct_rateado: number
          plano_conta_id: string
          regra_origem: string
          regra_versao?: number
          valor_rateado: number
          venda_pagamento_parcela_id: string
        }
        Update: {
          centro_custo_id?: string | null
          created_at?: string
          created_by?: string | null
          empresa_representada_id?: string
          hash_classificacao?: string
          id?: string
          natureza_receita_id?: string | null
          pct_rateado?: number
          plano_conta_id?: string
          regra_origem?: string
          regra_versao?: number
          valor_rateado?: number
          venda_pagamento_parcela_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venda_parcela_classificacao_rec_venda_pagamento_parcela_id_fkey"
            columns: ["venda_pagamento_parcela_id"]
            isOneToOne: false
            referencedRelation: "venda_pagamento_parcelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_parcela_classificacao_receit_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_parcela_classificacao_receita_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_parcela_classificacao_receita_natureza_receita_id_fkey"
            columns: ["natureza_receita_id"]
            isOneToOne: false
            referencedRelation: "naturezas_receita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_parcela_classificacao_receita_plano_conta_id_fkey"
            columns: ["plano_conta_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          acrescimo: number | null
          canal_venda: string | null
          cliente_id: string | null
          created_at: string
          data_entrega_prevista: string | null
          data_venda: string
          deleted_at: string | null
          desconto: number | null
          empresa_representada_id: string
          hash_payload: string | null
          id: string
          numero_venda: string | null
          observacoes: string | null
          observacoes_internas: string | null
          orcamento_id: string | null
          origem: string | null
          plano_pagamento_id: string | null
          status: string | null
          status_fiscal: string
          subtotal: number | null
          tipo: string
          updated_at: string
          valor_frete: number | null
          valor_total: number | null
          vendedor_id: string | null
        }
        Insert: {
          acrescimo?: number | null
          canal_venda?: string | null
          cliente_id?: string | null
          created_at?: string
          data_entrega_prevista?: string | null
          data_venda?: string
          deleted_at?: string | null
          desconto?: number | null
          empresa_representada_id: string
          hash_payload?: string | null
          id?: string
          numero_venda?: string | null
          observacoes?: string | null
          observacoes_internas?: string | null
          orcamento_id?: string | null
          origem?: string | null
          plano_pagamento_id?: string | null
          status?: string | null
          status_fiscal?: string
          subtotal?: number | null
          tipo: string
          updated_at?: string
          valor_frete?: number | null
          valor_total?: number | null
          vendedor_id?: string | null
        }
        Update: {
          acrescimo?: number | null
          canal_venda?: string | null
          cliente_id?: string | null
          created_at?: string
          data_entrega_prevista?: string | null
          data_venda?: string
          deleted_at?: string | null
          desconto?: number | null
          empresa_representada_id?: string
          hash_payload?: string | null
          id?: string
          numero_venda?: string | null
          observacoes?: string | null
          observacoes_internas?: string | null
          orcamento_id?: string | null
          origem?: string | null
          plano_pagamento_id?: string | null
          status?: string | null
          status_fiscal?: string
          subtotal?: number | null
          tipo?: string
          updated_at?: string
          valor_frete?: number | null
          valor_total?: number | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos_venda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_plano_pagamento_id_fkey"
            columns: ["plano_pagamento_id"]
            isOneToOne: false
            referencedRelation: "planos_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_configs: {
        Row: {
          ativo: boolean | null
          created_at: string
          descricao: string | null
          empresa_representada_id: string
          eventos: Json | null
          headers: Json | null
          id: string
          max_tentativas: number | null
          metodo: string | null
          nome: string
          secret_token: string | null
          signature_version: string
          strict_mode: boolean
          timeout_segundos: number | null
          updated_at: string
          url_destino: string
          v2_enforced_at: string | null
          v2_only: boolean
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          empresa_representada_id: string
          eventos?: Json | null
          headers?: Json | null
          id?: string
          max_tentativas?: number | null
          metodo?: string | null
          nome: string
          secret_token?: string | null
          signature_version?: string
          strict_mode?: boolean
          timeout_segundos?: number | null
          updated_at?: string
          url_destino: string
          v2_enforced_at?: string | null
          v2_only?: boolean
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          empresa_representada_id?: string
          eventos?: Json | null
          headers?: Json | null
          id?: string
          max_tentativas?: number | null
          metodo?: string | null
          nome?: string
          secret_token?: string | null
          signature_version?: string
          strict_mode?: boolean
          timeout_segundos?: number | null
          updated_at?: string
          url_destino?: string
          v2_enforced_at?: string | null
          v2_only?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "webhook_configs_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          created_at: string
          delivery_id: string
          empresa_representada_id: string
          execution_time_ms: number | null
          id: string
          outcome: string
          request_id: string | null
          signature_version: string | null
          source_system: string
          sync_log_id: string | null
          synthetic: boolean
          ts_skew_ms: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_id: string
          empresa_representada_id: string
          execution_time_ms?: number | null
          id?: string
          outcome?: string
          request_id?: string | null
          signature_version?: string | null
          source_system: string
          sync_log_id?: string | null
          synthetic?: boolean
          ts_skew_ms?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_id?: string
          empresa_representada_id?: string
          execution_time_ms?: number | null
          id?: string
          outcome?: string
          request_id?: string | null
          signature_version?: string | null
          source_system?: string
          sync_log_id?: string | null
          synthetic?: boolean
          ts_skew_ms?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      fiscal_metrics_daily: {
        Row: {
          dia: string | null
          empresa_representada_id: string | null
          latencia_media_s: number | null
          provider: string | null
          status: string | null
          total: number | null
          valor_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_documentos_empresa_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_estoque_curva_abc: {
        Row: {
          classe: string | null
          empresa_id: string | null
          percentual_acumulado: number | null
          produto_id: string | null
          qtd_saida: number | null
          refreshed_at: string | null
          valor_saida: number | null
        }
        Relationships: []
      }
      mv_fluxo_competencia: {
        Row: {
          ano_mes: string | null
          centro_custo_id: string | null
          empresa_representada_id: string | null
          plano_conta_id: string | null
          qtd_titulos: number | null
          tipo: string | null
          valor_previsto: number | null
          valor_realizado: number | null
        }
        Relationships: []
      }
      v_report_run_failures_by_reason_24h: {
        Row: {
          failures: number | null
          format: string | null
          last_seen_at: string | null
          reason: string | null
          scope: string | null
        }
        Relationships: []
      }
      v_report_run_kpis_24h: {
        Row: {
          avg_duration_ms: number | null
          failed: number | null
          format: string | null
          p95_duration_ms: number | null
          running: number | null
          scope: string | null
          succeeded: number | null
          success_rate_pct: number | null
          total_runs: number | null
        }
        Relationships: []
      }
      vw_estoque_posicao_localizacao: {
        Row: {
          categoria_id: string | null
          custo_medio: number | null
          empresa_id: string | null
          localizacao_id: string | null
          localizacao_nome: string | null
          produto_codigo: string | null
          produto_id: string | null
          produto_nome: string | null
          quantidade: number | null
          valor_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_estoque_ruptura: {
        Row: {
          categoria_id: string | null
          empresa_id: string | null
          estoque_minimo: number | null
          produto_codigo: string | null
          produto_id: string | null
          produto_nome: string | null
          saldo_total: number | null
          status: string | null
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
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      autorizar_excecao_venda: {
        Args: {
          p_bloqueio_codigo: string
          p_cliente_id: string
          p_empresa_id: string
          p_justificativa: string
          p_valor_pretendido: number
        }
        Returns: Json
      }
      baixar_estoque_venda: {
        Args: { p_localizacao_id: string; p_venda_id: string }
        Returns: Json
      }
      check_dependencias: {
        Args: { p_entidade: string; p_id: string }
        Returns: Json
      }
      check_v2_readiness: {
        Args: { p_min_events?: number; p_nome: string; p_tenant: string }
        Returns: Json
      }
      clear_pessoa_pendente: { Args: never; Returns: undefined }
      conciliar_inventario: { Args: { p_inventario_id: string }; Returns: Json }
      confirmar_match: {
        Args: { p_extrato_linha_id: string; p_movimentacao_id: string }
        Returns: Json
      }
      converter_orcamento_em_venda: { Args: { p_payload: Json }; Returns: Json }
      criar_lancamento_do_extrato: {
        Args: { p_extrato_linha_id: string; p_payload?: Json }
        Returns: Json
      }
      criar_responsavel_centelha: {
        Args: { p_cnpj: string; p_nome: string }
        Returns: string
      }
      desfazer_conciliacao: {
        Args: { p_extrato_linha_id: string }
        Returns: Json
      }
      estornar_estoque_venda: { Args: { p_venda_id: string }; Returns: Json }
      financeiro_cancelar_titulo: {
        Args: {
          p_idempotency_key: string
          p_motivo: string
          p_ticket_autorizacao?: string
          p_tipo_titulo: string
          p_titulo_id: string
        }
        Returns: Json
      }
      financeiro_consumir_autorizacao: {
        Args: {
          p_acao: string
          p_empresa_id: string
          p_referencia: string
          p_ticket: string
        }
        Returns: undefined
      }
      financeiro_estornar_liquidacao: {
        Args: {
          p_idempotency_key: string
          p_liquidacao_id: string
          p_motivo: string
          p_ticket_autorizacao?: string
        }
        Returns: Json
      }
      financeiro_exigir_autorizacao_liquidacao: {
        Args: { p_liquidacao_id: string; p_ticket: string }
        Returns: undefined
      }
      financeiro_exigir_autorizacao_titulo: {
        Args: {
          p_acao: string
          p_ticket: string
          p_tipo_titulo: string
          p_titulo_id: string
        }
        Returns: undefined
      }
      financeiro_exigir_permissao: {
        Args: { p_acao: string }
        Returns: undefined
      }
      financeiro_limite_retroativo: { Args: never; Returns: string }
      financeiro_liquidar_titulo: {
        Args: {
          p_conta_bancaria_id?: string
          p_data_pagamento: string
          p_desconto?: number
          p_forma_pagamento: string
          p_idempotency_key: string
          p_juros?: number
          p_multa?: number
          p_multi_baixa?: Json
          p_observacoes?: string
          p_ticket_autorizacao?: string
          p_tipo_titulo: string
          p_titulo_id: string
          p_valor: number
        }
        Returns: Json
      }
      financeiro_permissoes: { Args: never; Returns: Json }
      financeiro_pode: { Args: { p_acao: string }; Returns: boolean }
      financeiro_pode_usuario: {
        Args: { p_acao: string; p_user_id: string }
        Returns: boolean
      }
      financeiro_salvar_titulo: {
        Args: {
          p_dados: Json
          p_empresa_id?: string
          p_rateios?: Json
          p_tipo_titulo: string
          p_titulo_id?: string
        }
        Returns: string
      }
      fn_curva_abc: {
        Args: {
          p_categoria_id?: string
          p_empresa_id: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          categoria_id: string
          classe: string
          codigo: string
          nome: string
          percentual_acumulado: number
          produto_id: string
          qtd_saida: number
          refreshed_at: string
          total_count: number
          valor_saida: number
        }[]
      }
      fn_kardex_produto: {
        Args: {
          p_data_fim?: string
          p_data_inicio?: string
          p_empresa_id: string
          p_limit?: number
          p_localizacao_id?: string
          p_offset?: number
          p_produto_id: string
        }
        Returns: {
          custo_total: number
          custo_unitario: number
          data_movimento: string
          documento_ref: string
          id: string
          localizacao_destino_id: string
          localizacao_origem_id: string
          observacoes: string
          qtd_entrada: number
          qtd_saida: number
          saldo_acumulado: number
          tipo: string
          total_count: number
        }[]
      }
      fn_produtos_parados: {
        Args: { p_dias?: number; p_empresa_id: string }
        Returns: {
          categoria_id: string
          codigo: string
          custo_medio: number
          dias_parado: number
          nome: string
          produto_id: string
          saldo_total: number
          ultima_saida: string
          valor_imobilizado: number
        }[]
      }
      fn_refresh_mv_curva_abc: { Args: never; Returns: undefined }
      fn_relatorio_giro: {
        Args: {
          p_categoria_id?: string
          p_data_fim: string
          p_data_inicio: string
          p_empresa_id: string
          p_localizacao_id?: string
        }
        Returns: {
          categoria_id: string
          codigo: string
          estoque_medio: number
          giro: number
          nome: string
          produto_id: string
          qtd_saida: number
          saldo_final: number
          saldo_inicial: number
        }[]
      }
      gerar_contas_receber_da_venda: {
        Args: { p_idempotency_key?: string; p_venda_id: string }
        Returns: Json
      }
      get_audit_trail: {
        Args: { p_movimentacao_id: string }
        Returns: {
          acao: string
          conta_bancaria_id: string
          created_at: string
          dados_anteriores: Json
          dados_novos: Json
          empresa_representada_id: string
          id: string
          ip_origem: unknown
          movimentacao_id: string
          usuario_id: string
        }[]
      }
      get_empresas_disponiveis: {
        Args: never
        Returns: {
          representada_cnpj: string
          representada_id: string
          representada_nome: string
          responsavel_id: string
          responsavel_nome: string
        }[]
      }
      get_ultimo_documento_por_venda: {
        Args: { venda_ids: string[] }
        Returns: {
          documento_id: string
          status: string
          updated_at: string
          venda_id: string
        }[]
      }
      get_user_empresa_id: { Args: never; Returns: string }
      has_permissao: {
        Args: { p_permissao: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_for_empresa: {
        Args: {
          _empresa_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_novus_owner: { Args: never; Returns: boolean }
      listar_satelites_disponiveis: {
        Args: never
        Returns: {
          codigo: string
          id: string
          nome: string
        }[]
      }
      materializar_recorrencias: {
        Args: { p_dias_antecedencia?: number }
        Returns: Json
      }
      periodicidade_meses: {
        Args: { p_periodicidade: string }
        Returns: number
      }
      precheck_source_system_nome_consistency: {
        Args: never
        Returns: {
          consistent: boolean
          distinct_source_systems: string[]
          empresa_representada_id: string
          event_count: number
          nome: string
          signature_version: string
        }[]
      }
      promote_to_dual: {
        Args: { p_nome: string; p_tenant: string }
        Returns: Json
      }
      promote_to_v2_only: {
        Args: { p_min_events?: number; p_nome: string; p_tenant: string }
        Returns: Json
      }
      recalc_saldo_estoque: {
        Args: { p_empresa: string; p_localizacao: string; p_produto: string }
        Returns: undefined
      }
      refresh_mv_fluxo_competencia: { Args: never; Returns: undefined }
      regenerar_entidade_dependencias: { Args: never; Returns: number }
      relatorio_fluxo_competencia: {
        Args: { p_data_fim: string; p_data_ini: string; p_empresa_id?: string }
        Returns: {
          ano_mes: string
          despesa_prevista: number
          despesa_realizada: number
          receita_prevista: number
          receita_realizada: number
          saldo_competencia: number
        }[]
      }
      resolver_classificacao_receita: {
        Args: { p_item_id: string }
        Returns: {
          centro_custo_id: string
          hash_classificacao: string
          natureza_receita_id: string
          plano_conta_id: string
          regra_origem: string
          regra_versao: number
        }[]
      }
      reverter_extrato: { Args: { p_extrato_id: string }; Returns: Json }
      rollback_to_dual: {
        Args: { p_nome: string; p_tenant: string }
        Returns: Json
      }
      rollback_to_v1: {
        Args: { p_nome: string; p_tenant: string }
        Returns: Json
      }
      sugerir_matches_extrato: { Args: { p_extrato_id: string }; Returns: Json }
      transferencia_bancaria_atomica: {
        Args: {
          p_centro_custo_id: string
          p_conta_destino_id: string
          p_conta_origem_id: string
          p_data_lancamento: string
          p_descricao: string
          p_empresa_id: string
          p_lote_descricao: string
          p_natureza_id: string
          p_plano_conta_id: string
          p_valor: number
        }
        Returns: string
      }
      user_has_access_to_empresa: {
        Args: { _empresa_id: string }
        Returns: boolean
      }
      validar_pagamento_venda: { Args: { p_venda_id: string }; Returns: Json }
      validar_saldo_estoque: {
        Args: { p_localizacao: string; p_produto: string; p_quantidade: number }
        Returns: Json
      }
      validate_required_user_fields: {
        Args: { p_email: string; p_full_name: string; p_phone: string }
        Returns: {
          missing_field: string
        }[]
      }
      verificar_autorizacao_venda: {
        Args: {
          p_cliente_id: string
          p_empresa_id: string
          p_valor_pretendido: number
        }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "gerente"
        | "operador"
        | "visualizador"
        | "novus_owner"
      report_export_format: "xlsx" | "pdf" | "csv"
      report_run_status: "pending" | "running" | "succeeded" | "failed"
      report_schedule_frequency: "daily" | "weekly" | "monthly"
      report_schedule_scope: "vendas" | "financeiro"
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
  centelha: {
    Enums: {},
  },
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "gerente", "operador", "visualizador", "novus_owner"],
      report_export_format: ["xlsx", "pdf", "csv"],
      report_run_status: ["pending", "running", "succeeded", "failed"],
      report_schedule_frequency: ["daily", "weekly", "monthly"],
      report_schedule_scope: ["vendas", "financeiro"],
    },
  },
} as const
