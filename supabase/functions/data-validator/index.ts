import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'phone' | 'cpf' | 'cnpj' | 'date' | 'number' | 'string';
  message?: string;
}

interface ValidationSchema {
  [table: string]: ValidationRule[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { table, data, operation = 'insert' } = await req.json();

    if (!table || !data) {
      return new Response(JSON.stringify({
        valid: false,
        errors: ['Tabela e dados são obrigatórios']
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Validando dados para tabela: ${table}, operação: ${operation}`);

    const validationResult = validateData(table, data, operation);

    return new Response(JSON.stringify(validationResult), {
      status: validationResult.valid ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na validação:', error);
    
    return new Response(JSON.stringify({
      valid: false,
      errors: [`Erro interno: ${error.message}`]
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function validateData(table: string, data: any, operation: string) {
  const schema = getValidationSchema();
  const rules = schema[table.toLowerCase()];

  if (!rules) {
    console.warn(`Esquema de validação não encontrado para tabela: ${table}`);
    return {
      valid: true,
      warnings: [`Esquema de validação não encontrado para tabela: ${table}`]
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Validar cada regra
  for (const rule of rules) {
    const value = data[rule.field];
    const validationResult = validateField(rule, value, data);

    if (!validationResult.valid) {
      errors.push(validationResult.message || `Campo ${rule.field} inválido`);
    }

    if (validationResult.warning) {
      warnings.push(validationResult.warning);
    }
  }

  // Validações específicas por tabela
  const specificValidation = validateSpecificBusinessRules(table, data, operation);
  errors.push(...specificValidation.errors);
  warnings.push(...specificValidation.warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    validated_fields: rules.map(r => r.field),
    table,
    operation
  };
}

function validateField(rule: ValidationRule, value: any, data: any) {
  switch (rule.type) {
    case 'required':
      return {
        valid: value !== null && value !== undefined && value !== '',
        message: rule.message || `Campo ${rule.field} é obrigatório`
      };

    case 'email':
      if (!value) return { valid: true }; // Campo opcional
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return {
        valid: emailRegex.test(value),
        message: rule.message || `Campo ${rule.field} deve ser um email válido`
      };

    case 'phone':
      if (!value) return { valid: true }; // Campo opcional
      const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$|^\d{10,11}$/;
      return {
        valid: phoneRegex.test(value.replace(/\D/g, '')),
        message: rule.message || `Campo ${rule.field} deve ser um telefone válido`
      };

    case 'cpf':
      if (!value) return { valid: true }; // Campo opcional
      return {
        valid: validateCPF(value),
        message: rule.message || `Campo ${rule.field} deve ser um CPF válido`
      };

    case 'cnpj':
      if (!value) return { valid: true }; // Campo opcional
      return {
        valid: validateCNPJ(value),
        message: rule.message || `Campo ${rule.field} deve ser um CNPJ válido`
      };

    case 'date':
      if (!value) return { valid: true }; // Campo opcional
      const date = new Date(value);
      return {
        valid: !isNaN(date.getTime()),
        message: rule.message || `Campo ${rule.field} deve ser uma data válida`
      };

    case 'number':
      if (!value) return { valid: true }; // Campo opcional
      return {
        valid: !isNaN(Number(value)) && isFinite(Number(value)),
        message: rule.message || `Campo ${rule.field} deve ser um número válido`
      };

    case 'string':
      return {
        valid: typeof value === 'string' || value === null || value === undefined,
        message: rule.message || `Campo ${rule.field} deve ser uma string`
      };

    default:
      return { valid: true };
  }
}

function validateSpecificBusinessRules(table: string, data: any, operation: string) {
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (table.toLowerCase()) {
    case 'clientes':
      // Validar tipo de pessoa
      if (data.tipo === 'F' && !data.cpf && !data.cpf_cnpj) {
        errors.push('CPF é obrigatório para pessoa física');
      }
      if (data.tipo === 'J' && !data.cnpj && !data.cpf_cnpj) {
        errors.push('CNPJ é obrigatório para pessoa jurídica');
      }
      
      // Validar nome/razão social
      if (data.tipo === 'F' && !data.nome) {
        errors.push('Nome é obrigatório para pessoa física');
      }
      if (data.tipo === 'J' && !data.nome && !data.razao_social) {
        errors.push('Razão social é obrigatória para pessoa jurídica');
      }
      break;

    case 'vendas':
      // Validar valor total
      if (data.valor_total <= 0) {
        errors.push('Valor total deve ser maior que zero');
      }
      
      // Validar itens
      if (!data.itens || !Array.isArray(data.itens) || data.itens.length === 0) {
        warnings.push('Venda sem itens pode indicar problema nos dados');
      }
      
      // Validar data de venda
      if (data.data_venda) {
        const dataVenda = new Date(data.data_venda);
        const hoje = new Date();
        const umAnoAtras = new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate());
        
        if (dataVenda > hoje) {
          warnings.push('Data de venda no futuro');
        }
        if (dataVenda < umAnoAtras) {
          warnings.push('Data de venda muito antiga (mais de 1 ano)');
        }
      }
      break;

    case 'contratos':
      // Validar datas
      if (data.data_inicio && data.data_fim) {
        const inicio = new Date(data.data_inicio);
        const fim = new Date(data.data_fim);
        
        if (fim <= inicio) {
          errors.push('Data de fim deve ser posterior à data de início');
        }
      }
      
      // Validar valores
      if (data.valor_mensal && data.valor_mensal <= 0) {
        errors.push('Valor mensal deve ser maior que zero');
      }
      break;

    case 'contas_receber':
      // Validar vencimento
      if (data.data_emissao && data.data_vencimento) {
        const emissao = new Date(data.data_emissao);
        const vencimento = new Date(data.data_vencimento);
        
        if (vencimento < emissao) {
          errors.push('Data de vencimento não pode ser anterior à data de emissão');
        }
      }
      
      // Validar valores
      if (data.valor_original <= 0) {
        errors.push('Valor original deve ser maior que zero');
      }
      
      if (data.valor_pago > data.valor_original) {
        warnings.push('Valor pago maior que valor original');
      }
      break;
  }

  return { errors, warnings };
}

function getValidationSchema(): ValidationSchema {
  return {
    clientes: [
      { field: 'nome', type: 'required' },
      { field: 'tipo', type: 'required' },
      { field: 'email', type: 'email' },
      { field: 'telefone', type: 'phone' },
      { field: 'cpf_cnpj', type: 'string' },
      { field: 'data_nascimento', type: 'date' },
      { field: 'data_fundacao', type: 'date' }
    ],
    vendas: [
      { field: 'numero_venda', type: 'required' },
      { field: 'data_venda', type: 'required' },
      { field: 'valor_total', type: 'required' },
      { field: 'valor_total', type: 'number' },
      { field: 'valor_desconto', type: 'number' },
      { field: 'valor_acrescimo', type: 'number' }
    ],
    contratos: [
      { field: 'numero_contrato', type: 'required' },
      { field: 'data_inicio', type: 'required' },
      { field: 'data_inicio', type: 'date' },
      { field: 'data_fim', type: 'date' },
      { field: 'valor_mensal', type: 'number' },
      { field: 'valor_total', type: 'number' }
    ],
    contas_receber: [
      { field: 'numero_documento', type: 'required' },
      { field: 'data_emissao', type: 'required' },
      { field: 'data_vencimento', type: 'required' },
      { field: 'valor_original', type: 'required' },
      { field: 'data_emissao', type: 'date' },
      { field: 'data_vencimento', type: 'date' },
      { field: 'data_pagamento', type: 'date' },
      { field: 'valor_original', type: 'number' },
      { field: 'valor_pago', type: 'number' },
      { field: 'valor_desconto', type: 'number' }
    ]
  };
}

function validateCPF(cpf: string): boolean {
  cpf = cpf.replace(/\D/g, '');
  
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  return remainder === parseInt(cpf.charAt(10));
}

function validateCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/\D/g, '');
  
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) {
    return false;
  }

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj.charAt(i)) * weights1[i];
  }
  
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(cnpj.charAt(12))) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj.charAt(i)) * weights2[i];
  }
  
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  return digit2 === parseInt(cnpj.charAt(13));
}