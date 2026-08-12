import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { QuickAddButton } from '@/components/modules/rh/QuickAddButton';

export interface QuickAddValues {
  nome: string;
  codigo?: string;
  descricao?: string;
}

export interface QuickAddResult {
  id: string;
  nome: string;
}

interface QuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  showCode?: boolean;
  codeLabel?: string;
  onCreate: (values: QuickAddValues) => Promise<QuickAddResult>;
  onCreated: (created: QuickAddResult) => void | Promise<void>;
}

const emptyValues: QuickAddValues = { nome: '', codigo: '', descricao: '' };

export const QuickAddDialog: React.FC<QuickAddDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  showCode = false,
  codeLabel = 'Código / Sigla',
  onCreate,
  onCreated,
}) => {
  const [values, setValues] = useState(emptyValues);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const close = () => {
    if (loading) return;
    setValues(emptyValues);
    setError('');
    onOpenChange(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const nome = values.nome.trim();
    if (!nome) {
      setError('Nome é obrigatório.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const created = await onCreate({
        nome,
        codigo: values.codigo?.trim() || undefined,
        descricao: values.descricao?.trim() || undefined,
      });
      await onCreated(created);
      setValues(emptyValues);
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir o cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog modal={false} open={open} onOpenChange={(nextOpen) => !nextOpen && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ?? 'Cadastre sem sair do formulário atual.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-add-nome">Nome *</Label>
            <Input
              id="quick-add-nome"
              autoFocus
              value={values.nome}
              onChange={(event) => setValues((current) => ({ ...current, nome: event.target.value }))}
              disabled={loading}
            />
          </div>

          {showCode && (
            <div className="space-y-2">
              <Label htmlFor="quick-add-codigo">{codeLabel}</Label>
              <Input
                id="quick-add-codigo"
                value={values.codigo}
                onChange={(event) => setValues((current) => ({ ...current, codigo: event.target.value }))}
                disabled={loading}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="quick-add-descricao">Descrição</Label>
            <Textarea
              id="quick-add-descricao"
              rows={3}
              value={values.descricao}
              onChange={(event) => setValues((current) => ({ ...current, descricao: event.target.value }))}
              disabled={loading}
            />
          </div>

          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface QuickAddLookupProps extends Omit<QuickAddDialogProps, 'open' | 'onOpenChange'> {
  tooltip: string;
  disabled?: boolean;
}

export const QuickAddLookup: React.FC<QuickAddLookupProps> = ({ tooltip, disabled, ...dialogProps }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <QuickAddButton onClick={() => setOpen(true)} tooltip={tooltip} disabled={disabled} />
      <QuickAddDialog open={open} onOpenChange={setOpen} {...dialogProps} />
    </>
  );
};
