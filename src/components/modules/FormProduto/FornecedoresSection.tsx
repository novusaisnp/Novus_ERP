import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import { Produto } from '@/types/produto';
import { ProdutoFornecedorList } from '../ProdutoFornecedorList';

interface Props {
  formData: Produto;
  onChange: <K extends keyof Produto>(field: K, value: Produto[K]) => void;
}

export const FornecedoresSection: React.FC<Props> = ({ formData, onChange }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Building2 className="h-5 w-5" />
        Fornecedores do Produto
      </CardTitle>
    </CardHeader>
    <CardContent>
      <ProdutoFornecedorList
        produtoId={formData.id}
        fornecedores={formData.fornecedores || []}
        onFornecedoresChange={(fornecedores) => onChange('fornecedores', fornecedores)}
      />
    </CardContent>
  </Card>
);
