
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Building, Edit } from 'lucide-react';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import FormDepartamento from '@/components/modules/FormDepartamento';
import { Departamento } from '@/types/rh';

const Departamentos: React.FC = () => {
  const { departamentos, loading } = useDepartamentos();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDepartamento, setSelectedDepartamento] = useState<Departamento | null>(null);

  console.log('[Departamentos] Renderizando página de Departamentos');

  const filteredDepartamentos = departamentos.filter(departamento =>
    departamento.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNewDepartamento = () => {
    console.log('[Departamentos] Abrindo modal para novo departamento');
    setSelectedDepartamento(null);
    setIsModalOpen(true);
  };

  const handleEditDepartamento = (departamento: Departamento) => {
    console.log('[Departamentos] Abrindo modal para editar departamento:', departamento.nome);
    setSelectedDepartamento(departamento);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    console.log('[Departamentos] Fechando modal');
    setIsModalOpen(false);
    setSelectedDepartamento(null);
  };

  const handleSuccess = () => {
    console.log('[Departamentos] Operação realizada com sucesso');
    // O hook useDepartamentos já recarrega automaticamente os dados
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
          <h1 className="text-3xl font-bold tracking-tight">Departamentos</h1>
          <p className="text-muted-foreground">
            Gerencie os departamentos da empresa
          </p>
        </div>
        <Button onClick={handleNewDepartamento} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Departamento
        </Button>
      </div>

      {/* Card de Estatísticas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Departamentos</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{departamentos.length}</div>
          <p className="text-xs text-muted-foreground">
            departamentos cadastrados
          </p>
        </CardContent>
      </Card>

      {/* Barra de Pesquisa */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar departamentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Departamentos */}
      <div className="grid gap-4">
        {filteredDepartamentos.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum departamento encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Tente ajustar os filtros de pesquisa'
                  : 'Comece cadastrando seu primeiro departamento'
                }
              </p>
              {!searchTerm && (
                <Button onClick={handleNewDepartamento}>
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Departamento
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredDepartamentos.map((departamento) => (
            <Card key={departamento.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{departamento.nome}</h3>
                      <Badge variant={departamento.ativo ? "default" : "secondary"}>
                        {departamento.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    
                    {departamento.descricao && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Descrição:</span> {departamento.descricao}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditDepartamento(departamento)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de Departamento */}
      <FormDepartamento
        open={isModalOpen}
        onOpenChange={handleCloseModal}
        departamento={selectedDepartamento}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default Departamentos;
