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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator } from "lucide-react";
import {
  useConfiguracoesFiscais,
  useNaturezasOperacao,
  useCreateNaturezaOperacao,
  useUpdateNaturezaOperacao,
} from '@/hooks/useFiscal';
import type { ConfiguracaoFiscal, NaturezaOperacao } from '@/types/fiscal';

console.log('[Fiscal] Inicializando página de Tributos refatorada');

const Tributos: React.FC = () => {
  const [activeTab, setActiveTab] = useState('configuracoes');
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showNaturezaForm, setShowNaturezaForm] = useState(false);
  const [configuracaoEditando, setConfiguracaoEditando] = useState<ConfiguracaoFiscal>();
  const [naturezaEditando, setNaturezaEditando] = useState<NaturezaOperacao>();
  const { data: configuracoes = [] } = useConfiguracoesFiscais();
  const { data: naturezas = [], isLoading: loadingNaturezas } = useNaturezasOperacao();
  const criarNatureza = useCreateNaturezaOperacao();
  const atualizarNatureza = useUpdateNaturezaOperacao();

  const handleNovaNatureza = () => {
    setNaturezaEditando(undefined);
    setShowNaturezaForm(true);
  };

  const handleEditarNatureza = (natureza: NaturezaOperacao) => {
    setNaturezaEditando(natureza);
    setShowNaturezaForm(true);
  };

  const handleSalvarNatureza = (data: NaturezaOperacao) => {
    const { id, createdAt, updatedAt, ...input } = data;
    if (naturezaEditando) {
      atualizarNatureza.mutate(
        { id: naturezaEditando.id, input },
        { onSuccess: () => setShowNaturezaForm(false) },
      );
    } else {
      criarNatureza.mutate(input, { onSuccess: () => setShowNaturezaForm(false) });
    }
  };

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
                <Button onClick={() => setConfiguracaoEditando(undefined)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Configuração
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Configuração fiscal</DialogTitle></DialogHeader>
                <FiscalConfigForm configuracao={configuracaoEditando} onClose={() => setShowConfigForm(false)} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {configuracoes.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center p-6 min-h-[200px]">
                  <Calculator className="h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Nenhuma configuração</h3>
                  <p className="mt-2 text-sm text-muted-foreground text-center">Cadastre a empresa emitente para liberar a emissão.</p>
                </CardContent>
              </Card>
            ) : configuracoes.map((config) => (
              <Card key={config.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{config.cnpjEmitente}</CardTitle>
                  <CardDescription>{config.ambiente === 'PRODUCAO' ? 'Produção' : 'Homologação'} · Focus NFe</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">Série {config.serieNfe} · {config.regimeTributario.replace(/_/g, ' ')}</p>
                  <Button variant="outline" size="sm" onClick={() => { setConfiguracaoEditando(config); setShowConfigForm(true); }}>Editar</Button>
                </CardContent>
              </Card>
            ))}
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
                <Button onClick={handleNovaNatureza}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Natureza
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <NaturezaOperacaoForm
                  natureza={naturezaEditando}
                  onClose={() => setShowNaturezaForm(false)}
                  onSave={handleSalvarNatureza}
                />
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingNaturezas ? (
                <div className="text-center py-12 text-muted-foreground">Carregando…</div>
              ) : naturezas.length === 0 ? (
                <div className="text-center py-12">
                  <Calculator className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Nenhuma natureza cadastrada</h3>
                  <p className="mt-2 text-muted-foreground">
                    Cadastre a primeira natureza de operação da empresa.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Finalidade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {naturezas.map((natureza) => (
                      <TableRow key={natureza.id}>
                        <TableCell className="font-mono font-semibold">{natureza.codigo}</TableCell>
                        <TableCell>{natureza.descricao}</TableCell>
                        <TableCell className="capitalize">{natureza.tipo}</TableCell>
                        <TableCell className="capitalize">{natureza.finalidade}</TableCell>
                        <TableCell>
                          <Badge variant={natureza.ativo ? 'default' : 'secondary'}>
                            {natureza.ativo ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleEditarNatureza(natureza)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
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
    </div>
  );
};

export default Tributos;
