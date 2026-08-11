import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  solicitarAutorizacao,
  type AcaoAutorizavel,
} from '@/services/autorizacaoFinanceiraService';

const TITULO_POR_ACAO: Record<AcaoAutorizavel, string> = {
  LIQUIDACAO_RETROATIVA: 'Baixa retroativa',
  ESTORNO: 'Estorno de baixa',
  CANCELAMENTO: 'Cancelamento de título',
};

const MOTIVO_POR_ACAO: Record<AcaoAutorizavel, string> = {
  LIQUIDACAO_RETROATIVA:
    'A data de pagamento é anterior às últimas 24 horas. Um usuário com permissão para lançamento retroativo precisa autorizar.',
  ESTORNO: 'Estorno exige autorização de um usuário permissionado.',
  CANCELAMENTO: 'Cancelamento exige autorização de um usuário permissionado.',
};

const JUSTIFICATIVA_MINIMA = 5;

interface Props {
  isOpen: boolean;
  acao: AcaoAutorizavel;
  /** Dados da operação, guardados junto da autorização para auditoria. */
  contexto?: Record<string, unknown>;
  onClose: () => void;
  /** Recebe o ticket emitido; quem chama repete a operação passando-o adiante. */
  onAutorizado: (ticket: string) => void;
}

export function AutorizacaoFinanceiraModal({
  isOpen,
  acao,
  contexto,
  onClose,
  onAutorizado,
}: Props) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Credencial de outra pessoa não pode sobreviver ao fechamento do diálogo.
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setSenha('');
      setJustificativa('');
      setErro(null);
      setEnviando(false);
    }
  }, [isOpen]);

  const justificativaValida = justificativa.trim().length >= JUSTIFICATIVA_MINIMA;
  const podeEnviar = Boolean(email && senha) && justificativaValida && !enviando;

  const autorizar = async () => {
    setEnviando(true);
    setErro(null);
    try {
      const ticket = await solicitarAutorizacao({
        acao,
        email: email.trim(),
        senha,
        justificativa: justificativa.trim(),
        contexto,
      });
      setSenha('');
      onAutorizado(ticket);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao autorizar operação.');
      setSenha('');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Autorização necessária — {TITULO_POR_ACAO[acao]}
          </DialogTitle>
          <DialogDescription>{MOTIVO_POR_ACAO[acao]}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="autorizacao-email">E-mail do autorizador</Label>
            <Input
              id="autorizacao-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={enviando}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="autorizacao-senha">Senha</Label>
            <Input
              id="autorizacao-senha"
              type="password"
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={enviando}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="autorizacao-justificativa">Justificativa</Label>
            <Textarea
              id="autorizacao-justificativa"
              rows={3}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              disabled={enviando}
            />
            {justificativa.length > 0 && !justificativaValida && (
              <p className="text-xs text-muted-foreground">
                Mínimo de {JUSTIFICATIVA_MINIMA} caracteres.
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Quem autoriza, quando e por quê fica registrado para auditoria.
          </p>

          {erro && (
            <Alert variant="destructive">
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={autorizar} disabled={!podeEnviar}>
            {enviando ? 'Autorizando...' : 'Autorizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
