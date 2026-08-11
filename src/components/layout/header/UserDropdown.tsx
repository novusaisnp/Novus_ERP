
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, Settings, User, LogOut, Building2, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clearEmpresaAtivaId } from '@/lib/empresaAtiva';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { usuarioService } from "@/services/usuarioService";
import { supabase } from '@/integrations/supabase/client';
import { passwordSchema, PASSWORD_POLICY_MESSAGE } from '@/lib/passwordPolicy';
import { toast } from '@/hooks/use-toast';

const trocarSenhaSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  });

type TrocarSenhaFormData = z.infer<typeof trocarSenhaSchema>;

export const UserDropdown: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [trocarSenhaOpen, setTrocarSenhaOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TrocarSenhaFormData>({ resolver: zodResolver(trocarSenhaSchema) });

  const handleTrocarEmpresa = () => {
    clearEmpresaAtivaId();
    queryClient.invalidateQueries({ queryKey: ['empresa-representada-atual'] });
    navigate('/selecionar-empresa');
  };

  const { data: nomeCadastrado } = useQuery({
    queryKey: ['usuario-nome-atual', user?.id],
    queryFn: () => usuarioService.fetchNomeUsuarioAtual(user!.id),
    enabled: !!user?.id,
  });

  const handleLogout = async () => {
    console.log('[UserDropdown] Fazendo logout');
    await signOut();
    navigate('/login');
  };

  const onTrocarSenha = async (data: TrocarSenhaFormData) => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: data.newPassword });
      if (error) {
        toast({ title: 'Erro ao trocar senha', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Senha alterada com sucesso!' });
      reset();
      setTrocarSenhaOpen(false);
    } finally {
      setSaving(false);
    }
  };

  // Extrair primeiro nome do nome completo ou usar a primeira parte do email
  const getFirstName = (fullName: string | null, email: string | null) => {
    if (fullName) {
      return fullName.split(' ')[0];
    }
    if (email) {
      return email.split('@')[0];
    }
    return 'Usuário';
  };

  const userName = nomeCadastrado || user?.user_metadata?.nome_completo || null;
  const userEmail = user?.email || '';
  const firstName = getFirstName(userName, userEmail);
  const userInitials = firstName.slice(0, 2).toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground rounded-md px-2 py-1.5 transition-colors">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start min-w-0 hidden sm:flex">
              <div className="text-sm font-medium text-foreground truncate max-w-[120px]">
                {firstName}
              </div>
              <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                {userEmail}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56"
          side="bottom"
          align="end"
          sideOffset={8}
        >
          <DropdownMenuItem onClick={() => navigate("/configuracoes/sistema")}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Configurações</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleTrocarEmpresa}>
            <Building2 className="mr-2 h-4 w-4" />
            <span>Trocar empresa</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTrocarSenhaOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" />
            <span>Trocar senha</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={trocarSenhaOpen} onOpenChange={(open) => { setTrocarSenhaOpen(open); if (!open) reset(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Trocar senha</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onTrocarSenha)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input id="newPassword" type="password" {...register('newPassword')} />
              <p className="text-xs text-muted-foreground">{PASSWORD_POLICY_MESSAGE}</p>
              {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirme a nova senha</Label>
              <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTrocarSenhaOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
