
import { useToast } from '@/hooks/use-toast';
import { usuarioUtils } from '@/utils/usuarioUtils';

export const useUsuarioErrorHandler = () => {
  const { toast } = useToast();

  const handleError = (error: any, defaultMessage: string) => {
    console.error('Erro:', error);
    
    const errorMessage = usuarioUtils.getErrorMessage(error);
    
    toast({
      title: "Erro",
      description: errorMessage || defaultMessage,
      variant: "destructive"
    });
  };

  const handleValidationError = (message: string) => {
    toast({
      title: "Erro de validação",
      description: message,
      variant: "destructive"
    });
  };

  const handleSuccess = (message: string) => {
    toast({
      title: "Sucesso",
      description: message,
    });
  };

  return {
    handleError,
    handleValidationError,
    handleSuccess
  };
};
