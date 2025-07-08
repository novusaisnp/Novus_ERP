
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import EmpresaResponsavelForm from '@/components/modules/configuracoes/empresas/EmpresaResponsavelForm';
import EmpresasRepresentadasList from '@/components/modules/configuracoes/empresas/EmpresasRepresentadasList';
import { useEmpresaResponsavel } from '@/hooks/useEmpresaResponsavel';
import { useEmpresasRepresentadas } from '@/hooks/useEmpresasRepresentadas';

const ConfiguracoesEmpresas: React.FC = () => {
  console.log('[ERP]', 'Iniciando módulo de Configurações de Empresas');

  // Hooks para carregar dados do Supabase
  const { empresa: empresaResponsavel, saveEmpresa: saveEmpresaResponsavel, loading: loadingEmpresa } = useEmpresaResponsavel();
  const { empresas: empresasRepresentadas, saveEmpresa: saveEmpresaRepresentada, deleteEmpresa: deleteEmpresaRepresentada, loading: loadingEmpresas } = useEmpresasRepresentadas(empresaResponsavel?.id);

  // Contar estatísticas
  const empresasAtivas = empresasRepresentadas.filter(e => e.ativa).length;

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">
          Configurações de Empresas
        </h1>
        <p className="text-muted-foreground">
          Gerencie a empresa responsável e as empresas representadas
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <Card className="gradient-card border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresa Principal</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {empresaResponsavel ? '1' : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {empresaResponsavel ? 'Configurada' : 'Não configurada'}
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas Ativas</CardTitle>
            <Building2 className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {empresasAtivas}
            </div>
            <p className="text-xs text-muted-foreground">
              de {empresasRepresentadas.length} cadastradas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Configuração */}
      <Tabs defaultValue="empresa-responsavel" className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full bg-white shadow-lg rounded-lg p-2">
          <TabsTrigger 
            value="empresa-responsavel" 
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Empresa Principal</span>
          </TabsTrigger>
          <TabsTrigger 
            value="empresas-representadas"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Empresas Representadas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa-responsavel" className="animate-fade-in">
          <EmpresaResponsavelForm
            empresa={empresaResponsavel || undefined}
            onSave={saveEmpresaResponsavel}
          />
        </TabsContent>

        <TabsContent value="empresas-representadas" className="animate-fade-in">
          <EmpresasRepresentadasList
            empresas={empresasRepresentadas}
            onAdd={saveEmpresaRepresentada}
            onEdit={saveEmpresaRepresentada}
            onDelete={deleteEmpresaRepresentada}
            empresaResponsavelId={empresaResponsavel?.id || ''}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConfiguracoesEmpresas;
