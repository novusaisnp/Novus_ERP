import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Upload, Calculator, Building2, AlertTriangle } from 'lucide-react';
import { Produto } from '@/types/produto';
import { produtoUtils } from '@/utils/produtoUtils';
import { ProdutoFornecedorList } from './ProdutoFornecedorList';
import { useCategorias } from '@/hooks/useCategorias';

type CategoriaOption = {
  id: string;
  nome: string;
  ativo?: boolean;
  plano_conta_receita_id?: string | null;
  plano_conta_despesa_id?: string | null;
};

interface CategoriaSelectProps {
  categorias: CategoriaOption[];
  categoriaId: string | null;
  onChange: (id: string | null) => void;
}

const CategoriaSelect: React.FC<CategoriaSelectProps> = ({
  categorias, categoriaId, onChange,
}) => {
  const selecionada = useMemo(
    () => categorias.find((c) => c.id === categoriaId),
    [categorias, categoriaId],
  );
  const classificacaoCompleta =
    !!selecionada?.plano_conta_receita_id && !!selecionada?.plano_conta_despesa_id;

  return (
    <div className="space-y-2">
      <Label htmlFor="categoria_id">Categoria</Label>
      <Select
        value={categoriaId ?? '__none__'}
        onValueChange={(v) => onChange(v === '__none__' ? null : v)}
      >
        <SelectTrigger id="categoria_id">
          <SelectValue placeholder="Selecione uma categoria..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Sem categoria</SelectItem>
          {categorias.map((c) => {
            const completa =
              !!c.plano_conta_receita_id && !!c.plano_conta_despesa_id;
            return (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
                {!c.ativo && ' (rascunho)'}
                {!completa && c.ativo && ' — sem classificação'}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {!categoriaId && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Produto sem categoria não terá classificação contábil automática.</span>
        </div>
      )}

      {selecionada && (
        <div className="rounded-md border p-3 space-y-1 text-xs bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="font-medium">Classificação Contábil Herdada</span>
            <Badge variant={classificacaoCompleta ? 'default' : 'outline'}>
              {classificacaoCompleta ? 'Completa' : 'Pendente na categoria'}
            </Badge>
          </div>
          <div className="text-muted-foreground">
            Receita: {selecionada.plano_conta_receita_id ? '✓ vinculada' : '— não definida na categoria'}
          </div>
          <div className="text-muted-foreground">
            Despesa: {selecionada.plano_conta_despesa_id ? '✓ vinculada' : '— não definida na categoria'}
          </div>
        </div>
      )}
    </div>
  );
};

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      handleInputChange('imagem_url', imageUrl);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{produto ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-6 mb-4">
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="medidas">Medidas</TabsTrigger>
              <TabsTrigger value="precos">Preços</TabsTrigger>
              <TabsTrigger value="imagem">Imagem</TabsTrigger>
              <TabsTrigger value="estoque">Estoque</TabsTrigger>
              <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
            </TabsList>

            <div className="overflow-y-auto flex-1 pr-2">
              <TabsContent value="dados" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Básicas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nome">Nome do Produto *</Label>
                        <Input
                          id="nome"
                          value={formData.nome}
                          onChange={(e) => handleInputChange('nome', e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="codigo">Código</Label>
                        <Input
                          id="codigo"
                          value={formData.codigo ?? ''}
                          onChange={(e) => handleInputChange('codigo', e.target.value || null)}
                        />
                      </div>
                    </div>

                    <CategoriaSelect
                      categorias={categorias as CategoriaOption[]}
                      categoriaId={formData.categoria_id ?? null}
                      onChange={(id) => handleInputChange('categoria_id', id)}
                    />

                    <div className="space-y-2">
                      <Label htmlFor="descricao">Descrição</Label>
                      <Textarea
                        id="descricao"
                        value={formData.descricao ?? ''}
                        onChange={(e) => handleInputChange('descricao', e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ncm">NCM</Label>
                        <Input
                          id="ncm"
                          value={formData.ncm ?? ''}
                          onChange={(e) => handleInputChange('ncm', e.target.value)}
                          placeholder="00000000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cest">CEST</Label>
                        <Input
                          id="cest"
                          value={formData.cest ?? ''}
                          onChange={(e) => handleInputChange('cest', e.target.value)}
                          placeholder="0000000"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="medidas" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Tamanhos e Medidas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="peso">Peso (kg)</Label>
                        <Input
                          id="peso"
                          type="number"
                          step="0.01"
                          value={formData.peso ?? ''}
                          onChange={(e) => handleInputChange('peso', e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="altura">Altura (cm)</Label>
                        <Input
                          id="altura"
                          type="number"
                          step="0.01"
                          value={formData.altura ?? ''}
                          onChange={(e) => handleInputChange('altura', e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="largura">Largura (cm)</Label>
                        <Input
                          id="largura"
                          type="number"
                          step="0.01"
                          value={formData.largura ?? ''}
                          onChange={(e) => handleInputChange('largura', e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="comprimento">Comprimento (cm)</Label>
                        <Input
                          id="comprimento"
                          type="number"
                          step="0.01"
                          value={formData.comprimento ?? ''}
                          onChange={(e) => handleInputChange('comprimento', e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </div>
                    </div>
                    <Separator />
                    <p className="text-xs text-muted-foreground">
                      Dimensões usadas para cálculo de frete e logística.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="precos" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Tabela de Preços</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="preco_custo">Preço de Custo</Label>
                        <CurrencyInput
                          id="preco_custo"
                          value={formData.preco_custo ?? 0}
                          onValueChange={(v) => handleInputChange('preco_custo', v || undefined)}
                          onBlur={calcularMargem}
                          placeholder="R$ 0,00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="preco_venda">Preço de Venda *</Label>
                        <CurrencyInput
                          id="preco_venda"
                          value={formData.preco_venda}
                          onValueChange={(v) => handleInputChange('preco_venda', v)}
                          onBlur={calcularMargem}
                          placeholder="R$ 0,00"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="margem_lucro">Margem de Lucro (%)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="margem_lucro"
                            type="number"
                            step="0.01"
                            value={formData.margem_lucro ?? ''}
                            onChange={(e) => handleInputChange('margem_lucro', e.target.value ? parseFloat(e.target.value) : undefined)}
                            onBlur={calcularPrecoVenda}
                          />
                          <Button type="button" variant="outline" size="sm" onClick={calcularMargem}>
                            <Calculator className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="imagem" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Imagem do Produto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                      {formData.imagem_url ? (
                        <div className="text-center space-y-2">
                          <img src={formData.imagem_url} alt="Preview" className="max-w-48 max-h-48 mx-auto rounded" />
                          <Button type="button" variant="outline" onClick={() => handleInputChange('imagem_url', '')}>
                            Remover Imagem
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center space-y-2">
                          <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                          <div>
                            <Label htmlFor="image-upload" className="cursor-pointer">
                              <span className="text-sm text-muted-foreground">
                                Clique para fazer upload ou arraste uma imagem
                              </span>
                              <Input
                                id="image-upload"
                                type="file"
                                accept="image/jpeg,image/png"
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                            </Label>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="estoque" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Controle de Estoque</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="estoque_atual">Estoque Atual</Label>
                        <Input
                          id="estoque_atual"
                          type="number"
                          value={formData.estoque_atual ?? 0}
                          onChange={(e) => handleInputChange('estoque_atual', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
                        <Input
                          id="estoque_minimo"
                          type="number"
                          value={formData.estoque_minimo ?? 0}
                          onChange={(e) => handleInputChange('estoque_minimo', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="estoque_maximo">Estoque Máximo</Label>
                        <Input
                          id="estoque_maximo"
                          type="number"
                          value={formData.estoque_maximo ?? ''}
                          onChange={(e) => handleInputChange('estoque_maximo', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fornecedores" className="space-y-4">
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
                      onFornecedoresChange={(fornecedores) => handleInputChange('fornecedores', fornecedores)}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : produto ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
