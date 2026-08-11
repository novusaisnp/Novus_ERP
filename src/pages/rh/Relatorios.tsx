
import React, { useMemo } from 'react';
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
import { ExportMenu } from '@/components/relatorios/ExportMenu';
import { useColaboradores } from '@/hooks/useColaboradores';
import { useCargos } from '@/hooks/useCargos';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useReportBranding } from '@/hooks/useReportBranding';
import { groupBy, type AggregatedRow } from '@/utils/relatoriosAgg';
import type { ReportExportPayload } from '@/utils/reportExportShared';
import { toCsv, downloadCsv, type CsvColumn } from '@/utils/csvExport';
import type { Colaborador } from '@/types/rh';

type ColaboradorRow = {
  nome: string;
  cargo: string;
  departamento: string;
  situacao: string;
  admissao: string;
};

const relatoriosEmDesenvolvimento = [
  {
    id: 4,
    titulo: "Admissões e Demissões",
    descricao: "Histórico de admissões e demissões por período",
    icon: Calendar,
    categoria: "Movimentação",
  },
  {
    id: 5,
    titulo: "Análise Salarial",
    descricao: "Estatísticas e análises de salários por cargo e departamento",
    icon: TrendingUp,
    categoria: "Financeiro",
  },
  {
    id: 6,
    titulo: "Dashboard Executivo RH",
    descricao: "Visão geral com KPIs e métricas principais do RH",
    icon: BarChart3,
    categoria: "Dashboard",
  },
];

const estatisticas = [
  {
    titulo: "Relatórios Disponíveis",
    valor: 3,
    descricao: "prontos para geração",
    icon: FileText,
    cor: "text-status-confirmed"
  },
  {
    titulo: "Em Desenvolvimento",
    valor: 3,
    descricao: "em construção",
    icon: Calendar,
    cor: "text-status-production"
  },
  {
    titulo: "Formatos",
    valor: "PDF/Excel",
    descricao: "disponíveis",
    icon: Download,
    cor: "text-status-delivered"
  }
];

const Relatorios: React.FC = () => {
  const { colaboradores, loading: loadingColaboradores } = useColaboradores();
  const { cargos } = useCargos();
  const { departamentos } = useDepartamentos();
  const { branding } = useReportBranding();

  const cargosMap = useMemo(() => new Map(cargos.map((c) => [c.id, c.nome])), [cargos]);
  const departamentosMap = useMemo(
    () => new Map(departamentos.map((d) => [d.id, d.nome])),
    [departamentos],
  );

  const rows: ColaboradorRow[] = useMemo(
    () =>
      colaboradores.map((c: Colaborador) => ({
        nome: c.nomeCompleto,
        cargo: (c.cargoId && cargosMap.get(c.cargoId)) || 'Não informado',
        departamento: (c.departamentoId && departamentosMap.get(c.departamentoId)) || 'Não informado',
        situacao: c.situacao ? 'Ativo' : 'Inativo',
        admissao: c.dataAdmissao ? new Date(c.dataAdmissao).toLocaleDateString('pt-BR') : '—',
      })),
    [colaboradores, cargosMap, departamentosMap],
  );

  const detailColumns: ReportExportPayload<ColaboradorRow>['detail']['columns'] = [
    { header: 'Nome', accessor: (r) => r.nome },
    { header: 'Cargo', accessor: (r) => r.cargo },
    { header: 'Departamento', accessor: (r) => r.departamento },
    { header: 'Situação', accessor: (r) => r.situacao },
    { header: 'Admissão', accessor: (r) => r.admissao },
  ];

  const csvColumns: CsvColumn<ColaboradorRow>[] = [
    { header: 'Nome', accessor: (r) => r.nome },
    { header: 'Cargo', accessor: (r) => r.cargo },
    { header: 'Departamento', accessor: (r) => r.departamento },
    { header: 'Situação', accessor: (r) => r.situacao },
    { header: 'Admissão', accessor: (r) => r.admissao },
  ];

  const porCargo: AggregatedRow[] = useMemo(
    () => groupBy(colaboradores, (c) => c.cargoId || 'Não informado', (c) => c.salarioBase || 0, (key) => cargosMap.get(key) || 'Não informado'),
    [colaboradores, cargosMap],
  );

  const porDepartamento: AggregatedRow[] = useMemo(
    () => groupBy(colaboradores, (c) => c.departamentoId || 'Não informado', (c) => c.salarioBase || 0, (key) => departamentosMap.get(key) || 'Não informado'),
    [colaboradores, departamentosMap],
  );

  const buildPayload = (
    title: string,
    aggregated: { groupLabel: string; rows: AggregatedRow[] } | null,
  ): ReportExportPayload<ColaboradorRow> => ({
    title,
    subtitle: `${colaboradores.length} colaborador(es)`,
    branding,
    filters: [],
    kpis: [],
    insights: [],
    detail: { columns: detailColumns, rows },
    aggregated,
    filenameBase: title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-'),
  });

  const relatoriosDisponiveis: Array<{
    id: number;
    titulo: string;
    descricao: string;
    icon: typeof Users;
    categoria: string;
    payload: ReportExportPayload<ColaboradorRow>;
    csvFilename: string;
  }> = [
    {
      id: 1,
      titulo: "Relatório de Colaboradores",
      descricao: "Listagem completa de todos os colaboradores ativos e inativos",
      icon: Users,
      categoria: "Colaboradores",
      payload: buildPayload('Relatório de Colaboradores', null),
      csvFilename: 'relatorio-colaboradores',
    },
    {
      id: 2,
      titulo: "Colaboradores por Cargo",
      descricao: "Agrupamento de colaboradores por cargo com estatísticas",
      icon: Briefcase,
      categoria: "Colaboradores",
      payload: buildPayload('Colaboradores por Cargo', { groupLabel: 'Cargo', rows: porCargo }),
      csvFilename: 'colaboradores-por-cargo',
    },
    {
      id: 3,
      titulo: "Colaboradores por Departamento",
      descricao: "Distribuição de colaboradores por departamento",
      icon: Building,
      categoria: "Colaboradores",
      payload: buildPayload('Colaboradores por Departamento', { groupLabel: 'Departamento', rows: porDepartamento }),
      csvFilename: 'colaboradores-por-departamento',
    },
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
                        <Badge variant="default">Disponível</Badge>
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
                    <ExportMenu
                      payload={relatorio.payload}
                      disabled={loadingColaboradores}
                      onCsv={() =>
                        downloadCsv(relatorio.csvFilename, toCsv(rows, csvColumns))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {relatoriosEmDesenvolvimento.map((relatorio) => (
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
                        <Badge variant="secondary">Em Desenvolvimento</Badge>
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
                    <Button variant="outline" size="sm" disabled>
                      Em Breve
                    </Button>
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
