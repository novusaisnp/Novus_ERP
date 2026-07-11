import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Tags } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useRegrasClassificacao } from '@/hooks/useRegrasClassificacao';
import { RegraClassificacaoModal } from '@/components/configuracoes/RegraClassificacaoModal';
import type { RegraClassificacaoReceita } from '@/types/classificacaoReceita';

const RegrasClassificacaoReceita: React.FC = () => {
  const { regras, isLoading, criar, atualizar, excluir } = useRegrasClassificacao();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RegraClassificacaoReceita | null>(null);
  const [toDelete, setToDelete] = useState<RegraClassificacaoReceita | null>(null);

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">Regras de Classificação de Receita</h1>
          <p className="text-muted-foreground">Define plano de contas, centro de custo e natureza aplicáveis à receita</p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Nova Regra
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Tags className="h-5 w-5" /> Regras Ativas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : regras.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Nenhuma regra cadastrada</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alvo</TableHead>
                  <TableHead>Alvo ID / Categoria</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead>Vigência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regras.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="outline">{r.alvo_tipo}</Badge></TableCell>
                    <TableCell className="text-xs font-mono">{r.alvo_id || r.categoria_id || r.tipo_item || '-'}</TableCell>
                    <TableCell>{r.prioridade}</TableCell>
                    <TableCell>v{r.versao}</TableCell>
                    <TableCell className="text-xs">
                      {r.vigencia_ini || '—'} → {r.vigencia_fim || '∞'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.ativo ? 'default' : 'secondary'}>{r.ativo ? 'Ativa' : 'Inativa'}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setModalOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setToDelete(r)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RegraClassificacaoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        regra={editing}
        onSubmit={async (input) => {
          if (editing) await atualizar({ id: editing.id, input });
          else await criar(input);
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir regra?"
        description="A regra será desativada e removida do fluxo de resolução."
        onConfirm={async () => { if (toDelete?.id) await excluir(toDelete.id); setToDelete(null); }}
      />
    </div>
  );
};

export default RegrasClassificacaoReceita;
