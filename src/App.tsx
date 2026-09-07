import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ui/theme-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { Toaster } from './components/ui/toaster';
import Login from './pages/Login';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { EmpresaGate } from './components/auth/EmpresaGate';
import SelecionarEmpresa from './pages/auth/SelecionarEmpresa';
import OnboardingCliente from './pages/auth/OnboardingCliente';
import Dashboard from './pages/Dashboard';


// Configurações Pages
import Usuarios from './pages/configuracoes/Usuarios';
import Empresas from './pages/configuracoes/Empresas';
import CentrosCusto from './pages/configuracoes/CentrosCusto';
import Perfil from './pages/configuracoes/Perfil';
import Webhooks from './pages/configuracoes/Webhooks';
import CamposPersonalizados from './pages/configuracoes/CamposPersonalizados';
import RegrasClassificacaoReceita from './pages/configuracoes/RegrasClassificacaoReceita';
// P6.1: lazy — página admin de operação do pipeline de relatórios (P5.1).
const RelatoriosOps = React.lazy(() => import('./pages/configuracoes/RelatoriosOps'));

// Cadastros Pages
import Servicos from './pages/cadastros/Servicos';
import Entidades from './pages/cadastros/Entidades';
import Clientes from './pages/cadastros/Clientes';
import Fornecedores from './pages/cadastros/Fornecedores';

// Estoque Pages
import Produtos from './pages/estoque/Produtos';
import Categorias from './pages/estoque/Categorias';
import Localizacoes from './pages/estoque/Localizacoes';
import UnidadesMedida from './pages/estoque/UnidadesMedida';
import Tamanhos from './pages/estoque/Tamanhos';
import MovimentacoesEstoque from './pages/estoque/movimentacoes/index';
import InventarioEstoque from './pages/estoque/inventario/index';
import KardexPage from './pages/estoque/kardex/index';
import RelatoriosEstoqueHub from './pages/estoque/relatorios/index';
import GiroPage from './pages/estoque/relatorios/giro/index';
import CurvaAbcPage from './pages/estoque/relatorios/curva-abc/index';
import PosicaoPage from './pages/estoque/relatorios/posicao/index';
import ParadosPage from './pages/estoque/relatorios/parados/index';
import RupturaPage from './pages/estoque/relatorios/ruptura/index';
import { ArrowLeftRight, ClipboardList, BarChart3, FileText } from 'lucide-react';

// Financeiro Pages
import PlanoContas from './pages/financeiro/PlanoContas';
import AtivosFixos from './pages/financeiro/AtivosFixos';
import AlcadasAprovacao from './pages/financeiro/AlcadasAprovacao';
import Aprovacoes from './pages/financeiro/Aprovacoes';
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
import ConciliacaoIndex from './pages/gestao-bancaria/conciliacao/index';
import ConciliacaoImportar from './pages/gestao-bancaria/conciliacao/importar/index';
import ConciliacaoExtrato from './pages/gestao-bancaria/conciliacao/[extratoId]/index';
import ConciliacaoRegras from './pages/gestao-bancaria/conciliacao/regras/index';
import ConciliacaoRelatorios from './pages/gestao-bancaria/conciliacao/relatorios/index';

// Fiscal Pages
import NotasFiscais from './pages/fiscal/NotasFiscais';
import SPED from './pages/fiscal/SPED';
import Tributos from './pages/fiscal/Tributos';
import MDFe from './pages/fiscal/MDFe';
const DashboardFiscal = React.lazy(() => import('./pages/fiscal/DashboardFiscal'));




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
import RelatoriosVendas from './pages/vendas/Relatorios';
import RelatoriosFinanceiro from './pages/financeiro/Relatorios';

// Contratos Pages
import Contratos from './pages/contratos/Contratos';

// Integração Pages
import SyncDashboard from './pages/integracao/SyncDashboard';
import { AdminRoute } from './components/auth/AdminRoute';
import { FeatureRoute } from './components/auth/FeatureRoute';
import { SessionPersistenceHandler } from './components/SessionPersistenceHandler';

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
            <SessionPersistenceHandler />
            <Toaster />
            <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />

                <Route path="/selecionar-empresa" element={<ProtectedRoute><SelecionarEmpresa /></ProtectedRoute>} />
                <Route path="/selecionar-empresa/nova" element={<ProtectedRoute><OnboardingCliente /></ProtectedRoute>} />

                <Route element={<ProtectedRoute><EmpresaGate><AppLayout /></EmpresaGate></ProtectedRoute>}>
                  {/* Dashboard Route */}
                  <Route index element={<Dashboard />} />
                  
                  {/* Cadastros Routes */}
                  <Route path="cadastros">
                    <Route path="entidades" element={<Entidades />} />
                    <Route path="clientes" element={<Clientes />} />
                    <Route path="fornecedores" element={<Fornecedores />} />
                    <Route path="servicos" element={<Servicos />} />
                  </Route>
                  
                  {/* Estoque Routes — core (Produtos/Categorias/Kardex) sempre aberto;
                      o resto exige VITE_FEATURE_ESTOQUE_EXT (AUDITORIA_NOVA Fase 4:
                      a flag agora protege a rota, não só o item de menu). */}
                  <Route path="estoque">
                    <Route path="produtos" element={<Produtos />} />
                    <Route path="categorias" element={<Categorias />} />
                    <Route path="kardex/:produtoId" element={<KardexPage />} />
                    <Route path="localizacoes" element={<FeatureRoute flag="estoqueExt"><Localizacoes /></FeatureRoute>} />
                    <Route path="unidades-medida" element={<FeatureRoute flag="estoqueExt"><UnidadesMedida /></FeatureRoute>} />
                    <Route path="tamanhos" element={<FeatureRoute flag="estoqueExt"><Tamanhos /></FeatureRoute>} />
                    <Route path="movimentacoes" element={<FeatureRoute flag="estoqueExt"><MovimentacoesEstoque /></FeatureRoute>} />
                    <Route path="inventario" element={<FeatureRoute flag="estoqueExt"><InventarioEstoque /></FeatureRoute>} />

                    <Route path="relatorios" element={<FeatureRoute flag="estoqueExt"><RelatoriosEstoqueHub /></FeatureRoute>} />
                    <Route path="relatorios/giro" element={<FeatureRoute flag="estoqueExt"><GiroPage /></FeatureRoute>} />
                    <Route path="relatorios/curva-abc" element={<FeatureRoute flag="estoqueExt"><CurvaAbcPage /></FeatureRoute>} />
                    <Route path="relatorios/posicao" element={<FeatureRoute flag="estoqueExt"><PosicaoPage /></FeatureRoute>} />
                    <Route path="relatorios/parados" element={<FeatureRoute flag="estoqueExt"><ParadosPage /></FeatureRoute>} />
                    <Route path="relatorios/ruptura" element={<FeatureRoute flag="estoqueExt"><RupturaPage /></FeatureRoute>} />
                  </Route>

                  {/* Vendas Routes - declared before generic routes to avoid conflicts */}
                  <Route path="vendas">
                    <Route index element={<Navigate to="/vendas/pedidos" replace />} />
                    <Route path="pedidos" element={<Vendas />} />
                    <Route path="orcamentos" element={<Orcamentos />} />
                    <Route path="contratos" element={<Contratos />} />
                    <Route path="relatorios" element={<RelatoriosVendas />} />
                  </Route>

                  {/* Contratos redirect (legacy) */}
                  <Route path="contratos/*" element={<Navigate to="/vendas/contratos" replace />} />
                  
                  {/* Gestão Bancária Routes */}
                  <Route path="gestao-bancaria">
                    <Route path="bancos" element={<Bancos />} />
                    <Route path="agencias" element={<Agencias />} />
                    <Route path="contas-bancarias" element={<ContasBancarias />} />
                    <Route path="movimentacoes-bancarias" element={<MovimentacoesBancarias />} />
                    <Route path="conciliacao">
                      <Route index element={<ConciliacaoIndex />} />
                      <Route path="importar" element={<ConciliacaoImportar />} />
                      <Route path="regras" element={<ConciliacaoRegras />} />
                      <Route path="relatorios" element={<ConciliacaoRelatorios />} />
                      <Route path=":extratoId" element={<ConciliacaoExtrato />} />
                    </Route>
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
                    <Route path="ativos-fixos" element={<AtivosFixos />} />
                    <Route path="alcadas" element={<AdminRoute><AlcadasAprovacao /></AdminRoute>} />
                    <Route path="aprovacoes" element={<Aprovacoes />} />
                    <Route path="config-basicas" element={<ConfigBasicas />} />
                    <Route path="relatorios" element={<RelatoriosFinanceiro />} />
                  </Route>
                  <Route path="configuracoes/centros-custo" element={<Navigate to="/financeiro/centros-custo" replace />} />
                  <Route path="centros-custo" element={<Navigate to="/financeiro/centros-custo" replace />} />
                  
                  {/* Fiscal Routes */}
                  <Route path="fiscal">
                    <Route
                      path="dashboard"
                      element={
                        <AdminRoute>
                          <React.Suspense
                            fallback={
                              <div className="min-h-[40vh] flex items-center justify-center" aria-busy="true">
                                <div className="text-muted-foreground text-sm">Carregando…</div>
                              </div>
                            }
                          >
                            <DashboardFiscal />
                          </React.Suspense>
                        </AdminRoute>
                      }
                    />
                    <Route path="notas-fiscais" element={<NotasFiscais />} />
                    <Route path="mdfe" element={<MDFe />} />
                    <Route path="sped" element={<SPED />} />
                    <Route path="tributos" element={<Tributos />} />
                  </Route>
                  
                  
                  {/* RH Routes */}
                  <Route path="rh">
                    <Route path="colaboradores" element={<Colaboradores />} />
                    <Route path="cargos" element={<Cargos />} />
                    <Route path="departamentos" element={<Departamentos />} />
                    {/* AUDITORIA_NOVA Fase 6: folha_pagamento agora é admin-only na
                        RLS (salário não é dado que qualquer funcionário deveria ler) —
                        a rota segue a mesma direção. */}
                    <Route path="folha/folha-pagamento" element={<AdminRoute><FolhaPagamento /></AdminRoute>} />
                    <Route path="folha/vencimentos-padrao" element={<VencimentosPadrao />} />
                    <Route path="folha/descontos-padrao" element={<DescontosPadrao />} />
                    <Route path="folha/beneficios-vinculados" element={<BeneficiosVinculados />} />
                    <Route path="folha/integracao-ponto" element={<IntegracaoPonto />} />
                    <Route path="registros-ponto" element={<RegistrosPonto />} />
                    <Route path="relatorios" element={<Relatorios />} />
                  </Route>

                  {/* Integração Routes — admin-only + VITE_FEATURE_SYNC_DASHBOARD (SM1-D).
                      AUDITORIA_NOVA Fase 4: antes só o item de menu respeitava a flag,
                      a rota abria pra qualquer admin mesmo com o módulo desligado. */}
                  <Route path="integracao">
                    <Route
                      path="sincronizacao"
                      element={
                        <FeatureRoute flag="syncDashboard">
                          <AdminRoute>
                            <SyncDashboard />
                          </AdminRoute>
                        </FeatureRoute>
                      }
                    />
                  </Route>
                  
                  {/* Configurações Routes */}
                  <Route path="configuracoes">
                    <Route path="empresas" element={<Empresas />} />
                    <Route path="usuarios" element={<Usuarios />} />
                    <Route path="perfil" element={<Perfil />} />
                    {/* AUDITORIA_NOVA Fase 6: webhook_configs agora é admin-only na
                        RLS (secret_token HMAC não é dado que qualquer funcionário
                        deveria ler nem rotacionar) — a rota segue a mesma direção. */}
                    <Route path="webhooks" element={<AdminRoute><Webhooks /></AdminRoute>} />
                    <Route path="campos-personalizados" element={<AdminRoute><CamposPersonalizados /></AdminRoute>} />
                    {/* AUDITORIA_NOVA Fase 3: tela pronta, sem rota — alimenta um trigger real
                        (trg_snapshot_class_venda) já ativo no banco. RLS é authenticated normal,
                        sem gate de admin, então a rota também não tem. */}
                    <Route path="regras-classificacao-receita" element={<RegrasClassificacaoReceita />} />
                    {/* P6.1: novus_owner-only (AUDITORIA_NOVA Fase 1.5 — report_ops_* não tem
                        coluna de empresa, é operação interna NOVUS, não dado de cliente).
                        Gate server-side (AdminRoute) + gate próprio na página. */}
                    <Route
                      path="relatorios-ops"
                      element={
                        <AdminRoute role="novus_owner">
                          <React.Suspense
                            fallback={
                              <div className="min-h-[40vh] flex items-center justify-center" aria-busy="true">
                                <div className="text-muted-foreground text-sm">Carregando…</div>
                              </div>
                            }
                          >
                            <RelatoriosOps />
                          </React.Suspense>
                        </AdminRoute>
                      }
                    />
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
