
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Download, 
  FileText, 
  Users, 
  TrendingUp,
  Calendar,
  Building,
  Briefcase
} from 'lucide-react';

const Relatorios: React.FC = () => {
  console.log('[RH] Renderizando página de Relatórios RH');

  const relatoriosDisponiveis = [
    {
      id: 1,
      titulo: "Relatório de Colaboradores",
      descricao: "Listagem completa de todos os colaboradores ativos e inativos",
      icon: Users,
      categoria: "Colaboradores",
      status: "Disponível"
    },
    {
      id: 2,
      titulo: "Colaboradores por Cargo",
      descricao: "Agrupamento de colaboradores por cargo com estatísticas",
      icon: Briefcase,
      categoria: "Colaboradores",
      status: "Disponível"
    },
    {
      id: 3,
      titulo: "Colaboradores por Departamento",
      descricao: "Distribuição de colaboradores por departamento",
      icon: Building,
      categoria: "Colaboradores",
      status: "Disponível"
    },
    {
      id: 4,
      titulo: "Admissões e Demissões",
      descricao: "Histórico de admissões e demissões por período",
      icon: Calendar,
      categoria: "Movimentação",
      status: "Em Desenvolvimento"
    },
    {
      id: 5,
      titulo: "Análise Salarial",
      descricao: "Estatísticas e análises de salários por cargo e departamento",
      icon: TrendingUp,
      categoria: "Financeiro",
      status: "Em Desenvolvimento"
    },
    {
      id: 6,
      titulo: "Dashboard Executivo RH",
      descricao: "Visão geral com KPIs e métricas principais do RH",
      icon: BarChart3,
      categoria: "Dashboard",
      status: "Em Desenvolvimento"
    }
  ];

  const estatisticas = [
    {
      titulo: "Relatórios Disponíveis",
      valor: 3,
      descricao: "prontos para geração",
      icon: FileText,
      cor: "text-blue-600"
    },
    {
      titulo: "Em Desenvolvimento",
      valor: 3,
      descricao: "em construção",
      icon: Calendar,
      cor: "text-orange-600"
    },
    {
      titulo: "Formatos",
      valor: "PDF/Excel",
      descricao: "disponíveis",
      icon: Download,
      cor: "text-green-600"
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios RH</h1>
          <p className="text-muted-foreground">
            Geração de relatórios e análises do módulo de Recursos Humanos
          </p>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-6 md:grid-cols-3">
        {estatisticas.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.titulo}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.cor}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.cor}`}>{stat.valor}</div>
              <p className="text-xs text-muted-foreground">
                {stat.descricao}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lista de Relatórios */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Relatórios Disponíveis</h2>
        
        <div className="grid gap-4">
          {relatoriosDisponiveis.map((relatorio) => (
            <Card key={relatorio.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <relatorio.icon className="h-6 w-6 text-primary" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{relatorio.titulo}</h3>
                        <Badge 
                          variant={relatorio.status === 'Disponível' ? "default" : "secondary"}
                        >
                          {relatorio.status}
                        </Badge>
                        <Badge variant="outline">
                          {relatorio.categoria}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {relatorio.descricao}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {relatorio.status === 'Disponível' ? (
                      <>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Excel
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        Em Breve
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Card de Informações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Informações sobre Relatórios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Formatos Disponíveis</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• PDF - Para visualização e impressão</li>
                <li>• Excel - Para análises e manipulação de dados</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Funcionalidades</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Filtros por período, departamento e cargo</li>
                <li>• Agrupamentos e totalizadores</li>
                <li>• Gráficos e visualizações</li>
              </ul>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> Alguns relatórios estão em desenvolvimento e serão disponibilizados em breve. 
              Os relatórios disponíveis podem ser gerados imediatamente com os dados atuais do sistema.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Relatorios;
