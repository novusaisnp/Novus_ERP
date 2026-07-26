// [Refatoração] Mudança para Gestão Bancária

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Banco, BancoInput, BancoBrasilAPI } from '@/types/banco';
import { buscarBancoPorCodigo, buscarBancosBrasilAPI } from '@/services/bancoService';
import { Search, Loader2, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

interface BancosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BancoInput) => void;
  banco?: Banco;
  isSubmitting?: boolean;
}

export const BancosModal = ({
  isOpen,
  onClose,
  onSubmit,
  banco,
  isSubmitting,
}: BancosModalProps) => {
  const [isBuscandoAPI, setIsBuscandoAPI] = useState(false);
  const [isBuscandoNome, setIsBuscandoNome] = useState(false);
  const [bancosEncontrados, setBancosEncontrados] = useState<BancoBrasilAPI[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const isEdit = !!banco;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BancoInput>({
    defaultValues: {
      codigo: '',
      nome: '',
      sigla: '',
      pais: 'Brasil',
      ativo: true,
    },
  });

  const codigoValue = watch('codigo');
  const nomeValue = watch('nome');

  useEffect(() => {
    if (banco) {
      reset({
        codigo: banco.codigo,
        nome: banco.nome,
        sigla: banco.sigla || '',
        pais: banco.pais,
        ativo: banco.ativo,
      });
    } else {
      reset({
        codigo: '',
        nome: '',
        sigla: '',
        pais: 'Brasil',
        ativo: true,
      });
    }
  }, [banco, reset]);

  const buscarPorCodigo = async () => {
    if (!codigoValue || !/^\d+$/.test(codigoValue)) {
      toast({
        title: 'Atenção',
        description: 'Digite o código numérico do banco',
        variant: 'destructive',
      });
      return;
    }

    setIsBuscandoAPI(true);
    try {
      console.log('[GestaoBancaria] Buscando banco por código:', codigoValue);
      const bancoAPI = await buscarBancoPorCodigo(codigoValue);
      
      if (bancoAPI) {
        setValue('nome', bancoAPI.fullName || bancoAPI.name);
        setValue('sigla', bancoAPI.name);
        setValue('pais', 'Brasil');
        toast({
          title: 'Sucesso',
          description: 'Dados do banco preenchidos automaticamente!',
        });
      } else {
        toast({
          title: 'Banco não localizado',
          description: 'Banco não encontrado na base do Banco Central. Preencha manualmente.',
        });
      }
    } catch (error) {
      console.error('[GestaoBancaria] Erro ao buscar por código:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao buscar banco na API. Tente novamente ou preencha manualmente.',
        variant: 'destructive',
      });
    } finally {
      setIsBuscandoAPI(false);
    }
  };

  const buscarPorNome = async () => {
    if (!nomeValue || nomeValue.length < 3) {
      toast({
        title: 'Atenção',
        description: 'Digite pelo menos 3 letras do nome do banco',
        variant: 'destructive',
      });
      return;
    }

    setIsBuscandoNome(true);
    try {
      console.log('[GestaoBancaria] Buscando bancos por nome:', nomeValue);
      const todosOsBancos = await buscarBancosBrasilAPI();
      
      const bancosEncontrados = todosOsBancos.filter(banco => 
        banco.name.toLowerCase().includes(nomeValue.toLowerCase()) ||
        banco.fullName.toLowerCase().includes(nomeValue.toLowerCase())
      );

      if (bancosEncontrados.length > 0) {
        console.log('[GestaoBancaria] Bancos encontrados:', bancosEncontrados.length);
        setBancosEncontrados(bancosEncontrados);
        setIsPopoverOpen(true);
      } else {
        toast({
          title: 'Nenhum banco encontrado',
          description: 'Nenhum banco encontrado com esse nome. Tente outro termo ou preencha manualmente.',
        });
      }
    } catch (error) {
      console.error('[GestaoBancaria] Erro ao buscar por nome:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao buscar bancos na API. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsBuscandoNome(false);
    }
  };

  const selecionarBanco = (bancoSelecionado: BancoBrasilAPI) => {
    console.log('[GestaoBancaria] Banco selecionado:', bancoSelecionado);
    setValue('codigo', bancoSelecionado.code.toString());
    setValue('nome', bancoSelecionado.fullName || bancoSelecionado.name);
    setValue('sigla', bancoSelecionado.name);
    setValue('pais', 'Brasil');
    setIsPopoverOpen(false);
    setBancosEncontrados([]);
    
    toast({
      title: 'Sucesso',
      description: 'Dados do banco preenchidos automaticamente!',
    });
  };

  const handleFormSubmit = (data: BancoInput) => {
    console.log('[GestaoBancaria] Submetendo formulário:', data);
    onSubmit(data);
  };

  const handleClose = () => {
    reset();
    setBancosEncontrados([]);
    setIsPopoverOpen(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Banco' : 'Cadastrar Banco'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="codigo">Código do Banco *</Label>
            <div className="flex gap-2">
              <Input
                id="codigo"
                {...register('codigo', {
                  required: 'Código é obrigatório',
                  pattern: {
                    value: /^\d+$/,
                    message: 'Código deve conter apenas números',
                  },
                })}
                placeholder="Ex: 001, 341, 237"
                maxLength={10}
                disabled={isEdit}
              />
              {!isEdit && (
                <Button
                  type="button"
                  onClick={buscarPorCodigo}
                  disabled={isBuscandoAPI || !codigoValue}
                  size="sm"
                  variant="outline"
                >
                  {isBuscandoAPI ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            {errors.codigo && (
              <p className="text-sm text-red-600 mt-1">{errors.codigo.message}</p>
            )}
            {!isEdit && (
              <p className="text-xs text-gray-500 mt-1">
                Digite o código e clique em buscar para preencher automaticamente
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="nome">Nome do Banco *</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  id="nome"
                  {...register('nome', {
                    required: 'Nome é obrigatório',
                    maxLength: {
                      value: 100,
                      message: 'Nome deve ter no máximo 100 caracteres',
                    },
                  })}
                  placeholder="Ex: Banco do Brasil S.A."
                />
                {bancosEncontrados.length > 0 && (
                  <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-8 w-8 p-0"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar banco..." />
                        <CommandList>
                          <CommandEmpty>Nenhum banco encontrado.</CommandEmpty>
                          <CommandGroup>
                            {bancosEncontrados.map((banco) => (
                              <CommandItem
                                key={banco.ispb}
                                onSelect={() => selecionarBanco(banco)}
                                className="cursor-pointer"
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">{banco.fullName || banco.name}</span>
                                  <span className="text-sm text-gray-500">
                                    Código: {banco.code} | {banco.name}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              {!isEdit && (
                <Button
                  type="button"
                  onClick={buscarPorNome}
                  disabled={isBuscandoNome || !nomeValue}
                  size="sm"
                  variant="outline"
                >
                  {isBuscandoNome ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            {errors.nome && (
              <p className="text-sm text-red-600 mt-1">{errors.nome.message}</p>
            )}
            {!isEdit && (
              <p className="text-xs text-gray-500 mt-1">
                Digite o nome e clique em buscar para ver opções disponíveis
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="sigla">Sigla</Label>
            <Input
              id="sigla"
              {...register('sigla', {
                maxLength: {
                  value: 10,
                  message: 'Sigla deve ter no máximo 10 caracteres',
                },
              })}
              placeholder="Ex: BB, CEF, BRADESCO"
              maxLength={10}
            />
            {errors.sigla && (
              <p className="text-sm text-red-600 mt-1">{errors.sigla.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="pais">País</Label>
            <Input
              id="pais"
              {...register('pais', {
                required: 'País é obrigatório',
                maxLength: {
                  value: 50,
                  message: 'País deve ter no máximo 50 caracteres',
                },
              })}
              placeholder="Ex: Brasil, Argentina"
            />
            {errors.pais && (
              <p className="text-sm text-red-600 mt-1">{errors.pais.message}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="ativo"
              {...register('ativo')}
              defaultChecked={true}
            />
            <Label htmlFor="ativo">Banco ativo</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEdit ? 'Salvando...' : 'Criando...'}
                </>
              ) : (
                <>{isEdit ? 'Salvar' : 'Criar'}</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};