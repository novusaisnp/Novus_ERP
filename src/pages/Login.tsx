
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { passwordSchema, PASSWORD_POLICY_MESSAGE } from '@/lib/passwordPolicy';
import { TurnstileWidget } from '@/components/auth/TurnstileWidget';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import loginHero from '@/assets/login-hero.png.asset.json';
import { IntroSplash, hasSeenIntro, markIntroSeen } from '@/components/IntroSplash';

const loginSchema = z.object({
  email: z.string().min(1, 'E-mail é obrigatório').email('Formato de e-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
  rememberMe: z.boolean().default(false)
});

type LoginFormData = z.infer<typeof loginSchema>;

const newPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  });

type NewPasswordFormData = z.infer<typeof newPasswordSchema>;

const Login: React.FC = () => {
  const { signIn, user, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIntro, setShowIntro] = useState(() => !hasSeenIntro());
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // Quando o login usa a senha temporária (e-mail nos dois campos) ou uma
  // senha resetada pelo admin, a conta fica pendente até definir uma senha
  // de verdade aqui mesmo — sem navegar pra outra rota.
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const finishIntro = () => {
    markIntroSeen();
    setShowIntro(false);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false
    }
  });

  const {
    register: registerNewPassword,
    handleSubmit: handleNewPasswordSubmit,
    formState: { errors: newPasswordErrors },
    reset: resetNewPasswordForm,
  } = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema),
  });

  const rememberMe = watch('rememberMe');

  // Decide o que fazer com uma sessão autenticada: checar pessoa_pendente
  // ANTES de navegar. Precisa estar aqui (reagindo a `user`), não dentro do
  // onSubmit — o listener onAuthStateChange atualiza `user` assim que
  // signInWithPassword resolve, o que dispararia um redirect imediato pra
  // '/' numa corrida contra a checagem assíncrona feita no onSubmit.
  useEffect(() => {
    if (!user || loading || needsPasswordSetup) return;
    let cancelled = false;

    (async () => {
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('pessoa_pendente')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (usuario?.pessoa_pendente) {
        setNeedsPasswordSetup(true);
        return;
      }

      // Force page reload for clean state
      window.location.href = '/';
    })();

    return () => {
      cancelled = true;
    };
  }, [user, loading, needsPasswordSetup]);

  // Check if remember me was previously set
  useEffect(() => {
    const shouldRemember = localStorage.getItem('novus_remember_me') === 'true';
    if (shouldRemember) {
      setValue('rememberMe', true);
    }
  }, [setValue]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsSubmitting(true);

      // A senha temporária é o e-mail em minúsculas (ver edge function
      // enviar-convite-usuario). Senha no Supabase é case-sensitive, e-mail não —
      // sem isso, digitar "Fulano@x.com" nos dois campos falha no primeiro acesso.
      const password =
        data.password.toLowerCase() === data.email.trim().toLowerCase()
          ? data.password.toLowerCase()
          : data.password;

      const result = await signIn(data.email, password, data.rememberMe, captchaToken ?? undefined);

      if (result.error) {
        toast({
          title: 'Erro no Login',
          description: result.error,
          variant: 'destructive'
        });
        return;
      }

      // Sucesso: o useEffect que observa `user` decide entre mostrar o
      // painel de definição de senha ou seguir pro app.
    } catch (error) {
      toast({
        title: 'Erro Interno',
        description: 'Ocorreu um erro inesperado. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSetNewPassword = async (data: NewPasswordFormData) => {
    setSettingPassword(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: data.newPassword });
      if (updateError) {
        toast({ title: 'Erro ao definir senha', description: updateError.message, variant: 'destructive' });
        return;
      }

      const { error: rpcError } = await supabase.rpc('clear_pessoa_pendente');
      if (rpcError) {
        console.error('[Login] falha ao limpar pessoa_pendente:', rpcError.message);
      }

      toast({ title: 'Senha definida com sucesso!' });
      resetNewPasswordForm();
      window.location.href = '/';
    } catch (error) {
      toast({
        title: 'Erro Interno',
        description: 'Ocorreu um erro inesperado. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setSettingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showIntro && <IntroSplash onFinish={finishIntro} />}
      <div className="light min-h-screen flex">
      {/* Login Panel - Left side */}
      <div className="w-full lg:w-[30%] flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md shadow-none border-0">
          <CardHeader className="text-center space-y-6 pb-8">
            <div className="mx-auto flex items-center justify-center gap-3">
              <span className="text-2xl font-bold text-primary">ERP</span>
              <img
                src="/novus-logo.png"
                alt="NOVUS.AI"
                className="h-10 w-auto"
              />
            </div>
            <p className="text-muted-foreground text-sm">
              {needsPasswordSetup
                ? 'Cadastre sua senha definitiva para continuar'
                : 'Entre com suas credenciais para acessar o sistema'}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {needsPasswordSetup ? (
              <form onSubmit={handleNewPasswordSubmit(onSetNewPassword)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-medium text-foreground">
                    Nova senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Digite sua nova senha"
                      className="pl-10 pr-10 h-11 focus:border-ring focus:ring-ring"
                      {...registerNewPassword('newPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">{PASSWORD_POLICY_MESSAGE}</p>
                  {newPasswordErrors.newPassword && (
                    <p className="text-sm text-status-cancelled">{newPasswordErrors.newPassword.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                    Confirme a nova senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Digite novamente"
                      className="pl-10 h-11 focus:border-ring focus:ring-ring"
                      {...registerNewPassword('confirmPassword')}
                    />
                  </div>
                  {newPasswordErrors.confirmPassword && (
                    <p className="text-sm text-status-cancelled">{newPasswordErrors.confirmPassword.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={settingPassword}
                >
                  {settingPassword ? 'Salvando...' : 'Definir senha'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    E-mail
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      className="pl-10 h-11 focus:border-ring focus:ring-ring"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && <p className="text-sm text-status-cancelled">{errors.email.message}</p>}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Digite sua senha (primeiro acesso: use seu e-mail)"
                      className="pl-10 pr-10 h-11 focus:border-ring focus:ring-ring"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-status-cancelled">{errors.password.message}</p>}
                </div>

                {/* Remember Me */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={checked => setValue('rememberMe', !!checked)}
                  />
                  <Label
                    htmlFor="rememberMe"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-foreground"
                  >
                    Lembrar-me
                  </Label>
                </div>

                <TurnstileWidget onVerify={setCaptchaToken} />

                {/* Login Button */}
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Background Image - Right side */}
      <div
        className="hidden lg:flex lg:w-[70%] bg-cover bg-center bg-no-repeat relative items-center justify-center"
        style={{ backgroundImage: `url('${loginHero.url}')` }}
      >
        {/* Subtle overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
      </div>
      </div>
    </>
  );
};

export default Login;
