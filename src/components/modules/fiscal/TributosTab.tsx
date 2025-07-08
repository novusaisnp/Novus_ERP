
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useTributos } from "@/hooks/useFiscal";
import { TributosList } from "./TributosList";

export const TributosTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: tributos, isLoading } = useTributos();

  const filteredTributos = tributos?.filter(tributo =>
    tributo.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tributo.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Gestão de Tributos</h2>
          <p className="text-muted-foreground">
            Configure alíquotas e regras tributárias
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Tributo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Tributos Cadastrados</CardTitle>
              <CardDescription>
                Alíquotas e regras tributárias por tipo
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tributos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TributosList
            tributos={filteredTributos}
            isLoading={isLoading}
            searchTerm={searchTerm}
          />
        </CardContent>
      </Card>
    </div>
  );
};
