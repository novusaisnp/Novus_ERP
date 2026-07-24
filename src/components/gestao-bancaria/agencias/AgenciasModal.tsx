
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AgenciaInput, Agencia } from '@/types/agencia';
import { useBancos } from '@/hooks/useBancos';

const enderecoSchema = z.object({
  rua: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional().refine((val) => {
    if (!val) return true;
    return /^\d{5}-?\d{3}$/.test(val);
  }, { message: 'CEP deve ter formato 12345-678' }),
});

const agenciaSchema = z.object({
  banco_id: z.string().min(1, 'Banco é obrigatório'),
  numero_agencia: z.string()
    .min(1, 'Número da agência é obrigatório')
    .max(10, 'Número da agência deve ter no máximo 10 dígitos')
    .regex(/^\d+$/, 'Número da agência deve conter apenas números'),
  descricao: z.string()
    .min(3, 'Descrição deve ter pelo menos 3 caracteres')
    .max(100, 'Descrição deve ter no máximo 100 caracteres'),
  endereco: enderecoSchema.optional(),
  telefone: z.string().optional().refine((val) => {
    if (!val) return true;
    const numeros = val.replace(/\D/g, '');
    return numeros.length >= 10 && numeros.length <= 11;
  }, { message: 'Telefone deve ter 10 ou 11 dígitos' }),
  ativo: z.boolean().optional(),
});

type AgenciaFormData = z.infer<typeof agenciaSchema>;

interface AgenciasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AgenciaInput) => void;
  agencia?: Agencia;
  isSubmitting: boolean;
}

export const AgenciasModal: React.FC<AgenciasModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  agencia,
  isSubmitting,
}) => {
  console.log('[AgenciasModal] Modal aberto:', isOpen, 'Agência:', agencia?.id);

  const { bancos } = useBancos({ ativo: true });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AgenciaFormData>({
    resolver: zodResolver(agenciaSchema),
    defaultValues: {
      banco_id: '',
      numero_agencia: '',
      descricao: '',
      endereco: {},
      telefone: '',
      ativo: true,
    },
  });

  const watchedBancoId = watch('banco_id');
  const watchedAtivo = watch('ativo');

  useEffect(() => {
    if (isOpen && agencia) {
      console.log('[AgenciasModal] Preenchendo formulário com dados:', agencia);
      setValue('banco_id', agencia.banco_id);
      setValue('numero_agencia', agencia.numero_agencia);
      setValue('descricao', agencia.descricao);
      setValue('endereco', agencia.endereco || {});
      setValue('telefone', agencia.telefone || '');
      setValue('ativo', agencia.ativo);
    } else if (isOpen) {
      console.log('[AgenciasModal] Limpando formulário para nova agência');
      reset({
        banco_id: '',
        numero_agencia: '',
        descricao: '',
        endereco: {},
        telefone: '',
        ativo: true,
      });
    }
  }, [isOpen, agencia, setValue, reset]);

  const handleFormSubmit = (data: AgenciaFormData) => {
    console.log('[AgenciasModal] Enviando dados:', data);
    
    // Formatar telefone
    let telefoneFormatado = data.telefone;
    if (telefoneFormatado) {
      const numeros = telefoneFormatado.replace(/\D/g, '');
      if (numeros.length === 11) {
        telefoneFormatado = `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
      } else if (numeros.length === 10) {
        telefoneFormatado = `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
      }
    }

    // Formatar CEP
    const endereco = { ...data.endereco };
    if (endereco.cep) {
      const numeros = endereco.cep.replace(/\D/g, '');
      if (numeros.length === 8) {
        endereco.cep = `${numeros.slice(0, 5)}-${numeros.slice(5)}`;
      }
    }

    const payload: AgenciaInput = {
      banco_id: data.banco_id,
      numero_agencia: data.numero_agencia,
      descricao: data.descricao,
      endereco: Object.keys(endereco).length > 0 ? endereco : undefined,
      telefone: telefoneFormatado || undefined,
      ativo: data.ativo,
    };

    onSubmit(payload);
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.length <= 11) {
      if (value.length <= 2) {
        // mantém sem formatação
      } else if (value.length <= 6) {
        value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
      } else if (value.length <= 10) {
        value = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
      } else {
        value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
      }
    }
    
    setValue('telefone', value);
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.length <= 8) {
      if (value.length > 5) {
        value = `${value.slice(0, 5)}-${value.slice(5)}`;
      }
    }
    
    setValue('endereco.cep', value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {agencia ? 'Editar Agência' : 'Nova Agência'}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Dados Principais */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Dados Principais</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="banco_id">Banco *</Label>
                <Select
                  value={watchedBancoId}
                  onValueChange={(value) => setValue('banco_id', value)}
                >
                  <SelectTrigger className={errors.banco_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {bancos.map((banco) => (
                      <SelectItem key={banco.id} value={banco.id}>
                        {banco.sigla ? `${banco.sigla} - ${banco.nome}` : banco.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.banco_id && (
                  <p className="text-sm text-red-500">{errors.banco_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero_agencia">Número da Agência *</Label>
                <Input
                  id="numero_agencia"
                  {...register('numero_agencia')}
                  placeholder="Ex: 1234"
                  className={errors.numero_agencia ? 'border-red-500' : ''}
                />
                {errors.numero_agencia && (
                  <p className="text-sm text-red-500">{errors.numero_agencia.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição da Agência *</Label>
              <Input
                id="descricao"
                {...register('descricao')}
                placeholder="Ex: Agência Centro, Agência Shopping..."
                className={errors.descricao ? 'border-red-500' : ''}
              />
              {errors.descricao && (
                <p className="text-sm text-red-500">{errors.descricao.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                {...register('telefone')}
                placeholder="(11) 99999-9999"
                onChange={handleTelefoneChange}
                className={errors.telefone ? 'border-red-500' : ''}
              />
              {errors.telefone && (
                <p className="text-sm text-red-500">{errors.telefone.message}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Endereço */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Endereço (Opcional)</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="endereco.rua">Rua/Logradouro</Label>
                <Input
                  id="endereco.rua"
                  {...register('endereco.rua')}
                  placeholder="Nome da rua"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco.numero">Número</Label>
                <Input
                  id="endereco.numero"
                  {...register('endereco.numero')}
                  placeholder="123"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco.complemento">Complemento</Label>
              <Input
                id="endereco.complemento"
                {...register('endereco.complemento')}
                placeholder="Sala, andar, etc."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="endereco.cidade">Cidade</Label>
                <Input
                  id="endereco.cidade"
                  {...register('endereco.cidade')}
                  placeholder="Nome da cidade"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco.estado">Estado</Label>
                <Input
                  id="endereco.estado"
                  {...register('endereco.estado')}
                  placeholder="SP"
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco.cep">CEP</Label>
                <Input
                  id="endereco.cep"
                  {...register('endereco.cep')}
                  placeholder="12345-678"
                  onChange={handleCepChange}
                  className={errors.endereco?.cep ? 'border-red-500' : ''}
                />
                {errors.endereco?.cep && (
                  <p className="text-sm text-red-500">{errors.endereco.cep.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Status */}
          <div className="flex items-center space-x-2">
            <Switch
              id="ativo"
              checked={watchedAtivo}
              onCheckedChange={(checked) => setValue('ativo', checked)}
            />
            <Label htmlFor="ativo">Agência ativa</Label>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : (agencia ? 'Atualizar' : 'Criar')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
