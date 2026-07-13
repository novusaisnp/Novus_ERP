
import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FormLocalizacao } from '@/components/modules/FormLocalizacao';
import {
  useLocalizacoes,
  useCreateLocalizacao,
  useUpdateLocalizacao,
  useDeleteLocalizacao,
} from '@/hooks/useLocalizacoes';
import { useEmpresaAtual } from '@/hooks/estoque/useEmpresaAtual';
import { toast } from 'sonner';
import type { Localizacao } from '@/services/localizacaoService';


const Localizacoes: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedLocalizacao, setSelectedLocalizacao] = useState<Localizacao | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [localizacaoToDelete, setLocalizacaoToDelete] = useState<Localizacao | null>(null);

  const { data: localizacoes = [], isLoading } = useLocalizacoes();
  const { data: empresaId } = useEmpresaAtual();
  const createMutation = useCreateLocalizacao();
  const updateMutation = useUpdateLocalizacao();
  const deleteMutation = useDeleteLocalizacao();


  const filteredLocalizacoes = localizacoes.filter((localizacao) =>
    localizacao.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    localizacao.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    console.log('[Localizacoes] Abrindo formulário para nova localização');
    setSelectedLocalizacao(null);
    setIsFormOpen(true);
  };

  const handleEdit = (localizacao: Localizacao) => {
    console.log('[Localizacoes] Editando localização:', localizacao.id);
    setSelectedLocalizacao(localizacao);
    setIsFormOpen(true);
  };

  const handleDelete = (localizacao: Localizacao) => {
    console.log('[Localizacoes] Solicitando exclusão da localização:', localizacao.id);
    setLocalizacaoToDelete(localizacao);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (localizacaoToDelete) {
      console.log('[Localizacoes] Confirmando exclusão da localização:', localizacaoToDelete.id);
      deleteMutation.mutate(localizacaoToDelete.id);
      setDeleteDialogOpen(false);
      setLocalizacaoToDelete(null);
    }
  };

  const handleFormSubmit = (data: any) => {
    if (selectedLocalizacao) {
      console.log('[Localizacoes] Atualizando localização:', selectedLocalizacao.id);
      updateMutation.mutate({
        id: selectedLocalizacao.id,
        localizacao: data,
      });
    } else {
      if (!empresaId) {
        toast.error('Empresa atual não identificada. Não é possível cadastrar a localização.');
        return;
      }
      console.log('[Localizacoes] Criando nova localização para empresa:', empresaId);
      createMutation.mutate({ ...data, empresa_representada_id: empresaId });
    }
    setIsFormOpen(false);
    setSelectedLocalizacao(null);
  };


  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Localizações de Estoque</h1>
          <p className="text-muted-foreground">
            Gerencie os setores e locais de armazenamento
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Localização
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Localizações Cadastradas
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar localizações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLocalizacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <p className="text-muted-foreground">
                      {searchTerm ? 'Nenhuma localização encontrada.' : 'Nenhuma localização cadastrada.'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLocalizacoes.map((localizacao) => (
                  <TableRow key={localizacao.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {localizacao.nome === 'Geral' && (
                          <Badge variant="secondary" className="text-xs">
                            Padrão
                          </Badge>
                        )}
                        {localizacao.nome}
                      </div>
                    </TableCell>
                    <TableCell>{localizacao.descricao || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-green-600">
                        Ativa
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(localizacao)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(localizacao)}
                          disabled={localizacao.nome === 'Geral' && localizacoes.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FormLocalizacao
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedLocalizacao(null);
        }}
        localizacao={selectedLocalizacao}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a localização "{localizacaoToDelete?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Localizacoes;
