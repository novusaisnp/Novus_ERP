import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SlidersHorizontal } from 'lucide-react';
import type { CampoPersonalizado } from '@/types/campoPersonalizado';
import type { Json } from '@/integrations/supabase/types';

interface CamposExtrasSectionProps {
  campos: (Pick<CampoPersonalizado, 'chave' | 'rotulo' | 'tipo' | 'obrigatorio'> & { opcoes?: string[] | null })[];
  valores: Record<string, Json | undefined>;
  onChange: (chave: string, valor: Json) => void;
}

export function CamposExtrasSection({ campos, valores, onChange }: CamposExtrasSectionProps) {
  if (campos.length === 0) return null;

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-lg">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          Informações adicionais
        </CardTitle>
        <CardDescription>Campos definidos pela sua empresa para complementar este cadastro.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {campos.map((campo) => {
          const id = `campo-extra-${campo.chave}`;
          const label = `${campo.rotulo}${campo.obrigatorio ? ' *' : ''}`;

          if (campo.tipo === 'booleano') {
            return (
              <div key={campo.chave} className="flex items-center gap-2 pt-6">
                <Checkbox
                  id={id}
                  checked={valores[campo.chave] === true}
                  onCheckedChange={(checked) => onChange(campo.chave, checked === true)}
                />
                <Label htmlFor={id}>{label}</Label>
              </div>
            );
          }

          if (campo.tipo === 'selecao') {
            return (
              <div key={campo.chave} className="space-y-2">
                <Label htmlFor={id}>{label}</Label>
                <Select
                  value={String(valores[campo.chave] ?? '')}
                  onValueChange={(value) => onChange(campo.chave, value)}
                  required={campo.obrigatorio}
                >
                  <SelectTrigger id={id}><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(campo.opcoes ?? []).map((opcao) => <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            );
          }

          return (
            <div key={campo.chave} className="space-y-2">
              <Label htmlFor={id}>{label}</Label>
              <Input
                id={id}
                type={campo.tipo === 'numero' ? 'number' : campo.tipo === 'data' ? 'date' : 'text'}
                value={String(valores[campo.chave] ?? '')}
                onChange={(event) => onChange(
                  campo.chave,
                  campo.tipo === 'numero' && event.target.value !== '' ? Number(event.target.value) : event.target.value,
                )}
                required={campo.obrigatorio}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
