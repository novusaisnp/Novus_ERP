import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { webhookConfigService } from '@/services/webhookConfigService';
import type { WebhookConfigInput } from '@/types/webhookConfig';

export const useWebhookConfigs = (empresaId: string | null | undefined) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['webhook_configs', empresaId],
    queryFn: () => webhookConfigService.list(empresaId!),
    enabled: !!empresaId,
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['webhook_configs', empresaId] });

  const createMutation = useMutation({
    mutationFn: (input: WebhookConfigInput) => webhookConfigService.create(input),
    onSuccess: () => {
      invalidate();
      toast.success('Webhook criado');
    },
    onError: (e: any) => toast.error(e?.message || 'Falha ao criar webhook'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<WebhookConfigInput> }) =>
      webhookConfigService.update(id, patch, empresaId!),
    onSuccess: () => {
      invalidate();
      toast.success('Webhook atualizado');
    },
    onError: (e: any) => toast.error(e?.message || 'Falha ao atualizar webhook'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      ativo
        ? webhookConfigService.ativar(id, empresaId!)
        : webhookConfigService.inativar(id, empresaId!),
    onSuccess: (_d, vars) => {
      invalidate();
      toast.success(vars.ativo ? 'Webhook ativado' : 'Webhook inativado');
    },
    onError: (e: any) => toast.error(e?.message || 'Falha ao alternar status'),
  });

  const rotateSecretMutation = useMutation({
    mutationFn: (id: string) => webhookConfigService.rotateSecret(id, empresaId!),
    onSuccess: () => {
      invalidate();
      toast.success('Secret rotacionado');
    },
    onError: (e: any) => toast.error(e?.message || 'Falha ao rotacionar secret'),
  });

  return {
    webhooks: query.data ?? [],
    loading: query.isLoading,
    refetch: query.refetch,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    toggleAtivo: toggleMutation.mutateAsync,
    rotateSecret: rotateSecretMutation.mutateAsync,
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
  };
};
