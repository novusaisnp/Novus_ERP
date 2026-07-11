import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { X, Upload, Calculator, Plus, Trash2, Building2, AlertTriangle } from 'lucide-react';
import { Produto, ProdutoVariacao, ProdutoFornecedor } from '@/types/produto';
import { produtoUtils } from '@/utils/produtoUtils';
import { ProdutoFornecedorList } from './ProdutoFornecedorList';
import { useCategorias } from '@/hooks/useCategorias';


interface CategoriaSelectProps {
  categorias: any[];
  categoriaId: string | null;
  categoriaTexto?: string | null;
  onChange: (id: string | null, nome: string) => void;
}

const CategoriaSelect: React.FC<CategoriaSelectProps> = ({
  categorias, categoriaId, categoriaTexto, onChange,
}) => {
  const selecionada = useMemo(
    () => categorias.find((c) => c.id === categoriaId),
    [categorias, categoriaId],
  );
  const classificacaoCompleta =
    !!selecionada?.plano_conta_receita_id && !!selecionada?.plano_conta_despesa_id;
  const orfaTexto = !categoriaId && !!categoriaTexto;

  return (
    <div className="space-y-2">
      <Label htmlFor="categoria_id">Categoria</Label>
      <Select
        value={categoriaId ?? '__none__'}
        onValueChange={(v) => {
          if (v === '__none__') {
            onChange(null, '');
          } else {
            const cat = categorias.find((c) => c.id === v);
            onChange(v, cat?.nome ?? '');
          }
        }}
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

      {orfaTexto && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Categoria antiga: <strong>{categoriaTexto}</strong>. Reclassifique selecionando uma categoria da lista para herdar a classificação contábil.
          </span>
        </div>
      )}

      {!categoriaId && !orfaTexto && (
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

export const FormProduto: React.FC<FormProdutoProps> = ({
  produto,
  isOpen,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [activeTab, setActiveTab] = useState('dados');
  const { data: categorias = [] } = useCategorias();

  const [formData, setFormData] = useState<Produto>({
    nome: '',
    descricao: '',
    codigo_barras: '',
    categoria: '',
    unidade_medida: 'UN',
    peso: undefined,
    altura: undefined,
    largura: undefined,
    comprimento: undefined,
    variacoes: [],
    preco_compra: undefined,
    preco_venda: 0,
    margem_lucro: undefined,
    imagem: '',
    ncm: '',
    cst_csosn: '',
    cfop: '',
    cest: '',
    ficha_tecnica: '',
    modo_preparo: '',
    codigo_delivery: '',
    estoque_atual: 0,
    estoque_minimo: 0,
    custo_total: undefined,
    ativo: true,
    fornecedores: [],
  });
  
  const [novaVariacao, setNovaVariacao] = useState<ProdutoVariacao>({
    tipo: '',
    valor: '',
    preco_adicional: 0,
    codigo_barras: '',
    ativo: true,
  });

  useEffect(() => {
    if (produto) {
      console.log('[FormProduto] Editando produto:', produto);
      setFormData({ ...produto, fornecedores: produto.fornecedores || [] });
    } else {
      console.log('[FormProduto] Novo produto');
      setFormData({
        nome: '',
        descricao: '',
        codigo_barras: '',
        categoria: '',
        unidade_medida: 'UN',
        peso: undefined,
        altura: undefined,
        largura: undefined,
        comprimento: undefined,
        variacoes: [],
        preco_compra: undefined,
        preco_venda: 0,
        margem_lucro: undefined,
        imagem: '',
        ncm: '',
        cst_csosn: '',
        cfop: '',
        cest: '',
        ficha_tecnica: '',
        modo_preparo: '',
        codigo_delivery: '',
        estoque_atual: 0,
        estoque_minimo: 0,
        custo_total: undefined,
        ativo: true,
        fornecedores: [],
      });
    }
    setActiveTab('dados');
  }, [produto, isOpen]);

  const handleInputChange = (field: keyof Produto, value: any) => {
    console.log('[FormProduto] Alterando campo:', field, value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calcularMargem = () => {
    if (formData.preco_compra && formData.preco_venda) {
      const margem = produtoUtils.calcularMargemLucro(formData.preco_compra, formData.preco_venda);
      handleInputChange('margem_lucro', Number(margem.toFixed(2)));
    }
  };

  const calcularPrecoVenda = () => {
    if (formData.preco_compra && formData.margem_lucro) {
      const preco = produtoUtils.calcularPrecoVenda(formData.preco_compra, formData.margem_lucro);
      handleInputChange('preco_venda', Number(preco.toFixed(2)));
    }
  };

  const adicionarVariacao = () => {
    if (novaVariacao.tipo && novaVariacao.valor) {
      const variacoes = [...(formData.variacoes || []), { ...novaVariacao }];
      handleInputChange('variacoes', variacoes);
      setNovaVariacao({
        tipo: '',
        valor: '',
        preco_adicional: 0,
        codigo_barras: '',
        ativo: true,
      });
    }
  };

  const removerVariacao = (index: number) => {
    const variacoes = [...(formData.variacoes || [])];
    variacoes.splice(index, 1);
    handleInputChange('variacoes', variacoes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[FormProduto] Enviando formulário:', formData);
    
    const success = await onSubmit(formData);
    if (success) {
      onClose();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Aqui seria implementado o upload real da imagem
      // Por enquanto, apenas simula a URL
      const imageUrl = URL.createObjectURL(file);
      handleInputChange('imagem', imageUrl);
      console.log('[FormProduto] Imagem carregada:', file.name);
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
            <TabsList className="grid w-full grid-cols-10 mb-4">
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="medidas">Medidas</TabsTrigger>
              <TabsTrigger value="variacoes">Variações</TabsTrigger>
              <TabsTrigger value="precos">Preços</TabsTrigger>
              <TabsTrigger value="imagem">Imagem</TabsTrigger>
              <TabsTrigger value="tributacao">Tributação</TabsTrigger>
              <TabsTrigger value="ficha">Ficha</TabsTrigger>
              <TabsTrigger value="delivery">Delivery</TabsTrigger>
              <TabsTrigger value="estoque">Estoque</TabsTrigger>
              <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
            </TabsList>

            <div className="overflow-y-auto flex-1 pr-2">
              {/* Aba Dados do Produto */}
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
                        <Label htmlFor="codigo_barras">Código de Barras</Label>
                        <Input
                          id="codigo_barras"
                          value={formData.codigo_barras}
                          onChange={(e) => handleInputChange('codigo_barras', e.target.value)}
                        />
                      </div>
                    </div>
                    <CategoriaSelect
                      categorias={categorias as any[]}
                      categoriaId={formData.categoria_id ?? null}
                      categoriaTexto={formData.categoria}
                      onChange={(id, nome) => {
                        handleInputChange('categoria_id', id);
                        handleInputChange('categoria', nome);
                      }}
                    />

                    <div className="space-y-2">
                      <Label htmlFor="descricao">Descrição</Label>
                      <Textarea
                        id="descricao"
                        value={formData.descricao}
                        onChange={(e) => handleInputChange('descricao', e.target.value)}
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba Tamanhos e Medidas */}
              <TabsContent value="medidas" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Tamanhos e Medidas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="unidade_medida">Unidade</Label>
                        <Input
                          id="unidade_medida"
                          value={formData.unidade_medida}
                          onChange={(e) => handleInputChange('unidade_medida', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="peso">Peso (kg)</Label>
                        <Input
                          id="peso"
                          type="number"
                          step="0.01"
                          value={formData.peso || ''}
                          onChange={(e) => handleInputChange('peso', e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="altura">Altura (cm)</Label>
                        <Input
                          id="altura"
                          type="number"
                          step="0.01"
                          value={formData.altura || ''}
                          onChange={(e) => handleInputChange('altura', e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="largura">Largura (cm)</Label>
                        <Input
                          id="largura"
                          type="number"
                          step="0.01"
                          value={formData.largura || ''}
                          onChange={(e) => handleInputChange('largura', e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="comprimento">Comprimento (cm)</Label>
                        <Input
                          id="comprimento"
                          type="number"
                          step="0.01"
                          value={formData.comprimento || ''}
                          onChange={(e) => handleInputChange('comprimento', e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba Variações */}
              <TabsContent value="variacoes" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Variações do Produto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Input
                          value={novaVariacao.tipo}
                          onChange={(e) => setNovaVariacao(prev => ({ ...prev, tipo: e.target.value }))}
                          placeholder="ex: Cor, Tamanho"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Valor</Label>
                        <Input
                          value={novaVariacao.valor}
                          onChange={(e) => setNovaVariacao(prev => ({ ...prev, valor: e.target.value }))}
                          placeholder="ex: Azul, P"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Preço Adicional</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={novaVariacao.preco_adicional || ''}
                          onChange={(e) => setNovaVariacao(prev => ({ ...prev, preco_adicional: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>&nbsp;</Label>
                        <Button type="button" onClick={adicionarVariacao} className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar
                        </Button>
                      </div>
                    </div>
                    
                    {formData.variacoes && formData.variacoes.length > 0 && (
                      <div className="space-y-2">
                        <Label>Variações Cadastradas</Label>
                        <div className="space-y-2">
                          {formData.variacoes.map((variacao, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{variacao.tipo}</Badge>
                                <span>{variacao.valor}</span>
                                {variacao.preco_adicional && variacao.preco_adicional > 0 && (
                                  <span className="text-sm text-muted-foreground">
                                    (+{produtoUtils.formatarPreco(variacao.preco_adicional)})
                                  </span>
                                )}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removerVariacao(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba Preços */}
              <TabsContent value="precos" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Tabela de Preços</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="preco_compra">Preço de Compra</Label>
                        <Input
                          id="preco_compra"
                          type="number"
                          step="0.01"
                          value={formData.preco_compra || ''}
                          onChange={(e) => handleInputChange('preco_compra', e.target.value ? parseFloat(e.target.value) : undefined)}
                          onBlur={calcularMargem}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="preco_venda">Preço de Venda *</Label>
                        <Input
                          id="preco_venda"
                          type="number"
                          step="0.01"
                          value={formData.preco_venda}
                          onChange={(e) => handleInputChange('preco_venda', parseFloat(e.target.value) || 0)}
                          onBlur={calcularMargem}
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
                            value={formData.margem_lucro || ''}
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

              {/* Aba Imagem */}
              <TabsContent value="imagem" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Imagem do Produto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                        {formData.imagem ? (
                          <div className="text-center space-y-2">
                            <img src={formData.imagem} alt="Preview" className="max-w-48 max-h-48 mx-auto rounded" />
                            <Button type="button" variant="outline" onClick={() => handleInputChange('imagem', '')}>
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
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba Tributação */}
              <TabsContent value="tributacao" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Fiscais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ncm">NCM</Label>
                        <Input
                          id="ncm"
                          value={formData.ncm}
                          onChange={(e) => handleInputChange('ncm', e.target.value)}
                          placeholder="00000000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cst_csosn">CST/CSOSN</Label>
                        <Input
                          id="cst_csosn"
                          value={formData.cst_csosn}
                          onChange={(e) => handleInputChange('cst_csosn', e.target.value)}
                          placeholder="000"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cfop">CFOP</Label>
                        <Input
                          id="cfop"
                          value={formData.cfop}
                          onChange={(e) => handleInputChange('cfop', e.target.value)}
                          placeholder="0000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cest">CEST</Label>
                        <Input
                          id="cest"
                          value={formData.cest}
                          onChange={(e) => handleInputChange('cest', e.target.value)}
                          placeholder="0000000"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba Ficha Técnica */}
              <TabsContent value="ficha" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Ficha Técnica</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ficha_tecnica">Informações Técnicas</Label>
                      <Textarea
                        id="ficha_tecnica"
                        value={formData.ficha_tecnica}
                        onChange={(e) => handleInputChange('ficha_tecnica', e.target.value)}
                        rows={4}
                        placeholder="Ingredientes, materiais, composição..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="modo_preparo">Modo de Preparo/Uso</Label>
                      <Textarea
                        id="modo_preparo"
                        value={formData.modo_preparo}
                        onChange={(e) => handleInputChange('modo_preparo', e.target.value)}
                        rows={4}
                        placeholder="Instruções de preparo ou uso..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba Delivery */}
              <TabsContent value="delivery" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Integração com Delivery</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="codigo_delivery">Código Delivery</Label>
                      <Input
                        id="codigo_delivery"
                        value={formData.codigo_delivery}
                        onChange={(e) => handleInputChange('codigo_delivery', e.target.value)}
                        placeholder="Código para iFood, Uber Eats, etc."
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba Estoque */}
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
                          value={formData.estoque_atual}
                          onChange={(e) => handleInputChange('estoque_atual', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
                        <Input
                          id="estoque_minimo"
                          type="number"
                          value={formData.estoque_minimo}
                          onChange={(e) => handleInputChange('estoque_minimo', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="custo_total">Custo Total</Label>
                        <Input
                          id="custo_total"
                          type="number"
                          step="0.01"
                          value={formData.custo_total || ''}
                          onChange={(e) => handleInputChange('custo_total', e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Nova Aba Fornecedores */}
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
