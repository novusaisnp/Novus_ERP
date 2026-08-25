> ⚠️ **DESATUALIZADO.** Gerado em 2026-07-11, várias tabelas/arquivos mudaram desde então
> (rebuild de schema em 2026-07-10, migrações subsequentes, novos services). Não confie nele
> sem re-verificar. Estado atual: [`docs/STATUS.md`](./docs/STATUS.md).

# Árvore do Projeto — NOVUS ERP MODULAR

_Gerado em 2026-07-11T01:57:06Z — exclui `node_modules`, `dist`, `.git`, `coverage`._

```text
.
|-- .workspace
|   `-- AGENTS.md
|-- docs
|   `-- DOCUMENTACAO_COMPLETA_NOVUS_ERP.md
|-- public
|   |-- lovable-uploads
|   |   |-- 12cf8826-c8db-4e85-bca1-d7e32f9ff2ec.png
|   |   |-- 2b20e13a-06d5-4b20-8072-9b4f413ad5f2.png
|   |   |-- 7b5385fe-eb33-46fa-b16a-0f308fa5cc31.png
|   |   |-- a18945ec-c5b9-4d49-b438-0ce66ff55b7d.png
|   |   `-- e3a1140c-9fb4-4ca4-8401-be58b48089cb.png
|   |-- novus-logo.png
|   |-- placeholder.svg
|   `-- robots.txt
|-- src
|   |-- __tests__
|   |   `-- lote3d.test.ts
|   |-- components
|   |   |-- auth
|   |   |   `-- ProtectedRoute.tsx
|   |   |-- configuracoes
|   |   |   |-- CentroCustoCard.tsx
|   |   |   |-- CentroCustoEmptyState.tsx
|   |   |   `-- CentroCustoModal.tsx
|   |   |-- contratos
|   |   |   `-- ContratoFormModal.tsx
|   |   |-- financeiro
|   |   |   |-- bancos
|   |   |   |   |-- BancoCard.tsx
|   |   |   |   |-- BancoEmptyState.tsx
|   |   |   |   |-- BancosContent.tsx
|   |   |   |   |-- BancosFilters.tsx
|   |   |   |   |-- BancosHeader.tsx
|   |   |   |   |-- BancosModal.tsx
|   |   |   |   `-- BancosStats.tsx
|   |   |   |-- config-basicas
|   |   |   |   |-- ModalidadeAPIModal.tsx
|   |   |   |   |-- ModalidadeAPITab.tsx
|   |   |   |   |-- ModalidadeCaixaModal.tsx
|   |   |   |   |-- ModalidadeCaixasTab.tsx
|   |   |   |   |-- NaturezaCaixaModal.tsx
|   |   |   |   |-- NaturezaCaixasTab.tsx
|   |   |   |   |-- PlanoPagamentoModal.tsx
|   |   |   |   `-- PlanosPagamentoTab.tsx
|   |   |   |-- contas-pagar
|   |   |   |   |-- ContaContabilAutocomplete.tsx
|   |   |   |   |-- ContasPagarContent.tsx
|   |   |   |   |-- ContasPagarEmptyState.tsx
|   |   |   |   |-- ContasPagarFilters.tsx
|   |   |   |   |-- ContasPagarForm.tsx
|   |   |   |   |-- ContasPagarHeader.tsx
|   |   |   |   |-- ContasPagarModal.tsx
|   |   |   |   |-- ContasPagarStats.tsx
|   |   |   |   |-- FornecedorAutocomplete.tsx
|   |   |   |   `-- RateioManager.tsx
|   |   |   |-- contas-receber
|   |   |   |   |-- ContaReceberFormModal.tsx
|   |   |   |   |-- ContasReceberContent.tsx
|   |   |   |   |-- ContasReceberEmptyState.tsx
|   |   |   |   |-- ContasReceberFilters.tsx
|   |   |   |   |-- ContasReceberHeader.tsx
|   |   |   |   `-- ContasReceberStats.tsx
|   |   |   |-- fluxo-caixa
|   |   |   |   |-- FluxoCaixaExportButtons.tsx
|   |   |   |   |-- FluxoCaixaFiltros.tsx
|   |   |   |   |-- FluxoCaixaGrafico.tsx
|   |   |   |   |-- FluxoCaixaResumo.tsx
|   |   |   |   `-- FluxoCaixaTabela.tsx
|   |   |   |-- movimentacoes
|   |   |   |   |-- DocumentosTab.tsx
|   |   |   |   |-- HistoricoTab.tsx
|   |   |   |   `-- RateiosTab.tsx
|   |   |   |-- LiquidacaoTituloModal.tsx
|   |   |   |-- MovimentacoesGestaoPopup.tsx
|   |   |   |-- MovimentacoesModal.tsx
|   |   |   |-- PlanoContasContent.tsx
|   |   |   |-- PlanoContasEmptyState.tsx
|   |   |   |-- PlanoContasFilters.tsx
|   |   |   |-- PlanoContasHeader.tsx
|   |   |   |-- PlanoContasModal.tsx
|   |   |   |-- PlanoContasStats.tsx
|   |   |   `-- PlanoContasTreeView.tsx
|   |   |-- gestao-bancaria
|   |   |   |-- agencias
|   |   |   |   |-- AgenciaEmptyState.tsx
|   |   |   |   |-- AgenciasContent.tsx
|   |   |   |   |-- AgenciasFilters.tsx
|   |   |   |   |-- AgenciasHeader.tsx
|   |   |   |   |-- AgenciasModal.tsx
|   |   |   |   `-- AgenciasStats.tsx
|   |   |   |-- bancos
|   |   |   |   |-- BancoCard.tsx
|   |   |   |   |-- BancoEmptyState.tsx
|   |   |   |   |-- BancosContent.tsx
|   |   |   |   |-- BancosFilters.tsx
|   |   |   |   |-- BancosHeader.tsx
|   |   |   |   |-- BancosModal.tsx
|   |   |   |   `-- BancosStats.tsx
|   |   |   |-- contas-bancarias
|   |   |   |   |-- ContaBancariaCard.tsx
|   |   |   |   |-- ContaBancariaEmptyState.tsx
|   |   |   |   |-- ContasBancariasContent.tsx
|   |   |   |   |-- ContasBancariasFilters.tsx
|   |   |   |   |-- ContasBancariasHeader.tsx
|   |   |   |   |-- ContasBancariasModal.tsx
|   |   |   |   `-- ContasBancariasStats.tsx
|   |   |   `-- movimentacoes-bancarias
|   |   |       |-- HistoricoMovimentacoes.tsx
|   |   |       |-- MovimentacoesBancariasFilters.tsx
|   |   |       |-- MovimentacoesBancariasModal.tsx
|   |   |       |-- MovimentacoesBancariasStats.tsx
|   |   |       |-- MovimentacoesBancariasTable.tsx
|   |   |       |-- NovaMovimentacaoModal.tsx
|   |   |       `-- TransferenciaModal.tsx
|   |   |-- layout
|   |   |   |-- header
|   |   |   |   `-- UserDropdown.tsx
|   |   |   |-- sidebar
|   |   |   |   |-- SidebarMenuGroup.tsx
|   |   |   |   |-- SidebarMenuItem.tsx
|   |   |   |   |-- SidebarUserFooter.tsx
|   |   |   |   `-- sidebarConfig.ts
|   |   |   |-- AppHeader.tsx
|   |   |   |-- AppLayout.tsx
|   |   |   |-- AppSidebar.tsx
|   |   |   `-- BrandFooter.tsx
|   |   |-- modules
|   |   |   |-- Cargos
|   |   |   |   |-- CargoCard.tsx
|   |   |   |   |-- CargosEmptyState.tsx
|   |   |   |   |-- CargosHeader.tsx
|   |   |   |   |-- CargosSearch.tsx
|   |   |   |   `-- CargosStats.tsx
|   |   |   |-- DescontosPadrao
|   |   |   |   |-- DescontoPadraoCard.tsx
|   |   |   |   |-- DescontosPadraoEmptyState.tsx
|   |   |   |   |-- DescontosPadraoFilters.tsx
|   |   |   |   |-- DescontosPadraoHeader.tsx
|   |   |   |   |-- DescontosPadraoList.tsx
|   |   |   |   `-- DescontosPadraoStats.tsx
|   |   |   |-- FormCargo
|   |   |   |   |-- CurrencyInput.tsx
|   |   |   |   |-- FormCargoFields.tsx
|   |   |   |   `-- index.tsx
|   |   |   |-- FormDepartamento
|   |   |   |   |-- FormDepartamentoFields.tsx
|   |   |   |   `-- index.tsx
|   |   |   |-- FormDescontoPadrao
|   |   |   |   |-- FormDescontoPadraoFields.tsx
|   |   |   |   `-- index.tsx
|   |   |   |-- FormVencimentoPadrao
|   |   |   |   `-- index.tsx
|   |   |   |-- VencimentosPadrao
|   |   |   |   |-- VencimentoPadraoCard.tsx
|   |   |   |   |-- VencimentosPadraoEmptyState.tsx
|   |   |   |   |-- VencimentosPadraoFilters.tsx
|   |   |   |   |-- VencimentosPadraoHeader.tsx
|   |   |   |   |-- VencimentosPadraoList.tsx
|   |   |   |   `-- VencimentosPadraoStats.tsx
|   |   |   |-- clientes
|   |   |   |   |-- CNAEAutocomplete.tsx
|   |   |   |   |-- ContatoEmpresaManager.tsx
|   |   |   |   |-- EmailManager.tsx
|   |   |   |   `-- MultiSelectComunicacao.tsx
|   |   |   |-- configuracoes
|   |   |   |   |-- empresas
|   |   |   |   |   |-- EmpresaResponsavelForm.tsx
|   |   |   |   |   |-- EmpresasRepresentadasList.tsx
|   |   |   |   |   |-- PerfisConfig.tsx
|   |   |   |   |   |-- SociosRepresentantesTab.tsx
|   |   |   |   |   `-- UsuariosVinculadosList.tsx
|   |   |   |   `-- usuarios
|   |   |   |       |-- FormPerfil.tsx
|   |   |   |       |-- FormUsuario.tsx
|   |   |   |       |-- FormVinculoColaborador.tsx
|   |   |   |       |-- NovoUsuarioModal.tsx
|   |   |   |       |-- PerfilCard.tsx
|   |   |   |       |-- PerfilFormModal.tsx
|   |   |   |       |-- PerfisEmptyState.tsx
|   |   |   |       |-- PermissionsSelector.tsx
|   |   |   |       |-- UsuarioCard.tsx
|   |   |   |       |-- UsuarioEmptyState.tsx
|   |   |   |       |-- UsuarioFilters.tsx
|   |   |   |       |-- UsuarioFormModal.tsx
|   |   |   |       `-- UsuarioLoadingState.tsx
|   |   |   |-- fiscal
|   |   |   |   |-- NaturezaOperacaoCFOPFields.tsx
|   |   |   |   |-- NaturezaOperacaoFormFields.tsx
|   |   |   |   |-- NaturezaOperacaoSwitches.tsx
|   |   |   |   |-- TributosList.tsx
|   |   |   |   `-- TributosTab.tsx
|   |   |   |-- rh
|   |   |   |   |-- ColaboradorDetailsModal.tsx
|   |   |   |   |-- ColaboradorFormModal.tsx
|   |   |   |   `-- QuickAddButton.tsx
|   |   |   |-- CFOPConfig.tsx
|   |   |   |-- DateInput.tsx
|   |   |   |-- DocumentUpload.tsx
|   |   |   |-- FiscalConfigForm.tsx
|   |   |   |-- FormCategoria.tsx
|   |   |   |-- FormCliente.tsx
|   |   |   |-- FormFornecedor.tsx
|   |   |   |-- FormLocalizacao.tsx
|   |   |   |-- FormProduto.tsx
|   |   |   |-- FormTamanho.tsx
|   |   |   |-- FormUnidadeMedida.tsx
|   |   |   |-- NaturezaOperacaoForm.tsx
|   |   |   |-- ProdutoFornecedorList.tsx
|   |   |   |-- SyncDashboard.tsx
|   |   |   `-- TelefoneManager.tsx
|   |   |-- shared
|   |   |   |-- CepInput.tsx
|   |   |   |-- CnpjLookupInput.tsx
|   |   |   `-- CpfInput.tsx
|   |   |-- ui
|   |   |   |-- sidebar
|   |   |   |   |-- context.tsx
|   |   |   |   |-- group.tsx
|   |   |   |   |-- layout.tsx
|   |   |   |   |-- menu.tsx
|   |   |   |   |-- sidebar.tsx
|   |   |   |   |-- submenu.tsx
|   |   |   |   `-- trigger.tsx
|   |   |   |-- ArchiveButton.tsx
|   |   |   |-- AuditTrail.tsx
|   |   |   |-- RestoreButton.tsx
|   |   |   |-- accordion.tsx
|   |   |   |-- alert-dialog.tsx
|   |   |   |-- alert.tsx
|   |   |   |-- aspect-ratio.tsx
|   |   |   |-- avatar.tsx
|   |   |   |-- badge.tsx
|   |   |   |-- breadcrumb.tsx
|   |   |   |-- button.tsx
|   |   |   |-- calendar.tsx
|   |   |   |-- card.tsx
|   |   |   |-- carousel.tsx
|   |   |   |-- chart.tsx
|   |   |   |-- checkbox.tsx
|   |   |   |-- collapsible.tsx
|   |   |   |-- command.tsx
|   |   |   |-- confirm-dialog.tsx
|   |   |   |-- context-menu.tsx
|   |   |   |-- dialog.tsx
|   |   |   |-- drawer.tsx
|   |   |   |-- dropdown-menu.tsx
|   |   |   |-- form.tsx
|   |   |   |-- hover-card.tsx
|   |   |   |-- input-otp.tsx
|   |   |   |-- input.tsx
|   |   |   |-- label.tsx
|   |   |   |-- pagination.tsx
|   |   |   |-- popover.tsx
|   |   |   |-- progress.tsx
|   |   |   |-- radio-group.tsx
|   |   |   |-- resizable.tsx
|   |   |   |-- scroll-area.tsx
|   |   |   |-- select.tsx
|   |   |   |-- separator.tsx
|   |   |   |-- sheet.tsx
|   |   |   |-- sidebar.tsx
|   |   |   |-- skeleton.tsx
|   |   |   |-- slider.tsx
|   |   |   |-- sonner.tsx
|   |   |   |-- switch.tsx
|   |   |   |-- table.tsx
|   |   |   |-- tabs.tsx
|   |   |   |-- textarea.tsx
|   |   |   |-- theme-provider.tsx
|   |   |   |-- theme-toggle.tsx
|   |   |   |-- toast.tsx
|   |   |   |-- toaster.tsx
|   |   |   |-- toggle-group.tsx
|   |   |   |-- toggle.tsx
|   |   |   |-- tooltip.tsx
|   |   |   |-- tree-view.tsx
|   |   |   `-- use-toast.ts
|   |   `-- vendas
|   |       `-- VendaFormModal.tsx
|   |-- contexts
|   |   `-- AuthContext.tsx
|   |-- data
|   |   |-- estadosCivis.ts
|   |   |-- formasAtuacao.ts
|   |   |-- meiosComunicacao.ts
|   |   `-- niveisEscolaridade.ts
|   |-- docs
|   |   |-- examples
|   |   |   `-- new-auditable-entity.md
|   |   `-- rateios-pagamento-behavior.md
|   |-- hooks
|   |   |-- use-mobile.tsx
|   |   |-- use-toast.ts
|   |   |-- useAgencias.ts
|   |   |-- useAuditableCentrosCusto.ts
|   |   |-- useAuditableEntity.ts
|   |   |-- useAuthenticationState.ts
|   |   |-- useBancos.ts
|   |   |-- useCargos.ts
|   |   |-- useCategorias.ts
|   |   |-- useCentrosCusto.ts
|   |   |-- useCep.ts
|   |   |-- useClientes.ts
|   |   |-- useCnpjLookup.ts
|   |   |-- useColaboradorFormValidation.ts
|   |   |-- useColaboradores.ts
|   |   |-- useConfigBasicas.ts
|   |   |-- useContaContabilSearch.ts
|   |   |-- useContasBancarias.ts
|   |   |-- useContasPagar.ts
|   |   |-- useContasPagarForm.ts
|   |   |-- useContasReceber.ts
|   |   |-- useContratos.ts
|   |   |-- useDepartamentos.ts
|   |   |-- useDescontosPadrao.ts
|   |   |-- useEmpresaResponsavel.ts
|   |   |-- useEmpresasRepresentadas.ts
|   |   |-- useFiscal.ts
|   |   |-- useFluxoCaixa.ts
|   |   |-- useFluxoCaixaExport.ts
|   |   |-- useFornecedores.ts
|   |   |-- useLocalizacoes.ts
|   |   |-- useMeuPerfil.ts
|   |   |-- useMovimentacoesBancarias.ts
|   |   |-- useMovimentacoesCompletas.ts
|   |   |-- useMovimentacoesFinanceiras.ts
|   |   |-- usePerfis.ts
|   |   |-- usePlanoContas.ts
|   |   |-- useProdutos.ts
|   |   |-- useSetores.ts
|   |   |-- useSociosRepresentantes.ts
|   |   |-- useSyncHealth.ts
|   |   |-- useSyncLogs.ts
|   |   |-- useSyncStatus.ts
|   |   |-- useTamanhos.ts
|   |   |-- useUnidadesMedida.ts
|   |   |-- useUsuarioErrorHandler.ts
|   |   |-- useUsuarios.ts
|   |   |-- useVencimentosPadrao.ts
|   |   `-- useVendas.ts
|   |-- integrations
|   |   `-- supabase
|   |       |-- client.ts
|   |       `-- types.ts
|   |-- lib
|   |   |-- bankingErrors.ts
|   |   |-- queryKeys.ts
|   |   |-- statusMappers.ts
|   |   `-- utils.ts
|   |-- pages
|   |   |-- cadastros
|   |   |   |-- Clientes.tsx
|   |   |   |-- Fornecedores.tsx
|   |   |   |-- Produtos.tsx
|   |   |   `-- Servicos.tsx
|   |   |-- configuracoes
|   |   |   |-- CentrosCusto.tsx
|   |   |   |-- Empresas.tsx
|   |   |   |-- Perfil.tsx
|   |   |   |-- Sistema.tsx
|   |   |   `-- Usuarios.tsx
|   |   |-- contratos
|   |   |   `-- Contratos.tsx
|   |   |-- estoque
|   |   |   |-- Categorias.tsx
|   |   |   |-- EmBreve.tsx
|   |   |   |-- Localizacoes.tsx
|   |   |   |-- Produtos.tsx
|   |   |   |-- Tamanhos.tsx
|   |   |   `-- UnidadesMedida.tsx
|   |   |-- financeiro
|   |   |   |-- ConfigBasicas.tsx
|   |   |   |-- ContasPagar.tsx
|   |   |   |-- ContasReceber.tsx
|   |   |   |-- FluxoCaixaPage.tsx
|   |   |   |-- MovimentacoesFinanceiras.tsx
|   |   |   `-- PlanoContas.tsx
|   |   |-- fiscal
|   |   |   |-- NotasFiscais.tsx
|   |   |   |-- SPED.tsx
|   |   |   `-- Tributos.tsx
|   |   |-- gestao-bancaria
|   |   |   |-- agencias
|   |   |   |   `-- index.tsx
|   |   |   |-- bancos
|   |   |   |   `-- index.tsx
|   |   |   |-- contas-bancarias
|   |   |   |   `-- index.tsx
|   |   |   `-- movimentacoes-bancarias
|   |   |       `-- index.tsx
|   |   |-- integracao
|   |   |   `-- SyncDashboard.tsx
|   |   |-- rh
|   |   |   |-- BeneficiosVinculados.tsx
|   |   |   |-- Cargos.tsx
|   |   |   |-- Colaboradores.tsx
|   |   |   |-- Departamentos.tsx
|   |   |   |-- DescontosPadrao.tsx
|   |   |   |-- FolhaPagamento.tsx
|   |   |   |-- IntegracaoPonto.tsx
|   |   |   |-- RegistrosPonto.tsx
|   |   |   |-- Relatorios.tsx
|   |   |   `-- VencimentosPadrao.tsx
|   |   |-- vendas
|   |   |   |-- Pedidos.tsx
|   |   |   `-- Vendas.tsx
|   |   |-- Dashboard.tsx
|   |   |-- Index.tsx
|   |   |-- Login.tsx
|   |   `-- NotFound.tsx
|   |-- services
|   |   |-- contasPagar
|   |   |   |-- contasPagarOperations.ts
|   |   |   |-- contasPagarPagamentos.ts
|   |   |   |-- contasPagarQueries.ts
|   |   |   `-- contasPagarTransforms.ts
|   |   |-- contasReceber
|   |   |   |-- contasReceberOperations.ts
|   |   |   |-- contasReceberQueries.ts
|   |   |   `-- contasReceberTransforms.ts
|   |   |-- fiscal
|   |   |   |-- cfopService.ts
|   |   |   |-- configService.ts
|   |   |   |-- naturezaService.ts
|   |   |   |-- ncmService.ts
|   |   |   `-- tributoService.ts
|   |   |-- agenciaService.ts
|   |   |-- auditableCentroCustoService.ts
|   |   |-- bancoService.ts
|   |   |-- cargoService.ts
|   |   |-- categoriaService.ts
|   |   |-- centroCustoService.ts
|   |   |-- clienteService.ts
|   |   |-- cnpjApi.ts
|   |   |-- colaboradorService.ts
|   |   |-- configBasicasService.ts
|   |   |-- contaBancariaService.ts
|   |   |-- contasPagarService.ts
|   |   |-- contasReceberService.ts
|   |   |-- contratosService.ts
|   |   |-- departamentoService.ts
|   |   |-- descontoPadraoService.ts
|   |   |-- empresaResponsavelService.ts
|   |   |-- empresasRepresentadasService.ts
|   |   |-- fiscalService.ts
|   |   |-- fluxoCaixaService.ts
|   |   |-- fornecedorService.ts
|   |   |-- localizacaoService.ts
|   |   |-- movimentacoesBancariasService.ts
|   |   |-- movimentacoesService.ts
|   |   |-- planoContasService.ts
|   |   |-- produtoService.ts
|   |   |-- setorService.ts
|   |   |-- sociosRepresentantesService.ts
|   |   |-- syncService.ts
|   |   |-- tamanhoService.ts
|   |   |-- unidadeMedidaService.ts
|   |   |-- usuarioService.ts
|   |   |-- vencimentoPadraoService.ts
|   |   `-- vendasService.ts
|   |-- test
|   |   `-- setup.ts
|   |-- types
|   |   |-- agencia.ts
|   |   |-- banco.ts
|   |   |-- cliente.ts
|   |   |-- configBasicas.ts
|   |   |-- configuracoes.ts
|   |   |-- contaBancaria.ts
|   |   |-- contasPagar.ts
|   |   |-- contasReceber.ts
|   |   |-- contato.ts
|   |   |-- contratos.ts
|   |   |-- empresa.ts
|   |   |-- fiscal.ts
|   |   |-- fluxoCaixa.ts
|   |   |-- fornecedor.ts
|   |   |-- movimentacoesBancarias.ts
|   |   |-- movimentacoesFinanceiras.ts
|   |   |-- planoContas.ts
|   |   |-- produto.ts
|   |   |-- rh.ts
|   |   |-- setor.ts
|   |   |-- socios.ts
|   |   `-- vendas.ts
|   |-- utils
|   |   |-- auditableServiceTemplate.ts
|   |   |-- authUtils.ts
|   |   |-- clienteUtils.ts
|   |   |-- currencyUtils.ts
|   |   |-- fornecedorUtils.ts
|   |   |-- newTableTemplate.ts
|   |   |-- produtoUtils.ts
|   |   |-- rhUtils.ts
|   |   `-- usuarioUtils.ts
|   |-- App.css
|   |-- App.tsx
|   |-- index.css
|   |-- main.tsx
|   `-- vite-env.d.ts
|-- supabase
|   |-- functions
|   |   |-- data-validator
|   |   |   `-- index.ts
|   |   |-- enviar-convite-usuario
|   |   |   `-- index.ts
|   |   |-- health-check
|   |   |   `-- index.ts
|   |   |-- retry-failed-syncs
|   |   |   `-- index.ts
|   |   `-- sync-webhook
|   |       `-- index.ts
|   |-- migrations
|   |   |-- 20250704203536-b8b786a1-4f00-49fe-8667-1d1ea39e1bad.sql
|   |   |-- 20250704205515-2a37397b-fe7a-4b6c-a980-3a9a2ad8124d.sql
|   |   |-- 20250704225402-60da34e6-75a8-4a86-8cfe-045f76f8a1c1.sql
|   |   |-- 20250705020843-d8fe6e1b-db49-471b-b2a0-5797de5e15f0.sql
|   |   |-- 20250705022434-da6f7f64-1acd-4f8d-a9cf-c0e6d0acffce.sql
|   |   |-- 20250705024240-f3fb0a95-818a-47b1-aac2-2522f634e87a.sql
|   |   |-- 20250705040201-8503063a-c459-4764-9f88-54cd7634ca2e.sql
|   |   |-- 20250705050651-f6309e19-af4a-45c7-ac7d-cecac8fb54e3.sql
|   |   |-- 20250705142417-4c564e13-366f-481a-9e6e-ba38e2f8c92c.sql
|   |   |-- 20250705155653-49f0f6ff-ecdb-4702-a9f0-49b583480364.sql
|   |   |-- 20250705170650-5b847cf4-a296-4cfe-8340-fd7b8c362426.sql
|   |   |-- 20250705204734-9f35a7f8-eacc-4ff3-aeee-e531d9ec53be.sql
|   |   |-- 20250705221811-f754e412-e2a2-46ba-895f-a5ec8db125a1.sql
|   |   |-- 20250706011801-972dc8a4-ebeb-4c28-9000-4fe8c184e6f8.sql
|   |   |-- 20250706014220-512d4782-50f2-4384-aafb-7c67a453e0f8.sql
|   |   |-- 20250706020636-92352caa-1b73-49c9-8650-48efc6856904.sql
|   |   |-- 20250706033238-63082cf4-a11c-4353-92b9-80fe69aa13f1.sql
|   |   |-- 20250706034031-4c17d717-3014-4c38-80cb-058037837091.sql
|   |   |-- 20250706134752-5340e39d-8db4-4d3c-9dc5-67baf2a2e7a3.sql
|   |   |-- 20250706152125-fa1af423-1572-41a3-b5fe-d350b46d4f34.sql
|   |   |-- 20250707122459-bab1c40a-fe65-4b0d-b3b9-3e3c770e2045.sql
|   |   |-- 20250707131055-31028d19-a245-42dd-9da8-000165e1fed8.sql
|   |   |-- 20250707133003-9af7efed-c55f-4198-85e5-28a317d43650.sql
|   |   |-- 20250707142130-e19a2a06-7504-4dfe-994b-202aa67f6656.sql
|   |   |-- 20250707171831-f741fd88-f13a-463f-9979-11630292a3bf.sql
|   |   |-- 20250707191510-8f0fe38c-f269-497e-9782-b8fadf60e2f0.sql
|   |   |-- 20250707200849-79ebee83-d60f-4123-a71e-a1b1aa4d7772.sql
|   |   |-- 20250707201007-9a6b9f26-63dc-4cb0-9441-866bb72962ec.sql
|   |   |-- 20250707201748-ab5bdae0-eed8-4b1e-bb8c-c2fa0047a991.sql
|   |   |-- 20250707203750-0873fc21-b6e9-4532-97d8-1525f6134636.sql
|   |   |-- 20250707211441-a43cc2d8-3293-429a-bb77-268fe81de67b.sql
|   |   |-- 20250708144445-dfda76de-afd0-454a-8072-ea2c494277f3.sql
|   |   |-- 20250708172303-f32181f1-7f25-40e7-8595-5e2381e3ca9a.sql
|   |   |-- 20260710134155_3580c07e-321d-46d2-8237-35b3de1c24b8.sql
|   |   |-- 20260710134609_05419ab0-6c14-4c9f-a7a4-1709ff58c2b1.sql
|   |   |-- 20260710134847_3dcbeddb-eb2e-4aa3-9c39-650ee86f11e1.sql
|   |   |-- 20260710135144_eeb9a25d-cfbc-4c9a-b3e3-94385c94a6ae.sql
|   |   |-- 20260710135546_7c14a30a-27ed-439a-bb85-cccea3b52e68.sql
|   |   |-- 20260710135935_889cd59c-af2e-4415-ac38-2d8723482cfb.sql
|   |   |-- 20260710180530_1d2eace1-0333-49fe-bf08-23e2ddac15c3.sql
|   |   |-- 20260710181733_5192a4e7-7e6e-45cf-9924-04d0df14126a.sql
|   |   |-- 20260710225607_9ffdc81b-134e-46c0-8736-87aef1770a29.sql
|   |   |-- 20260710225718_4810d20d-445e-419e-b65b-235cb6ede918.sql
|   |   |-- 20260710230720_83d6f1fc-f306-4f37-b338-35bed5364db2.sql
|   |   |-- 20260710231806_1ca0290a-42ee-4b11-a8dd-1cb1a5fbb911.sql
|   |   |-- 20260710232918_41acc2e3-6321-40e5-ab09-b3024c6f3560.sql
|   |   |-- 20260711000337_e605aca9-5b81-4e8c-9873-a7d0dcedd871.sql
|   |   `-- 20260711000633_b2271c8a-ca99-42cf-906b-d8ba450a9a37.sql
|   `-- config.toml
|-- .env
|-- .gitignore
|-- README.md
|-- bun.lock
|-- components.json
|-- eslint.config.js
|-- index.html
|-- package-lock.json
|-- package.json
|-- postcss.config.js
|-- tailwind.config.ts
|-- tsconfig.app.json
|-- tsconfig.json
|-- tsconfig.node.json
|-- vite.config.ts
`-- vitest.config.ts
```
