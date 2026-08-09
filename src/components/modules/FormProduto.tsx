import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Produto } from '@/types/produto';
import { produtoUtils } from '@/utils/produtoUtils';
import { useCategorias } from '@/hooks/useCategorias';
import { CategoriaOption } from './FormProduto/CategoriaSelect';
import { DadosBasicosSection } from './FormProduto/DadosBasicosSection';
import { MedidasSection } from './FormProduto/MedidasSection';
import { PrecosSection } from './FormProduto/PrecosSection';
import { ImagemSection } from './FormProduto/ImagemSection';
import { EstoqueSection } from './FormProduto/EstoqueSection';
import { FornecedoresSection } from './FormProduto/FornecedoresSection';

interface FormProdutoProps {
  produto?: Produto;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (produto: Produto) => Promise<boolean>;
  loading?: boolean;
}

const emptyProduto = (): Produto => ({
  nome: '',
  descricao: '',
  codigo: null,
  categoria_id: null,
  peso: undefined,
  altura: undefined,
  largura: undefined,
  comprimento: undefined,
  preco_custo: undefined,
  preco_venda: 0,
  margem_lucro: undefined,
  imagem_url: '',
  ncm: '',
  cest: '',
  estoque_atual: 0,
  estoque_minimo: 0,
  ativo: true,
  fornecedores: [],
});

export const FormProduto: React.FC<FormProdutoProps> = ({
  produto,
  isOpen,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [activeTab, setActiveTab] = useState('dados');
  const { data: categorias = [] } = useCategorias();

  const [formData, setFormData] = useState<Produto>(emptyProduto());

  useEffect(() => {
    if (produto) {
      setFormData({ ...produto, fornecedores: produto.fornecedores || [] });
    } else {
      setFormData(emptyProduto());
    }
    setActiveTab('dados');
  }, [produto, isOpen]);

  const handleInputChange = <K extends keyof Produto>(field: K, value: Produto[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const calcularMargem = () => {
    if (formData.preco_custo && formData.preco_venda) {
      const margem = produtoUtils.calcularMargemLucro(formData.preco_custo, formData.preco_venda);
      handleInputChange('margem_lucro', Number(margem.toFixed(2)));
    }
  };

  const calcularPrecoVenda = () => {
    if (formData.preco_custo && formData.margem_lucro) {
      const preco = produtoUtils.calcularPrecoVenda(formData.preco_custo, formData.margem_lucro);
      handleInputChange('preco_venda', Number(preco.toFixed(2)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSubmit(formData);
    if (success) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{produto ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-6 mb-4 bg-transparent p-0 border-b rounded-none">
              <TabsTrigger value="dados" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--accent-vivid))] data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium">Dados</TabsTrigger>
              <TabsTrigger value="medidas" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--accent-vivid))] data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium">Medidas</TabsTrigger>
              <TabsTrigger value="precos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--accent-vivid))] data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium">Preços</TabsTrigger>
              <TabsTrigger value="imagem" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--accent-vivid))] data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium">Imagem</TabsTrigger>
              <TabsTrigger value="estoque" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--accent-vivid))] data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium">Estoque</TabsTrigger>
              <TabsTrigger value="fornecedores" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--accent-vivid))] data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium">Fornecedores</TabsTrigger>
            </TabsList>

            <div className="overflow-y-auto flex-1 pr-2">
              <TabsContent value="dados" className="space-y-4">
                <DadosBasicosSection
                  formData={formData}
                  categorias={categorias as CategoriaOption[]}
                  onChange={handleInputChange}
                />
              </TabsContent>

              <TabsContent value="medidas" className="space-y-4">
                <MedidasSection formData={formData} onChange={handleInputChange} />
              </TabsContent>

              <TabsContent value="precos" className="space-y-4">
                <PrecosSection
                  formData={formData}
                  onChange={handleInputChange}
                  onCalcularMargem={calcularMargem}
                  onCalcularPrecoVenda={calcularPrecoVenda}
                />
              </TabsContent>

              <TabsContent value="imagem" className="space-y-4">
                <ImagemSection formData={formData} onChange={handleInputChange} />
              </TabsContent>

              <TabsContent value="estoque" className="space-y-4">
                <EstoqueSection formData={formData} onChange={handleInputChange} />
              </TabsContent>

              <TabsContent value="fornecedores" className="space-y-4">
                <FornecedoresSection formData={formData} onChange={handleInputChange} />
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" data-testid="produto-salvar-btn" disabled={loading}>
              {loading ? 'Salvando...' : produto ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
