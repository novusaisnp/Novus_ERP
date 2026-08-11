import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { encerrarMDFe, incluirCondutorMDFe } from '@/services/fiscal/mdfeService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentoId: string | null;
  acao: 'encerrar' | 'incluir_condutor';
}

export default function MDFeEventoDialog({ open, onOpenChange, documentoId, acao }: Props) {
  const queryClient = useQueryClient();
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [uf, setUf] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  useEffect(() => {
    if (!open) return;
    setData(new Date().toISOString().slice(0, 10)); setUf(''); setMunicipio(''); setNome(''); setCpf('');
  }, [open, acao]);
  const mutation = useMutation({
    mutationFn: () => {
      if (!documentoId) throw new Error('Documento não selecionado.');
      return acao === 'encerrar'
        ? encerrarMDFe(documentoId, data, uf, municipio)
        : incluirCondutorMDFe(documentoId, nome, cpf.replace(/\D/g, ''));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-documento', documentoId] });
      queryClient.invalidateQueries({ queryKey: ['fiscal-eventos', documentoId] });
      toast.success(acao === 'encerrar' ? 'MDF-e encerrado.' : 'Condutor incluído.');
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const valid = acao === 'encerrar'
    ? /^\d{4}-\d{2}-\d{2}$/.test(data) && uf.trim().length === 2 && municipio.trim().length >= 2
    : nome.trim().length >= 2 && cpf.replace(/\D/g, '').length === 11;

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
    <DialogHeader><DialogTitle>{acao === 'encerrar' ? 'Encerrar MDF-e' : 'Incluir condutor'}</DialogTitle>
      <DialogDescription>{acao === 'encerrar' ? 'Informe local e data do encerramento. A ação é comunicada à SEFAZ.' : 'Inclua outro condutor no MDF-e autorizado.'}</DialogDescription>
    </DialogHeader>
    {acao === 'encerrar' ? <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Data"><Input type="date" value={data} onChange={e => setData(e.target.value)} /></Field>
      <Field label="UF"><Input maxLength={2} value={uf} onChange={e => setUf(e.target.value.toUpperCase())} /></Field>
      <Field label="Município"><Input value={municipio} onChange={e => setMunicipio(e.target.value)} /></Field>
    </div> : <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nome"><Input value={nome} onChange={e => setNome(e.target.value)} /></Field>
      <Field label="CPF"><Input inputMode="numeric" value={cpf} onChange={e => setCpf(e.target.value)} /></Field>
    </div>}
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Voltar</Button><Button onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending}>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar</Button></DialogFooter>
  </DialogContent></Dialog>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
