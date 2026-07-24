// Ponto único de validação de dados de entrada contra os contratos canônicos
// do NOVUS ERP (ver docs/CONTRATOS_CANONICOS_ERP.md). Consumido hoje pela UI
// e, no futuro, pela camada de adaptadores de sistemas satélite (PDV,
// sistema escolar, etc.) antes da ingestão via sync-webhook.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { canonicalSchemas, canonicalObjectSchemas, type CanonicalTable } from "../_shared/canonical/entities.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const result = validateAgainstCanonicalContract(table, data, operation);

    return new Response(JSON.stringify(result), {
      status: result.valid ? 200 : 400,
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

function validateAgainstCanonicalContract(table: string, data: unknown, operation: string) {
  const key = table.toLowerCase() as CanonicalTable;
  const objectSchema = canonicalObjectSchemas[key];

  if (!objectSchema) {
    console.warn(`Contrato canônico não encontrado para tabela: ${table}`);
    return {
      valid: true,
      warnings: [`Contrato canônico não encontrado para tabela: ${table}`],
      table,
      operation,
    };
  }

  // Em updates, campos obrigatórios podem legitimamente estar ausentes do
  // payload parcial (só os campos alterados são enviados), e regras cruzadas
  // (superRefine) não se aplicam de forma confiável a um payload incompleto —
  // por isso updates usam o schema-objeto puro com `.partial()`, e apenas
  // inserts (registro completo) usam o schema com as regras cruzadas.
  const parseResult = operation === 'update'
    ? objectSchema.partial().safeParse(data)
    : canonicalSchemas[key].safeParse(data);

  if (parseResult.success) {
    return {
      valid: true,
      errors: [],
      warnings: [],
      validated_fields: Object.keys(objectSchema.shape),
      table,
      operation,
    };
  }

  const errors = parseResult.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });

  return {
    valid: false,
    errors,
    warnings: [],
    table,
    operation,
  };
}
