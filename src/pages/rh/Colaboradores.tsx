
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Users, UserCheck, UserX } from 'lucide-react';
import { useColaboradores } from '@/hooks/useColaboradores';
import { Colaborador } from '@/types/rh';
import { rhUtils } from '@/utils/rhUtils';
import { ColaboradorFormModal } from '@/components/modules/rh/ColaboradorFormModal';
import { ColaboradorDetailsModal } from '@/components/modules/rh/ColaboradorDetailsModal';

const Colaboradores: React.FC = () => {
  const { colaboradores, loading } = useColaboradores();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedColaborador, setSelectedColaborador] = useState<Colaborador | null>(null);


  const filteredColaboradores = colaboradores.filter(colaborador =>
    colaborador.nomeCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    colaborador.cpf.includes(searchTerm)
  );

  const colaboradoresAtivos = colaboradores.filter(c => c.situacao).length;
  const colaboradoresInativos = colaboradores.filter(c => !c.situacao).length;

  const handleNovoColaborador = () => {
    setSelectedColaborador(null);
    setIsFormModalOpen(true);
  };

  const handleEditarColaborador = (colaborador: Colaborador) => {
    setSelectedColaborador(colaborador);
    setIsFormModalOpen(true);
  };

  const handleVerDetalhes = (colaborador: Colaborador) => {
    setSelectedColaborador(colaborador);
    setIsDetailsModalOpen(true);
  };

  const handleFormModalClose = () => {
    setIsFormModalOpen(false);
    setSelectedColaborador(null);
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
            Gerencie os colaboradores da empresa
          </p>
        </div>
        <Button className="flex items-center gap-2" onClick={handleNovoColaborador}>
          <Plus className="h-4 w-4" />
          Novo Colaborador
        </Button>
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
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{colaboradoresAtivos}</div>
            <p className="text-xs text-muted-foreground">
              colaboradores ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inativos</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{colaboradoresInativos}</div>
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
                  : 'Comece cadastrando seu primeiro colaborador'
                }
              </p>
              {!searchTerm && (
                <Button onClick={handleNovoColaborador}>
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Colaborador
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredColaboradores.map((colaborador) => (
            <Card key={colaborador.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{colaborador.nomeCompleto}</h3>
                      <Badge variant={colaborador.situacao ? "default" : "secondary"}>
                        {colaborador.situacao ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">CPF:</span> {rhUtils.formatCPF(colaborador.cpf)}
                      </div>
                      <div>
                        <span className="font-medium">Admissão:</span> {colaborador.dataAdmissao.toLocaleDateString('pt-BR')}
                      </div>
                      <div>
                        <span className="font-medium">Regime:</span> {colaborador.regimeContratacao}
                      </div>
                      {colaborador.emailPessoal && (
                        <div>
                          <span className="font-medium">Email:</span> {colaborador.emailPessoal}
                        </div>
                      )}
                      {colaborador.telefone && (
                        <div>
                          <span className="font-medium">Telefone:</span> {colaborador.telefone}
                        </div>
                      )}
                      {colaborador.salarioBase && (
                        <div>
                          <span className="font-medium">Salário:</span> {rhUtils.formatCurrency(colaborador.salarioBase)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditarColaborador(colaborador)}
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

      {/* Modal de Cadastro/Edição */}
      <ColaboradorFormModal
        open={isFormModalOpen}
        onOpenChange={handleFormModalClose}
        colaborador={selectedColaborador}
      />

      {/* Modal de Detalhes */}
      <ColaboradorDetailsModal
        open={isDetailsModalOpen}
        onOpenChange={handleDetailsModalClose}
        colaborador={selectedColaborador}
      />
    </div>
  );
};

export default Colaboradores;
