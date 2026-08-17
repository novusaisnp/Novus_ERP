
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Columns3, Edit, Plus, RotateCcw, Search, Trash2, Users } from 'lucide-react';
import type { Entidade, PapelCodigo } from '@/types/entidade';
import { useEntidades } from '@/hooks/useEntidades';
import { useEmpresaAtual } from '@/hooks/estoque/useEmpresaAtual';
import { FormEntidade } from '@/components/modules/FormEntidade';
import { ConfirmDeleteWithDeps } from '@/components/shared/ConfirmDeleteWithDeps';
import { PaginationFooter } from '@/components/shared/PaginationFooter';
import { entidadeService } from '@/services/entidadeService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { camposPersonalizadosService } from '@/services/camposPersonalizadosService';
import { preferenciasListagemService } from '@/services/preferenciasListagemService';
import { useAuth } from '@/contexts/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { formatarCampoExtra } from '@/utils/camposExtrasUtils';

const COLUNAS_PADRAO = ['nome', 'tipo', 'documento', 'papeis', 'status'];
const COLUNAS_FIXAS = [
  { chave: 'nome', rotulo: 'Nome' },
  { chave: 'tipo', rotulo: 'Tipo' },
  { chave: 'documento', rotulo: 'CPF/CNPJ' },
  { chave: 'papeis', rotulo: 'Papéis' },
  { chave: 'status', rotulo: 'Status' },
];

/**
 * Cadastro Unificado de Entidades — único lugar do ERP onde se cria/edita
 * uma entidade (toggle PF/PJ + papéis). Clientes/Fornecedores/Colaboradores
 * são telas satélite: só listam quem já tem aquele papel, "Novo"/"Editar"
 * de lá trazem o usuário pra cá (via ?papel=/?edit=) em vez de duplicar o
 * form com seletor de tipo em cada tela.
 */
const PAGE_SIZE = 50;

const Entidades: React.FC = () => {
  const { data: empresaId } = useEmpresaAtual();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);

  // Debounce da busca — mesmo padrão de useContaContabilSearch.ts (300ms).
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const paginacao = { page, pageSize: PAGE_SIZE };
  const { data: entidadesResult, isLoading: loading, isFetching } = useQuery({
    queryKey: ['entidades', 'todas', empresaId, debouncedSearchTerm, paginacao],
    queryFn: () => entidadeService.fetchEntidades(empresaId!, undefined, { busca: debouncedSearchTerm, paginacao }),
    enabled: !!empresaId,
  });
  const entidades = entidadesResult?.data ?? [];
  const total = entidadesResult?.total ?? 0;
  const { data: camposPersonalizados = [] } = useQuery({
    queryKey: ['campos-personalizados-ativos', empresaId],
    queryFn: () => camposPersonalizadosService.listar(empresaId!, true),
    enabled: !!empresaId,
  });
  const { data: preferenciaColunas } = useQuery({
    queryKey: ['preferencias-listagem', user?.id, empresaId, 'entidades'],
    queryFn: () => preferenciasListagemService.obter(user!.id, empresaId!, 'entidades'),
    enabled: !!user?.id && !!empresaId,
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntidade, setEditingEntidade] = useState<Entidade | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [colunasVisiveis, setColunasVisiveis] = useState<string[]>(COLUNAS_PADRAO);

  useEffect(() => {
    setColunasVisiveis(preferenciaColunas ?? COLUNAS_PADRAO);
  }, [preferenciaColunas]);

  const salvarColunas = async (proximas: string[]) => {
    if (!user?.id || !empresaId) return;
    const anteriores = colunasVisiveis;
    setColunasVisiveis(proximas);
    try {
      await preferenciasListagemService.salvar(user.id, empresaId, 'entidades', proximas);
      queryClient.setQueryData(['preferencias-listagem', user.id, empresaId, 'entidades'], proximas);
    } catch (error) {
      setColunasVisiveis(anteriores);
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar as colunas.');
    }
  };

  const toggleColuna = (chave: string, checked: boolean) => {
    void salvarColunas(checked
      ? [...colunasVisiveis, chave]
      : colunasVisiveis.filter((coluna) => coluna !== chave));
  };

  const papelParam = searchParams.get('papel') as PapelCodigo | null;
  const editParam = searchParams.get('edit');

  // Deep-link das telas satélite: ?papel=X abre criação com o papel
  // pré-marcado, ?edit=<id> abre edição direto — busca direta por id
  // (getEntidadeById), não depende da entidade estar na página atual.
  const { data: entidadeParaEditar } = useQuery({
    queryKey: ['entidade-por-id', editParam],
    queryFn: () => entidadeService.getEntidadeById(editParam as string),
    enabled: !!editParam,
  });
  useEffect(() => {
    if (editParam && entidadeParaEditar) {
      setEditingEntidade(entidadeParaEditar);
      setIsDialogOpen(true);
    } else if (papelParam && !isDialogOpen) {
      setEditingEntidade(null);
      setIsDialogOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editParam, papelParam, entidadeParaEditar]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['entidades'] });
  };

  const save = async (entidade: Entidade) => {
    try {
      if (entidade.id) {
        await entidadeService.updateEntidade(entidade.id, entidade);
      } else {
        await entidadeService.createEntidade(entidade);
      }
      invalidateAll();
      return true;
    } catch (error) {
      console.error('[Entidades] Erro ao salvar:', error);
      return false;
    }
  };

  const handleEdit = (entidade: Entidade) => {
    setEditingEntidade(entidade);
    setIsDialogOpen(true);
  };

  const requestDelete = (id: string) => {
    if (!id) return;
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    const id = confirmDeleteId;
    if (!id) return;
    setConfirmDeleteId(null);
    await entidadeService.deleteEntidade(id);
    invalidateAll();
  };

  const handleCloseDialog = () => {
    // Chegou aqui via deep-link de uma tela satélite (Clientes/Fornecedores/
    // Colaboradores) — volta pra lá ao terminar (salvar ou cancelar), em vez
    // de deixar o usuário preso na tela central. Sem deep-link (veio direto
    // pra Entidades), só fecha o modal e continua na lista.
    if (papelParam || editParam) {
      navigate(-1);
      return;
    }
    setIsDialogOpen(false);
    setEditingEntidade(null);
  };

  // Busca já é server-side (fetchEntidades com `busca`) — `entidades` chega
  // filtrada e paginada, sem filtro client-side redundante.
  const filtered = entidades;

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(0);
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Cadastro de Entidades</h1>
          <p className="text-muted-foreground">Cadastro único de pessoas e empresas — marque os papéis (Cliente, Fornecedor, Colaborador...) que cada uma exerce</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); else setIsDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={() => setEditingEntidade(null)}>
              <Plus className="h-4 w-4" />
              Nova Entidade
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEntidade ? 'Editar Entidade' : 'Nova Entidade'}</DialogTitle>
            </DialogHeader>
            {empresaId && (
              <FormEntidade
                entidade={editingEntidade || undefined}
                empresaRepresentadaId={empresaId}
                papeisIniciais={papelParam ? [papelParam] : []}
                onSave={save}
                onCancel={handleCloseDialog}
                loading={loading}
                camposPersonalizados={camposPersonalizados}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Todas as Entidades
          </CardTitle>
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF/CNPJ ou email..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline"><Columns3 className="mr-2 h-4 w-4" /> Colunas</Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="mb-3">
                  <p className="font-medium">Colunas visíveis</p>
                  <p className="text-xs text-muted-foreground">Esta escolha vale para você nesta empresa.</p>
                </div>
                <div className="space-y-3">
                  {COLUNAS_FIXAS.map((coluna) => (
                    <label key={coluna.chave} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox checked={colunasVisiveis.includes(coluna.chave)} onCheckedChange={(value) => toggleColuna(coluna.chave, value === true)} />
                      {coluna.rotulo}
                    </label>
                  ))}
                  {camposPersonalizados.length > 0 && <Separator />}
                  {camposPersonalizados.map((campo) => (
                    <label key={campo.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox checked={colunasVisiveis.includes(`extra:${campo.chave}`)} onCheckedChange={(value) => toggleColuna(`extra:${campo.chave}`, value === true)} />
                      {campo.rotulo}
                    </label>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => void salvarColunas(COLUNAS_PADRAO)}>
                  <RotateCcw className="mr-2 h-3.5 w-3.5" /> Restaurar padrão
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12"><p>Carregando...</p></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? 'Nenhuma entidade encontrada' : 'Nenhuma entidade cadastrada'}
              </h3>
              {!searchTerm && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Entidade
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {colunasVisiveis.includes('nome') && <TableHead>Nome</TableHead>}
                  {colunasVisiveis.includes('tipo') && <TableHead>Tipo</TableHead>}
                  {colunasVisiveis.includes('documento') && <TableHead>CPF/CNPJ</TableHead>}
                  {colunasVisiveis.includes('papeis') && <TableHead>Papéis</TableHead>}
                  {colunasVisiveis.includes('status') && <TableHead>Status</TableHead>}
                  {camposPersonalizados.filter((campo) => colunasVisiveis.includes(`extra:${campo.chave}`)).map((campo) => (
                    <TableHead key={campo.id}>{campo.rotulo}</TableHead>
                  ))}
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entidade) => (
                  <TableRow key={entidade.id}>
                    {colunasVisiveis.includes('nome') && <TableCell className="font-medium">
                      <div>{entidade.nome}</div>
                      {entidade.apelido && <div className="text-sm text-muted-foreground">{entidade.apelido}</div>}
                    </TableCell>}
                    {colunasVisiveis.includes('tipo') && <TableCell>
                      <Badge variant="outline">{entidade.tipoPessoa}</Badge>
                    </TableCell>}
                    {colunasVisiveis.includes('documento') && <TableCell>{entidade.cpf || entidade.cnpj || '-'}</TableCell>}
                    {colunasVisiveis.includes('papeis') && <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {entidade.papeis.map((p) => <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>)}
                      </div>
                    </TableCell>}
                    {colunasVisiveis.includes('status') && <TableCell>
                      <Badge variant={entidade.ativo !== false ? 'default' : 'secondary'}>
                        {entidade.ativo !== false ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>}
                    {camposPersonalizados.filter((campo) => colunasVisiveis.includes(`extra:${campo.chave}`)).map((campo) => (
                      <TableCell key={campo.id}>{formatarCampoExtra(campo.tipo, entidade.camposExtras?.[campo.chave])}</TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(entidade)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => requestDelete(entidade.id!)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!loading && filtered.length > 0 && (
        <PaginationFooter
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          isFetching={isFetching}
          onPageChange={setPage}
        />
      )}

      <ConfirmDeleteWithDeps
        open={confirmDeleteId !== null}
        onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}
        entidade="entidades"
        id={confirmDeleteId}
        nomeRegistro="esta entidade"
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default Entidades;
