import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, User, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { sociosRepresentantesService } from '@/services/sociosRepresentantesService';
import { usuarioService, type ColaboradorDisponivel, type NovoUsuarioPendenteInput } from '@/services/usuarioService';
import { usePerfis } from '@/hooks/usePerfis';
import { provisionarAdminSatelites } from '@/lib/provisionarAdminSatelites';
import type { SocioRepresentante } from '@/types/socios';

type Origem = 'COLABORADOR' | 'SOCIO';
type Pessoa = ColaboradorDisponivel | SocioRepresentante;

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
  const [role, setRole] = useState<'admin' | 'gerente' | 'operador' | 'visualizador'>('operador');
  const [saving, setSaving] = useState(false);

  const { data: empresaId } = useQuery({
    queryKey: ['user-empresa-id'],
    queryFn: usuarioService.getEmpresaIdAtual,
    enabled: open,
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores-disponiveis', empresaId],
    enabled: open && origem === 'COLABORADOR' && !!empresaId,
    queryFn: usuarioService.listColaboradoresDisponiveis,
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
      setRole('operador');
    }
  }, [open]);

  const pessoaSelecionada: Pessoa | undefined = useMemo(() => {
    if (origem === 'COLABORADOR') return colaboradores.find((c) => c.id === pessoaId);
    return socios.find((s) => s.id === pessoaId);
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
    const nome = pessoaSelecionada.nome;
    const email = pessoaSelecionada.email;
    if (!email) {
      toast.error('A pessoa selecionada precisa ter e-mail cadastrado');
      return;
    }
    setSaving(true);
    try {
      const payload: NovoUsuarioPendenteInput = {
        empresa_representada_id: empresaId,
        nome,
        email,
        perfil_id: perfilId,
        pessoa_pendente: true,
        ativo: true,
        updated_at: new Date().toISOString(),
        entidade_id: pessoaId,
      };

      // user_id fica NULL até o acesso ser provisionado abaixo.
      let created: { id: string };
      try {
        created = await usuarioService.criarUsuarioPendente(payload);
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === '23505') throw new Error('Esta pessoa já está vinculada a um usuário.');
        if (code === '23503') throw new Error('Referência inválida (empresa, perfil ou pessoa).');
        if (code === '42501') throw new Error('Sem permissão. Apenas administradores podem criar usuários.');
        throw error;
      }

      // Provisiona o acesso: cria a conta com senha temporária = e-mail do
      // usuário (login com e-mail nos dois campos) e grava o role em
      // user_roles — sem isso a pessoa nunca vê nenhuma empresa disponível.
      try {
        const { data: provData, error: provError } = await usuarioService.provisionarAcesso({
          usuario_id: created.id,
          email,
          nome,
          empresa_representada_id: empresaId,
          role,
        });
        if (provError) throw provError;
        if (provData?.ok) {
          toast.success('Usuário criado. Peça pra pessoa entrar com o e-mail dela nos dois campos (login e senha) no primeiro acesso.');
          if (origem === 'SOCIO') {
            await provisionarAdminSatelites(pessoaId);
          }
        } else {
          toast.warning('Usuário criado, porém o acesso não foi provisionado: ' + (provData?.message || 'erro desconhecido.'));
        }
      } catch (provErr) {
        console.error('[NovoUsuario] Falha ao provisionar acesso:', provErr);
        const msg = provErr instanceof Error ? provErr.message : 'erro desconhecido';
        toast.warning('Usuário criado, porém falhou ao provisionar acesso: ' + msg);
      }

      onCreated();
      onOpenChange(false);

    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao criar usuário');
    } finally {
      setSaving(false);
    }
  };

  const lista: Pessoa[] = origem === 'COLABORADOR' ? colaboradores : socios;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Origem da pessoa</Label>
            <RadioGroup
              value={origem}
              onValueChange={(v) => {
                const nova = v as Origem;
                setOrigem(nova);
                setPessoaId('');
                // Sócio/representante legal recebe acesso administrativo por força do
                // contrato entre a NOVUS e a empresa responsável — o role não é escolha
                // de quem cadastra.
                setRole(nova === 'SOCIO' ? 'admin' : 'operador');
              }}
              className="grid grid-cols-2 gap-2"
            >
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
                {lista.map((p) => (
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
              <div><strong>Nome:</strong> {pessoaSelecionada.nome}</div>
              <div><strong>Email:</strong> {pessoaSelecionada.email || <span className="text-destructive">não informado</span>}</div>
              {pessoaSelecionada.cpf && <div><strong>CPF:</strong> {pessoaSelecionada.cpf}</div>}
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
              <Select
                value={role}
                onValueChange={(v) => setRole(v as 'admin' | 'gerente' | 'operador' | 'visualizador')}
                disabled={origem === 'SOCIO'}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="visualizador">Visualizador</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
              {origem === 'SOCIO' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Sócio e representante legal recebem acesso administrativo por contrato, aqui e
                  em todos os sistemas licenciados para a empresa.
                </p>
              )}
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
