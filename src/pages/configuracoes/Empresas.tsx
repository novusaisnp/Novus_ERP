import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import EmpresaResponsavelForm from '@/components/modules/configuracoes/empresas/EmpresaResponsavelForm';
import EmpresasRepresentadasList from '@/components/modules/configuracoes/empresas/EmpresasRepresentadasList';
import { useEmpresaResponsavel } from '@/hooks/useEmpresaResponsavel';
import { useEmpresasRepresentadas } from '@/hooks/useEmpresasRepresentadas';

const ConfiguracoesEmpresas: React.FC = () => {
  const { empresa, saveEmpresa, saving } = useEmpresaResponsavel();
  const { empresas, saveEmpresa: saveRep, deleteEmpresa, saving: savingRep } = useEmpresasRepresentadas();

  const ativas = empresas.filter((e) => e.ativo).length;

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-1">Configurações de Empresas</h1>
        <p className="text-muted-foreground">Gerencie a empresa responsável e as empresas representadas</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresa Principal</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{empresa ? '1' : '0'}</div>
            <p className="text-xs text-muted-foreground">{empresa ? 'Configurada' : 'Não configurada'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas Ativas</CardTitle>
            <Building2 className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ativas}</div>
            <p className="text-xs text-muted-foreground">de {empresas.length} cadastradas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="responsavel" className="space-y-4">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="responsavel">Empresa Principal</TabsTrigger>
          <TabsTrigger value="representadas">Empresas Representadas</TabsTrigger>
        </TabsList>
        <TabsContent value="responsavel">
          <EmpresaResponsavelForm empresa={empresa} onSave={saveEmpresa} saving={saving} />
        </TabsContent>
        <TabsContent value="representadas">
          <EmpresasRepresentadasList empresas={empresas} onSave={saveRep} onDelete={deleteEmpresa} saving={savingRep} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConfiguracoesEmpresas;
