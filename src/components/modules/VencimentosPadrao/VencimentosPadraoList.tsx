
import React from 'react';
import { VencimentoPadrao } from '@/types/rh';
import { VencimentoPadraoCard } from './VencimentoPadraoCard';

interface VencimentosPadraoListProps {
  vencimentos: VencimentoPadrao[];
  onEdit: (vencimento: VencimentoPadrao) => void;
  onDelete: (vencimento: VencimentoPadrao) => void;
}

export const VencimentosPadraoList: React.FC<VencimentosPadraoListProps> = ({
  vencimentos,
  onEdit,
  onDelete
}) => {
  return (
    <div className="grid gap-4">
      {vencimentos.map((vencimento) => (
        <VencimentoPadraoCard
          key={vencimento.id}
          vencimento={vencimento}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
