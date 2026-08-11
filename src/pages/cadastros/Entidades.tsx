
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Plus, Search, Edit, Trash2 } from 'lucide-react';
import type { Entidade, PapelCodigo } from '@/types/entidade';
import { useEntidades } from '@/hooks/useEntidades';
import { useEmpresaAtual } from '@/hooks/estoque/useEmpresaAtual';
import { FormEntidade } from '@/components/modules/FormEntidade';
import { ConfirmDeleteWithDeps } from '@/components/shared/ConfirmDeleteWithDeps';
import { entidadeService } from '@/services/entidadeService';
import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Cadastro Unificado de Entidades — único lugar do ERP onde se cria/edita
 * uma entidade (toggle PF/PJ + papéis). Clientes/Fornecedores/Colaboradores
 * são telas satélite: só listam quem já tem aquele papel, "Novo"/"Editar"
 * de lá trazem o usuário pra cá (via ?papel=/?edit=) em vez de duplicar o
 * form com seletor de tipo em cada tela.
 */
const Entidades: React.FC = () => {
  const { data: empresaId } = useEmpresaAtual();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: entidades = [], isLoading: loading } = useQuery({
    queryKey: ['entidades', 'todas', empresaId],
    queryFn: () => entidadeService.fetchEntidades(empresaId!),
    enabled: !!empresaId,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntidade, setEditingEntidade] = useState<Entidade | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const papelParam = searchParams.get('papel') as PapelCodigo | null;
  const editParam = searchParams.get('edit');

  // Deep-link das telas satélite: ?papel=X abre criação com o papel
  // pré-marcado, ?edit=<id> abre edição direto.
  useEffect(() => {
    if (editParam && entidades.length > 0) {
      const alvo = entidades.find((e) => e.id === editParam);
      if (alvo) {
        setEditingEntidade(alvo);
        setIsDialogOpen(true);
      }
    } else if (papelParam && !isDialogOpen) {
      setEditingEntidade(null);
      setIsDialogOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editParam, papelParam, entidades.length]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['entidades'] });
  };

  const save = async (entidade: Entidade) => {
    try {
      if (entidade.id) {
        await entidadeService.updateEntidade(entidade.id, entidade);
      } else {
        await entidadeService.createEntidade(entidade);
      }
      invalidateAll();
      return true;
    } catch (error) {
      console.error('[Entidades] Erro ao salvar:', error);
      return false;
    }
  };

  const handleEdit = (entidade: Entidade) => {
    setEditingEntidade(entidade);
    setIsDialogOpen(true);
  };

  const requestDelete = (id: string) => {
    if (!id) return;
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    const id = confirmDeleteId;
    if (!id) return;
    setConfirmDeleteId(null);
    await entidadeService.deleteEntidade(id);
    invalidateAll();
  };

  const handleCloseDialog = () => {
    // Chegou aqui via deep-link de uma tela satélite (Clientes/Fornecedores/
    // Colaboradores) — volta pra lá ao terminar (salvar ou cancelar), em vez
    // de deixar o usuário preso na tela central. Sem deep-link (veio direto
    // pra Entidades), só fecha o modal e continua na lista.
    if (papelParam || editParam) {
      navigate(-1);
      return;
    }
    setIsDialogOpen(false);
    setEditingEntidade(null);
  };

  const filtered = entidades.filter((e) =>
    e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.cpf && e.cpf.includes(searchTerm)) ||
    (e.cnpj && e.cnpj.includes(searchTerm)) ||
    (e.email && e.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Cadastro de Entidades</h1>
          <p className="text-muted-foreground">Cadastro único de pessoas e empresas — marque os papéis (Cliente, Fornecedor, Colaborador...) que cada uma exerce</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); else setIsDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={() => setEditingEntidade(null)}>
              <Plus className="h-4 w-4" />
              Nova Entidade
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEntidade ? 'Editar Entidade' : 'Nova Entidade'}</DialogTitle>
            </DialogHeader>
            {empresaId && (
              <FormEntidade
                entidade={editingEntidade || undefined}
                empresaRepresentadaId={empresaId}
                papeisIniciais={papelParam ? [papelParam] : []}
                onSave={save}
                onCancel={handleCloseDialog}
                loading={loading}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Todas as Entidades
          </CardTitle>
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF/CNPJ ou email..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12"><p>Carregando...</p></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? 'Nenhuma entidade encontrada' : 'Nenhuma entidade cadastrada'}
              </h3>
              {!searchTerm && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Entidade
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Papéis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entidade) => (
                  <TableRow key={entidade.id}>
                    <TableCell className="font-medium">
                      <div>{entidade.nome}</div>
                      {entidade.apelido && <div className="text-sm text-muted-foreground">{entidade.apelido}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{entidade.tipoPessoa}</Badge>
                    </TableCell>
                    <TableCell>{entidade.cpf || entidade.cnpj || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {entidade.papeis.map((p) => <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entidade.ativo !== false ? 'default' : 'secondary'}>
                        {entidade.ativo !== false ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(entidade)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => requestDelete(entidade.id!)}>
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
        entidade="entidades"
        id={confirmDeleteId}
        nomeRegistro="esta entidade"
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default Entidades;
