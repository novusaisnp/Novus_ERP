import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wrench, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;
import { useToast } from '@/hooks/use-toast';

interface Servico {
  id: string;
  nome: string;
  descricao?: string | null;
  preco: number | null;
  ativo: boolean;
  plano_conta_receita_id?: string | null;
  centro_custo_id?: string | null;
  natureza_receita_id?: string | null;
  created_at: string;
}

interface Option { id: string; codigo?: string | null; nome: string; }

const NONE = '__none__';

const Servicos: React.FC = () => {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [planoContas, setPlanoContas] = useState<Option[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<Option[]>([]);
  const [naturezasReceita, setNaturezasReceita] = useState<Option[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco: '',
    plano_conta_receita_id: '' as string,
    centro_custo_id: '' as string,
    natureza_receita_id: '' as string,
  });

  useEffect(() => {
    fetchServicos();
    fetchClassificacoes();
  }, []);

  const fetchServicos = async () => {
    try {
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServicos(data || []);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os serviços.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchClassificacoes = async () => {
    try {
      const [pc, cc, nr] = await Promise.all([
        supabase
          .from('plano_contas')
          .select('id, codigo, nome, tipo, aceita_lancamento, ativo')
          .eq('tipo', 'RECEITA')
          .eq('aceita_lancamento', true)
          .eq('ativo', true)
          .order('codigo', { ascending: true }),
        supabase
          .from('centros_custo')
          .select('id, codigo, nome, ativo')
          .eq('ativo', true)
          .order('codigo', { ascending: true }),
        supabase
          .from('naturezas_receita')
          .select('id, codigo, nome, ativo')
          .eq('ativo', true)
          .is('deleted_at', null)
          .order('codigo', { ascending: true }),
      ]);
      if (pc.error) throw pc.error;
      if (cc.error) throw cc.error;
      if (nr.error) throw nr.error;
      setPlanoContas(pc.data || []);
      setCentrosCusto(cc.data || []);
      setNaturezasReceita(nr.data || []);
    } catch (error) {
      console.error('Erro ao carregar classificações contábeis:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const serviceData: Record<string, unknown> = {
        nome: formData.nome,
        descricao: formData.descricao || null,
        preco: formData.preco ? parseFloat(formData.preco) : null,
        plano_conta_receita_id: formData.plano_conta_receita_id || null,
        centro_custo_id: formData.centro_custo_id || null,
        natureza_receita_id: formData.natureza_receita_id || null,
      };

      if (editingServico) {
        const { error } = await supabase.from('servicos').update(serviceData).eq('id', editingServico.id);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Serviço atualizado com sucesso!' });
      } else {
        const { error } = await supabase.from('servicos').insert([serviceData]);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Serviço criado com sucesso!' });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchServicos();
    } catch (error: any) {
      console.error('Erro ao salvar serviço:', error);
      toast({ title: 'Erro', description: error?.message || 'Não foi possível salvar o serviço.', variant: 'destructive' });
    }
  };

  const handleEdit = (servico: Servico) => {
    setEditingServico(servico);
    setFormData({
      nome: servico.nome,
      descricao: servico.descricao || '',
      preco: servico.preco != null ? servico.preco.toString() : '',
      plano_conta_receita_id: servico.plano_conta_receita_id || '',
      centro_custo_id: servico.centro_custo_id || '',
      natureza_receita_id: servico.natureza_receita_id || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('servicos').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Serviço excluído com sucesso!' });
      fetchServicos();
    } catch (error) {
      console.error('Erro ao excluir serviço:', error);
      toast({ title: 'Erro', description: 'Não foi possível excluir o serviço.', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      preco: '',
      plano_conta_receita_id: '',
      centro_custo_id: '',
      natureza_receita_id: '',
    });
    setEditingServico(null);
  };

  const filteredServicos = servicos.filter((servico) =>
    servico.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const labelOption = (o: Option) => (o.codigo ? `${o.codigo} — ${o.nome}` : o.nome);

  const renderClassificacaoSelect = (
    id: string,
    label: string,
    value: string,
    options: Option[],
    onChange: (v: string) => void,
    placeholder: string,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? '' : v)}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>— não vincular —</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {labelOption(o)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Serviços</h1>
          <p className="text-muted-foreground">Gerencie seus serviços</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(v) => { setIsDialogOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={resetForm}>
              <Plus className="h-4 w-4" />
              Novo Serviço
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingServico ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preco">Preço</Label>
                  <Input
                    id="preco"
                    type="number"
                    step="0.01"
                    value={formData.preco}
                    onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold">Classificação contábil</h4>
                  <p className="text-xs text-muted-foreground">
                    Usado como padrão ao gerar contas a receber deste serviço.
                  </p>
                </div>
                {renderClassificacaoSelect(
                  'plano_conta_receita_id',
                  'Conta de Receita (Plano de Contas)',
                  formData.plano_conta_receita_id,
                  planoContas,
                  (v) => setFormData({ ...formData, plano_conta_receita_id: v }),
                  planoContas.length ? 'Selecione a conta de receita' : 'Nenhuma conta de receita cadastrada',
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderClassificacaoSelect(
                    'centro_custo_id',
                    'Centro de Custo',
                    formData.centro_custo_id,
                    centrosCusto,
                    (v) => setFormData({ ...formData, centro_custo_id: v }),
                    'Selecione o centro de custo',
                  )}
                  {renderClassificacaoSelect(
                    'natureza_receita_id',
                    'Natureza de Receita',
                    formData.natureza_receita_id,
                    naturezasReceita,
                    (v) => setFormData({ ...formData, natureza_receita_id: v }),
                    'Selecione a natureza',
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editingServico ? 'Atualizar' : 'Criar'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Lista de Serviços
          </CardTitle>
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar serviços..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12"><p>Carregando...</p></div>
          ) : filteredServicos.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? 'Nenhum serviço encontrado' : 'Nenhum serviço cadastrado'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Tente ajustar os termos de busca' : 'Comece adicionando seu primeiro serviço'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Serviço
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Conta de Receita</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServicos.map((servico) => {
                  const conta = planoContas.find((p) => p.id === servico.plano_conta_receita_id);
                  return (
                    <TableRow key={servico.id}>
                      <TableCell className="font-medium">{servico.nome}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {conta ? labelOption(conta) : <span className="text-xs italic">não vinculado</span>}
                      </TableCell>
                      <TableCell>{servico.preco != null ? `R$ ${Number(servico.preco).toFixed(2)}` : '-'}</TableCell>
                      <TableCell>
                        <Badge variant={servico.ativo ? 'default' : 'secondary'}>
                          {servico.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(servico)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(servico.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Servicos;
