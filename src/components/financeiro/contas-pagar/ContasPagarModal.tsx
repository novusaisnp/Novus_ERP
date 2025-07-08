
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RateioManager } from './RateioManager';
import { ContasPagarForm } from './ContasPagarForm';
import { useContasPagarForm } from '@/hooks/useContasPagarForm';
import { useToast } from '@/hooks/use-toast';
import type { ContaPagar, ContaPagarInput } from '@/types/contasPagar';

interface ContasPagarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ContaPagarInput) => Promise<void>;
  conta?: ContaPagar;
  isSubmitting: boolean;
}

export const ContasPagarModal = ({
  isOpen,
  onClose,
  onSubmit,
  conta,
  isSubmitting,
}: ContasPagarModalProps) => {
  console.log('[ContasPagarModal] Renderizando modal', { isOpen, conta: conta?.id, isSubmitting });
  
  const { toast } = useToast();
  
  const {
    formData,
    useRateio,
    setUseRateio,
    handleInputChange,
    handleRateiosChange,
    prepareSubmitData,
  } = useContasPagarForm({ conta, isOpen });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) {
      console.log('[ContasPagarModal] Já está enviando, ignorando nova submissão');
      return;
    }
    
    try {
      console.log('[ContasPagarModal] Iniciando submissão do formulário');
      const dataToSubmit = prepareSubmitData();
      console.log('[ContasPagarModal] Dados validados, enviando para onSubmit');
      
      await onSubmit(dataToSubmit);
      
      console.log('[ContasPagarModal] Submissão concluída com sucesso');
      
    } catch (error) {
      console.error('[ContasPagarModal] Erro na validação/submissão:', error);
      toast({
        title: "Erro na validação",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleTabChange = (value: string) => {
    console.log('[ContasPagarModal] Mudando para aba:', value);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {conta ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basico" className="w-full" onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basico">Dados da Conta</TabsTrigger>
              <TabsTrigger value="rateio">Rateio</TabsTrigger>
            </TabsList>

            <TabsContent value="basico" className="space-y-4">
              <ContasPagarForm
                formData={formData}
                onInputChange={handleInputChange}
                useRateio={useRateio}
                onUseRateioChange={setUseRateio}
                onRateiosChange={handleRateiosChange}
              />
            </TabsContent>

            <TabsContent value="rateio" className="space-y-4">
              {useRateio ? (
                <RateioManager
                  valorTotal={formData.valor_atual}
                  rateios={formData.rateios || []}
                  onRateiosChange={handleRateiosChange}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Para usar o rateio, marque a opção "Usar rateio entre contas contábeis" na aba "Dados da Conta".
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setUseRateio(true)}
                    disabled={isSubmitting}
                  >
                    Ativar Rateio
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? 'Salvando...' : conta ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
