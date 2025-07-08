
import React from 'react';
import { DescontoPadrao } from '@/types/rh';
import { DescontoPadraoCard } from './DescontoPadraoCard';

interface DescontosPadraoListProps {
  descontos: DescontoPadrao[];
  onEdit: (desconto: DescontoPadrao) => void;
  onDelete: (desconto: DescontoPadrao) => void;
}

export const DescontosPadraoList: React.FC<DescontosPadraoListProps> = ({
  descontos,
  onEdit,
  onDelete
}) => {
  return (
    <div className="grid gap-4">
      {descontos.map((desconto) => (
        <DescontoPadraoCard
          key={desconto.id}
          desconto={desconto}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
