// FIN-E4.1: diálogo para converter orçamento aprovado em venda
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePagamentoModalidades } from '@/hooks/usePagamentoCatalogo';
import type { Orcamento } from '@/services/orcamentosService';

interface Props {
  orcamento: Orcamento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RpcErro {
  codigo: string;
  categoria?: string;
  mensagem: string;
  campo?: string;
}

interface RpcResult {
  ok: boolean;
  venda_id?: string;
  replay?: boolean;
  avisos?: RpcErro[];
  erros?: RpcErro[];
}

const FRIENDLY_CODES: Record<string, string> = {
  PERM_DENIED: 'Você não tem permissão para converter este orçamento.',
  ORCAMENTO_NAO_APROVAVEL: 'Somente orçamentos aprovados podem ser convertidos em venda.',
  ORCAMENTO_NAO_ENCONTRADO: 'Orçamento não encontrado.',
  ORCAMENTO_ID_REQUERIDO: 'Identificador do orçamento ausente.',
  CONVERSAO_CONFLITO: 'Este orçamento já foi convertido com dados diferentes.',
  CLIENTE_BLOQUEADO: 'Cliente bloqueado para vendas.',
  CREDIARIO_SEM_LIMITE: 'Cliente sem limite de crediário disponível.',
  MODALIDADE_BLOQUEADA: 'Modalidade de pagamento bloqueada para este cliente.',
  DIVERGENCIA_TOTAL: 'Soma dos pagamentos difere do total da venda.',
  PLANO_INATIVO_OU_EXPIRADO: 'Plano de pagamento inativo ou fora da vigência.',
};

function parseRpcError(err: unknown): { codigo: string; mensagem: string } {
  const anyErr = err as { message?: string; code?: string };
  const msg = anyErr?.message ?? 'Erro inesperado ao converter orçamento.';
  const m = msg.match(/^([A-Z_]+):?\s*(.*)$/);
  if (m) {
    const codigo = m[1];
    return { codigo, mensagem: FRIENDLY_CODES[codigo] ?? m[2] ?? msg };
  }
  return { codigo: 'ERRO', mensagem: msg };
}

export const ConverterVendaDialog: React.FC<Props> = ({ orcamento, open, onOpenChange }) => {
  const navigate = useNavigate();
  const modsQ = usePagamentoModalidades(true);
  const [modalidadeId, setModalidadeId] = useState<string>('');
  const [qtdParcelas, setQtdParcelas] = useState<number>(1);
  const [diasPrimeira, setDiasPrimeira] = useState<number>(30);
  const [intervalo, setIntervalo] = useState<number>(30);
  const [submitting, setSubmitting] = useState(false);
  const [erros, setErros] = useState<RpcErro[]>([]);

  const handleClose = (o: boolean) => {
    if (submitting) return;
    if (!o) {
      setErros([]);
      setModalidadeId('');
      setQtdParcelas(1);
      setDiasPrimeira(30);
      setIntervalo(30);
    }
    onOpenChange(o);
  };

  const handleConverter = async () => {
    if (!orcamento) return;
    if (submitting) return;
    if (!modalidadeId) {
      toast.error('Selecione a modalidade de pagamento.');
      return;
    }
    setSubmitting(true);
    setErros([]);
    try {
      const payload = {
        orcamento_id: orcamento.id,
        pagamento: {
          modalidade_id: modalidadeId,
          valor_bruto: Number(orcamento.valorTotal) || 0,
          qtd_parcelas: qtdParcelas,
          parcelamento: {
            dias_primeira: diasPrimeira,
            intervalo_dias: intervalo,
          },
        },
      };
      const { data, error } = await supabase.rpc(
        // @ts-expect-error - RPC recém-criada, aguardando regen de types
        'converter_orcamento_em_venda',
        { p_payload: payload },
      );

      if (import.meta.env.DEV) {
        console.log('[converter_orcamento_em_venda]', { data, error });
      }

      if (error) {
        const parsed = parseRpcError(error);
        // erros compostos vindos do validar_pagamento_venda
        if (parsed.codigo === 'PAGAMENTO_INVALIDO') {
          try {
            const jsonPart = error.message.replace(/^PAGAMENTO_INVALIDO:\s*/, '');
            const parsedJson = JSON.parse(jsonPart);
            const errosVal: RpcErro[] = parsedJson?.erros ?? [];
            setErros(errosVal);
            toast.error('Pagamento inválido — verifique os erros abaixo.');
            return;
          } catch {
            /* fallback */
          }
        }
        setErros([{ codigo: parsed.codigo, mensagem: parsed.mensagem }]);
        toast.error(parsed.mensagem);
        return;
      }

      const result = data as RpcResult;
      if (!result?.ok) {
        setErros(result?.erros ?? [{ codigo: 'ERRO', mensagem: 'Falha desconhecida.' }]);
        toast.error('Conversão não concluída.');
        return;
      }

      if (result.replay) {
        toast.info('Orçamento já convertido — abrindo venda existente.');
      } else {
        toast.success('Orçamento convertido em venda com sucesso.');
      }
      handleClose(false);
      navigate(`/vendas/pedidos?venda=${result.venda_id}`);
    } catch (e) {
      const parsed = parseRpcError(e);
      setErros([{ codigo: parsed.codigo, mensagem: parsed.mensagem }]);
      toast.error(parsed.mensagem);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Converter em Venda</DialogTitle>
          <DialogDescription>
            {orcamento
              ? `Orçamento ${orcamento.numero} — ${(Number(orcamento.valorTotal) || 0).toLocaleString(
                  'pt-BR',
                  { style: 'currency', currency: 'BRL' },
                )}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Modalidade de pagamento *</Label>
            <Select value={modalidadeId} onValueChange={setModalidadeId} disabled={submitting}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {(modsQ.data ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Parcelas</Label>
              <Input
                type="number"
                min={1}
                value={qtdParcelas}
                onChange={(e) => setQtdParcelas(Math.max(1, Number(e.target.value) || 1))}
                disabled={submitting}
              />
            </div>
            <div>
              <Label>1ª (dias)</Label>
              <Input
                type="number"
                min={0}
                value={diasPrimeira}
                onChange={(e) => setDiasPrimeira(Math.max(0, Number(e.target.value) || 0))}
                disabled={submitting}
              />
            </div>
            <div>
              <Label>Intervalo (dias)</Label>
              <Input
                type="number"
                min={1}
                value={intervalo}
                onChange={(e) => setIntervalo(Math.max(1, Number(e.target.value) || 1))}
                disabled={submitting}
              />
            </div>
          </div>

          {erros.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4 space-y-1">
                  {erros.map((e, i) => (
                    <li key={`${e.codigo}-${i}`}>
                      <span className="font-mono text-xs mr-1">[{e.codigo}]</span>
                      {e.mensagem}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleConverter} disabled={submitting || !modalidadeId}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Converter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
