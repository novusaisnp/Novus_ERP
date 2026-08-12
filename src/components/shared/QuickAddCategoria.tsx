import React, { useState } from 'react';
import { QuickAddButton } from '@/components/modules/rh/QuickAddButton';
import { FormCategoria } from '@/components/modules/FormCategoria';
import type { QuickAddResult } from '@/components/shared/QuickAddDialog';
import type { CategoriaInsert } from '@/services/categoriaService';
import { getEmpresaAtivaIdOuFalha } from '@/lib/empresaAtiva';
import { useCreateCategoria } from '@/hooks/useCategorias';

interface Props {
  onCreated: (created: QuickAddResult) => void | Promise<void>;
}

export const QuickAddCategoria: React.FC<Props> = ({ onCreated }) => {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateCategoria();

  const create = async (input: CategoriaInsert) => {
    const created = await createMutation.mutateAsync({
      ...input,
      empresa_representada_id: await getEmpresaAtivaIdOuFalha(),
    });
    await onCreated({ id: created.id, nome: created.nome });
    setOpen(false);
  };

  return (
    <>
      <QuickAddButton onClick={() => setOpen(true)} tooltip="Cadastrar categoria" />
      <FormCategoria
        open={open}
        modal={false}
        onClose={() => !createMutation.isPending && setOpen(false)}
        onSubmit={create}
        isLoading={createMutation.isPending}
      />
    </>
  );
};
