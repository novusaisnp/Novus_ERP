import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  emitirNFe,
  cancelarNFe,
  enviarCartaCorrecao,
  type EmitirNFeInput,
  type EmitirNFeResult,
  type CancelarNFeInput,
  type CartaCorrecaoInput,
} from "@/services/fiscal/emissaoService";

const invalidateFiscal = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['fiscal-documentos'] });
  qc.invalidateQueries({ queryKey: ['fiscal-eventos'] });
  qc.invalidateQueries({ queryKey: ['vendas'] });
};

export const useEmitirNFe = () => {
  const qc = useQueryClient();
  return useMutation<EmitirNFeResult, Error, EmitirNFeInput>({
    mutationFn: emitirNFe,
    onSuccess: (result, input) => {
      invalidateFiscal(qc);
      const label = input.tipo === 'NFCE' ? 'NFC-e' : 'NF-e';
      if (result.status === 'autorizada') {
        toast.success(`${label} autorizada com sucesso!`);
      } else if (result.status === 'processando') {
        toast.info(result.mock ? `${label} em processamento (modo simulação).` : `${label} em processamento na SEFAZ.`);
      } else {
        toast.warning(`${label} com status: ${result.status}`);
      }
    },
    onError: (err) => {
      console.error('[useEmitirNFe] erro:', err);
      toast.error(err.message || 'Falha ao emitir NF-e.');
    },
  });
};

export const useCancelarNFe = () => {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean }, Error, CancelarNFeInput>({
    mutationFn: cancelarNFe,
    onSuccess: () => {
      invalidateFiscal(qc);
      toast.success('NF-e cancelada com sucesso!');
    },
    onError: (err) => toast.error(err.message || 'Falha ao cancelar NF-e.'),
  });
};

export const useCartaCorrecao = () => {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean }, Error, CartaCorrecaoInput>({
    mutationFn: enviarCartaCorrecao,
    onSuccess: () => {
      invalidateFiscal(qc);
      toast.success('Carta de correção enviada!');
    },
    onError: (err) => toast.error(err.message || 'Falha ao enviar carta de correção.'),
  });
};
