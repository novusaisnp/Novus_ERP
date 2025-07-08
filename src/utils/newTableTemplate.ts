
/**
 * Template SQL para criar novas tabelas com proteção automática
 * Use este template sempre que criar uma nova tabela crítica
 */

export const generateTableCreationSQL = (
  tableName: string,
  columns: string[],
  additionalConstraints?: string[]
): string => {
  const baseColumns = [
    'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
    'created_at TIMESTAMPTZ NOT NULL DEFAULT now()',
    'updated_at TIMESTAMPTZ NOT NULL DEFAULT now()',
    'deleted_at TIMESTAMPTZ DEFAULT NULL'
  ];

  const allColumns = [...columns, ...baseColumns];
  const allConstraints = additionalConstraints || [];

  return `
-- Criar tabela ${tableName} com proteção automática
CREATE TABLE public.${tableName} (
  ${allColumns.join(',\n  ')}${allConstraints.length > 0 ? ',\n  ' + allConstraints.join(',\n  ') : ''}
);

-- Habilitar RLS
ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;

-- Política básica de acesso (ajustar conforme necessário)
CREATE POLICY "Permitir acesso total para usuários autenticados - ${tableName}" 
  ON public.${tableName}
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Adicionar índice para deleted_at
CREATE INDEX idx_${tableName}_deleted_at ON public.${tableName}(deleted_at);

-- Adicionar trigger de updated_at
CREATE TRIGGER trigger_${tableName}_updated_at
  BEFORE UPDATE ON public.${tableName}
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Aplicar trigger de auditoria automática
SELECT public.create_audit_trigger('${tableName}');

-- Comentário para documentação
COMMENT ON TABLE public.${tableName} IS 'Tabela criada com proteção automática de auditoria e soft delete';
COMMENT ON COLUMN public.${tableName}.deleted_at IS 'Soft delete timestamp - NULL = ativo, timestamp = arquivado';
`;
};

/**
 * Exemplo de uso:
 * 
 * const sql = generateTableCreationSQL(
 *   'nova_entidade',
 *   [
 *     'nome VARCHAR(255) NOT NULL',
 *     'descricao TEXT',
 *     'ativo BOOLEAN DEFAULT true'
 *   ],
 *   [
 *     'CONSTRAINT uk_nova_entidade_nome UNIQUE (nome)'
 *   ]
 * );
 */

export const newTableInstructions = `
📋 INSTRUÇÕES PARA NOVAS TABELAS

Sempre que criar uma nova tabela crítica:

1. Use a função generateTableCreationSQL() para gerar o SQL
2. Inclua as colunas padrões automaticamente:
   - id (UUID, Primary Key)
   - created_at (Timestamp)
   - updated_at (Timestamp) 
   - deleted_at (Timestamp, Soft Delete)

3. O SQL gerado já inclui:
   ✅ RLS habilitado
   ✅ Política de acesso básica
   ✅ Índice para deleted_at
   ✅ Trigger de updated_at
   ✅ Trigger de auditoria automática

4. Para o código TypeScript:
   - Use useAuditableEntity() hook
   - Use AuditableServiceTemplate para serviços
   - Use ArchiveButton em vez de botões Delete
   - Use AuditTrail para histórico

5. Tipos TypeScript devem estender:
   interface MinhaEntidade {
     id: string;
     created_at?: string;
     updated_at?: string;
     deleted_at?: string | null;
     // ... outros campos
   }

Exemplo completo em /docs/examples/new-auditable-entity.md
`;
