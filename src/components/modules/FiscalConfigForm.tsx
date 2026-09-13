import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreateConfiguracaoFiscal } from '@/hooks/useFiscal';
import { useEmpresasRepresentadas } from '@/hooks/useEmpresasRepresentadas';
import type { ConfiguracaoFiscal } from '@/types/fiscal';
import { REGIMES_TRIBUTARIOS } from '@/types/fiscal';
import { toast } from 'sonner';

interface FiscalConfigFormProps {
  configuracao?: ConfiguracaoFiscal;
  onClose?: () => void;
}

const REGIME_LABEL: Record<ConfiguracaoFiscal['regimeTributario'], string> = {
  SIMPLES_NACIONAL: 'Simples Nacional',
  LUCRO_PRESUMIDO: 'Lucro Presumido',
  LUCRO_REAL: 'Lucro Real',
  MEI: 'MEI',
};

export const FiscalConfigForm: React.FC<FiscalConfigFormProps> = ({ configuracao, onClose }) => {
  const { empresas = [] } = useEmpresasRepresentadas();
  const mutation = useCreateConfiguracaoFiscal();
  const { register, handleSubmit, watch, setValue } = useForm<ConfiguracaoFiscal>({
    defaultValues: configuracao || {
      empresaRepresentadaId: '',
      ambiente: 'HOMOLOGACAO',
      provedor: 'FOCUS_NFE',
      regimeTributario: 'SIMPLES_NACIONAL',
      cnpjEmitente: '',
      inscricaoEstadual: '',
      serieNfe: 1,
      ativo: true,
    },
  });

  const selecionarEmpresa = (id: string) => {
    setValue('empresaRepresentadaId', id);
    const empresa = empresas.find((item) => item.id === id);
    if (empresa?.cnpj) setValue('cnpjEmitente', empresa.cnpj);
  };

  const onSubmit = async (data: ConfiguracaoFiscal) => {
    if (data.cnpjEmitente.replace(/\D/g, '').length !== 14) {
      toast.error('CNPJ emitente deve ter 14 dígitos.');
      return;
    }
    if (!data.inscricaoEstadual.trim()) {
      toast.error('Inscrição Estadual é obrigatória para NF-e.');
      return;
    }
    await mutation.mutateAsync({ ...data, provedor: 'FOCUS_NFE' });
    onClose?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          O certificado A1 e o token são administrados na Focus NFe; nenhuma senha é salva no ERP.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Empresa *</Label>
          <Select value={watch('empresaRepresentadaId')} onValueChange={selecionarEmpresa} disabled={Boolean(configuracao)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {empresas.filter((empresa) => empresa.id).map((empresa) => (
                <SelectItem key={empresa.id} value={empresa.id!}>{empresa.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Ambiente *</Label>
          <Select value={watch('ambiente')} onValueChange={(value) => setValue('ambiente', value as ConfiguracaoFiscal['ambiente'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="HOMOLOGACAO">Homologação</SelectItem>
              <SelectItem value="PRODUCAO">Produção</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Regime tributário *</Label>
          <Select value={watch('regimeTributario')} onValueChange={(value) => setValue('regimeTributario', value as ConfiguracaoFiscal['regimeTributario'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {REGIMES_TRIBUTARIOS.map((regime) => <SelectItem key={regime} value={regime}>{REGIME_LABEL[regime]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cnpjEmitente">CNPJ emitente *</Label>
          <Input id="cnpjEmitente" {...register('cnpjEmitente', { required: true })} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="inscricaoEstadual">Inscrição Estadual *</Label>
          <Input id="inscricaoEstadual" {...register('inscricaoEstadual', { required: true })} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="inscricaoMunicipal">Inscrição Municipal</Label>
          <Input id="inscricaoMunicipal" {...register('inscricaoMunicipal')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="serieNfe">Série NF-e *</Label>
          <Input id="serieNfe" type="number" min={1} max={999} {...register('serieNfe', { required: true, valueAsNumber: true })} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="proximoNumeroNfe">Próximo número</Label>
          <Input id="proximoNumeroNfe" type="number" min={1} {...register('proximoNumeroNfe', { valueAsNumber: true })} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="serieNfce">Série NFC-e</Label>
          <Input id="serieNfce" type="number" min={1} max={999} {...register('serieNfce', { valueAsNumber: true })} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="proximoNumeroNfce">Próximo número NFC-e</Label>
          <Input id="proximoNumeroNfce" type="number" min={1} {...register('proximoNumeroNfce', { valueAsNumber: true })} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="serieNfceContingencia">Série de contingência (NFC-e)</Label>
          <Input id="serieNfceContingencia" type="number" min={1} max={999} {...register('serieNfceContingencia', { valueAsNumber: true })} />
          <p className="text-xs text-muted-foreground">
            Usada só quando a NFC-e é emitida offline (SEFAZ indisponível) — nunca se mistura
            com a numeração normal.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="serieMdfe">Série MDF-e</Label>
          <Input id="serieMdfe" type="number" min={1} max={999} {...register('serieMdfe', { valueAsNumber: true })} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="proximoNumeroMdfe">Próximo número MDF-e</Label>
          <Input id="proximoNumeroMdfe" type="number" min={1} {...register('proximoNumeroMdfe', { valueAsNumber: true })} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rntrc">RNTRC (rodoviário)</Label>
          <Input id="rntrc" inputMode="numeric" maxLength={8} {...register('rntrc', { pattern: /^\d{8}$/ })} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch id="ativo" checked={watch('ativo')} onCheckedChange={(value) => setValue('ativo', value)} />
        <Label htmlFor="ativo">Configuração ativa</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending || !watch('empresaRepresentadaId')}>
          {mutation.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
};
