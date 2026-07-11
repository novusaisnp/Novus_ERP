import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ContaContabilAutocomplete } from '@/components/financeiro/contas-pagar/ContaContabilAutocomplete';
import { ClienteAutocomplete } from './ClienteAutocomplete';
import { useCentrosCusto } from '@/hooks/useCentrosCusto';
import { useEmpresasRepresentadas } from '@/hooks/useEmpresasRepresentadas';
import type {
  ContaReceberInput,
  RateioContaReceber,
  ContaReceberStatus,
} from '@/types/contasReceber';

interface ContasReceberFormProps {
  formData: ContaReceberInput;
  onInputChange: <K extends keyof ContaReceberInput>(
    field: K,
    value: ContaReceberInput[K],
  ) => void;
  useRateio: boolean;
  onUseRateioChange: (value: boolean) => void;
  onRateiosChange: (rateios: RateioContaReceber[]) => void;
}

export const ContasReceberForm: React.FC<ContasReceberFormProps> = ({
  formData,
  onInputChange,
  useRateio,
  onUseRateioChange,
  onRateiosChange,
}) => {
  const { centrosCusto } = useCentrosCusto();
  const { empresas, loading: loadingEmpresas } = useEmpresasRepresentadas();




  return (
    <div className="space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="empresa_representada_id" className="flex items-center gap-1">
                Empresa <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.empresa_representada_id || undefined}
                onValueChange={(v) => onInputChange('empresa_representada_id', v)}
                disabled={loadingEmpresas}
              >
                <SelectTrigger id="empresa_representada_id">
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas
                    .filter((e) => !!e.id)
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id!}>
                        {e.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <ClienteAutocomplete
              value={formData.cliente_id ?? undefined}
              onChange={(value) => onInputChange('cliente_id', value)}
              placeholder="Selecione um cliente"
              label="Cliente"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero_documento" className="flex items-center gap-1">
                Número do Documento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="numero_documento"
                value={formData.numero_documento ?? ''}
                onChange={(e) => onInputChange('numero_documento', e.target.value)}
                placeholder="Ex: NF-001234"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Situação</Label>
              <Select
                value={formData.status ?? 'PENDENTE'}
                onValueChange={(value) =>
                  onInputChange('status', value as ContaReceberStatus)
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDENTE">Em Aberto</SelectItem>
                  <SelectItem value="PARCIAL">Parcial</SelectItem>
                  <SelectItem value="RECEBIDO">Recebida</SelectItem>
                  <SelectItem value="VENCIDO">Vencida</SelectItem>
                  <SelectItem value="CANCELADO">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao" className="flex items-center gap-1">
              Descrição <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => onInputChange('descricao', e.target.value)}
              placeholder="Descreva o que está sendo recebido"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor_original" className="flex items-center gap-1">
                Valor Original <span className="text-destructive">*</span>
              </Label>
              <CurrencyInput
                id="valor_original"
                value={formData.valor_original}
                onValueChange={(v) => onInputChange('valor_original', v)}
                placeholder="R$ 0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_recebido">Valor Recebido</Label>
              <CurrencyInput
                id="valor_recebido"
                value={formData.valor_recebido ?? 0}
                onValueChange={(v) => onInputChange('valor_recebido', v || null)}
                placeholder="R$ 0,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_desconto">Desconto</Label>
              <CurrencyInput
                id="valor_desconto"
                value={formData.valor_desconto ?? 0}
                onValueChange={(v) => onInputChange('valor_desconto', v || null)}
                placeholder="R$ 0,00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_emissao" className="flex items-center gap-1">
                Data de Emissão <span className="text-destructive">*</span>
              </Label>
              <Input
                id="data_emissao"
                type="date"
                value={formData.data_emissao ?? ''}
                onChange={(e) => onInputChange('data_emissao', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_vencimento" className="flex items-center gap-1">
                Data de Vencimento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="data_vencimento"
                type="date"
                value={formData.data_vencimento}
                onChange={(e) => onInputChange('data_vencimento', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_competencia">Data de Competência</Label>
              <Input
                id="data_competencia"
                type="date"
                value={formData.data_competencia ?? ''}
                onChange={(e) =>
                  onInputChange('data_competencia', e.target.value || null)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuração Contábil / Rateio */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração Contábil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="use_rateio_receber"
              checked={useRateio}
              onCheckedChange={onUseRateioChange}
            />
            <Label htmlFor="use_rateio_receber">
              Usar rateio entre contas contábeis
            </Label>
          </div>

          {!useRateio && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ContaContabilAutocomplete
                value={formData.plano_conta_id ?? undefined}
                onChange={(value) => onInputChange('plano_conta_id', value)}
                placeholder="Selecione uma conta analítica"
                label="Conta Contábil"
                required={!useRateio}
                tipo="RECEITA"
              />

              <div className="space-y-2">
                <Label htmlFor="centro_custo_id">Centro de Custo</Label>
                <Select
                  value={formData.centro_custo_id ?? 'nenhum'}
                  onValueChange={(value) =>
                    onInputChange(
                      'centro_custo_id',
                      value === 'nenhum' ? null : value,
                    )
                  }
                >
                  <SelectTrigger id="centro_custo_id">
                    <SelectValue placeholder="Selecione um centro de custo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Nenhum</SelectItem>
                    {centrosCusto.map((centro) => (
                      <SelectItem key={centro.id} value={centro.id}>
                        {centro.codigo ? `${centro.codigo} - ` : ''}
                        {centro.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {useRateio && (
            <p className="text-sm text-muted-foreground">
              Configuração de rateio disponível na aba "Rateio".
            </p>
          )}
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Adicionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes ?? ''}
              onChange={(e) => onInputChange('observacoes', e.target.value || null)}
              placeholder="Observações adicionais sobre esta conta"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="recorrente_receber"
              checked={!!formData.recorrente}
              onCheckedChange={(checked) => onInputChange('recorrente', checked)}
            />
            <Label htmlFor="recorrente_receber">Conta recorrente</Label>
          </div>

          {formData.recorrente && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodicidade">Periodicidade</Label>
                <Select
                  value={formData.periodicidade ?? 'nenhuma'}
                  onValueChange={(value) =>
                    onInputChange(
                      'periodicidade',
                      value === 'nenhuma' ? null : (value as any),
                    )
                  }
                >
                  <SelectTrigger id="periodicidade">
                    <SelectValue placeholder="Selecione a periodicidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhuma">Selecione uma opção</SelectItem>
                    <SelectItem value="MENSAL">Mensal</SelectItem>
                    <SelectItem value="BIMESTRAL">Bimestral</SelectItem>
                    <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                    <SelectItem value="SEMESTRAL">Semestral</SelectItem>
                    <SelectItem value="ANUAL">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero_parcela">Parcela Atual</Label>
                <Input
                  id="numero_parcela"
                  type="number"
                  min="1"
                  value={formData.numero_parcela ?? ''}
                  onChange={(e) =>
                    onInputChange(
                      'numero_parcela',
                      e.target.value ? parseInt(e.target.value, 10) : null,
                    )
                  }
                  placeholder="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_parcelas">Total de Parcelas</Label>
                <Input
                  id="total_parcelas"
                  type="number"
                  min="1"
                  value={formData.total_parcelas ?? ''}
                  onChange={(e) =>
                    onInputChange(
                      'total_parcelas',
                      e.target.value ? parseInt(e.target.value, 10) : null,
                    )
                  }
                  placeholder="12"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
