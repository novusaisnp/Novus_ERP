import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePagamentoNaturezas } from '@/hooks/usePagamentoCatalogo';

console.log('[NaturezaCaixasTab] Componente inicializado (catálogo global)');

export const NaturezaCaixasTab = () => {
  const { data: naturezas = [], isLoading } = usePagamentoNaturezas(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Naturezas de Pagamento</h3>
        <p className="text-sm text-muted-foreground">
          Catálogo global que rege o comportamento financeiro de cada plano (à vista, parcelado, crediário, recorrente).
          Somente leitura — planos de pagamento se associam a uma natureza.
        </p>
      </div>

      {naturezas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Nenhuma natureza cadastrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {naturezas.map((n) => (
            <Card key={n.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{n.nome}</CardTitle>
                  <Badge variant={n.ativo ? 'default' : 'secondary'}>{n.codigo}</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {n.descricao || 'Sem descrição'}
                <div className="mt-2 text-xs">Ordem: {n.ordem}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
