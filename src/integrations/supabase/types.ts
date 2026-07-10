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
      agencias_bancarias: {
        Row: {
          ativo: boolean | null
          banco_id: string
          created_at: string
          digito: string | null
          email: string | null
          empresa_representada_id: string
          endereco: string | null
          id: string
          nome: string | null
          numero: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          banco_id: string
          created_at?: string
          digito?: string | null
          email?: string | null
          empresa_representada_id: string
          endereco?: string | null
          id?: string
          nome?: string | null
          numero: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          banco_id?: string
          created_at?: string
          digito?: string | null
          email?: string | null
          empresa_representada_id?: string
          endereco?: string | null
          id?: string
          nome?: string | null
          numero?: string
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
      bancos: {
        Row: {
          ativo: boolean | null
          codigo: string | null
          created_at: string
          empresa_representada_id: string
          id: string
          ispb: string | null
          logo_url: string | null
          nome: string
          nome_curto: string | null
          site: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          codigo?: string | null
          created_at?: string
          empresa_representada_id: string
          id?: string
          ispb?: string | null
          logo_url?: string | null
          nome: string
          nome_curto?: string | null
          site?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          codigo?: string | null
          created_at?: string
          empresa_representada_id?: string
          id?: string
          ispb?: string | null
          logo_url?: string | null
          nome?: string
          nome_curto?: string | null
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
            referencedRelation: "colaboradores"
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
      colaboradores: {
        Row: {
          agencia: string | null
          ativo: boolean | null
          bairro: string | null
          banco: string | null
          carga_horaria: number | null
          cargo_id: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          conta: string | null
          cpf: string | null
          created_at: string | null
          ctps: string | null
          data_admissao: string | null
          data_demissao: string | null
          data_nascimento: string | null
          deleted_at: string | null
          departamento_id: string | null
          email: string | null
          email_corporativo: string | null
          empresa_representada_id: string
          escolaridade: string | null
          estado: string | null
          estado_civil: string | null
          foto_url: string | null
          id: string
          logradouro: string | null
          nome: string
          numero: string | null
          observacoes: string | null
          pis: string | null
          pix: string | null
          regime_trabalho: string | null
          rg: string | null
          salario: number | null
          serie_ctps: string | null
          setor_id: string | null
          sexo: string | null
          telefone: string | null
          tipo_conta: string | null
          tipo_contrato: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean | null
          bairro?: string | null
          banco?: string | null
          carga_horaria?: number | null
          cargo_id?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          conta?: string | null
          cpf?: string | null
          created_at?: string | null
          ctps?: string | null
          data_admissao?: string | null
          data_demissao?: string | null
          data_nascimento?: string | null
          deleted_at?: string | null
          departamento_id?: string | null
          email?: string | null
          email_corporativo?: string | null
          empresa_representada_id: string
          escolaridade?: string | null
          estado?: string | null
          estado_civil?: string | null
          foto_url?: string | null
          id?: string
          logradouro?: string | null
          nome: string
          numero?: string | null
          observacoes?: string | null
          pis?: string | null
          pix?: string | null
          regime_trabalho?: string | null
          rg?: string | null
          salario?: number | null
          serie_ctps?: string | null
          setor_id?: string | null
          sexo?: string | null
          telefone?: string | null
          tipo_conta?: string | null
          tipo_contrato?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          agencia?: string | null
          ativo?: boolean | null
          bairro?: string | null
          banco?: string | null
          carga_horaria?: number | null
          cargo_id?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          conta?: string | null
          cpf?: string | null
          created_at?: string | null
          ctps?: string | null
          data_admissao?: string | null
          data_demissao?: string | null
          data_nascimento?: string | null
          deleted_at?: string | null
          departamento_id?: string | null
          email?: string | null
          email_corporativo?: string | null
          empresa_representada_id?: string
          escolaridade?: string | null
          estado?: string | null
          estado_civil?: string | null
          foto_url?: string | null
          id?: string
          logradouro?: string | null
          nome?: string
          numero?: string | null
          observacoes?: string | null
          pis?: string | null
          pix?: string | null
          regime_trabalho?: string | null
          rg?: string | null
          salario?: number | null
          serie_ctps?: string | null
          setor_id?: string | null
          sexo?: string | null
          telefone?: string | null
          tipo_conta?: string | null
          tipo_contrato?: string | null
          updated_at?: string | null
          whatsapp?: string | null
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
          {
            foreignKeyName: "colaboradores_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_bancarias: {
        Row: {
          agencia_id: string | null
          ativo: boolean | null
          banco_id: string | null
          cor: string | null
          cpf_cnpj_titular: string | null
          created_at: string
          data_saldo_inicial: string | null
          deleted_at: string | null
          descricao: string | null
          digito: string | null
          empresa_representada_id: string
          icone: string | null
          id: string
          limite_cheque_especial: number | null
          nome_titular: string | null
          numero_conta: string
          permite_transferencia: boolean | null
          principal: boolean | null
          saldo_atual: number | null
          saldo_inicial: number | null
          tipo_conta: string | null
          updated_at: string
        }
        Insert: {
          agencia_id?: string | null
          ativo?: boolean | null
          banco_id?: string | null
          cor?: string | null
          cpf_cnpj_titular?: string | null
          created_at?: string
          data_saldo_inicial?: string | null
          deleted_at?: string | null
          descricao?: string | null
          digito?: string | null
          empresa_representada_id: string
          icone?: string | null
          id?: string
          limite_cheque_especial?: number | null
          nome_titular?: string | null
          numero_conta: string
          permite_transferencia?: boolean | null
          principal?: boolean | null
          saldo_atual?: number | null
          saldo_inicial?: number | null
          tipo_conta?: string | null
          updated_at?: string
        }
        Update: {
          agencia_id?: string | null
          ativo?: boolean | null
          banco_id?: string | null
          cor?: string | null
          cpf_cnpj_titular?: string | null
          created_at?: string
          data_saldo_inicial?: string | null
          deleted_at?: string | null
          descricao?: string | null
          digito?: string | null
          empresa_representada_id?: string
          icone?: string | null
          id?: string
          limite_cheque_especial?: number | null
          nome_titular?: string | null
          numero_conta?: string
          permite_transferencia?: boolean | null
          principal?: boolean | null
          saldo_atual?: number | null
          saldo_inicial?: number | null
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
          centro_custo_id: string | null
          created_at: string
          data_emissao: string | null
          data_pagamento: string | null
          data_vencimento: string
          deleted_at: string | null
          descricao: string
          empresa_representada_id: string
          fornecedor_id: string | null
          id: string
          natureza_id: string | null
          numero_documento: string | null
          numero_parcela: number | null
          observacoes: string | null
          plano_conta_id: string | null
          plano_pagamento_id: string | null
          status: string | null
          total_parcelas: number | null
          updated_at: string
          valor_desconto: number | null
          valor_juros: number | null
          valor_multa: number | null
          valor_original: number
          valor_pago: number | null
        }
        Insert: {
          centro_custo_id?: string | null
          created_at?: string
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          deleted_at?: string | null
          descricao: string
          empresa_representada_id: string
          fornecedor_id?: string | null
          id?: string
          natureza_id?: string | null
          numero_documento?: string | null
          numero_parcela?: number | null
          observacoes?: string | null
          plano_conta_id?: string | null
          plano_pagamento_id?: string | null
          status?: string | null
          total_parcelas?: number | null
          updated_at?: string
          valor_desconto?: number | null
          valor_juros?: number | null
          valor_multa?: number | null
          valor_original: number
          valor_pago?: number | null
        }
        Update: {
          centro_custo_id?: string | null
          created_at?: string
          data_emissao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          deleted_at?: string | null
          descricao?: string
          empresa_representada_id?: string
          fornecedor_id?: string | null
          id?: string
          natureza_id?: string | null
          numero_documento?: string | null
          numero_parcela?: number | null
          observacoes?: string | null
          plano_conta_id?: string | null
          plano_pagamento_id?: string | null
          status?: string | null
          total_parcelas?: number | null
          updated_at?: string
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
            referencedRelation: "fornecedores"
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
          centro_custo_id: string | null
          cliente_id: string | null
          created_at: string
          data_emissao: string | null
          data_recebimento: string | null
          data_vencimento: string
          deleted_at: string | null
          descricao: string
          empresa_representada_id: string
          id: string
          natureza_id: string | null
          numero_documento: string | null
          numero_parcela: number | null
          observacoes: string | null
          plano_conta_id: string | null
          plano_pagamento_id: string | null
          status: string | null
          total_parcelas: number | null
          updated_at: string
          valor_desconto: number | null
          valor_juros: number | null
          valor_multa: number | null
          valor_original: number
          valor_recebido: number | null
        }
        Insert: {
          centro_custo_id?: string | null
          cliente_id?: string | null
          created_at?: string
          data_emissao?: string | null
          data_recebimento?: string | null
          data_vencimento: string
          deleted_at?: string | null
          descricao: string
          empresa_representada_id: string
          id?: string
          natureza_id?: string | null
          numero_documento?: string | null
          numero_parcela?: number | null
          observacoes?: string | null
          plano_conta_id?: string | null
          plano_pagamento_id?: string | null
          status?: string | null
          total_parcelas?: number | null
          updated_at?: string
          valor_desconto?: number | null
          valor_juros?: number | null
          valor_multa?: number | null
          valor_original: number
          valor_recebido?: number | null
        }
        Update: {
          centro_custo_id?: string | null
          cliente_id?: string | null
          created_at?: string
          data_emissao?: string | null
          data_recebimento?: string | null
          data_vencimento?: string
          deleted_at?: string | null
          descricao?: string
          empresa_representada_id?: string
          id?: string
          natureza_id?: string | null
          numero_documento?: string | null
          numero_parcela?: number | null
          observacoes?: string | null
          plano_conta_id?: string | null
          plano_pagamento_id?: string | null
          status?: string | null
          total_parcelas?: number | null
          updated_at?: string
          valor_desconto?: number | null
          valor_juros?: number | null
          valor_multa?: number | null
          valor_original?: number
          valor_recebido?: number | null
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
            referencedRelation: "clientes"
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
        ]
      }
      contratos: {
        Row: {
          arquivo_url: string | null
          cliente_id: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          deleted_at: string | null
          descricao: string | null
          dia_vencimento: number | null
          empresa_representada_id: string
          gera_financeiro: boolean | null
          id: string
          numero_contrato: string | null
          observacoes: string | null
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
          cliente_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          deleted_at?: string | null
          descricao?: string | null
          dia_vencimento?: number | null
          empresa_representada_id: string
          gera_financeiro?: boolean | null
          id?: string
          numero_contrato?: string | null
          observacoes?: string | null
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
          cliente_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          deleted_at?: string | null
          descricao?: string | null
          dia_vencimento?: number | null
          empresa_representada_id?: string
          gera_financeiro?: boolean | null
          id?: string
          numero_contrato?: string | null
          observacoes?: string | null
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
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
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
            referencedRelation: "colaboradores"
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
      documentos_movimentacoes_bancarias: {
        Row: {
          created_at: string
          descricao: string | null
          empresa_representada_id: string
          id: string
          movimentacao_id: string
          nome_arquivo: string
          tamanho_bytes: number | null
          tipo_arquivo: string | null
          url_arquivo: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          empresa_representada_id: string
          id?: string
          movimentacao_id: string
          nome_arquivo: string
          tamanho_bytes?: number | null
          tipo_arquivo?: string | null
          url_arquivo: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          empresa_representada_id?: string
          id?: string
          movimentacao_id?: string
          nome_arquivo?: string
          tamanho_bytes?: number | null
          tipo_arquivo?: string | null
          url_arquivo?: string
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
          conta_pagar_id: string | null
          conta_receber_id: string | null
          created_at: string
          descricao: string | null
          empresa_representada_id: string
          id: string
          nome_arquivo: string
          tamanho_bytes: number | null
          tipo_arquivo: string | null
          url_arquivo: string
        }
        Insert: {
          conta_pagar_id?: string | null
          conta_receber_id?: string | null
          created_at?: string
          descricao?: string | null
          empresa_representada_id: string
          id?: string
          nome_arquivo: string
          tamanho_bytes?: number | null
          tipo_arquivo?: string | null
          url_arquivo: string
        }
        Update: {
          conta_pagar_id?: string | null
          conta_receber_id?: string | null
          created_at?: string
          descricao?: string | null
          empresa_representada_id?: string
          id?: string
          nome_arquivo?: string
          tamanho_bytes?: number | null
          tipo_arquivo?: string | null
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
            referencedRelation: "colaboradores"
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
          empresa_representada_id: string
          id: string
          ip_origem: unknown
          registro_id: string
          tabela_origem: string
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
          registro_id: string
          tabela_origem: string
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
          registro_id?: string
          tabela_origem?: string
          usuario_id?: string | null
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
          created_at: string
          desconto_item: number | null
          descricao: string
          empresa_representada_id: string
          id: string
          observacoes: string | null
          ordem: number | null
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          servico_id: string | null
          unidade: string | null
          updated_at: string
          valor_total_item: number | null
          venda_id: string
        }
        Insert: {
          acrescimo_item?: number | null
          created_at?: string
          desconto_item?: number | null
          descricao: string
          empresa_representada_id: string
          id?: string
          observacoes?: string | null
          ordem?: number | null
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          servico_id?: string | null
          unidade?: string | null
          updated_at?: string
          valor_total_item?: number | null
          venda_id: string
        }
        Update: {
          acrescimo_item?: number | null
          created_at?: string
          desconto_item?: number | null
          descricao?: string
          empresa_representada_id?: string
          id?: string
          observacoes?: string | null
          ordem?: number | null
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          servico_id?: string | null
          unidade?: string | null
          updated_at?: string
          valor_total_item?: number | null
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_venda_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
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
          created_at: string
          data_liquidacao: string
          empresa_representada_id: string
          forma_pagamento: string | null
          id: string
          observacoes: string | null
          valor_total: number
        }
        Insert: {
          created_at?: string
          data_liquidacao: string
          empresa_representada_id: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          valor_total: number
        }
        Update: {
          created_at?: string
          data_liquidacao?: string
          empresa_representada_id?: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "liquidacoes_multiplas_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
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
          data_liquidacao: string
          empresa_representada_id: string
          forma_pagamento: string | null
          historico: string | null
          id: string
          motivo_cancelamento: string | null
          natureza_id: string | null
          numero_cheque: string | null
          plano_conta_id: string | null
          updated_at: string
          valor_desconto: number | null
          valor_juros: number | null
          valor_multa: number | null
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
          data_liquidacao: string
          empresa_representada_id: string
          forma_pagamento?: string | null
          historico?: string | null
          id?: string
          motivo_cancelamento?: string | null
          natureza_id?: string | null
          numero_cheque?: string | null
          plano_conta_id?: string | null
          updated_at?: string
          valor_desconto?: number | null
          valor_juros?: number | null
          valor_multa?: number | null
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
          data_liquidacao?: string
          empresa_representada_id?: string
          forma_pagamento?: string | null
          historico?: string | null
          id?: string
          motivo_cancelamento?: string | null
          natureza_id?: string | null
          numero_cheque?: string | null
          plano_conta_id?: string | null
          updated_at?: string
          valor_desconto?: number | null
          valor_juros?: number | null
          valor_multa?: number | null
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
          empresa_representada_id: string
          id: string
          motivo_cancelamento: string | null
          status: string | null
          tipo: string
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          cancelado_em?: string | null
          created_at?: string
          data_lancamento: string
          descricao?: string | null
          empresa_representada_id: string
          id?: string
          motivo_cancelamento?: string | null
          status?: string | null
          tipo: string
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          cancelado_em?: string | null
          created_at?: string
          data_lancamento?: string
          descricao?: string | null
          empresa_representada_id?: string
          id?: string
          motivo_cancelamento?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string
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
      movimentacoes_bancarias: {
        Row: {
          beneficiario_pagador: string | null
          centro_custo_id: string | null
          conciliado: boolean | null
          conta_bancaria_id: string
          created_at: string
          created_by: string | null
          data_compensacao: string | null
          data_conciliacao: string | null
          data_lancamento: string
          deleted_at: string | null
          descricao: string
          empresa_representada_id: string
          historico: string | null
          id: string
          lote_id: string | null
          natureza_id: string | null
          numero_documento: string | null
          plano_conta_id: string | null
          saldo_anterior: number | null
          saldo_posterior: number | null
          status: string | null
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          beneficiario_pagador?: string | null
          centro_custo_id?: string | null
          conciliado?: boolean | null
          conta_bancaria_id: string
          created_at?: string
          created_by?: string | null
          data_compensacao?: string | null
          data_conciliacao?: string | null
          data_lancamento: string
          deleted_at?: string | null
          descricao: string
          empresa_representada_id: string
          historico?: string | null
          id?: string
          lote_id?: string | null
          natureza_id?: string | null
          numero_documento?: string | null
          plano_conta_id?: string | null
          saldo_anterior?: number | null
          saldo_posterior?: number | null
          status?: string | null
          tipo: string
          updated_at?: string
          valor: number
        }
        Update: {
          beneficiario_pagador?: string | null
          centro_custo_id?: string | null
          conciliado?: boolean | null
          conta_bancaria_id?: string
          created_at?: string
          created_by?: string | null
          data_compensacao?: string | null
          data_conciliacao?: string | null
          data_lancamento?: string
          deleted_at?: string | null
          descricao?: string
          empresa_representada_id?: string
          historico?: string | null
          id?: string
          lote_id?: string | null
          natureza_id?: string | null
          numero_documento?: string | null
          plano_conta_id?: string | null
          saldo_anterior?: number | null
          saldo_posterior?: number | null
          status?: string | null
          tipo?: string
          updated_at?: string
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
            foreignKeyName: "movimentacoes_bancarias_empresa_representada_id_fkey"
            columns: ["empresa_representada_id"]
            isOneToOne: false
            referencedRelation: "empresas_representadas"
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
            referencedRelation: "colaboradores"
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
      socios_representantes: {
        Row: {
          ativo: boolean
          cargo_societario: string | null
          cpf: string | null
          created_at: string
          deleted_at: string | null
          documento_url: string | null
          email: string | null
          empresa_representada_id: string
          id: string
          nome: string
          participacao_percentual: number | null
          telefone: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cargo_societario?: string | null
          cpf?: string | null
          created_at?: string
          deleted_at?: string | null
          documento_url?: string | null
          email?: string | null
          empresa_representada_id: string
          id?: string
          nome: string
          participacao_percentual?: number | null
          telefone?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cargo_societario?: string | null
          cpf?: string | null
          created_at?: string
          deleted_at?: string | null
          documento_url?: string | null
          email?: string | null
          empresa_representada_id?: string
          id?: string
          nome?: string
          participacao_percentual?: number | null
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "socios_representantes_empresa_representada_id_fkey"
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
          colaborador_id: string | null
          created_at: string
          email: string
          empresa_representada_id: string | null
          id: string
          nome: string
          perfil_id: string | null
          pessoa_pendente: boolean
          pessoa_tipo: string | null
          socio_id: string | null
          ultimo_acesso: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          colaborador_id?: string | null
          created_at?: string
          email: string
          empresa_representada_id?: string | null
          id?: string
          nome: string
          perfil_id?: string | null
          pessoa_pendente?: boolean
          pessoa_tipo?: string | null
          socio_id?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          colaborador_id?: string | null
          created_at?: string
          email?: string
          empresa_representada_id?: string | null
          id?: string
          nome?: string
          perfil_id?: string | null
          pessoa_pendente?: boolean
          pessoa_tipo?: string | null
          socio_id?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
          user_id?: string
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
          {
            foreignKeyName: "usuarios_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "socios_representantes"
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
          id: string
          numero_venda: string | null
          observacoes: string | null
          observacoes_internas: string | null
          origem: string | null
          plano_pagamento_id: string | null
          status: string | null
          subtotal: number | null
          updated_at: string
          valor_frete: number | null
          valor_total: number | null
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
          id?: string
          numero_venda?: string | null
          observacoes?: string | null
          observacoes_internas?: string | null
          origem?: string | null
          plano_pagamento_id?: string | null
          status?: string | null
          subtotal?: number | null
          updated_at?: string
          valor_frete?: number | null
          valor_total?: number | null
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
          id?: string
          numero_venda?: string | null
          observacoes?: string | null
          observacoes_internas?: string | null
          origem?: string | null
          plano_pagamento_id?: string | null
          status?: string | null
          subtotal?: number | null
          updated_at?: string
          valor_frete?: number | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
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
            foreignKeyName: "vendas_plano_pagamento_id_fkey"
            columns: ["plano_pagamento_id"]
            isOneToOne: false
            referencedRelation: "planos_pagamento"
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
          timeout_segundos: number | null
          updated_at: string
          url_destino: string
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
          timeout_segundos?: number | null
          updated_at?: string
          url_destino: string
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
          timeout_segundos?: number | null
          updated_at?: string
          url_destino?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      get_user_empresa_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
