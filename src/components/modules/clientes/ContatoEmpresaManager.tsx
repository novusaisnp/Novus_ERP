import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Users, UserPlus } from 'lucide-react';
import { ContatoEmpresa } from '@/types/contato';
import { useSetores } from '@/hooks/useSetores';
import { QuickAddSetor } from '@/components/shared/QuickAddLookups';

interface ContatoEmpresaManagerProps {
  contatos: ContatoEmpresa[];
  onChange: (contatos: ContatoEmpresa[]) => void;
  className?: string;
}

export const ContatoEmpresaManager: React.FC<ContatoEmpresaManagerProps> = ({
  contatos,
  onChange,
  className = ''
}) => {
  const { setores, refetch } = useSetores();

  const adicionarContato = () => {
    console.log('[ContatoEmpresaManager] Adicionando novo contato');
    const novoContato: ContatoEmpresa = {
      nome: '',
      telefone: '',
      email: '',
      setorId: '',
      cargo: '',
      principal: contatos.length === 0
    };
    
    onChange([...contatos, novoContato]);
  };

  const removerContato = (index: number) => {
    console.log('[ContatoEmpresaManager] Removendo contato no índice:', index);
    const novosContatos = contatos.filter((_, i) => i !== index);
    
    // Se removeu o principal, tornar o primeiro como principal
    if (contatos[index]?.principal && novosContatos.length > 0) {
      novosContatos[0].principal = true;
    }
    
    onChange(novosContatos);
  };

  const atualizarContato = (index: number, campo: keyof ContatoEmpresa, valor: any) => {
    console.log('[ContatoEmpresaManager] Atualizando contato no índice:', index, 'campo:', campo);
    const novosContatos = [...contatos];
    
    if (campo === 'principal' && valor) {
      // Desmarcar todos os outros como principal
      novosContatos.forEach(contato => contato.principal = false);
    }
    
    novosContatos[index] = { ...novosContatos[index], [campo]: valor };
    onChange(novosContatos);
  };

  const formatarTelefone = (valor: string) => {
    const numero = valor.replace(/\D/g, '');
    
    if (numero.length <= 10) {
      return numero.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      return numero.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  const validarEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contatos da Empresa
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={adicionarContato}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Adicionar Contato
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {contatos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Nenhum contato cadastrado</p>
            <p className="text-sm mb-4">Adicione contatos para facilitar a comunicação com a empresa</p>
            <Button
              type="button"
              variant="ghost"
              onClick={adicionarContato}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar primeiro contato
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {contatos.map((contato, index) => (
              <Card key={index} className="border-muted">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Nome */}
                    <div className="space-y-2">
                      <Label htmlFor={`nome-${index}`}>Nome completo *</Label>
                      <Input
                        id={`nome-${index}`}
                        value={contato.nome}
                        onChange={(e) => atualizarContato(index, 'nome', e.target.value)}
                        placeholder="Nome do contato"
                        required
                      />
                    </div>

                    {/* Telefone */}
                    <div className="space-y-2">
                      <Label htmlFor={`telefone-${index}`}>Telefone *</Label>
                      <Input
                        id={`telefone-${index}`}
                        value={contato.telefone}
                        onChange={(e) => {
                          const formatted = formatarTelefone(e.target.value);
                          atualizarContato(index, 'telefone', formatted);
                        }}
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                        required
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor={`email-${index}`}>E-mail *</Label>
                      <Input
                        id={`email-${index}`}
                        type="email"
                        value={contato.email}
                        onChange={(e) => atualizarContato(index, 'email', e.target.value)}
                        placeholder="contato@empresa.com"
                        className={
                          contato.email && !validarEmail(contato.email) 
                            ? 'border-destructive focus:border-destructive' 
                            : ''
                        }
                        required
                      />
                      {contato.email && !validarEmail(contato.email) && (
                        <p className="text-sm text-destructive">
                          Formato de e-mail inválido
                        </p>
                      )}
                    </div>

                    {/* Setor */}
                    <div className="space-y-2">
                      <Label htmlFor={`setor-${index}`}>Setor</Label>
                      <div className="flex gap-2">
                        <Select
                          value={contato.setorId || ''}
                          onValueChange={(value) => atualizarContato(index, 'setorId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar setor" />
                          </SelectTrigger>
                          <SelectContent>
                            {setores.map((setor) => (
                              <SelectItem key={setor.id} value={setor.id}>
                                {setor.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <QuickAddSetor
                          onRefresh={refetch}
                          onCreated={({ id }) => atualizarContato(index, 'setorId', id)}
                        />
                      </div>
                    </div>

                    {/* Cargo */}
                    <div className="space-y-2">
                      <Label htmlFor={`cargo-${index}`}>Cargo</Label>
                      <Input
                        id={`cargo-${index}`}
                        value={contato.cargo || ''}
                        onChange={(e) => atualizarContato(index, 'cargo', e.target.value)}
                        placeholder="Gerente, Diretor, etc."
                      />
                    </div>

                    {/* Controles */}
                    <div className="flex items-end justify-between gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`principal-${index}`}
                          checked={contato.principal || false}
                          onCheckedChange={(checked) => 
                            atualizarContato(index, 'principal', checked)
                          }
                        />
                        <Label htmlFor={`principal-${index}`} className="text-sm">
                          Contato principal
                        </Label>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removerContato(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
