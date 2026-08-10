import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { setEmpresaAtivaId } from '@/lib/empresaAtiva';

interface EmpresaDisponivel {
  representada_id: string;
  representada_nome: string;
  representada_cnpj: string | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
}

interface Grupo {
  responsavel_id: string | null;
  responsavel_nome: string;
  representadas: EmpresaDisponivel[];
}

export default function SelecionarEmpresa() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('get_empresas_disponiveis');
      if (error || !data) {
        setLoading(false);
        return;
      }

      const rows = data as EmpresaDisponivel[];
      if (rows.length === 1) {
        setEmpresaAtivaId(rows[0].representada_id);
        queryClient.invalidateQueries({ queryKey: ['empresa-representada-atual'] });
        navigate('/', { replace: true });
        return;
      }

      const porResponsavel = new Map<string, Grupo>();
      for (const row of rows) {
        const chave = row.responsavel_id ?? 'sem-grupo';
        if (!porResponsavel.has(chave)) {
          porResponsavel.set(chave, {
            responsavel_id: row.responsavel_id,
            responsavel_nome: row.responsavel_nome ?? 'Sem grupo',
            representadas: [],
          });
        }
        porResponsavel.get(chave)!.representadas.push(row);
      }

      setGrupos(Array.from(porResponsavel.values()));
      setLoading(false);
    })();
  }, [navigate, queryClient]);

  const handleSelect = (representadaId: string) => {
    setEmpresaAtivaId(representadaId);
    queryClient.invalidateQueries({ queryKey: ['empresa-representada-atual'] });
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Escolha a empresa</CardTitle>
            <CardDescription>Sua conta tem acesso a mais de uma empresa — selecione com qual deseja trabalhar agora.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && <p className="text-sm text-muted-foreground">Carregando empresas...</p>}
            {!loading &&
              grupos.map((grupo) => (
                <Collapsible key={grupo.responsavel_id ?? 'sem-grupo'} defaultOpen>
                  <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                    {grupo.responsavel_nome}
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pb-2">
                    {grupo.representadas.map((rep) => (
                      <Button
                        key={rep.representada_id}
                        variant="outline"
                        className="w-full justify-start h-auto py-3"
                        onClick={() => handleSelect(rep.representada_id)}
                      >
                        <span>{rep.representada_nome}</span>
                      </Button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
