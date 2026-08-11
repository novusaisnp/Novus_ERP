
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Users, UserCheck, UserX } from 'lucide-react';
import { useEntidades } from '@/hooks/useEntidades';
import { useEmpresaAtual } from '@/hooks/estoque/useEmpresaAtual';
import type { Entidade } from '@/types/entidade';
import type { Colaborador } from '@/types/rh';
import { rhUtils } from '@/utils/rhUtils';
import { ColaboradorDetailsModal } from '@/components/modules/rh/ColaboradorDetailsModal';

// ColaboradorDetailsModal é só leitura e ainda espera o formato antigo
// (Date, não string) — adapter local em vez de reescrever o modal inteiro.
// jornada/adicionais/localTrabalho/compliance/regimeContratacao nunca foram
// persistidos de verdade em `colaboradores` (confirmado no schema real antes
// da migração pra `entidades`) — já apareciam em branco antes desta
// refatoração, não é regressão.
function entidadeParaColaboradorView(e: Entidade): Colaborador {
  const d = e.dadosColaborador ?? {};
  return {
    id: e.id,
    nomeCompleto: e.nome,
    dataNascimento: e.dataNascimento ? new Date(e.dataNascimento) : new Date(0),
    cpf: e.cpf || '',
    rg: e.rg || undefined,
    endereco: e.cep ? {
      cep: e.cep || '', logradouro: e.logradouro || '', numero: e.numero || '',
      complemento: e.complemento || undefined, bairro: e.bairro || '', cidade: e.cidade || '', uf: e.estado || '',
    } : undefined,
    telefone: e.telefone || undefined,
    emailPessoal: e.email || undefined,
    emailCorporativo: undefined,
    cargoId: d.cargoId || undefined,
    departamentoId: d.departamentoId || undefined,
    setorId: d.setorId || undefined,
    regimeContratacao: 'CLT',
    dataAdmissao: d.dataAdmissao ? new Date(d.dataAdmissao) : new Date(0),
    dataDemissao: d.dataDemissao ? new Date(d.dataDemissao) : undefined,
    tipoContrato: d.tipoContrato as Colaborador['tipoContrato'],
    regimeTrabalho: d.regimeTrabalho as Colaborador['regimeTrabalho'],
    salarioBase: d.salario ?? undefined,
    documentacao: {
      nisPis: d.pis || undefined,
      dadosBancarios: e.banco ? { banco: e.banco, agencia: e.agencia || '', conta: e.conta || '', tipoConta: (e.tipoConta as 'CORRENTE' | 'POUPANCA') || 'CORRENTE' } : undefined,
    },
    compliance: { aceiteLgpd: false, consentimentoDados: false },
    empresaRepresentadaId: e.empresaRepresentadaId,
    situacao: e.ativo,
  };
}

/**
 * Lista quem já tem o papel Colaborador no Cadastro de Entidades — não cria
 * entidade daqui. "Novo Colaborador"/"Editar" levam pra /cadastros/entidades.
 */
const Colaboradores: React.FC = () => {
  const navigate = useNavigate();
  const { data: empresaId } = useEmpresaAtual();
  const { entidades: colaboradores, loading } = useEntidades(empresaId ?? null, 'COLABORADOR');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedColaborador, setSelectedColaborador] = useState<Entidade | null>(null);

  const filteredColaboradores = colaboradores.filter((colaborador) =>
    colaborador.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (colaborador.cpf || '').includes(searchTerm)
  );

  const colaboradoresAtivos = colaboradores.filter((c) => c.ativo).length;
  const colaboradoresInativos = colaboradores.filter((c) => !c.ativo).length;

  const handleVerDetalhes = (colaborador: Entidade) => {
    setSelectedColaborador(colaborador);
    setIsDetailsModalOpen(true);
  };

  const handleDetailsModalClose = () => {
    setIsDetailsModalOpen(false);
    setSelectedColaborador(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Colaboradores</h1>
          <p className="text-muted-foreground">
            Entidades com o papel Colaborador — cadastro novo em Cadastros → Entidades
          </p>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{colaboradores.length}</div>
            <p className="text-xs text-muted-foreground">
              colaboradores cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <UserCheck className="h-4 w-4 text-status-delivered" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-delivered">{colaboradoresAtivos}</div>
            <p className="text-xs text-muted-foreground">
              colaboradores ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inativos</CardTitle>
            <UserX className="h-4 w-4 text-status-cancelled" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-cancelled">{colaboradoresInativos}</div>
            <p className="text-xs text-muted-foreground">
              colaboradores inativos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Pesquisa */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Colaboradores */}
      <div className="grid gap-4">
        {filteredColaboradores.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum colaborador encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? 'Tente ajustar os filtros de pesquisa'
                  : 'Cadastre entidades com o papel Colaborador em Cadastros → Entidades'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredColaboradores.map((colaborador) => (
            <Card key={colaborador.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{colaborador.nome}</h3>
                      <Badge variant={colaborador.ativo ? "default" : "secondary"}>
                        {colaborador.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">CPF:</span> {colaborador.cpf ? rhUtils.formatCPF(colaborador.cpf) : '-'}
                      </div>
                      {colaborador.dadosColaborador?.dataAdmissao && (
                        <div>
                          <span className="font-medium">Admissão:</span> {new Date(colaborador.dadosColaborador.dataAdmissao).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                      {colaborador.email && (
                        <div>
                          <span className="font-medium">Email:</span> {colaborador.email}
                        </div>
                      )}
                      {colaborador.telefone && (
                        <div>
                          <span className="font-medium">Telefone:</span> {colaborador.telefone}
                        </div>
                      )}
                      {colaborador.dadosColaborador?.salario != null && (
                        <div>
                          <span className="font-medium">Salário:</span> {rhUtils.formatCurrency(colaborador.dadosColaborador.salario)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/cadastros/entidades?edit=${colaborador.id}`)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerDetalhes(colaborador)}
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de Detalhes */}
      <ColaboradorDetailsModal
        open={isDetailsModalOpen}
        onOpenChange={handleDetailsModalClose}
        colaborador={selectedColaborador ? entidadeParaColaboradorView(selectedColaborador) : null}
      />
    </div>
  );
};

export default Colaboradores;
