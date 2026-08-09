
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Wrench, Database, Shield, Bell, Palette } from 'lucide-react';

const ConfiguracoesSistema: React.FC = () => {
  const configuracoesFuturas = [
    {
      icon: Database,
      titulo: 'Backup e Restauração',
      descricao: 'Configure backups automáticos e restauração de dados',
      status: 'Em breve'
    },
    {
      icon: Shield,
      titulo: 'Segurança',
      descricao: 'Configurações de segurança e auditoria do sistema',
      status: 'Em breve'
    },
    {
      icon: Bell,
      titulo: 'Notificações',
      descricao: 'Configure alertas e notificações do sistema',
      status: 'Em breve'
    },
    {
      icon: Palette,
      titulo: 'Personalização',
      descricao: 'Personalize a aparência e comportamento do sistema',
      status: 'Em breve'
    },
    {
      icon: Wrench,
      titulo: 'Integrações',
      descricao: 'Configure integrações com sistemas externos',
      status: 'Em breve'
    }
  ];

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">
          Configurações do Sistema
        </h1>
        <p className="text-muted-foreground">
          Configure aspectos gerais e avançados do sistema
        </p>
      </div>

      {/* Status Atual */}
      <Card className="mb-8 border-l-4 border-l-status-confirmed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-status-confirmed">
            <Settings className="w-5 h-5" />
            Status do Módulo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-status-confirmed/10 p-4 rounded-lg">
            <h3 className="font-semibold text-status-confirmed mb-2">Em Desenvolvimento</h3>
            <p className="text-status-confirmed">
              Este módulo está sendo desenvolvido e em breve estará disponível com 
              funcionalidades avançadas de configuração do sistema.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Configurações Futuras */}
      <div>
        <h2 className="text-xl font-semibold mb-6 text-gray-800">
          Funcionalidades Planejadas
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {configuracoesFuturas.map((config, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow opacity-75">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <config.icon className="w-5 h-5 text-gray-500" />
                  {config.titulo}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">
                  {config.descricao}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-status-draft/10 text-status-draft px-2 py-1 rounded">
                    {config.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Informações Adicionais */}
      <Card className="mt-8 bg-gray-50">
        <CardContent className="p-6">
          <div className="text-center">
            <Settings className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Configurações Avançadas
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              As configurações do sistema permitirão personalizar comportamentos avançados, 
              configurar integrações, definir políticas de segurança e muito mais. 
              Acompanhe as atualizações para ser notificado quando estiverem disponíveis.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfiguracoesSistema;
