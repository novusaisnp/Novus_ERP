import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FiscalConfigForm } from "@/components/modules/FiscalConfigForm";
import { NaturezaOperacaoForm } from "@/components/modules/NaturezaOperacaoForm";
import { CFOPConfig } from "@/components/modules/CFOPConfig";
import { NCMConfig } from "@/components/modules/NCMConfig";
import { TributosTab } from "@/components/modules/fiscal/TributosTab";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";

console.log('[Fiscal] Inicializando página de Tributos refatorada');

const Tributos: React.FC = () => {
  const [activeTab, setActiveTab] = useState('configuracoes');
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showNaturezaForm, setShowNaturezaForm] = useState(false);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações Fiscais</h1>
          <p className="text-muted-foreground">
            Gerencie todas as configurações fiscais do sistema
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
          <TabsTrigger value="naturezas">Naturezas</TabsTrigger>
          <TabsTrigger value="cfop">CFOP</TabsTrigger>
          <TabsTrigger value="ncm">NCM</TabsTrigger>
          <TabsTrigger value="tributos">Tributos</TabsTrigger>
        </TabsList>

        <TabsContent value="configuracoes" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Configurações Fiscais por Empresa</h2>
              <p className="text-muted-foreground">
                Configure parâmetros fiscais específicos para cada empresa representada
              </p>
            </div>
            <Dialog open={showConfigForm} onOpenChange={setShowConfigForm}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Configuração
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <FiscalConfigForm onClose={() => setShowConfigForm(false)} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-6 min-h-[200px]">
                <Calculator className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nenhuma Configuração</h3>
                <p className="mt-2 text-sm text-muted-foreground text-center">
                  Clique em "Nova Configuração" para começar
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="naturezas" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Naturezas de Operação</h2>
              <p className="text-muted-foreground">
                Configure as naturezas de operação para diferentes tipos de transações
              </p>
            </div>
            <Dialog open={showNaturezaForm} onOpenChange={setShowNaturezaForm}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Natureza
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <NaturezaOperacaoForm onClose={() => setShowNaturezaForm(false)} />
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="text-center py-12">
                <Calculator className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Naturezas de Operação</h3>
                <p className="mt-2 text-muted-foreground">
                  As naturezas básicas foram cadastradas automaticamente
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cfop">
          <CFOPConfig />
        </TabsContent>

        <TabsContent value="ncm">
          <NCMConfig />
        </TabsContent>

        <TabsContent value="tributos">
          <TributosTab />
        </TabsContent>
      </Tabs>

      <Dialog open={showConfigForm} onOpenChange={setShowConfigForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <FiscalConfigForm onClose={() => setShowConfigForm(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={showNaturezaForm} onOpenChange={setShowNaturezaForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <NaturezaOperacaoForm onClose={() => setShowNaturezaForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tributos;
