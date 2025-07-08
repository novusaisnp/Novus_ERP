
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Plus, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import { Fornecedor } from '@/types/fornecedor';
import { useFornecedores } from '@/hooks/useFornecedores';
import { FormFornecedor } from '@/components/modules/FormFornecedor';

const Fornecedores: React.FC = () => {
  console.log('[Fornecedores] Componente inicializado');
  
  const { fornecedores, loading, saveFornecedor, deleteFornecedor } = useFornecedores();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const handleEdit = (fornecedor: Fornecedor) => {
    console.log('[Fornecedores] Editando fornecedor:', fornecedor.id);
    setEditingFornecedor(fornecedor);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!id) return;
    
    console.log('[Fornecedores] Solicitando exclusão do fornecedor:', id);
    if (window.confirm('Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser desfeita.')) {
      setDeleteLoading(id);
      try {
        await deleteFornecedor(id);
      } finally {
        setDeleteLoading(null);
      }
    }
  };

  const handleCloseDialog = () => {
    console.log('[Fornecedores] Fechando modal');
    setIsDialogOpen(false);
    setEditingFornecedor(null);
  };

  const handleSaveFornecedor = async (fornecedor: Fornecedor) => {
    console.log('[Fornecedores] Salvando fornecedor:', fornecedor);
    const success = await saveFornecedor(fornecedor);
    if (success) {
      handleCloseDialog();
    }
    return success;
  };

  // Filtro aprimorado com verificações de null/undefined
  const filteredFornecedores = fornecedores.filter(fornecedor => {
    if (!searchTerm.trim()) return true;
    
    const term = searchTerm.toLowerCase();
    
    // Busca por razão social ou nome completo
    const nome = fornecedor.tipo_pessoa === 'PJ' 
      ? (fornecedor.razaoSocial || '')
      : (fornecedor.nome_completo || '');
    
    // Busca por nome fantasia (apenas PJ)
    const nomeFantasia = fornecedor.tipo_pessoa === 'PJ' 
      ? (fornecedor.nomeFantasia || '')
      : '';
    
    // Busca por documento (CNPJ ou CPF)
    const documento = fornecedor.tipo_pessoa === 'PJ'
      ? (fornecedor.cnpj || '')
      : (fornecedor.cpf || '');
    
    // Busca por email
    const email = fornecedor.email || '';
    
    return nome.toLowerCase().includes(term) ||
           nomeFantasia.toLowerCase().includes(term) ||
           documento.includes(searchTerm) ||
           email.toLowerCase().includes(term);
  });

  const formatarDocumento = (fornecedor: Fornecedor) => {
    if (fornecedor.tipo_pessoa === 'PJ' && fornecedor.cnpj) {
      const clean = fornecedor.cnpj.replace(/\D/g, '');
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    if (fornecedor.tipo_pessoa === 'PF' && fornecedor.cpf) {
      const clean = fornecedor.cpf.replace(/\D/g, '');
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    
    return '-';
  };

  const getNomeFormatado = (fornecedor: Fornecedor) => {
    if (fornecedor.tipo_pessoa === 'PJ') {
      return fornecedor.razaoSocial || 'Sem nome';
    }
    return fornecedor.nome_completo || 'Sem nome';
  };

  console.log('[Fornecedores] Renderizando com', fornecedores.length, 'fornecedores');

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie seus fornecedores com qualificação fiscal completa</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={() => setEditingFornecedor(null)}>
              <Plus className="h-4 w-4" />
              Novo Fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </DialogTitle>
            </DialogHeader>
            <FormFornecedor
              fornecedor={editingFornecedor || undefined}
              onSave={handleSaveFornecedor}
              onCancel={handleCloseDialog}
              loading={loading}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Lista de Fornecedores
          </CardTitle>
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, documento ou email..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Badge variant="outline" className="ml-2">
              {filteredFornecedores.length} de {fornecedores.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Carregando fornecedores...</p>
            </div>
          ) : filteredFornecedores.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Tente ajustar os termos de busca' : 'Comece adicionando seu primeiro fornecedor'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Fornecedor
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nome / Razão Social</TableHead>
                  <TableHead>Nome Fantasia</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFornecedores.map((fornecedor) => (
                  <TableRow key={fornecedor.id}>
                    <TableCell>
                      <Badge variant={fornecedor.tipo_pessoa === 'PJ' ? 'default' : 'secondary'}>
                        {fornecedor.tipo_pessoa}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{getNomeFormatado(fornecedor)}</TableCell>
                    <TableCell>
                      {fornecedor.tipo_pessoa === 'PJ' ? (fornecedor.nomeFantasia || '-') : '-'}
                    </TableCell>
                    <TableCell>{formatarDocumento(fornecedor)}</TableCell>
                    <TableCell>{fornecedor.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={fornecedor.ativo !== false ? 'default' : 'secondary'}>
                        {fornecedor.ativo !== false ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(fornecedor)}
                          disabled={loading}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(fornecedor.id!)}
                          disabled={loading || deleteLoading === fornecedor.id}
                        >
                          {deleteLoading === fornecedor.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
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
    </div>
  );
};

export default Fornecedores;
