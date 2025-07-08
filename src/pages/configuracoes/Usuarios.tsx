
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Shield } from 'lucide-react';
import PerfisConfig from '@/components/modules/configuracoes/empresas/PerfisConfig';
import UsuariosVinculadosList from '@/components/modules/configuracoes/empresas/UsuariosVinculadosList';
import { useEmpresaResponsavel } from '@/hooks/useEmpresaResponsavel';
import { useEmpresasRepresentadas } from '@/hooks/useEmpresasRepresentadas';
import { usePerfis } from '@/hooks/usePerfis';
import { useUsuarios } from '@/hooks/useUsuarios';
import { useColaboradores } from '@/hooks/useColaboradores';

const ConfiguracoesUsuarios: React.FC = () => {
  console.log('[ERP]', 'Iniciando módulo de Configurações de Usuários');

  // Hooks para carregar dados do Supabase
  const { empresa: empresaResponsavel } = useEmpresaResponsavel();
  const { empresas: empresasRepresentadas } = useEmpresasRepresentadas(empresaResponsavel?.id);
  const { perfis, savePerfil, deletePerfil, loading: loadingPerfis } = usePerfis();
  const { usuarios, saveUsuario, deleteUsuario, loading: loadingUsuarios } = useUsuarios();
  const { colaboradores, loading: loadingColaboradores } = useColaboradores();

  // Contar estatísticas
  const usuariosAtivos = usuarios.filter(u => u.ativo).length;
  const perfisCustomizados = perfis.filter(p => !p.sistema).length;

  // Combinar perfis do sistema com perfis customizados
  const todosPerfis = perfis;

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">
          Configurações de Usuários
        </h1>
        <p className="text-muted-foreground">
          Gerencie perfis de acesso e usuários do sistema
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <Card className="gradient-card border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-erp-success">
              {usuariosAtivos}
            </div>
            <p className="text-xs text-muted-foreground">
              de {usuarios.length} cadastrados
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Perfis Customizados</CardTitle>
            <Shield className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-erp-warning">
              {perfisCustomizados}
            </div>
            <p className="text-xs text-muted-foreground">
              + {perfis.filter(p => p.sistema).length} do sistema
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Configuração */}
      <Tabs defaultValue="usuarios" className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full bg-white shadow-lg rounded-lg p-2">
          <TabsTrigger 
            value="usuarios"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Usuários</span>
          </TabsTrigger>
          <TabsTrigger 
            value="perfis"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Perfis de Acesso</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="animate-fade-in">
          <UsuariosVinculadosList
            usuarios={usuarios}
            empresas={empresasRepresentadas}
            perfis={todosPerfis}
            colaboradores={colaboradores}
            onAdd={saveUsuario}
            onEdit={saveUsuario}
            onDelete={deleteUsuario}
          />
        </TabsContent>

        <TabsContent value="perfis" className="animate-fade-in">
          <PerfisConfig
            perfis={perfis}
            onAdd={savePerfil}
            onEdit={savePerfil}
            onDelete={deletePerfil}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConfiguracoesUsuarios;
