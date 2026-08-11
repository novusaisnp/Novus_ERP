// [Refatoração] Mudança para Gestão Bancária

import { Button } from '@/components/ui/button';
import { Plus, Building2 } from 'lucide-react';

interface BancosHeaderProps {
  onCreateClick: () => void;
}

export const BancosHeader = ({ onCreateClick }: BancosHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div className="flex items-center space-x-3">
        <Building2 className="h-8 w-8 text-accent-vivid" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cadastro de Bancos</h1>
          <p className="text-sm text-gray-600">
            Gerencie as instituições bancárias utilizadas pela empresa
          </p>
        </div>
      </div>
      <Button onClick={onCreateClick} className="w-full sm:w-auto">
        <Plus className="h-4 w-4 mr-2" />
        Novo Banco
      </Button>
    </div>
  );
};