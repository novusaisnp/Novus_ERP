
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import type { Entidade } from '@/types/entidade';
import { useEntidades } from '@/hooks/useEntidades';
import { useEmpresaAtual } from '@/hooks/estoque/useEmpresaAtual';
import { ConfirmDeleteWithDeps } from '@/components/shared/ConfirmDeleteWithDeps';

/**
 * Lista quem já tem o papel Fornecedor no Cadastro de Entidades — não cria
 * entidade daqui. "Novo Fornecedor"/"Editar" levam pra /cadastros/entidades.
 */
const Fornecedores: React.FC = () => {
  const navigate = useNavigate();
  const { data: empresaId } = useEmpresaAtual();
  const { entidades: fornecedores, loading, remove } = useEntidades(empresaId ?? null, 'FORNECEDOR');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const requestDelete = (id: string) => {
    if (!id) return;
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    const id = confirmDeleteId;
    if (!id) return;
    setConfirmDeleteId(null);
    await remove(id);
  };

  const filteredFornecedores = fornecedores.filter((fornecedor) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const nome = fornecedor.tipoPessoa === 'PJ' ? (fornecedor.razaoSocial || '') : fornecedor.nome;
    const nomeFantasia = fornecedor.tipoPessoa === 'PJ' ? (fornecedor.nomeFantasia || '') : '';
    const documento = fornecedor.tipoPessoa === 'PJ' ? (fornecedor.cnpj || '') : (fornecedor.cpf || '');
    const email = fornecedor.email || '';
    return nome.toLowerCase().includes(term) ||
      nomeFantasia.toLowerCase().includes(term) ||
      documento.includes(searchTerm) ||
      email.toLowerCase().includes(term);
  });

  const formatarDocumento = (fornecedor: Entidade) => {
    if (fornecedor.tipoPessoa === 'PJ' && fornecedor.cnpj) {
      const clean = fornecedor.cnpj.replace(/\D/g, '');
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    if (fornecedor.tipoPessoa === 'PF' && fornecedor.cpf) {
      const clean = fornecedor.cpf.replace(/\D/g, '');
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return '-';
  };

  const getNomeFormatado = (fornecedor: Entidade) => {
    if (fornecedor.tipoPessoa === 'PJ') {
      return fornecedor.razaoSocial || fornecedor.nome || 'Sem nome';
    }
    return fornecedor.nome || 'Sem nome';
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Fornecedores</h1>
          <p className="text-muted-foreground">Entidades com o papel Fornecedor — cadastro novo em Cadastros → Entidades</p>
        </div>
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
                {searchTerm ? 'Tente ajustar os termos de busca' : 'Cadastre entidades com o papel Fornecedor em Cadastros → Entidades'}
              </p>
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
                      <Badge variant={fornecedor.tipoPessoa === 'PJ' ? 'default' : 'secondary'}>
                        {fornecedor.tipoPessoa}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{getNomeFormatado(fornecedor)}</TableCell>
                    <TableCell>
                      {fornecedor.tipoPessoa === 'PJ' ? (fornecedor.nomeFantasia || '-') : '-'}
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
                          onClick={() => navigate(`/cadastros/entidades?edit=${fornecedor.id}`)}
                          disabled={loading}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => requestDelete(fornecedor.id!)}
                          disabled={loading}
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

      <ConfirmDeleteWithDeps
        open={confirmDeleteId !== null}
        onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}
        entidade="fornecedores"
        id={confirmDeleteId}
        nomeRegistro="este fornecedor"
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default Fornecedores;
