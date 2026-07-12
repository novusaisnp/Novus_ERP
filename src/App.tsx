import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ui/theme-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import Login from './pages/Login';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import Dashboard from './pages/Dashboard';


// Configurações Pages
import Usuarios from './pages/configuracoes/Usuarios';
import Empresas from './pages/configuracoes/Empresas';
import Sistema from './pages/configuracoes/Sistema';
import CentrosCusto from './pages/configuracoes/CentrosCusto';
import Perfil from './pages/configuracoes/Perfil';
import Webhooks from './pages/configuracoes/Webhooks';

// Cadastros Pages
import Servicos from './pages/cadastros/Servicos';
import Clientes from './pages/cadastros/Clientes';
import Fornecedores from './pages/cadastros/Fornecedores';

// Estoque Pages
import Produtos from './pages/estoque/Produtos';
import Categorias from './pages/estoque/Categorias';
import Localizacoes from './pages/estoque/Localizacoes';
import UnidadesMedida from './pages/estoque/UnidadesMedida';
import Tamanhos from './pages/estoque/Tamanhos';
import EmBreve from './pages/estoque/EmBreve';
import { ArrowLeftRight, ClipboardList, BarChart3, FileText } from 'lucide-react';

// Financeiro Pages
import PlanoContas from './pages/financeiro/PlanoContas';
import ContasPagar from './pages/financeiro/ContasPagar';
import ContasReceber from './pages/financeiro/ContasReceber';
import MovimentacoesFinanceiras from './pages/financeiro/MovimentacoesFinanceiras';
import ConfigBasicas from './pages/financeiro/ConfigBasicas';
import FluxoCaixaPage from './pages/financeiro/FluxoCaixaPage';
import FluxoCompetenciaPage from './pages/financeiro/FluxoCompetenciaPage';

// Gestão Bancária Pages
import Bancos from './pages/gestao-bancaria/bancos/index';
import Agencias from './pages/gestao-bancaria/agencias/index';
import ContasBancarias from './pages/gestao-bancaria/contas-bancarias/index';
import MovimentacoesBancarias from './pages/gestao-bancaria/movimentacoes-bancarias/index';

// Fiscal Pages
import NotasFiscais from './pages/fiscal/NotasFiscais';
import SPED from './pages/fiscal/SPED';
import Tributos from './pages/fiscal/Tributos';


// RH Pages
import Colaboradores from './pages/rh/Colaboradores';
import Cargos from './pages/rh/Cargos';
import Departamentos from './pages/rh/Departamentos';
import Relatorios from './pages/rh/Relatorios';
import VencimentosPadrao from './pages/rh/VencimentosPadrao';
import DescontosPadrao from './pages/rh/DescontosPadrao';
import FolhaPagamento from './pages/rh/FolhaPagamento';
import BeneficiosVinculados from './pages/rh/BeneficiosVinculados';
import IntegracaoPonto from './pages/rh/IntegracaoPonto';
import RegistrosPonto from './pages/rh/RegistrosPonto';

// Vendas Pages

import Vendas from './pages/vendas/Vendas';
import Orcamentos from './pages/vendas/Orcamentos';

// Contratos Pages
import Contratos from './pages/contratos/Contratos';

// Integração Pages
import SyncDashboard from './pages/integracao/SyncDashboard';
import { AdminRoute } from './components/auth/AdminRoute';

const queryClient = new QueryClient();

function App() {
  console.log('[Theme] App inicializada com ThemeProvider');
  
  return (
    <ThemeProvider 
      attribute="class" 
      defaultTheme="light" 
      enableSystem={false}
      storageKey="novus-erp-theme"
    >
      <Router>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                
                
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  {/* Dashboard Route */}
                  <Route index element={<Dashboard />} />
                  
                  {/* Cadastros Routes */}
                  <Route path="cadastros">
                    <Route path="clientes" element={<Clientes />} />
                    <Route path="fornecedores" element={<Fornecedores />} />
                    <Route path="servicos" element={<Servicos />} />
                  </Route>
                  
                  {/* Estoque Routes */}
                  <Route path="estoque">
                    <Route path="produtos" element={<Produtos />} />
                    <Route path="categorias" element={<Categorias />} />
                    <Route path="localizacoes" element={<Localizacoes />} />
                    <Route path="unidades-medida" element={<UnidadesMedida />} />
                    <Route path="tamanhos" element={<Tamanhos />} />
                    <Route path="movimentacoes" element={<EmBreve titulo="Movimentações de Estoque" icon={ArrowLeftRight} descricao="Entradas, saídas e transferências de estoque estarão disponíveis em breve." />} />
                    <Route path="inventario" element={<EmBreve titulo="Inventário" icon={ClipboardList} descricao="Contagem e conciliação de inventário estarão disponíveis em breve." />} />
                    <Route path="relatorios" element={<EmBreve titulo="Relatórios de Estoque" icon={BarChart3} descricao="Relatórios analíticos de estoque estarão disponíveis em breve." />} />
                  </Route>
                  
                  {/* Vendas Routes - declared before generic routes to avoid conflicts */}
                  <Route path="vendas">
                    <Route index element={<Navigate to="/vendas/pedidos" replace />} />
                    <Route path="pedidos" element={<Vendas />} />
                    <Route path="orcamentos" element={<Orcamentos />} />
                    <Route path="contratos" element={<Contratos />} />
                    <Route path="relatorios" element={<div className="p-8"><h1 className="text-3xl font-bold text-primary mb-2">Relatórios de Vendas</h1><p className="text-muted-foreground">Em breve</p></div>} />
                  </Route>

                  {/* Contratos redirect (legacy) */}
                  <Route path="contratos/*" element={<Navigate to="/vendas/contratos" replace />} />
                  
                  {/* Gestão Bancária Routes */}
                  <Route path="gestao-bancaria">
                    <Route path="bancos" element={<Bancos />} />
                    <Route path="agencias" element={<Agencias />} />
                    <Route path="contas-bancarias" element={<ContasBancarias />} />
                    <Route path="movimentacoes-bancarias" element={<MovimentacoesBancarias />} />
                  </Route>
                  
                  {/* Financeiro Routes */}
                  <Route path="financeiro">
                    <Route path="contas-receber" element={<ContasReceber />} />
                    <Route path="contas-pagar" element={<ContasPagar />} />
                    <Route path="movimentacoes" element={<MovimentacoesFinanceiras />} />
                    <Route path="fluxo-caixa" element={<FluxoCaixaPage />} />
                    <Route path="fluxo-competencia" element={<FluxoCompetenciaPage />} />
                    <Route path="centros-custo" element={<CentrosCusto />} />
                    <Route path="plano-contas" element={<PlanoContas />} />
                    <Route path="config-basicas" element={<ConfigBasicas />} />
                    <Route path="relatorios" element={<div>Relatórios Financeiros - Em desenvolvimento</div>} />
                  </Route>
                  <Route path="configuracoes/centros-custo" element={<Navigate to="/financeiro/centros-custo" replace />} />
                  <Route path="centros-custo" element={<Navigate to="/financeiro/centros-custo" replace />} />
                  
                  {/* Fiscal Routes */}
                  <Route path="fiscal">
                    <Route path="notas-fiscais" element={<NotasFiscais />} />
                    <Route path="sped" element={<SPED />} />
                    <Route path="tributos" element={<Tributos />} />
                  </Route>
                  
                  {/* RH Routes */}
                  <Route path="rh">
                    <Route path="colaboradores" element={<Colaboradores />} />
                    <Route path="cargos" element={<Cargos />} />
                    <Route path="departamentos" element={<Departamentos />} />
                    <Route path="folha/folha-pagamento" element={<FolhaPagamento />} />
                    <Route path="folha/vencimentos-padrao" element={<VencimentosPadrao />} />
                    <Route path="folha/descontos-padrao" element={<DescontosPadrao />} />
                    <Route path="folha/beneficios-vinculados" element={<BeneficiosVinculados />} />
                    <Route path="folha/integracao-ponto" element={<IntegracaoPonto />} />
                    <Route path="registros-ponto" element={<RegistrosPonto />} />
                    <Route path="relatorios" element={<Relatorios />} />
                  </Route>

                  {/* Integração Routes — admin-only (SM1-D) */}
                  <Route path="integracao">
                    <Route
                      path="sincronizacao"
                      element={
                        <AdminRoute>
                          <SyncDashboard />
                        </AdminRoute>
                      }
                    />
                  </Route>
                  
                  {/* Configurações Routes */}
                  <Route path="configuracoes">
                    <Route path="empresas" element={<Empresas />} />
                    <Route path="usuarios" element={<Usuarios />} />
                    <Route path="sistema" element={<Sistema />} />
                    <Route path="perfil" element={<Perfil />} />
                  </Route>
                  
                  {/* 404 Route */}
                  <Route path="*" element={<div className="flex items-center justify-center min-h-screen"><div className="text-center"><h1 className="text-4xl font-bold mb-4">404</h1><p className="text-xl text-muted-foreground">Página não encontrada</p></div></div>} />
                </Route>
              </Routes>
            </div>
          </AuthProvider>
        </QueryClientProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
