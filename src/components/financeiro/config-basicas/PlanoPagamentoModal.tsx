import React from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagamentoNaturezas, usePagamentoModalidades } from '@/hooks/usePagamentoCatalogo';
import type { PlanoPagamento, PlanoPagamentoInput } from '@/types/configBasicas';

console.log('[PlanoPagamentoModal] Componente inicializado');

interface PlanoPagamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  plano: PlanoPagamento | null;
  onSubmit: (data: PlanoPagamentoInput) => void;
  isLoading: boolean;
}

export const PlanoPagamentoModal: React.FC<PlanoPagamentoModalProps> = ({
  isOpen,
  onClose,
  plano,
  onSubmit,
  isLoading,
}) => {
  const { data: naturezas = [] } = usePagamentoNaturezas(true);
  const { data: modalidades = [] } = usePagamentoModalidades(true);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<PlanoPagamentoInput>({
    defaultValues: {
      nome: '',
      ativo: true,
      natureza_id: null,
      modalidade_default_id: null,
      qtd_parcelas: 1,
      dias_primeira_parcela: 30,
      intervalo_dias: 30,
      percentual_entrada: 0,
      juros_am: 0,
      desconto_avista_perc: 0,
    },
  });

  React.useEffect(() => {
    if (plano) {
      reset({
        nome: plano.nome,
        ativo: plano.ativo,
        natureza_id: plano.natureza_id ?? null,
        modalidade_default_id: plano.modalidade_default_id ?? null,
        qtd_parcelas: plano.qtd_parcelas ?? 1,
        dias_primeira_parcela: plano.dias_primeira_parcela ?? 30,
        intervalo_dias: plano.intervalo_dias ?? 30,
        percentual_entrada: plano.percentual_entrada ?? 0,
        juros_am: plano.juros_am ?? 0,
        desconto_avista_perc: plano.desconto_avista_perc ?? 0,
      });
    } else {
      reset({
        nome: '',
        ativo: true,
        natureza_id: null,
        modalidade_default_id: null,
        qtd_parcelas: 1,
        dias_primeira_parcela: 30,
        intervalo_dias: 30,
        percentual_entrada: 0,
        juros_am: 0,
        desconto_avista_perc: 0,
      });
    }
  }, [plano, reset]);

  const values = watch();
  const naturezaSel = naturezas.find((n) => n.id === values.natureza_id);

  // Filtro de modalidades por natureza (regras de coerência)
  const modalidadesFiltradas = modalidades.filter((m) => {
    if (!naturezaSel) return true;
    if (naturezaSel.codigo === 'AVISTA') return m.liquidacao_imediata;
    if (naturezaSel.codigo === 'PARCELADO') return m.permite_parcelamento;
    if (naturezaSel.codigo === 'CREDIARIO_PROPRIO') return m.codigo === 'CREDIARIO';
    return true;
  });

  const handleFormSubmit = (data: PlanoPagamentoInput) => {
    // Coerção de tipos numéricos vindos do Input
    const payload: PlanoPagamentoInput = {
      ...data,
      qtd_parcelas: Number(data.qtd_parcelas) || 1,
      dias_primeira_parcela: Number(data.dias_primeira_parcela) || 0,
      intervalo_dias: Number(data.intervalo_dias) || 0,
      percentual_entrada: Number(data.percentual_entrada) || 0,
      juros_am: Number(data.juros_am) || 0,
      desconto_avista_perc: Number(data.desconto_avista_perc) || 0,
    };
    onSubmit(payload);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plano ? 'Editar Plano de Pagamento' : 'Novo Plano de Pagamento'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Plano *</Label>
            <Input
              id="nome"
              {...register('nome', { required: 'Nome do plano é obrigatório' })}
              placeholder="Ex: 10x sem juros"
            />
            {errors.nome && <span className="text-sm text-destructive">{errors.nome.message}</span>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Natureza *</Label>
              <Select
                value={values.natureza_id ?? ''}
                onValueChange={(v) => {
                  setValue('natureza_id', v);
                  // reset modalidade se ficou incompatível
                  setValue('modalidade_default_id', null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a natureza" />
                </SelectTrigger>
                <SelectContent>
                  {naturezas.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Modalidade default</Label>
              <Select
                value={values.modalidade_default_id ?? ''}
                onValueChange={(v) => setValue('modalidade_default_id', v)}
                disabled={!naturezaSel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={naturezaSel ? 'Selecione a modalidade' : 'Escolha uma natureza primeiro'} />
                </SelectTrigger>
                <SelectContent>
                  {modalidadesFiltradas.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qtd_parcelas">Qtd. parcelas</Label>
              <Input id="qtd_parcelas" type="number" min={1} {...register('qtd_parcelas', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dias_primeira_parcela">1ª parcela (dias)</Label>
              <Input id="dias_primeira_parcela" type="number" min={0} {...register('dias_primeira_parcela', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="intervalo_dias">Intervalo (dias)</Label>
              <Input id="intervalo_dias" type="number" min={0} {...register('intervalo_dias', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="percentual_entrada">Entrada (%)</Label>
              <Input id="percentual_entrada" type="number" step="0.01" min={0} max={100} {...register('percentual_entrada', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="juros_am">Juros a.m. (%)</Label>
              <Input id="juros_am" type="number" step="0.01" min={0} {...register('juros_am', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desconto_avista_perc">Desc. à vista (%)</Label>
              <Input id="desconto_avista_perc" type="number" step="0.01" min={0} max={100} {...register('desconto_avista_perc', { valueAsNumber: true })} />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <Label htmlFor="ativo" className="text-sm">Ativo</Label>
            <Switch
              id="ativo"
              checked={values.ativo}
              onCheckedChange={(checked) => setValue('ativo', checked)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !values.natureza_id}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
