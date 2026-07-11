import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePagamentoModalidades } from '@/hooks/usePagamentoCatalogo';

console.log('[ModalidadeCaixasTab] Componente inicializado (catálogo global)');

export const ModalidadeCaixasTab = () => {
  const { data: modalidades = [], isLoading } = usePagamentoModalidades(false);

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
        <h3 className="text-lg font-semibold">Modalidades de Pagamento</h3>
        <p className="text-sm text-muted-foreground">
          Catálogo global de meios de pagamento aceitos (PIX, Dinheiro, Cartão, Boleto, Crediário...).
          Somente leitura — capacidades definem quais planos podem usar cada modalidade.
        </p>
      </div>

      {modalidades.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Nenhuma modalidade cadastrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modalidades.map((m) => (
            <Card key={m.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{m.nome}</CardTitle>
                  <Badge variant={m.ativo ? 'default' : 'secondary'}>{m.codigo}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {m.descricao && <p className="text-muted-foreground">{m.descricao}</p>}
                <div className="flex flex-wrap gap-1">
                  {m.liquidacao_imediata && <Badge variant="outline">Liquidação imediata</Badge>}
                  {m.permite_parcelamento && <Badge variant="outline">Parcelável</Badge>}
                  {m.exige_adquirente && <Badge variant="outline">Exige adquirente</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
