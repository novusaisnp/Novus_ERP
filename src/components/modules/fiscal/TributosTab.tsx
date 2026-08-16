
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search } from "lucide-react";
import { useTributos, useDeleteTributo } from "@/hooks/useFiscal";
import { TributosList } from "./TributosList";
import { TributoFormModal } from "./TributoFormModal";
import type { Tributo } from "@/types/fiscal";

export const TributosTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Tributo | null>(null);
  const [excluindo, setExcluindo] = useState<Tributo | null>(null);
  const { data: tributos, isLoading } = useTributos();
  const deleteMut = useDeleteTributo();

  const filteredTributos = tributos?.filter(tributo =>
    tributo.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tributo.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleNovo = () => {
    setEditando(null);
    setFormOpen(true);
  };

  const handleEditar = (tributo: Tributo) => {
    setEditando(tributo);
    setFormOpen(true);
  };

  const confirmarExclusao = () => {
    if (!excluindo) return;
    deleteMut.mutate(excluindo.id, { onSuccess: () => setExcluindo(null) });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Gestão de Tributos</h2>
          <p className="text-muted-foreground">
            Configure alíquotas e regras tributárias
          </p>
        </div>
        <Button onClick={handleNovo}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Tributo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Tributos Cadastrados</CardTitle>
              <CardDescription>
                Alíquotas e regras tributárias por tipo
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tributos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TributosList
            tributos={filteredTributos}
            isLoading={isLoading}
            searchTerm={searchTerm}
            onEdit={handleEditar}
            onDelete={setExcluindo}
          />
        </CardContent>
      </Card>

      <TributoFormModal open={formOpen} onOpenChange={setFormOpen} tributo={editando} />

      <AlertDialog open={!!excluindo} onOpenChange={(open) => !open && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tributo?</AlertDialogTitle>
            <AlertDialogDescription>
              {excluindo && (
                <>Você está prestes a excluir <strong>{excluindo.descricao}</strong>. Essa ação não pode ser desfeita pela tela.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? 'Excluindo…' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
