import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Eye, Edit, Filter } from "lucide-react";
import { useCFOPs } from "@/hooks/useFiscal";
import { CFOP } from "@/types/fiscal";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const CFOPConfig: React.FC = () => {
  const { data: cfops, isLoading } = useCFOPs();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDestino, setFilterDestino] = useState<string>('all');
  const [filterTipo, setFilterTipo] = useState<string>('all');

  const filteredCFOPs = cfops?.filter(cfop => {
    const matchesSearch = cfop.codigo.includes(searchTerm) || 
                         cfop.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDestino = filterDestino === 'all' || cfop.destino === filterDestino;
    const matchesTipo = filterTipo === 'all' || cfop.tipo === filterTipo;
    
    return matchesSearch && matchesDestino && matchesTipo;
  }) || [];

  const getDestinoColor = (destino: string) => {
    switch (destino) {
      case 'interno': return 'bg-green-100 text-green-800';
      case 'interestadual': return 'bg-blue-100 text-blue-800';
      case 'exterior': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'entrada': return 'bg-orange-100 text-orange-800';
      case 'saida': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Carregando CFOPs...</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Códigos Fiscais (CFOP)
            </CardTitle>
            <CardDescription>
              Gerencie os Códigos Fiscais de Operações e Prestações
            </CardDescription>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo CFOP
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterDestino} onValueChange={setFilterDestino}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Destino" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os destinos</SelectItem>
              <SelectItem value="interno">Interno</SelectItem>
              <SelectItem value="interestadual">Interestadual</SelectItem>
              <SelectItem value="exterior">Exterior</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold text-primary">{cfops?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Total de CFOPs</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {cfops?.filter(c => c.tipo === 'entrada').length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Entrada</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {cfops?.filter(c => c.tipo === 'saida').length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Saída</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {cfops?.filter(c => c.ativo).length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Ativos</div>
          </Card>
        </div>

        {/* Tabela de CFOPs */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCFOPs.length > 0 ? (
                filteredCFOPs.map((cfop) => (
                  <TableRow key={cfop.id}>
                    <TableCell className="font-mono font-semibold">
                      {cfop.codigo}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate" title={cfop.descricao}>
                        {cfop.descricao}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getDestinoColor(cfop.destino)}>
                        {cfop.destino.charAt(0).toUpperCase() + cfop.destino.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTipoColor(cfop.tipo)}>
                        {cfop.tipo.charAt(0).toUpperCase() + cfop.tipo.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {cfop.categoria && (
                        <Badge variant="outline">
                          {cfop.categoria.charAt(0).toUpperCase() + cfop.categoria.slice(1)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cfop.ativo ? "default" : "secondary"}>
                        {cfop.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {searchTerm || filterDestino !== 'all' || filterTipo !== 'all'
                        ? 'Nenhum CFOP encontrado com os filtros aplicados'
                        : 'Nenhum CFOP cadastrado'
                      }
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
