import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Phone } from 'lucide-react';
import { Telefone } from '@/types/fornecedor';

interface TelefoneManagerProps {
  telefones: Telefone[];
  onChange: (telefones: Telefone[]) => void;
}

export const TelefoneManager: React.FC<TelefoneManagerProps> = ({
  telefones = [],
  onChange,
}) => {
  console.log('[TelefoneManager] Gerenciando telefones:', telefones.length);

  const adicionarTelefone = () => {
    const novoTelefone: Telefone = {
      numero: '',
      tipo: 'celular',
      principal: telefones.length === 0
    };
    
    const novosTelefones = [...telefones, novoTelefone];
    onChange(novosTelefones);
    console.log('[TelefoneManager] Telefone adicionado');
  };

  const removerTelefone = (index: number) => {
    const novosTelefones = telefones.filter((_, i) => i !== index);
    
    // Se removeu o principal, tornar o primeiro como principal
    if (telefones[index]?.principal && novosTelefones.length > 0) {
      novosTelefones[0].principal = true;
    }
    
    onChange(novosTelefones);
    console.log('[TelefoneManager] Telefone removido:', index);
  };

  const atualizarTelefone = (index: number, campo: keyof Telefone, valor: any) => {
    const novosTelefones = [...telefones];
    
    if (campo === 'principal' && valor) {
      // Desmarcar todos os outros como principal
      novosTelefones.forEach(tel => tel.principal = false);
    }
    
    novosTelefones[index] = { ...novosTelefones[index], [campo]: valor };
    onChange(novosTelefones);
    console.log('[TelefoneManager] Telefone atualizado:', index, campo);
  };

  const formatarTelefone = (valor: string) => {
    const numero = valor.replace(/\D/g, '');
    
    if (numero.length <= 10) {
      return numero.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      return numero.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-base font-semibold">Telefones</Label>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={adicionarTelefone}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Telefone
        </Button>
      </div>

      {telefones.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum telefone cadastrado</p>
          <p className="text-sm">Clique em "Adicionar Telefone" para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {telefones.map((telefone, index) => (
            <div key={index} className="flex items-end gap-3 p-3 border rounded-lg">
              <div className="flex-1 space-y-2">
                <Label htmlFor={`telefone-${index}`}>Número</Label>
                <Input
                  id={`telefone-${index}`}
                  value={telefone.numero}
                  onChange={(e) => {
                    const formatted = formatarTelefone(e.target.value);
                    atualizarTelefone(index, 'numero', formatted);
                  }}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                />
              </div>

              <div className="w-32 space-y-2">
                <Label>Tipo</Label>
                <Select 
                  value={telefone.tipo} 
                  onValueChange={(value: 'fixo' | 'celular') => 
                    atualizarTelefone(index, 'tipo', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="celular">Celular</SelectItem>
                    <SelectItem value="fixo">Fixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pb-2">
                <Checkbox
                  id={`principal-${index}`}
                  checked={telefone.principal || false}
                  onCheckedChange={(checked) => 
                    atualizarTelefone(index, 'principal', checked)
                  }
                />
                <Label htmlFor={`principal-${index}`} className="text-sm">
                  Principal
                </Label>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removerTelefone(index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};