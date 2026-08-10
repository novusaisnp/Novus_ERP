import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { setEmpresaAtivaId } from '@/lib/empresaAtiva';
import loginHero from '@/assets/login-hero.png.asset.json';

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
  const [isNovusOwner, setIsNovusOwner] = useState(false);
  // null = ainda escolhendo o responsável (passo 1); preenchido = mostra as representadas dele (passo 2)
  const [responsavelEscolhidoChave, setResponsavelEscolhidoChave] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    (async () => {
      const [{ data, error }, { data: ownerData }] = await Promise.all([
        supabase.rpc('get_empresas_disponiveis'),
        supabase.rpc('is_novus_owner'),
      ]);
      setIsNovusOwner(Boolean(ownerData));

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

      const listaGrupos = Array.from(porResponsavel.values());
      setGrupos(listaGrupos);
      // só 1 responsável disponível — pula direto pro passo 2 (escolher a representada dele)
      if (listaGrupos.length === 1) {
        setResponsavelEscolhidoChave(listaGrupos[0].responsavel_id ?? 'sem-grupo');
      }
      setLoading(false);
    })();
  }, [navigate, queryClient]);

  const handleSelect = (representadaId: string) => {
    setEmpresaAtivaId(representadaId);
    queryClient.invalidateQueries({ queryKey: ['empresa-representada-atual'] });
    navigate('/', { replace: true });
  };

  const grupoEscolhido = grupos.find((g) => (g.responsavel_id ?? 'sem-grupo') === responsavelEscolhidoChave);

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 bg-cover bg-center relative"
      style={{ backgroundImage: `url('${loginHero.url}')` }}
    >
      <div className="absolute inset-0 bg-background/70" />
      <div className="max-w-md w-full space-y-8 relative">
        <Card>
          <CardHeader className="items-center text-center space-y-3">
            <div className="flex items-center justify-center gap-3">
              <span className="text-xl font-semibold text-primary">ERP</span>
              <img src="/novus-logo.png" alt="NOVUS.AI" className="h-8 w-auto" />
            </div>
            <CardTitle>Escolha a empresa</CardTitle>
            <CardDescription>
              {!grupoEscolhido
                ? 'Sua conta tem acesso a mais de uma empresa responsável — selecione com qual deseja trabalhar.'
                : `Empresas representadas de ${grupoEscolhido.responsavel_nome} — selecione qual CNPJ.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && <p className="text-sm text-muted-foreground">Carregando empresas...</p>}

            {!loading && !grupoEscolhido && (
              <>
                {isNovusOwner && (
                  <Button
                    variant="secondary"
                    className="w-full justify-start"
                    onClick={() => navigate('/selecionar-empresa/nova')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova empresa
                  </Button>
                )}
                {grupos.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma empresa disponível{isNovusOwner ? ' ainda — comece criando uma acima.' : '.'}
                  </p>
                )}
                {grupos.length > 0 && (
                  <div className="space-y-2">
                    <Select onValueChange={setResponsavelEscolhidoChave}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a empresa responsável..." />
                      </SelectTrigger>
                      <SelectContent>
                        {grupos.map((grupo) => (
                          <SelectItem key={grupo.responsavel_id ?? 'sem-grupo'} value={grupo.responsavel_id ?? 'sem-grupo'}>
                            {grupo.responsavel_nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {!loading && grupoEscolhido && (
              <div className="space-y-3">
                {grupos.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-ml-2"
                    onClick={() => setResponsavelEscolhidoChave(null)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" /> Trocar responsável
                  </Button>
                )}
                {grupoEscolhido.representadas.map((rep) => (
                  <Button
                    key={rep.representada_id}
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() => handleSelect(rep.representada_id)}
                  >
                    <span>{rep.representada_nome}</span>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
