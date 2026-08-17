
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Plus, Search, Edit, Trash2, Image, ScrollText } from 'lucide-react';
import { useProdutos } from '@/hooks/useProdutos';
import { FormProduto } from '@/components/modules/FormProduto';
import { Produto } from '@/types/produto';
import { produtoUtils } from '@/utils/produtoUtils';
import { ConfirmDeleteWithDeps } from '@/components/shared/ConfirmDeleteWithDeps';
import { PaginationFooter } from '@/components/shared/PaginationFooter';

const PAGE_SIZE = 50;

const Produtos: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const { produtos, total, loading, criarProduto, atualizarProduto, excluirProduto } = useProdutos(searchTerm, {
    page,
    pageSize: PAGE_SIZE,
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | undefined>(undefined);
  const [formLoading, setFormLoading] = useState(false);
  const [produtoToDelete, setProdutoToDelete] = useState<Produto | null>(null);

  // Busca já é server-side (useProdutos com `busca`) — `produtos` chega
  // filtrado e paginado, sem filtro client-side redundante. Exceção:
  // "categoria" nunca foi um campo populado em Produto (só categoria_id),
  // então esse ramo de busca já não fazia nada antes desta mudança.
  const filteredProdutos = produtos;

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(0);
  };

  const handleEdit = (produto: Produto) => {
    setEditingProduto(produto);
    setIsFormOpen(true);
  };

  const handleDelete = (produto: Produto) => {
    setProdutoToDelete(produto);
  };

  const confirmDelete = async () => {
    if (produtoToDelete?.id) {
      await excluirProduto(produtoToDelete.id);
      setProdutoToDelete(null);
    }
  };

  const handleFormSubmit = async (produto: Produto): Promise<boolean> => {
    setFormLoading(true);
    try {
      if (editingProduto) {
        return await atualizarProduto(editingProduto.id!, produto);
      } else {
        return await criarProduto(produto);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingProduto(undefined);
  };

  const handleNewProduct = () => {
    setEditingProduto(undefined);
    setIsFormOpen(true);
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Produtos</h1>
          <p className="text-muted-foreground">Gerencie o cadastro completo de produtos</p>
        </div>
        <Button className="flex items-center gap-2" onClick={handleNewProduct}>
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Catálogo de Produtos
          </CardTitle>
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos, códigos ou categorias..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
              <p>Carregando produtos...</p>
            </div>
          ) : filteredProdutos.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Tente ajustar os termos de busca' : 'Comece adicionando seu primeiro produto'}
              </p>
              {!searchTerm && (
                <Button onClick={handleNewProduct}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Produto
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProdutos.map((produto) => (
                  <TableRow key={produto.id} data-testid={`produto-row-${produto.id}`} className="hover:bg-muted/50">
                    <TableCell>
                      {produto.imagem_url ? (
                        <img 
                          src={produto.imagem_url} 
                          alt={produto.nome}
                          className="w-10 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                          <Image className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{produto.nome}</div>
                        {produto.descricao && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {produto.descricao}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {produto.codigo && (
                          <div className="text-sm font-mono">{produto.codigo}</div>
                        )}
                        {produto.ncm && (
                          <div className="text-xs text-muted-foreground">NCM: {produto.ncm}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {produto.categoria ? (
                        <Badge variant="outline">{produto.categoria}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {produtoUtils.formatarPreco(produto.preco_venda)}
                        </div>
                        {produto.margem_lucro && (
                          <div className="text-xs text-muted-foreground">
                            {produto.margem_lucro.toFixed(1)}% margem
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div
                          data-testid={`produto-saldo-final-${produto.id}`}
                          className={`font-medium ${
                          produto.estoque_atual! <= produto.estoque_minimo! 
                            ? 'text-destructive' 
                            : 'text-foreground'
                        }`}>
                          {produto.estoque_atual}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Mín: {produto.estoque_minimo}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={produto.ativo ? 'default' : 'secondary'}>
                        {produto.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="ghost" size="sm" title="Ver Kardex">
                          <Link to={`/estoque/kardex/${produto.id}`}>
                            <ScrollText className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(produto)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(produto)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!loading && filteredProdutos.length > 0 && (
        <PaginationFooter
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      )}

      <FormProduto
        produto={editingProduto}
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        loading={formLoading}
      />

      <ConfirmDeleteWithDeps
        open={!!produtoToDelete}
        onOpenChange={(open) => !open && setProdutoToDelete(null)}
        entidade="produtos"
        id={produtoToDelete?.id ?? null}
        nomeRegistro={produtoToDelete?.nome}
        onConfirm={confirmDelete}
      />

    </div>
  );
};

export default Produtos;
