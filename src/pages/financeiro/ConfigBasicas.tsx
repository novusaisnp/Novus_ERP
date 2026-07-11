
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, CreditCard, FileText, Link } from 'lucide-react';
import { NaturezaCaixasTab } from '@/components/financeiro/config-basicas/NaturezaCaixasTab';
import { ModalidadeCaixasTab } from '@/components/financeiro/config-basicas/ModalidadeCaixasTab';
import { PlanosPagamentoTab } from '@/components/financeiro/config-basicas/PlanosPagamentoTab';
import { ModalidadeAPITab } from '@/components/financeiro/config-basicas/ModalidadeAPITab';


const ConfigBasicas = () => {

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Configurações Básicas</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações básicas de pagamentos do sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações de Pagamentos
          </CardTitle>
          <CardDescription>
            Configure as naturezas de caixa, modalidades, planos de pagamento e integrações API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="natureza-caixas" className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="natureza-caixas" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Naturezas de Pagamento</span>
                <span className="sm:hidden">Natureza</span>
              </TabsTrigger>
              <TabsTrigger value="modalidade-caixas" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Modalidades de Pagamento</span>
                <span className="sm:hidden">Modalidade</span>
              </TabsTrigger>
              <TabsTrigger value="planos-pagamento" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Planos de Pagamento</span>
                <span className="sm:hidden">Planos</span>
              </TabsTrigger>
              <TabsTrigger value="modalidade-api" className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                <span className="hidden sm:inline">Modalidade API</span>
                <span className="sm:hidden">API</span>
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="natureza-caixas" className="space-y-4">
                <NaturezaCaixasTab />
              </TabsContent>

              <TabsContent value="modalidade-caixas" className="space-y-4">
                <ModalidadeCaixasTab />
              </TabsContent>

              <TabsContent value="planos-pagamento" className="space-y-4">
                <PlanosPagamentoTab />
              </TabsContent>

              <TabsContent value="modalidade-api" className="space-y-4">
                <ModalidadeAPITab />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfigBasicas;
