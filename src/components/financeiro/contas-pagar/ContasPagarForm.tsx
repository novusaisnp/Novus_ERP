
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ContaContabilAutocomplete } from './ContaContabilAutocomplete';
import { QuickAddCentroCusto } from '@/components/shared/QuickAddLookups';
import { FornecedorAutocomplete } from './FornecedorAutocomplete';
import { useCentrosCusto } from '@/hooks/useCentrosCusto';
import type { ContaPagarInput, RateioContaPagar } from '@/types/contasPagar';

interface ContasPagarFormProps {
  formData: ContaPagarInput;
  onInputChange: (field: keyof ContaPagarInput, value: any) => void;
  useRateio: boolean;
  onUseRateioChange: (value: boolean) => void;
  onRateiosChange: (rateios: RateioContaPagar[]) => void;
}

export const ContasPagarForm: React.FC<ContasPagarFormProps> = ({
  formData,
  onInputChange,
  useRateio,
  onUseRateioChange,
  onRateiosChange,
}) => {
  const { centrosCusto } = useCentrosCusto();

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
              <Label htmlFor="numero_documento">Número do Documento *</Label>
              <Input
                id="numero_documento"
                value={formData.numero_documento}
                onChange={(e) => onInputChange('numero_documento', e.target.value)}
                placeholder="Ex: NF-001234"
                required
              />
            </div>

            <FornecedorAutocomplete
              value={formData.fornecedor_id}
              onChange={(value) => onInputChange('fornecedor_id', value)}
              placeholder="Selecione um fornecedor"
              label="Fornecedor"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => onInputChange('descricao', e.target.value)}
              placeholder="Descreva o que está sendo pago"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor_original">Valor Original *</Label>
              <CurrencyInput
                id="valor_original"
                value={formData.valor_original}
                onValueChange={(v) => onInputChange('valor_original', v)}
                placeholder="R$ 0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_atual">Valor Atual *</Label>
              <CurrencyInput
                id="valor_atual"
                value={formData.valor_atual}
                onValueChange={(v) => onInputChange('valor_atual', v)}
                placeholder="R$ 0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="situacao">Situação</Label>
              <Select
                value={formData.situacao}
                onValueChange={(value) => onInputChange('situacao', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABERTA">Aberta</SelectItem>
                  <SelectItem value="PAGA">Paga</SelectItem>
                  <SelectItem value="VENCIDA">Vencida</SelectItem>
                  <SelectItem value="CANCELADA">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_emissao">Data de Emissão *</Label>
              <Input
                id="data_emissao"
                type="date"
                value={formData.data_emissao}
                onChange={(e) => onInputChange('data_emissao', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_vencimento">Data de Vencimento *</Label>
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
                value={formData.data_competencia || ''}
                onChange={(e) => onInputChange('data_competencia', e.target.value || undefined)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuração de Rateio */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração Contábil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="use_rateio"
              checked={useRateio}
              onCheckedChange={onUseRateioChange}
            />
            <Label htmlFor="use_rateio">Usar rateio entre contas contábeis</Label>
          </div>

          {!useRateio && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ContaContabilAutocomplete
                value={formData.plano_conta_id}
                onChange={(value) => onInputChange('plano_conta_id', value)}
                placeholder="Selecione uma conta analítica"
                label="Conta Contábil"
                required={!useRateio}
              />

              <div className="space-y-2">
                <Label htmlFor="centro_custo_id">Centro de Custo</Label>
                <div className="flex gap-2">
                <Select
                  value={formData.centro_custo_id || 'nenhum'}
                  onValueChange={(value) => onInputChange('centro_custo_id', value === 'nenhum' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um centro de custo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Nenhum</SelectItem>
                    {centrosCusto.map((centro) => (
                      <SelectItem key={centro.id} value={centro.id}>
                        {centro.codigo ? `${centro.codigo} - ` : ''}{centro.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                  <QuickAddCentroCusto onCreated={({ id }) => onInputChange('centro_custo_id', id)} />
                </div>
              </div>
            </div>
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
              value={formData.observacoes || ''}
              onChange={(e) => onInputChange('observacoes', e.target.value || undefined)}
              placeholder="Observações adicionais sobre esta conta"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="recorrente"
              checked={formData.recorrente}
              onCheckedChange={(checked) => onInputChange('recorrente', checked)}
            />
            <Label htmlFor="recorrente">Conta recorrente</Label>
          </div>

          {formData.recorrente && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodicidade">Periodicidade</Label>
                <Select
                  value={formData.periodicidade || 'nenhuma'}
                  onValueChange={(value) => onInputChange('periodicidade', value === 'nenhuma' ? undefined : value)}
                >
                  <SelectTrigger>
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
                  value={formData.numero_parcela || ''}
                  onChange={(e) => onInputChange('numero_parcela', parseInt(e.target.value) || undefined)}
                  placeholder="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_parcelas">Total de Parcelas</Label>
                <Input
                  id="total_parcelas"
                  type="number"
                  min="1"
                  value={formData.total_parcelas || ''}
                  onChange={(e) => onInputChange('total_parcelas', parseInt(e.target.value) || undefined)}
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
