import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as _supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const supabase: any = _supabase;

interface UsuarioRow {
  id: string;
  user_id: string;
  empresa_representada_id: string | null;
  ativo: boolean | null;
  nome?: string | null;
  email?: string | null;
  perfil_nome?: string | null;
  role?: string | null;
}

async function fetchUsuarios(): Promise<UsuarioRow[]> {
  const { data: usuarios, error } = await supabase
    .from('usuarios')
    .select('id, user_id, empresa_representada_id, ativo, nome, email');
  if (error) {
    console.error('[Usuarios] erro ao carregar');
    return [];
  }
  const userIds = (usuarios || []).map((u: any) => u.user_id).filter(Boolean);
  let roles: Record<string, string> = {};
  if (userIds.length) {
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds);
    (rolesData || []).forEach((r: any) => {
      roles[r.user_id] = r.role;
    });
  }
  return (usuarios || []).map((u: any) => ({ ...u, role: roles[u.user_id] || '-' }));
}

const ConfiguracoesUsuarios: React.FC = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['config-usuarios'],
    queryFn: fetchUsuarios,
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('usuarios')
        .update({ ativo, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-usuarios'] });
      toast({ title: 'Status atualizado' });
    },
    onError: (e: any) => {
      console.error('[Usuarios] erro ao atualizar');
      toast({ title: 'Erro', description: e?.message || 'Falha ao atualizar', variant: 'destructive' });
    },
  });

  const ativos = usuarios.filter((u) => u.ativo).length;

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-1">Usuários</h1>
        <p className="text-muted-foreground">Gestão de usuários da sua empresa</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
          <Users className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{ativos}</div>
          <p className="text-xs text-muted-foreground">de {usuarios.length} cadastrados</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : usuarios.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.nome || '-'}</TableCell>
                    <TableCell>{u.email || '-'}</TableCell>
                    <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={u.ativo ? 'default' : 'secondary'}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={!!u.ativo}
                        onCheckedChange={(v) => toggleAtivo.mutate({ id: u.id, ativo: v })}
                      />
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

export default ConfiguracoesUsuarios;
