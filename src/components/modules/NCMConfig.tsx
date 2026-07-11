import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Eye, Edit, Package } from 'lucide-react';
import { useNCMs } from '@/hooks/useFiscal';
import { NCM } from '@/types/fiscal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { NCMFormModal } from '@/components/modules/fiscal/NCMFormModal';

export const NCMConfig: React.FC = () => {
  const { data: ncms, isLoading } = useNCMs();
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('create');
  const [selected, setSelected] = useState<NCM | null>(null);

  const openCreate = () => { setSelected(null); setModalMode('create'); setModalOpen(true); };
  const openView = (n: NCM) => { setSelected(n); setModalMode('view'); setModalOpen(true); };
  const openEdit = (n: NCM) => { setSelected(n); setModalMode('edit'); setModalOpen(true); };

  const filtered = (ncms ?? []).filter((n) => {
    const term = searchTerm.toLowerCase();
    return (
      n.codigo.includes(searchTerm) ||
      n.descricao.toLowerCase().includes(term) ||
      (n.categoria ?? '').toLowerCase().includes(term)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Carregando NCMs...</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Nomenclatura Comum do Mercosul (NCM)
            </CardTitle>
            <CardDescription>
              Gerencie os códigos NCM utilizados na classificação fiscal de produtos
            </CardDescription>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo NCM
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, descrição ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold">{ncms?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Total de NCMs</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-primary">
              {ncms?.filter((n) => n.ativo).length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Ativos</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-muted-foreground">
              {new Set((ncms ?? []).map((n) => n.categoria).filter(Boolean)).size}
            </div>
            <div className="text-sm text-muted-foreground">Categorias</div>
          </Card>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>IPI (%)</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length > 0 ? (
                filtered.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-mono font-semibold">{n.codigo}</TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate" title={n.descricao}>{n.descricao}</div>
                    </TableCell>
                    <TableCell>{n.unidade || '-'}</TableCell>
                    <TableCell>{(n.aliquotaIpi ?? 0).toFixed(2)}</TableCell>
                    <TableCell>
                      {n.categoria && <Badge variant="outline">{n.categoria}</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={n.ativo ? 'default' : 'secondary'}>
                        {n.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openView(n)} title="Visualizar">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(n)} title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {searchTerm ? 'Nenhum NCM encontrado com os filtros aplicados' : 'Nenhum NCM cadastrado'}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <NCMFormModal open={modalOpen} onOpenChange={setModalOpen} ncm={selected} mode={modalMode} />
    </Card>
  );
};
