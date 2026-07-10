import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as _supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Shield, Plus, AlertTriangle, Briefcase, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePerfis } from '@/hooks/usePerfis';
import PerfisConfig from '@/components/modules/configuracoes/empresas/PerfisConfig';
import NovoUsuarioModal from '@/components/modules/configuracoes/usuarios/NovoUsuarioModal';
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
  pessoa_tipo?: 'COLABORADOR' | 'SOCIO' | null;
  pessoa_pendente?: boolean | null;
  colaborador_id?: string | null;
  socio_id?: string | null;
  pessoa_nome?: string | null;
}

async function fetchUsuarios(): Promise<UsuarioRow[]> {
  const { data: usuarios, error } = await supabase
    .from('usuarios')
    .select('id, user_id, empresa_representada_id, ativo, nome, email, perfil_id, pessoa_tipo, pessoa_pendente, colaborador_id, socio_id');
  if (error) {
    console.error('[Usuarios] erro ao carregar');
    return [];
  }

  const colabIds = (usuarios || []).map((u: any) => u.colaborador_id).filter(Boolean);
  const socioIds = (usuarios || []).map((u: any) => u.socio_id).filter(Boolean);
  const colabMap: Record<string, string> = {};
  const socioMap: Record<string, string> = {};

  if (colabIds.length) {
    const { data } = await supabase.from('colaboradores').select('id, nome').in('id', colabIds);
    (data || []).forEach((c: any) => { colabMap[c.id] = c.nome; });
  }
  if (socioIds.length) {
    const { data } = await supabase.from('socios_representantes').select('id, nome').in('id', socioIds);
    (data || []).forEach((s: any) => { socioMap[s.id] = s.nome; });
  }

  const userIds = (usuarios || []).map((u: any) => u.user_id).filter(Boolean);
  const roles: Record<string, string> = {};
  if (userIds.length) {
    const { data: rolesData } = await supabase.from('user_roles').select('user_id, role').in('user_id', userIds);
    (rolesData || []).forEach((r: any) => { roles[r.user_id] = r.role; });
  }

  return (usuarios || []).map((u: any) => ({
    ...u,
    role: roles[u.user_id] || '-',
    pessoa_nome: u.colaborador_id ? colabMap[u.colaborador_id] : u.socio_id ? socioMap[u.socio_id] : null,
  }));
}

const ConfiguracoesUsuarios: React.FC = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { perfis, savePerfil, deletePerfil } = usePerfis();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['config-usuarios'],
    queryFn: fetchUsuarios,
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('usuarios').update({ ativo, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-usuarios'] });
      toast({ title: 'Status atualizado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e?.message || 'Falha', variant: 'destructive' }),
  });

  const setPerfilUsuario = useMutation({
    mutationFn: async ({ id, perfil_id }: { id: string; perfil_id: string | null }) => {
      const { error } = await supabase.from('usuarios').update({ perfil_id, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-usuarios'] });
      toast({ title: 'Perfil de acesso atualizado' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e?.message || 'Falha', variant: 'destructive' }),
  });

  const ativos = usuarios.filter((u) => u.ativo).length;
  const pendentes = usuarios.filter((u) => u.pessoa_pendente).length;

  const handleAddPerfil = async (p: Perfil) => { await savePerfil(p); };
  const handleEditPerfil = async (p: Perfil) => { await savePerfil(p); };
  const handleDeletePerfil = async (id: string) => { await deletePerfil(id); };

  const perfilNome = (perfil_id?: string | null) => perfis.find((p) => p.id === perfil_id)?.nome || null;

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">Usuários e Perfis</h1>
          <p className="text-muted-foreground">Gestão de usuários e perfis de acesso da sua empresa</p>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Novo Usuário</Button>
      </div>

      {pendentes > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm">
          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <strong>{pendentes} usuário(s) legado(s)</strong> ainda não estão vinculados a um colaborador ou sócio.
            Vincule cada um deles editando o cadastro do respectivo colaborador/sócio para manter a rastreabilidade do sistema.
          </div>
        </div>
      )}

      <Tabs defaultValue="usuarios" className="space-y-6">
        <TabsList>
          <TabsTrigger value="usuarios" className="gap-2"><Users className="w-4 h-4" /> Usuários</TabsTrigger>
          <TabsTrigger value="perfis" className="gap-2"><Shield className="w-4 h-4" /> Perfis de Acesso</TabsTrigger>
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
                  <p className="text-xs text-muted-foreground mt-2">Clique em "Novo Usuário" para vincular uma pessoa.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Pessoa</TableHead>
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
                          {u.pessoa_pendente ? (
                            <Badge variant="outline" className="text-yellow-700 border-yellow-500/50">
                              <AlertTriangle className="w-3 h-3 mr-1" />Pendente
                            </Badge>
                          ) : u.pessoa_tipo === 'COLABORADOR' ? (
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs">{u.pessoa_nome || 'Colaborador'}</span>
                              <Badge variant="secondary" className="text-[10px]">Colab.</Badge>
                            </div>
                          ) : u.pessoa_tipo === 'SOCIO' ? (
                            <div className="flex items-center gap-1.5">
                              <UserIcon className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs">{u.pessoa_nome || 'Sócio'}</span>
                              <Badge variant="secondary" className="text-[10px]">Sócio</Badge>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={u.perfil_id || 'none'}
                            onValueChange={(v) => setPerfilUsuario.mutate({ id: u.id, perfil_id: v === 'none' ? null : v })}
                          >
                            <SelectTrigger className="w-52 h-8">
                              <SelectValue placeholder="Sem perfil">{perfilNome(u.perfil_id) || 'Sem perfil'}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem perfil</SelectItem>
                              {perfis.filter((p) => p.ativo).map((p) => (
                                <SelectItem key={p.id} value={p.id!}>
                                  {p.nome}{p.sistema ? ' (sistema)' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={u.ativo ? 'default' : 'secondary'}>{u.ativo ? 'Ativo' : 'Inativo'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Switch checked={!!u.ativo} onCheckedChange={(v) => toggleAtivo.mutate({ id: u.id, ativo: v })} />
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

      <NovoUsuarioModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={() => qc.invalidateQueries({ queryKey: ['config-usuarios'] })}
      />
    </div>
  );
};

export default ConfiguracoesUsuarios;
