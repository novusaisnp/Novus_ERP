import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QuickAddButton } from '@/components/modules/rh/QuickAddButton';
import { FormEntidade } from '@/components/modules/FormEntidade';
import { entidadeService } from '@/services/entidadeService';
import { camposPersonalizadosService } from '@/services/camposPersonalizadosService';
import type { Entidade, PapelCodigo } from '@/types/entidade';

export interface QuickAddEntidadeResult {
  id: string;
  nome: string;
}

interface QuickAddEntidadeProps {
  papel: Extract<PapelCodigo, 'CLIENTE' | 'FORNECEDOR'>;
  empresaRepresentadaId: string | null | undefined;
  onCreated: (created: QuickAddEntidadeResult) => void | Promise<void>;
  disabled?: boolean;
}

const ROTULO: Record<'CLIENTE' | 'FORNECEDOR', string> = {
  CLIENTE: 'Cliente',
  FORNECEDOR: 'Fornecedor',
};

/**
 * Cadastro rápido de entidade (Cliente/Fornecedor) sem sair do formulário
 * financeiro — embute o mesmo `FormEntidade`/`entidadeService` do cadastro
 * central (`src/pages/cadastros/Entidades.tsx`), não um form próprio, pra não
 * abrir uma segunda validação divergente (ex. indicador de IE obrigatório
 * para papel Cliente, campos personalizados obrigatórios por empresa).
 */
export const QuickAddEntidade: React.FC<QuickAddEntidadeProps> = ({
  papel,
  empresaRepresentadaId,
  onCreated,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: camposPersonalizados = [] } = useQuery({
    queryKey: ['campos-personalizados-ativos', empresaRepresentadaId],
    queryFn: () => camposPersonalizadosService.listar(empresaRepresentadaId as string, true),
    enabled: open && !!empresaRepresentadaId,
  });

  const handleSave = async (entidade: Entidade): Promise<boolean> => {
    setLoading(true);
    try {
      const created = await entidadeService.createEntidade(entidade);
      await onCreated({ id: created.id as string, nome: created.nome });
      setOpen(false);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível cadastrar.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <QuickAddButton
        onClick={() => setOpen(true)}
        tooltip={`Cadastrar ${ROTULO[papel].toLowerCase()}`}
        disabled={disabled || !empresaRepresentadaId}
      />
      <Dialog modal={false} open={open} onOpenChange={(next) => !loading && setOpen(next)}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo {ROTULO[papel]}</DialogTitle>
          </DialogHeader>
          {empresaRepresentadaId && (
            <FormEntidade
              empresaRepresentadaId={empresaRepresentadaId}
              papeisIniciais={[papel]}
              onSave={handleSave}
              onCancel={() => setOpen(false)}
              loading={loading}
              camposPersonalizados={camposPersonalizados}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
