import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as _supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePerfis } from '@/hooks/usePerfis';
import PerfisConfig from '@/components/modules/configuracoes/empresas/PerfisConfig';
import type { Perfil } from '@/types/empresa';

const supabase: any = _supabase;

interface UsuarioRow {
  id: string;
  user_id: string;
  empresa_representada_id: string | null;
  ativo: boolean | null;
  nome?: string | null;
  email?: string | null;
  perfil_id?: string | null;
  role?: string | null;
}

async function fetchUsuarios(): Promise<UsuarioRow[]> {
  const { data: usuarios, error } = await supabase
    .from('usuarios')
    .select('id, user_id, empresa_representada_id, ativo, nome, email, perfil_id');
  if (error) {
    console.error('[Usuarios] erro ao carregar');
    return [];
  }
  const userIds = (usuarios || []).map((u: any) => u.user_id).filter(Boolean);
  const roles: Record<string, string> = {};
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
  const { perfis, savePerfil, deletePerfil } = usePerfis();

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
      toast({ title: 'Erro', description: e?.message || 'Falha ao atualizar', variant: 'destructive' });
    },
  });

  const setPerfilUsuario = useMutation({
    mutationFn: async ({ id, perfil_id }: { id: string; perfil_id: string | null }) => {
      const { error } = await supabase
        .from('usuarios')
        .update({ perfil_id, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-usuarios'] });
      toast({ title: 'Perfil de acesso atualizado' });
    },
    onError: (e: any) => {
      toast({ title: 'Erro', description: e?.message || 'Falha ao atualizar perfil', variant: 'destructive' });
    },
  });

  const ativos = usuarios.filter((u) => u.ativo).length;

  const handleAddPerfil = async (p: Perfil) => { await savePerfil(p); };
  const handleEditPerfil = async (p: Perfil) => { await savePerfil(p); };
  const handleDeletePerfil = async (id: string) => { await deletePerfil(id); };

  const perfilNome = (perfil_id?: string | null) =>
    perfis.find((p) => p.id === perfil_id)?.nome || null;

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-1">Usuários e Perfis</h1>
        <p className="text-muted-foreground">Gestão de usuários e perfis de acesso da sua empresa</p>
      </div>

      <Tabs defaultValue="usuarios" className="space-y-6">
        <TabsList>
          <TabsTrigger value="usuarios" className="gap-2">
            <Users className="w-4 h-4" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="perfis" className="gap-2">
            <Shield className="w-4 h-4" /> Perfis de Acesso
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="space-y-6">
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
                  <p className="text-xs text-muted-foreground mt-2">
                    Novos usuários aparecerão aqui ao se cadastrarem no sistema.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Perfil de Acesso</TableHead>
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
                        <TableCell>
                          <Select
                            value={u.perfil_id || 'none'}
                            onValueChange={(v) =>
                              setPerfilUsuario.mutate({ id: u.id, perfil_id: v === 'none' ? null : v })
                            }
                          >
                            <SelectTrigger className="w-52 h-8">
                              <SelectValue placeholder="Sem perfil">
                                {perfilNome(u.perfil_id) || 'Sem perfil'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem perfil</SelectItem>
                              {perfis
                                .filter((p) => p.ativo)
                                .map((p) => (
                                  <SelectItem key={p.id} value={p.id!}>
                                    {p.nome}
                                    {p.sistema ? ' (sistema)' : ''}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{u.role}</Badge>
                        </TableCell>
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
        </TabsContent>

        <TabsContent value="perfis">
          <PerfisConfig
            perfis={perfis}
            onAdd={handleAddPerfil}
            onEdit={handleEditPerfil}
            onDelete={handleDeletePerfil}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConfiguracoesUsuarios;
