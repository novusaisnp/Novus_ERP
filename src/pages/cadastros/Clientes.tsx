
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Search, Edit, Trash2 } from 'lucide-react';
import type { Entidade } from '@/types/entidade';
import { useEntidades } from '@/hooks/useEntidades';
import { useEmpresaAtual } from '@/hooks/estoque/useEmpresaAtual';
import { ConfirmDeleteWithDeps } from '@/components/shared/ConfirmDeleteWithDeps';

/**
 * Lista quem já tem o papel Cliente no Cadastro de Entidades — não cria
 * entidade daqui. "Novo Cliente"/"Editar" levam pra /cadastros/entidades
 * (único lugar com o form completo, toggle PF/PJ + papéis).
 */
const Clientes: React.FC = () => {
  const navigate = useNavigate();
  const { data: empresaId } = useEmpresaAtual();
  const { entidades: clientes, loading, remove } = useEntidades(empresaId ?? null, 'CLIENTE');
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

  const filteredClientes = clientes.filter((cliente) =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cliente.cpf && cliente.cpf.includes(searchTerm)) ||
    (cliente.cnpj && cliente.cnpj.includes(searchTerm)) ||
    (cliente.email && cliente.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (cliente.apelido && cliente.apelido.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatarCpfCnpj = (cliente: Entidade) => {
    const doc = cliente.cpf || cliente.cnpj;
    if (!doc) return '-';
    const clean = doc.replace(/\D/g, '');
    if (cliente.tipoPessoa === 'PF') {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Clientes</h1>
          <p className="text-muted-foreground">Entidades com o papel Cliente — cadastro novo em Cadastros → Entidades</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lista de Clientes
          </CardTitle>
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar clientes..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p>Carregando...</p>
            </div>
          ) : filteredClientes.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Tente ajustar os termos de busca' : 'Cadastre entidades com o papel Cliente em Cadastros → Entidades'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Papéis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{cliente.nome}</div>
                        {cliente.apelido && (
                          <div className="text-sm text-muted-foreground">
                            {cliente.apelido}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {cliente.tipoPessoa === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatarCpfCnpj(cliente)}</TableCell>
                    <TableCell>{cliente.email || '-'}</TableCell>
                    <TableCell>{cliente.telefone || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {cliente.papeis.map((p) => (
                          <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={cliente.ativo !== false ? 'default' : 'secondary'}>
                        {cliente.ativo !== false ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/cadastros/entidades?edit=${cliente.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => requestDelete(cliente.id!)}
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
        entidade="clientes"
        id={confirmDeleteId}
        nomeRegistro="este cliente"
        onConfirm={confirmDelete}
      />

    </div>
  );
};

export default Clientes;
