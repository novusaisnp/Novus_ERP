
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, Shield } from "lucide-react";
import { useForm } from "react-hook-form";
import { ConfiguracaoFiscal, REGIMES_TRIBUTARIOS } from "@/types/fiscal";
import { useCreateConfiguracaoFiscal } from "@/hooks/useFiscal";
import { useEmpresasRepresentadas } from "@/hooks/useEmpresasRepresentadas";
import { toast } from "sonner";
import { validarCertificadoDigital } from "@/services/fiscalService";

console.log('[Fiscal] Inicializando FiscalConfigForm');

interface FiscalConfigFormProps {
  configuracao?: ConfiguracaoFiscal;
  onClose?: () => void;
}

export const FiscalConfigForm: React.FC<FiscalConfigFormProps> = ({ configuracao, onClose }) => {
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
  const [uploadingCertificado, setUploadingCertificado] = useState(false);
  
  const { empresas } = useEmpresasRepresentadas();
  const createConfigMutation = useCreateConfiguracaoFiscal();
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ConfiguracaoFiscal>({
    defaultValues: configuracao || {
      ambiente: 'Teste',
      regimeTributario: 'Simples Nacional',
      aliquotaIcmsPadrao: 18,
      aliquotaIpiPadrao: 0,
      aliquotaPisPadrao: 1.65,
      aliquotaCofinsPadrao: 7.6,
      aliquotaIssPadrao: 5,
      serieNfe: '1',
      numeroUltimoNfe: 0,
      serieNfce: '1',
      numeroUltimoNfce: 0,
      ativo: true
    }
  });

  const handleCertificadoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('[Fiscal] Iniciando upload de certificado:', file.name);
    setUploadingCertificado(true);

    try {
      const isValid = await validarCertificadoDigital(file);
      if (!isValid) {
        toast.error('Formato de certificado inválido. Use arquivos .pfx, .p12 ou .pem');
        return;
      }

      setCertificadoFile(file);
      toast.success('Certificado carregado com sucesso!');
      console.log('[Fiscal] Certificado carregado:', file.name);
    } catch (error) {
      console.error('[Fiscal] Erro no upload do certificado:', error);
      toast.error('Erro ao carregar certificado');
    } finally {
      setUploadingCertificado(false);
    }
  };

  const onSubmit = async (data: ConfiguracaoFiscal) => {
    console.log('[Fiscal] Submetendo configuração fiscal:', data);
    
    if (!data.empresaRepresentadaId) {
      toast.error('Selecione uma empresa');
      return;
    }

    try {
      const configData = {
        ...data,
        certificadoDigital: certificadoFile ? certificadoFile.name : data.certificadoDigital
      };
      
      await createConfigMutation.mutateAsync(configData);
      onClose?.();
    } catch (error) {
      console.error('[Fiscal] Erro ao salvar configuração:', error);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Configuração Fiscal
        </CardTitle>
        <CardDescription>
          Configure os parâmetros fiscais para emissão de documentos eletrônicos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="certificado">Certificado</TabsTrigger>
              <TabsTrigger value="aliquotas">Alíquotas</TabsTrigger>
              <TabsTrigger value="numeracao">Numeração</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="empresa">Empresa Representada *</Label>
                  <Select 
                    value={watch('empresaRepresentadaId')} 
                    onValueChange={(value) => setValue('empresaRepresentadaId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {empresas?.filter((e: any) => e.id).map((empresa: any) => (
                        <SelectItem key={empresa.id} value={empresa.id}>
                          {empresa.nome} - {empresa.cnpj}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ambiente">Ambiente *</Label>
                  <Select 
                    value={watch('ambiente')} 
                    onValueChange={(value) => setValue('ambiente', value as 'Teste' | 'Producao')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Teste">Teste</SelectItem>
                      <SelectItem value="Producao">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regimeTributario">Regime Tributário *</Label>
                  <Select 
                    value={watch('regimeTributario')} 
                    onValueChange={(value) => setValue('regimeTributario', value as typeof REGIMES_TRIBUTARIOS[number])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIMES_TRIBUTARIOS.map((regime) => (
                        <SelectItem key={regime} value={regime}>
                          {regime}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch 
                    id="ativo"
                    checked={watch('ativo')}
                    onCheckedChange={(checked) => setValue('ativo', checked)}
                  />
                  <Label htmlFor="ativo">Configuração Ativa</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="certificado" className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <Label htmlFor="certificado" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      {certificadoFile ? certificadoFile.name : 'Carregar Certificado Digital'}
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">
                      Formatos aceitos: .pfx, .p12, .pem
                    </span>
                  </Label>
                  <Input
                    id="certificado"
                    type="file"
                    accept=".pfx,.p12,.pem"
                    onChange={handleCertificadoUpload}
                    className="hidden"
                    disabled={uploadingCertificado}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="senhaCertificado">Senha do Certificado</Label>
                <Input
                  id="senhaCertificado"
                  type="password"
                  {...register('senhaCertificado')}
                  placeholder="Digite a senha do certificado"
                />
              </div>
            </TabsContent>

            <TabsContent value="aliquotas" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="aliquotaIcms">ICMS Padrão (%)</Label>
                  <Input
                    id="aliquotaIcms"
                    type="number"
                    step="0.01"
                    {...register('aliquotaIcmsPadrao', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aliquotaIpi">IPI Padrão (%)</Label>
                  <Input
                    id="aliquotaIpi"
                    type="number"
                    step="0.01"
                    {...register('aliquotaIpiPadrao', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aliquotaPis">PIS Padrão (%)</Label>
                  <Input
                    id="aliquotaPis"
                    type="number"
                    step="0.01"
                    {...register('aliquotaPisPadrao', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aliquotaCofins">COFINS Padrão (%)</Label>
                  <Input
                    id="aliquotaCofins"
                    type="number"
                    step="0.01"
                    {...register('aliquotaCofinsPadrao', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aliquotaIss">ISS Padrão (%)</Label>
                  <Input
                    id="aliquotaIss"
                    type="number"
                    step="0.01"
                    {...register('aliquotaIssPadrao', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="numeracao" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serieNfe">Série NF-e</Label>
                  <Input
                    id="serieNfe"
                    {...register('serieNfe')}
                    maxLength={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numeroNfe">Último Número NF-e</Label>
                  <Input
                    id="numeroNfe"
                    type="number"
                    {...register('numeroUltimoNfe', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serieNfce">Série NFC-e</Label>
                  <Input
                    id="serieNfce"
                    {...register('serieNfce')}
                    maxLength={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numeroNfce">Último Número NFC-e</Label>
                  <Input
                    id="numeroNfce"
                    type="number"
                    {...register('numeroUltimoNfce', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createConfigMutation.isPending}
              className="min-w-[120px]"
            >
              {createConfigMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
