import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usuarioService, type UsuarioComPessoa } from '@/services/usuarioService';
import { sociosRepresentantesService } from '@/services/sociosRepresentantesService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Shield, Plus, AlertTriangle, Briefcase, User as UserIcon, Link2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePerfis } from '@/hooks/usePerfis';
import PerfisConfig from '@/components/modules/configuracoes/empresas/PerfisConfig';
import NovoUsuarioModal from '@/components/modules/configuracoes/usuarios/NovoUsuarioModal';
import type { Perfil } from '@/types/empresa';

const VincularPessoaAction: React.FC<{ usuario: UsuarioComPessoa; onVinculado: () => void }> = ({ usuario, onVinculado }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<'COLABORADOR' | 'SOCIO'>('COLABORADOR');
  const [pessoaId, setPessoaId] = useState('');

  const { data: empresaId } = useQuery({
    queryKey: ['user-empresa-id'],
    queryFn: usuarioService.getEmpresaIdAtual,
    enabled: open,
  });
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores-disponiveis', empresaId],
    queryFn: usuarioService.listColaboradoresDisponiveis,
    enabled: open && tipo === 'COLABORADOR' && !!empresaId,
  });
  const { data: socios = [] } = useQuery({
    queryKey: ['socios-disponiveis', empresaId],
    queryFn: () => sociosRepresentantesService.listAvailableForUser(empresaId!),
    enabled: open && tipo === 'SOCIO' && !!empresaId,
  });
  const lista = tipo === 'COLABORADOR' ? colaboradores : socios;

  const vincular = useMutation({
    mutationFn: () => usuarioService.vincularPessoa(usuario.id, tipo, pessoaId),
    onSuccess: () => {
      toast({ title: 'Usuário vinculado' });
      setOpen(false);
      setPessoaId('');
      onVinculado();
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e?.message || 'Falha', variant: 'destructive' }),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={badgeVariants({ variant: 'outline' }) + ' text-yellow-700 border-yellow-500/50 cursor-pointer'}>
        <AlertTriangle className="w-3 h-3 mr-1" />Pendente
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <div className="text-sm font-medium">Vincular a pessoa existente</div>
        <Select value={tipo} onValueChange={(v) => { setTipo(v as 'COLABORADOR' | 'SOCIO'); setPessoaId(''); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="COLABORADOR">Colaborador</SelectItem>
            <SelectItem value="SOCIO">Sócio / Representante</SelectItem>
          </SelectContent>
        </Select>
        <Select value={pessoaId} onValueChange={setPessoaId}>
          <SelectTrigger><SelectValue placeholder={lista.length ? 'Selecione a pessoa' : 'Nenhuma disponível'} /></SelectTrigger>
          <SelectContent>
            {lista.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.nome}{p.email ? ` — ${p.email}` : ''}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="w-full" disabled={!pessoaId || vincular.isPending} onClick={() => vincular.mutate()}>
          <Link2 className="w-3 h-3 mr-1" />Vincular
        </Button>
      </PopoverContent>
    </Popover>
  );
};

const ConfiguracoesUsuarios: React.FC = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { perfis, savePerfil, deletePerfil } = usePerfis();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['config-usuarios'],
    queryFn: usuarioService.fetchUsuariosComPessoa,
  });

  const toggleAtivo = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => usuarioService.toggleAtivo(id, ativo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-usuarios'] });
      toast({ title: 'Status atualizado' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e?.message || 'Falha', variant: 'destructive' }),
  });

  const setPerfilUsuario = useMutation({
    mutationFn: ({ id, perfil_id }: { id: string; perfil_id: string | null }) => usuarioService.atualizarPerfilUsuario(id, perfil_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-usuarios'] });
      toast({ title: 'Perfil de acesso atualizado' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e?.message || 'Falha', variant: 'destructive' }),
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
        <div className="flex items-start gap-2 rounded-md border border-status-production/40 bg-status-production/10 p-3 text-sm">
          <AlertTriangle className="w-4 h-4 text-status-production mt-0.5 shrink-0" />
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
                            <VincularPessoaAction usuario={u} onVinculado={() => qc.invalidateQueries({ queryKey: ['config-usuarios'] })} />
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
