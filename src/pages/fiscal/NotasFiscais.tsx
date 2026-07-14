
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, Download, Eye, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";

console.log('[Fiscal] Inicializando página de Notas Fiscais');

const NotasFiscais: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Dados mockados para demonstração
  const mockNotas = [
    {
      id: '1',
      numero: '000001',
      serie: '1',
      tipo: 'NF-e',
      cliente: 'Cliente Exemplo Ltda',
      valor: 1250.00,
      status: 'autorizada',
      dataEmissao: '2024-01-15',
      chaveAcesso: '35240100000000000000550010000000011000000001'
    },
    {
      id: '2',
      numero: '000002',
      serie: '1',
      tipo: 'NFC-e',
      cliente: 'Consumidor Final',
      valor: 89.90,
      status: 'pendente',
      dataEmissao: '2024-01-15',
      chaveAcesso: ''
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'autorizada': return 'bg-green-100 text-green-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'cancelada': return 'bg-red-100 text-red-800';
      case 'rejeitada': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notas Fiscais</h1>
          <p className="text-muted-foreground">
            Gerencie suas notas fiscais eletrônicas (NF-e e NFC-e)
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Nota Fiscal
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="emitir">Emitir</TabsTrigger>
          <TabsTrigger value="consultar">Consultar</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Emitidas</p>
                    <p className="text-2xl font-bold">1.234</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                    <p className="text-2xl font-bold text-yellow-600">8</p>
                  </div>
                  <FileText className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Autorizadas</p>
                    <p className="text-2xl font-bold text-green-600">1.226</p>
                  </div>
                  <FileText className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
                    <p className="text-2xl font-bold">R$ 125.430</p>
                  </div>
                  <FileText className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Notas Recentes */}
          <Card>
            <CardHeader>
              <CardTitle>Notas Fiscais Recentes</CardTitle>
              <CardDescription>
                Últimas notas fiscais emitidas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockNotas.map((nota) => (
                  <div key={nota.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">{nota.tipo} {nota.numero}/{nota.serie}</span>
                          <Badge className={getStatusColor(nota.status)}>
                            {nota.status.charAt(0).toUpperCase() + nota.status.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{nota.cliente}</p>
                        <p className="text-sm text-muted-foreground">{nota.dataEmissao}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-semibold">
                        R$ {nota.valor.toFixed(2)}
                      </span>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        {nota.status === 'autorizada' && (
                          <Button variant="ghost" size="sm">
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emitir">
          <Card>
            <CardHeader>
              <CardTitle>Emitir Nova Nota Fiscal</CardTitle>
              <CardDescription>
                Preencha os dados para emitir uma nova nota fiscal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Formulário de Emissão</h3>
                <p className="mt-2 text-muted-foreground">
                  Funcionalidade em desenvolvimento
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consultar">
          <Card>
            <CardHeader>
              <CardTitle>Consultar Notas Fiscais</CardTitle>
              <CardDescription>
                Consulte o status das suas notas fiscais na SEFAZ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Consulta SEFAZ</h3>
                <p className="mt-2 text-muted-foreground">
                  Funcionalidade em desenvolvimento
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relatorios">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios Fiscais</CardTitle>
              <CardDescription>
                Gere relatórios detalhados das suas notas fiscais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Relatórios</h3>
                <p className="mt-2 text-muted-foreground">
                  Funcionalidade em desenvolvimento
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotasFiscais;
