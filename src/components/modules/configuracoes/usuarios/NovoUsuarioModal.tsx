import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase as _supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, User, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { sociosRepresentantesService } from '@/services/sociosRepresentantesService';
import { usePerfis } from '@/hooks/usePerfis';

const supabase: any = _supabase;

type Origem = 'COLABORADOR' | 'SOCIO';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}

const NovoUsuarioModal: React.FC<Props> = ({ open, onOpenChange, onCreated }) => {
  const { perfis } = usePerfis();
  const [origem, setOrigem] = useState<Origem>('COLABORADOR');
  const [pessoaId, setPessoaId] = useState<string>('');
  const [perfilId, setPerfilId] = useState<string>('');
  const [role, setRole] = useState<'admin' | 'moderator' | 'user'>('user');
  const [saving, setSaving] = useState(false);

  const { data: empresaId } = useQuery({
    queryKey: ['user-empresa-id'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_user_empresa_id');
      return (data as string | null) ?? null;
    },
    enabled: open,
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores-disponiveis', empresaId],
    enabled: open && origem === 'COLABORADOR' && !!empresaId,
    queryFn: async () => {
      const { data: colabs } = await supabase
        .from('colaboradores')
        .select('id, nome, cpf, email')
        .eq('ativo', true)
        .is('deleted_at', null)
        .order('nome');
      const { data: usados } = await supabase
        .from('usuarios')
        .select('colaborador_id')
        .not('colaborador_id', 'is', null);
      const usedIds = new Set((usados || []).map((u: any) => u.colaborador_id));
      return (colabs || []).filter((c: any) => !usedIds.has(c.id));
    },
  });

  const { data: socios = [] } = useQuery({
    queryKey: ['socios-disponiveis', empresaId],
    enabled: open && origem === 'SOCIO' && !!empresaId,
    queryFn: () => sociosRepresentantesService.listAvailableForUser(empresaId!),
  });

  useEffect(() => {
    if (open) {
      setOrigem('COLABORADOR');
      setPessoaId('');
      setPerfilId('');
      setRole('user');
    }
  }, [open]);

  const pessoaSelecionada = useMemo(() => {
    if (origem === 'COLABORADOR') return colaboradores.find((c: any) => c.id === pessoaId);
    return socios.find((s: any) => s.id === pessoaId);
  }, [origem, pessoaId, colaboradores, socios]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pessoaSelecionada || !empresaId) {
      toast.error('Selecione a pessoa');
      return;
    }
    if (!perfilId) {
      toast.error('Selecione o perfil de acesso');
      return;
    }
    const nome = (pessoaSelecionada as any).nome;
    const email = (pessoaSelecionada as any).email;
    if (!email) {
      toast.error('A pessoa selecionada precisa ter e-mail cadastrado');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        empresa_representada_id: empresaId,
        nome,
        email,
        perfil_id: perfilId,
        pessoa_tipo: origem,
        pessoa_pendente: true,
        ativo: true,
        updated_at: new Date().toISOString(),
      };
      if (origem === 'COLABORADOR') payload.colaborador_id = pessoaId;
      else payload.socio_id = pessoaId;

      // user_id fica NULL até a pessoa aceitar o convite / fazer signup.
      const { data: created, error } = await supabase
        .from('usuarios')
        .insert(payload)
        .select('id')
        .single();
      if (error) {
        if (error.code === '23505') throw new Error('Esta pessoa já está vinculada a um usuário.');
        if (error.code === '23503') throw new Error('Referência inválida (empresa, perfil ou pessoa).');
        if (error.code === '42501') throw new Error('Sem permissão. Apenas administradores podem criar usuários.');
        throw error;
      }

      void role;

      // Dispara convite via edge function (não bloqueia a criação em caso de falha)
      try {
        const { data: inviteData, error: inviteError } = await supabase.functions.invoke(
          'enviar-convite-usuario',
          { body: { usuario_id: created?.id, email, nome } },
        );
        if (inviteError) throw inviteError;
        if (inviteData?.invited) {
          toast.success('Usuário criado e convite enviado por e-mail.');
        } else {
          toast.success('Usuário criado. Convite pendente: ' + (inviteData?.message || 'envio manual necessário.'));
        }
      } catch (inviteErr: any) {
        console.error('[NovoUsuario] Falha ao enviar convite:', inviteErr);
        toast.warning('Usuário criado, porém falhou ao enviar convite: ' + (inviteErr?.message || 'erro desconhecido'));
      }

      onCreated();
      onOpenChange(false);

    } catch (err: any) {
      toast.error(err?.message || 'Falha ao criar usuário');
    } finally {
      setSaving(false);
    }
  };

  const lista: any[] = origem === 'COLABORADOR' ? colaboradores : socios;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Origem da pessoa</Label>
            <RadioGroup value={origem} onValueChange={(v) => { setOrigem(v as Origem); setPessoaId(''); }} className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 border rounded-md p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="COLABORADOR" />
                <Briefcase className="w-4 h-4" /> Colaborador
              </label>
              <label className="flex items-center gap-2 border rounded-md p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="SOCIO" />
                <User className="w-4 h-4" /> Sócio / Representante
              </label>
            </RadioGroup>
          </div>

          <div>
            <Label>Pessoa *</Label>
            <Select value={pessoaId} onValueChange={setPessoaId}>
              <SelectTrigger>
                <SelectValue placeholder={lista.length ? 'Selecione' : 'Nenhuma pessoa disponível'} />
              </SelectTrigger>
              <SelectContent>
                {lista.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome} {p.email ? `— ${p.email}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Só aparecem pessoas ativas ainda não vinculadas a outro usuário.
            </p>
          </div>

          {pessoaSelecionada && (
            <div className="rounded-md border p-3 bg-muted/30 text-sm space-y-1">
              <div><strong>Nome:</strong> {(pessoaSelecionada as any).nome}</div>
              <div><strong>Email:</strong> {(pessoaSelecionada as any).email || <span className="text-destructive">não informado</span>}</div>
              {(pessoaSelecionada as any).cpf && <div><strong>CPF:</strong> {(pessoaSelecionada as any).cpf}</div>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Perfil de Acesso *</Label>
              <Select value={perfilId} onValueChange={setPerfilId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {perfis.filter((p) => p.ativo).map((p) => (
                    <SelectItem key={p.id} value={p.id!}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="moderator">Moderador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Criar Usuário
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NovoUsuarioModal;
