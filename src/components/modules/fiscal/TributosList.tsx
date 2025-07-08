
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tributo } from "@/types/fiscal";

interface TributosListProps {
  tributos: Tributo[];
  isLoading: boolean;
  searchTerm: string;
}

export const TributosList: React.FC<TributosListProps> = ({
  tributos,
  isLoading,
  searchTerm
}) => {
  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'ICMS': return 'bg-blue-100 text-blue-800';
      case 'IPI': return 'bg-green-100 text-green-800';
      case 'PIS': return 'bg-yellow-100 text-yellow-800';
      case 'COFINS': return 'bg-orange-100 text-orange-800';
      case 'ISS': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-sm text-muted-foreground">Carregando tributos...</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descrição</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Subtipo</TableHead>
            <TableHead>Alíquota (%)</TableHead>
            <TableHead>UF</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tributos.length > 0 ? (
            tributos.map((tributo) => (
              <TableRow key={tributo.id}>
                <TableCell className="font-medium">
                  {tributo.descricao}
                </TableCell>
                <TableCell>
                  <Badge className={getTipoColor(tributo.tipo)}>
                    {tributo.tipo}
                  </Badge>
                </TableCell>
                <TableCell>
                  {tributo.subtipo && (
                    <Badge variant="outline">
                      {tributo.subtipo.charAt(0).toUpperCase() + tributo.subtipo.slice(1)}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono">
                  {tributo.aliquota.toFixed(4)}%
                </TableCell>
                <TableCell>
                  {tributo.uf && (
                    <Badge variant="secondary">
                      {tributo.uf}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={tributo.ativo ? "default" : "secondary"}>
                    {tributo.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8">
                <div className="text-muted-foreground">
                  {searchTerm 
                    ? 'Nenhum tributo encontrado com os filtros aplicados'
                    : 'Nenhum tributo cadastrado'
                  }
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
