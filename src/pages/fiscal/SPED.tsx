
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, Download, FileSpreadsheet, Calendar, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";

console.log('[Fiscal] Inicializando página SPED');

const SPED: React.FC = () => {
  const [activeTab, setActiveTab] = useState('fiscal');

  // Dados mockados para demonstração
  const mockArquivos = [
    {
      id: '1',
      tipo: 'SPED Fiscal',
      periodo: '12/2023',
      dataGeracao: '2024-01-15',
      tamanho: '2.5 MB',
      status: 'gerado'
    },
    {
      id: '2',
      tipo: 'SPED Contribuições',
      periodo: '12/2023',
      dataGeracao: '2024-01-15',
      tamanho: '1.8 MB',
      status: 'processando'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'gerado': return 'bg-green-100 text-green-800';
      case 'processando': return 'bg-yellow-100 text-yellow-800';
      case 'erro': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SPED</h1>
          <p className="text-muted-foreground">
            Sistema Público de Escrituração Digital
          </p>
        </div>
        <Button>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Gerar Arquivo
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="fiscal">SPED Fiscal</TabsTrigger>
          <TabsTrigger value="contribuicoes">Contribuições</TabsTrigger>
          <TabsTrigger value="contabil">Contábil</TabsTrigger>
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="fiscal" className="space-y-6">
          {/* Geração de Arquivo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                SPED Fiscal (EFD-ICMS/IPI)
              </CardTitle>
              <CardDescription>
                Gere o arquivo SPED Fiscal para envio à Receita Federal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mesReferencia">Mês de Referência</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="01">Janeiro</SelectItem>
                      <SelectItem value="02">Fevereiro</SelectItem>
                      <SelectItem value="03">Março</SelectItem>
                      <SelectItem value="04">Abril</SelectItem>
                      <SelectItem value="05">Maio</SelectItem>
                      <SelectItem value="06">Junho</SelectItem>
                      <SelectItem value="07">Julho</SelectItem>
                      <SelectItem value="08">Agosto</SelectItem>
                      <SelectItem value="09">Setembro</SelectItem>
                      <SelectItem value="10">Outubro</SelectItem>
                      <SelectItem value="11">Novembro</SelectItem>
                      <SelectItem value="12">Dezembro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="anoReferencia">Ano de Referência</Label>
                  <Input
                    id="anoReferencia"
                    type="number"
                    placeholder="2024"
                    min="2020"
                    max="2030"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="versaoLayout">Versão do Layout</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a versão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="018">Versão 018</SelectItem>
                      <SelectItem value="017">Versão 017</SelectItem>
                      <SelectItem value="016">Versão 016</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Gerar SPED Fiscal
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Arquivos Gerados */}
          <Card>
            <CardHeader>
              <CardTitle>Arquivos Gerados</CardTitle>
              <CardDescription>
                Histórico de arquivos SPED gerados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockArquivos.filter(a => a.tipo === 'SPED Fiscal').map((arquivo) => (
                  <div key={arquivo.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <FileSpreadsheet className="h-8 w-8 text-primary" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">{arquivo.tipo}</span>
                          <Badge className={getStatusColor(arquivo.status)}>
                            {arquivo.status.charAt(0).toUpperCase() + arquivo.status.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Período: {arquivo.periodo}</p>
                        <p className="text-sm text-muted-foreground">
                          Gerado em: {arquivo.dataGeracao} • {arquivo.tamanho}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contribuicoes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                SPED Contribuições (EFD-PIS/COFINS)
              </CardTitle>
              <CardDescription>
                Escrituração Fiscal Digital PIS/COFINS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Database className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">SPED Contribuições</h3>
                <p className="mt-2 text-muted-foreground">
                  Geração do EFD-Contribuições depende da integração fiscal real. Disponível após ativação do provedor (<code>FISCAL_MOCK=false</code>).
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contabil">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                SPED Contábil (ECD)
              </CardTitle>
              <CardDescription>
                Escrituração Contábil Digital
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Database className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">SPED Contábil</h3>
                <p className="mt-2 text-muted-foreground">
                  Geração da ECD depende da integração contábil-fiscal real. Disponível após ativação do provedor.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuracoes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações SPED
              </CardTitle>
              <CardDescription>
                Configure os parâmetros para geração dos arquivos SPED
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Settings className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Configurações</h3>
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

export default SPED;
