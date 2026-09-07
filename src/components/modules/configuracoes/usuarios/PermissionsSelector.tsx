import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Shield, CheckCircle, Circle, Lock } from 'lucide-react';

interface PermissionModule {
  modulo: string;
  descricao: string;
  permissoes: {
    codigo: string;
    nome: string;
    descricao: string;
    critica?: boolean;
  }[];
}

interface PermissionsSelectorProps {
  permissoesSelecionadas: string[];
  onPermissaoToggle: (permissao: string) => void;
  onModuloToggle: (moduloPermissoes: string[]) => void;
  readOnly?: boolean;
}

export const PERMISSOES_GRANULARES: PermissionModule[] = [
  {
    modulo: 'Vendas',
    descricao: 'Gestão de vendas e orçamentos',
    permissoes: [
      { codigo: 'vendas.create', nome: 'Criar Vendas', descricao: 'Criar novas vendas e orçamentos' },
      { codigo: 'vendas.read', nome: 'Consultar Vendas', descricao: 'Visualizar vendas existentes' },
      { codigo: 'vendas.update', nome: 'Editar Vendas', descricao: 'Modificar vendas em andamento' },
      { codigo: 'vendas.delete', nome: 'Excluir Vendas', descricao: 'Remover vendas do sistema', critica: true },
      { codigo: 'vendas.desconto', nome: 'Aplicar Descontos', descricao: 'Conceder descontos em vendas' },
      { codigo: 'vendas.cancelamento', nome: 'Cancelar Vendas', descricao: 'Cancelar vendas finalizadas', critica: true },
      { codigo: 'vendas.alterarPreco', nome: 'Alterar Preços', descricao: 'Modificar preços de produtos na venda' },
      { codigo: 'vendas.autorizarInadimplencia', nome: 'Autorizar Venda a Inadimplente', descricao: 'Superar bloqueio de crédito/inadimplência e autorizar venda a prazo para cliente bloqueado, em análise ou com títulos vencidos', critica: true }
    ]
  },
  {
    modulo: 'Compras',
    descricao: 'Gestão de compras e fornecedores',
    permissoes: [
      { codigo: 'compras.create', nome: 'Criar Compras', descricao: 'Registrar novas compras' },
      { codigo: 'compras.read', nome: 'Consultar Compras', descricao: 'Visualizar compras realizadas' },
      { codigo: 'compras.update', nome: 'Editar Compras', descricao: 'Modificar compras em andamento' },
      { codigo: 'compras.delete', nome: 'Excluir Compras', descricao: 'Remover compras do sistema', critica: true },
      { codigo: 'compras.aprovacao', nome: 'Aprovar Compras', descricao: 'Aprovar pedidos de compra', critica: true }
    ]
  },
  {
    modulo: 'Estoque',
    descricao: 'Controle de estoque e movimentações',
    permissoes: [
      { codigo: 'estoque.create', nome: 'Criar Movimentações', descricao: 'Registrar entradas e saídas' },
      { codigo: 'estoque.read', nome: 'Consultar Estoque', descricao: 'Visualizar posição de estoque' },
      { codigo: 'estoque.update', nome: 'Editar Movimentações', descricao: 'Corrigir movimentações' },
      { codigo: 'estoque.delete', nome: 'Excluir Movimentações', descricao: 'Remover movimentações', critica: true },
      { codigo: 'estoque.ajuste', nome: 'Ajustes de Estoque', descricao: 'Realizar ajustes manuais de estoque', critica: true },
      { codigo: 'estoque.transferencia', nome: 'Transferências', descricao: 'Transferir produtos entre locais' },
      { codigo: 'estoque.inventario', nome: 'Inventário', descricao: 'Realizar inventários físicos' }
    ]
  },
  {
    modulo: 'Produtos',
    descricao: 'Cadastro e gestão de produtos',
    permissoes: [
      { codigo: 'produtos.create', nome: 'Cadastrar Produtos', descricao: 'Adicionar novos produtos' },
      { codigo: 'produtos.read', nome: 'Consultar Produtos', descricao: 'Visualizar produtos cadastrados' },
      { codigo: 'produtos.update', nome: 'Editar Produtos', descricao: 'Modificar dados de produtos' },
      { codigo: 'produtos.delete', nome: 'Excluir Produtos', descricao: 'Remover produtos do cadastro', critica: true },
      { codigo: 'produtos.precos', nome: 'Gerenciar Preços', descricao: 'Alterar preços de venda e custo' }
    ]
  },
  {
    modulo: 'Clientes',
    descricao: 'Cadastro e gestão de clientes',
    permissoes: [
      { codigo: 'clientes.create', nome: 'Cadastrar Clientes', descricao: 'Adicionar novos clientes' },
      { codigo: 'clientes.read', nome: 'Consultar Clientes', descricao: 'Visualizar dados dos clientes' },
      { codigo: 'clientes.update', nome: 'Editar Clientes', descricao: 'Modificar dados dos clientes' },
      { codigo: 'clientes.delete', nome: 'Excluir Clientes', descricao: 'Remover clientes do cadastro', critica: true }
    ]
  },
  {
    modulo: 'Fornecedores',
    descricao: 'Cadastro e gestão de fornecedores',
    permissoes: [
      { codigo: 'fornecedores.create', nome: 'Cadastrar Fornecedores', descricao: 'Adicionar novos fornecedores' },
      { codigo: 'fornecedores.read', nome: 'Consultar Fornecedores', descricao: 'Visualizar dados dos fornecedores' },
      { codigo: 'fornecedores.update', nome: 'Editar Fornecedores', descricao: 'Modificar dados dos fornecedores' },
      { codigo: 'fornecedores.delete', nome: 'Excluir Fornecedores', descricao: 'Remover fornecedores do cadastro', critica: true }
    ]
  },
  {
    modulo: 'Financeiro',
    descricao: 'Gestão financeira e contas',
    permissoes: [
      { codigo: 'financeiro.create', nome: 'Criar Lançamentos', descricao: 'Registrar receitas e despesas' },
      { codigo: 'financeiro.read', nome: 'Consultar Financeiro', descricao: 'Visualizar movimentação financeira' },
      { codigo: 'financeiro.update', nome: 'Editar Lançamentos', descricao: 'Modificar lançamentos financeiros' },
      { codigo: 'financeiro.delete', nome: 'Excluir Lançamentos', descricao: 'Remover lançamentos financeiros', critica: true },
      { codigo: 'financeiro.liquidar', nome: 'Liquidar Títulos', descricao: 'Dar baixa total ou parcial em contas a pagar e receber', critica: true },
      { codigo: 'financeiro.estorno', nome: 'Estornar Lançamentos', descricao: 'Estornar operações financeiras', critica: true },
      { codigo: 'financeiro.cancelamento', nome: 'Cancelar Títulos', descricao: 'Cancelar títulos financeiros sem baixa', critica: true },
      { codigo: 'financeiro.lancamentoRetroativo', nome: 'Lançamentos Retroativos', descricao: 'Criar lançamentos em datas passadas', critica: true },
      { codigo: 'financeiro.alterarVencimento', nome: 'Alterar Vencimentos', descricao: 'Modificar datas de vencimento' }
    ]
  },
  {
    modulo: 'Fiscal',
    descricao: 'Gestão fiscal e tributária',
    permissoes: [
      { codigo: 'fiscal.create', nome: 'Emitir Documentos', descricao: 'Gerar documentos fiscais' },
      { codigo: 'fiscal.read', nome: 'Consultar Fiscal', descricao: 'Visualizar documentos fiscais' },
      { codigo: 'fiscal.update', nome: 'Editar Documentos', descricao: 'Modificar documentos em elaboração' },
      { codigo: 'fiscal.delete', nome: 'Excluir Documentos', descricao: 'Remover documentos não transmitidos', critica: true },
      { codigo: 'fiscal.cancelarNfe', nome: 'Cancelar NFe', descricao: 'Cancelar notas fiscais eletrônicas', critica: true },
      { codigo: 'fiscal.cartaCorrecao', nome: 'Carta de Correção', descricao: 'Emitir cartas de correção eletrônica' },
      { codigo: 'fiscal.inutilizacao', nome: 'Inutilizar Numeração', descricao: 'Inutilizar sequências de numeração', critica: true }
    ]
  },
  {
    modulo: 'NFe',
    descricao: 'Notas Fiscais Eletrônicas',
    permissoes: [
      { codigo: 'nfe.create', nome: 'Emitir NFe', descricao: 'Gerar notas fiscais eletrônicas' },
      { codigo: 'nfe.read', nome: 'Consultar NFe', descricao: 'Visualizar NFe emitidas' },
      { codigo: 'nfe.update', nome: 'Editar NFe', descricao: 'Modificar NFe em elaboração' },
      { codigo: 'nfe.cancel', nome: 'Cancelar NFe', descricao: 'Cancelar notas fiscais', critica: true }
    ]
  },
  {
    modulo: 'RH',
    descricao: 'Recursos Humanos',
    permissoes: [
      { codigo: 'rh.create', nome: 'Cadastrar Funcionários', descricao: 'Adicionar colaboradores' },
      { codigo: 'rh.read', nome: 'Consultar RH', descricao: 'Visualizar dados de RH' },
      { codigo: 'rh.update', nome: 'Editar Funcionários', descricao: 'Modificar dados dos colaboradores' },
      { codigo: 'rh.delete', nome: 'Excluir Funcionários', descricao: 'Remover colaboradores', critica: true },
      { codigo: 'rh.folhaPagamento', nome: 'Folha de Pagamento', descricao: 'Processar folha de pagamento', critica: true },
      { codigo: 'rh.ponto', nome: 'Controle de Ponto', descricao: 'Gerenciar registros de ponto' },
      { codigo: 'rh.admissao', nome: 'Admissões', descricao: 'Processar admissões de funcionários' },
      { codigo: 'rh.demissao', nome: 'Demissões', descricao: 'Processar demissões de funcionários', critica: true }
    ]
  },
  {
    modulo: 'Relatórios',
    descricao: 'Relatórios e consultas',
    permissoes: [
      { codigo: 'relatorios.vendas', nome: 'Relatórios de Vendas', descricao: 'Gerar relatórios de vendas' },
      { codigo: 'relatorios.compras', nome: 'Relatórios de Compras', descricao: 'Gerar relatórios de compras' },
      { codigo: 'relatorios.financeiro', nome: 'Relatórios Financeiros', descricao: 'Gerar relatórios financeiros' },
      { codigo: 'relatorios.fiscal', nome: 'Relatórios Fiscais', descricao: 'Gerar relatórios fiscais' },
      { codigo: 'relatorios.gerencial', nome: 'Relatórios Gerenciais', descricao: 'Acessar relatórios gerenciais' },
      { codigo: 'relatorios.operacional', nome: 'Relatórios Operacionais', descricao: 'Gerar relatórios operacionais' },
      { codigo: 'relatorios.export', nome: 'Exportar Relatórios', descricao: 'Exportar dados em diversos formatos' }
    ]
  },
  {
    modulo: 'Caixa',
    descricao: 'Operações de caixa',
    permissoes: [
      { codigo: 'caixa.abrir', nome: 'Abrir Caixa', descricao: 'Iniciar operações de caixa' },
      { codigo: 'caixa.fechar', nome: 'Fechar Caixa', descricao: 'Finalizar operações de caixa' },
      { codigo: 'caixa.sangria', nome: 'Sangria', descricao: 'Realizar sangrias do caixa', critica: true },
      { codigo: 'caixa.suprimento', nome: 'Suprimento', descricao: 'Adicionar dinheiro ao caixa' }
    ]
  },
  {
    modulo: 'Configurações',
    descricao: 'Configurações do sistema',
    permissoes: [
      { codigo: 'config.empresas', nome: 'Configurar Empresas', descricao: 'Gerenciar dados das empresas', critica: true },
      { codigo: 'config.usuarios', nome: 'Configurar Usuários', descricao: 'Gerenciar usuários e perfis', critica: true },
      { codigo: 'config.sistema', nome: 'Configurações Gerais', descricao: 'Acessar configurações do sistema', critica: true }
    ]
  }
];

const PermissionsSelector: React.FC<PermissionsSelectorProps> = ({
  permissoesSelecionadas,
  onPermissaoToggle,
  onModuloToggle,
  readOnly = false
}) => {
  const getTotalPermissoesSelecionadas = () => {
    return permissoesSelecionadas.length;
  };

  const getPermissoesCriticas = () => {
    return PERMISSOES_GRANULARES.flatMap(modulo => 
      modulo.permissoes.filter(p => p.critica && permissoesSelecionadas.includes(p.codigo))
    ).length;
  };

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-4">
          <Shield className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold text-foreground">
              {readOnly ? 'Permissões do Perfil (Somente Leitura)' : 'Permissões do Perfil'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {readOnly ? 'Visualize as permissões configuradas neste perfil' : 'Configure as ações permitidas para este perfil'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Badge variant="outline" className="bg-card">
            {getTotalPermissoesSelecionadas()} permissões selecionadas
          </Badge>
          {getPermissoesCriticas() > 0 && (
            <Badge variant="destructive">
              {getPermissoesCriticas()} críticas
            </Badge>
          )}
          {readOnly && (
            <Badge variant="outline" className="border-status-confirmed text-status-confirmed bg-status-confirmed/10">
              <Lock className="w-3 h-3 mr-1" />
              Somente Leitura
            </Badge>
          )}
        </div>
      </div>

      {/* Lista de módulos */}
      <div className="space-y-4">
        {PERMISSOES_GRANULARES.map((modulo) => {
          const todasIncluidas = modulo.permissoes.every(p => permissoesSelecionadas.includes(p.codigo));
          const algumasIncluidas = modulo.permissoes.some(p => permissoesSelecionadas.includes(p.codigo));
          const permissoesSelecionadasModulo = modulo.permissoes.filter(p => permissoesSelecionadas.includes(p.codigo)).length;
          
          return (
            <Card key={modulo.modulo} className="overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Shield className="w-4 h-4 text-primary" />
                      <h4 className="font-medium text-foreground">{modulo.modulo}</h4>
                      <Badge variant="outline" className="text-xs">
                        {permissoesSelecionadasModulo}/{modulo.permissoes.length}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{modulo.descricao}</p>
                  </div>
                  
                  {!readOnly && (
                    <Button
                      type="button"
                      variant={todasIncluidas ? "default" : "outline"}
                      size="sm"
                      onClick={() => onModuloToggle(modulo.permissoes.map(p => p.codigo))}
                      className="ml-4"
                    >
                      {todasIncluidas ? 'Desmarcar Todas' : 'Selecionar Todas'}
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {modulo.permissoes.map((permissao) => {
                    const isSelected = permissoesSelecionadas.includes(permissao.codigo);
                    
                    return (
                      <div 
                        key={permissao.codigo} 
                        className={`
                          flex items-start space-x-3 p-3 rounded-lg border transition-all 
                          ${readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-muted/50'}
                          ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}
                          ${permissao.critica ? 'border-l-4 border-l-status-cancelled' : ''}
                        `}
                        onClick={readOnly ? undefined : () => onPermissaoToggle(permissao.codigo)}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {isSelected ? (
                            <CheckCircle className="w-4 h-4 text-primary" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Label className={`font-medium text-sm ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}>
                              {permissao.nome}
                            </Label>
                            {permissao.critica && (
                              <Badge variant="destructive" className="text-xs">
                                Crítica
                              </Badge>
                            )}
                            {readOnly && (
                              <Lock className="w-3 h-3 text-status-confirmed" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{permissao.descricao}</p>
                          <code className="text-xs text-muted-foreground font-mono bg-muted px-1 rounded">
                            {permissao.codigo}
                          </code>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Aviso sobre permissões críticas */}
      {getPermissoesCriticas() > 0 && (
        <Card className="border-status-cancelled/20 bg-status-cancelled/5">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-status-cancelled mt-0.5" />
              <div>
                <h4 className="font-medium text-status-cancelled">Permissões Críticas Selecionadas</h4>
                <p className="text-sm text-status-cancelled/80 mt-1">
                  Este perfil possui permissões críticas que podem afetar significativamente o sistema. 
                  Certifique-se de que apenas usuários confiáveis tenham acesso a estas funcionalidades.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PermissionsSelector;
