
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Building2 } from 'lucide-react';
import { ProdutoFornecedor } from '@/types/produto';
import { useFornecedores } from '@/hooks/useFornecedores';
import { produtoUtils } from '@/utils/produtoUtils';

interface ProdutoFornecedorListProps {
  produtoId?: string;
  fornecedores: ProdutoFornecedor[];
  onFornecedoresChange: (fornecedores: ProdutoFornecedor[]) => void;
}

export const ProdutoFornecedorList: React.FC<ProdutoFornecedorListProps> = ({
  produtoId,
  fornecedores,
  onFornecedoresChange,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const { fornecedores: fornecedoresDisponiveis, loading: loadingFornecedores } = useFornecedores();
  
  const [formData, setFormData] = useState<ProdutoFornecedor>({
    fornecedor_id: '',
    codigo_fornecedor: '',
    descricao_fornecedor: '',
    unidade_compra: 'UN',
    fator_conversao: 1,
    preco_compra: 0,
    preco_ultima_compra: undefined,
    data_ultima_compra: undefined,
    lead_time_dias: undefined,
    pedido_minimo: undefined,
    agrupamento: '',
    observacoes: '',
    ativo: true,
  });

  const resetForm = () => {
    setFormData({
      fornecedor_id: '',
      codigo_fornecedor: '',
      descricao_fornecedor: '',
      unidade_compra: 'UN',
      fator_conversao: 1,
      preco_compra: 0,
      preco_ultima_compra: undefined,
      data_ultima_compra: undefined,
      lead_time_dias: undefined,
      pedido_minimo: undefined,
      agrupamento: '',
      observacoes: '',
      ativo: true,
    });
    setEditingIndex(null);
  };

  const handleAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (index: number) => {
    const fornecedor = fornecedores[index];
    setFormData({ ...fornecedor });
    setEditingIndex(index);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.fornecedor_id || !formData.codigo_fornecedor) {
      return;
    }

    const fornecedorSelecionado = fornecedoresDisponiveis.find(f => f.id === formData.fornecedor_id);
    const fornecedorData = {
      ...formData,
      fornecedor_nome: fornecedorSelecionado?.razaoSocial || fornecedorSelecionado?.nomeFantasia,
    };

    let novosFornecedores = [...fornecedores];
    
    if (editingIndex !== null) {
      novosFornecedores[editingIndex] = fornecedorData;
    } else {
      novosFornecedores.push(fornecedorData);
    }

    onFornecedoresChange(novosFornecedores);
    setShowModal(false);
    resetForm();
  };

  const handleRemove = (index: number) => {
    const novosFornecedores = fornecedores.filter((_, i) => i !== index);
    onFornecedoresChange(novosFornecedores);
  };

  const handleInputChange = (field: keyof ProdutoFornecedor, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {fornecedores.length} fornecedor(es) cadastrado(s)
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Fornecedor
        </Button>
      </div>

      {fornecedores.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum fornecedor cadastrado</p>
          <p className="text-sm">Clique em "Adicionar Fornecedor" para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {fornecedores.map((fornecedor, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{fornecedor.fornecedor_nome}</h4>
                    {!fornecedor.ativo && <Badge variant="secondary">Inativo</Badge>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div>Código: {fornecedor.codigo_fornecedor}</div>
                    <div>Unidade: {fornecedor.unidade_compra}</div>
                    <div>Preço: {produtoUtils.formatarPreco(fornecedor.preco_compra)}</div>
                    <div>Fator: {fornecedor.fator_conversao}x</div>
                    {fornecedor.agrupamento && <div>Agrupamento: {fornecedor.agrupamento}</div>}
                    {fornecedor.lead_time_dias && <div>Lead Time: {fornecedor.lead_time_dias} dias</div>}
                  </div>
                  {fornecedor.descricao_fornecedor && (
                    <div className="text-sm text-muted-foreground mt-2">
                      {fornecedor.descricao_fornecedor}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(index)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleRemove(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingIndex !== null ? 'Editar Fornecedor' : 'Adicionar Fornecedor'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fornecedor *</Label>
                <Select
                  value={formData.fornecedor_id}
                  onValueChange={(value) => handleInputChange('fornecedor_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedoresDisponiveis.map((fornecedor) => (
                      <SelectItem key={fornecedor.id} value={fornecedor.id!}>
                        {fornecedor.razaoSocial} {fornecedor.nomeFantasia && `(${fornecedor.nomeFantasia})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Código do Fornecedor *</Label>
                <Input
                  value={formData.codigo_fornecedor}
                  onChange={(e) => handleInputChange('codigo_fornecedor', e.target.value)}
                  placeholder="Código no fornecedor"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição no Fornecedor</Label>
              <Input
                value={formData.descricao_fornecedor}
                onChange={(e) => handleInputChange('descricao_fornecedor', e.target.value)}
                placeholder="Como o fornecedor identifica este produto"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Unidade de Compra</Label>
                <Input
                  value={formData.unidade_compra}
                  onChange={(e) => handleInputChange('unidade_compra', e.target.value)}
                  placeholder="UN, CX, KG..."
                />
              </div>
              <div className="space-y-2">
                <Label>Fator de Conversão</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.fator_conversao}
                  onChange={(e) => handleInputChange('fator_conversao', parseFloat(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label>Preço de Compra</Label>
                <CurrencyInput
                  value={formData.preco_compra}
                  onValueChange={(v) => handleInputChange('preco_compra', v)}
                  placeholder="R$ 0,00"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Agrupamento</Label>
                <Input
                  value={formData.agrupamento}
                  onChange={(e) => handleInputChange('agrupamento', e.target.value)}
                  placeholder="Pacote, Caixa, Fardo..."
                />
              </div>
              <div className="space-y-2">
                <Label>Lead Time (dias)</Label>
                <Input
                  type="number"
                  value={formData.lead_time_dias || ''}
                  onChange={(e) => handleInputChange('lead_time_dias', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
              <div className="space-y-2">
                <Label>Pedido Mínimo</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.pedido_minimo || ''}
                  onChange={(e) => handleInputChange('pedido_minimo', e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => handleInputChange('observacoes', e.target.value)}
                rows={3}
                placeholder="Informações adicionais sobre este fornecedor..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingIndex !== null ? 'Atualizar' : 'Adicionar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
