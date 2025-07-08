
# Criando Nova Entidade Auditável

Este guia mostra como criar uma nova entidade com proteção automática de auditoria e soft delete.

## 1. Criar Tabela no Supabase

```sql
-- Use o template para gerar o SQL automaticamente
SELECT public.generateTableCreationSQL(
  'minha_nova_entidade',
  ARRAY[
    'nome VARCHAR(255) NOT NULL',
    'descricao TEXT',
    'categoria VARCHAR(100)',
    'ativo BOOLEAN DEFAULT true',
    'valor DECIMAL(10,2)'
  ],
  ARRAY[
    'CONSTRAINT uk_minha_entidade_nome UNIQUE (nome)'
  ]
);
```

## 2. Definir Tipos TypeScript

```typescript
// src/types/minhaEntidade.ts
export interface MinhaEntidade {
  id: string;
  nome: string;
  descricao?: string;
  categoria?: string;
  ativo: boolean;
  valor?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface MinhaEntidadeInput {
  nome: string;
  descricao?: string;
  categoria?: string;
  ativo: boolean;
  valor?: number;
}
```

## 3. Criar Serviço Auditável

```typescript
// src/services/minhaEntidadeService.ts
import { AuditableServiceTemplate } from '@/utils/auditableServiceTemplate';
import type { MinhaEntidade, MinhaEntidadeInput } from '@/types/minhaEntidade';

class MinhaEntidadeService extends AuditableServiceTemplate<MinhaEntidade> {
  constructor() {
    super('minha_nova_entidade', 'Minha Entidade');
  }

  async hasRestrictions(id: string): Promise<boolean> {
    // Implementar verificações específicas
    return false;
  }

  async criar(input: MinhaEntidadeInput): Promise<MinhaEntidade> {
    if (!input.nome?.trim()) {
      throw new Error('Nome é obrigatório');
    }
    return await this.create(input);
  }

  async atualizar(id: string, input: MinhaEntidadeInput): Promise<MinhaEntidade> {
    if (!input.nome?.trim()) {
      throw new Error('Nome é obrigatório');
    }
    return await this.update(id, input);
  }
}

export const minhaEntidadeService = new MinhaEntidadeService();
```

## 4. Criar Hook Personalizado

```typescript
// src/hooks/useMinhaEntidade.ts
import { useAuditableEntity } from '@/hooks/useAuditableEntity';
import { minhaEntidadeService } from '@/services/minhaEntidadeService';
import type { MinhaEntidade, MinhaEntidadeInput } from '@/types/minhaEntidade';

export const useMinhaEntidade = () => {
  const auditableHook = useAuditableEntity<MinhaEntidade>({
    tableName: 'minha_nova_entidade',
    entityName: 'Minha Entidade',
    validateBeforeDelete: async (id) => {
      const hasRestrictions = await minhaEntidadeService.hasRestrictions(id);
      return !hasRestrictions;
    }
  });

  const criar = async (input: MinhaEntidadeInput) => {
    const entidade = await minhaEntidadeService.criar(input);
    await auditableHook.fetchActive();
    return entidade;
  };

  const atualizar = async (id: string, input: MinhaEntidadeInput) => {
    const entidade = await minhaEntidadeService.atualizar(id, input);
    await auditableHook.fetchActive();
    return entidade;
  };

  return {
    ...auditableHook,
    entidades: auditableHook.entities,
    criar,
    atualizar,
    arquivar: auditableHook.softDelete,
    restaurar: auditableHook.restore,
  };
};
```

## 5. Criar Componentes da Interface

```tsx
// src/components/MinhaEntidadeCard.tsx
import { ArchiveButton } from '@/components/ui/ArchiveButton';
import { AuditTrail } from '@/components/ui/AuditTrail';
import { Card } from '@/components/ui/card';

interface Props {
  entidade: MinhaEntidade;
  onArchive: (id: string) => Promise<boolean>;
}

export const MinhaEntidadeCard = ({ entidade, onArchive }: Props) => {
  return (
    <Card className="p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{entidade.nome}</h3>
          <p className="text-sm text-muted-foreground">{entidade.descricao}</p>
        </div>
        
        <div className="flex gap-2">
          <AuditTrail
            tableName="minha_nova_entidade"
            recordId={entidade.id}
            entityName="Minha Entidade"
          />
          
          <ArchiveButton
            onArchive={() => onArchive(entidade.id)}
            entityName="Minha Entidade"
            entityId={entidade.id}
          />
        </div>
      </div>
    </Card>
  );
};
```

## 6. Página Principal

```tsx
// src/pages/MinhaEntidade.tsx
import { useMinhaEntidade } from '@/hooks/useMinhaEntidade';
import { MinhaEntidadeCard } from '@/components/MinhaEntidadeCard';

export const MinhaEntidadePage = () => {
  const {
    entidades,
    loading,
    arquivar,
    carregarAtivos,
    carregarArquivados
  } = useMinhaEntidade();

  useEffect(() => {
    carregarAtivos();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1>Minha Entidade</h1>
        <div className="flex gap-2">
          <Button onClick={carregarAtivos}>Ativos</Button>
          <Button onClick={carregarArquivados} variant="outline">Arquivados</Button>
        </div>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : (
        <div className="grid gap-4">
          {entidades.map(entidade => (
            <MinhaEntidadeCard
              key={entidade.id}
              entidade={entidade}
              onArchive={arquivar}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

## ✅ Recursos Automáticos Incluídos

- **Soft Delete**: Registros nunca são excluídos fisicamente
- **Auditoria**: Todas as operações são logadas automaticamente
- **Triggers**: Proteção contra exclusão física no banco
- **RLS**: Políticas de segurança aplicadas
- **Componentes**: Botões padronizados para arquivar/restaurar
- **Histórico**: Visualização completa da trilha de auditoria
- **Validações**: Verificação de vínculos antes de arquivar

## 🔄 Herança Automática

Qualquer nova entidade criada seguindo este padrão automaticamente herda:
- Sistema de auditoria completo
- Proteção contra exclusão física
- Interface padronizada
- Logs imutáveis
- Trilha de operações

## 📋 Checklist de Implementação

- [ ] SQL executado com `generateTableCreationSQL()`
- [ ] Tipos TypeScript definidos
- [ ] Serviço criado estendendo `AuditableServiceTemplate`
- [ ] Hook criado usando `useAuditableEntity`
- [ ] Componentes usando `ArchiveButton` e `AuditTrail`
- [ ] Página implementada com filtros ativo/arquivado
- [ ] Testes de arquivamento e restauração realizados
