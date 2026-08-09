
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RestoreButtonProps {
  onRestore: () => Promise<boolean>;
  entityName: string;
  entityId: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'lg' | 'icon' | 'default';
  showText?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Botão padronizado para restauração de registros arquivados
 * Permite desfazer soft deletes
 */
export const RestoreButton = ({
  onRestore,
  entityName,
  entityId,
  variant = 'outline',
  size = 'sm',
  showText = true,
  disabled = false,
  className = '',
}: RestoreButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  console.log(`[RestoreButton] Renderizado para ${entityName} ID: ${entityId}`);

  const handleRestore = async () => {
    try {
      console.log(`[RestoreButton] Iniciando restauração de ${entityName}`);
      setIsRestoring(true);
      
      const success = await onRestore();
      
      if (success) {
        console.log(`[RestoreButton] ${entityName} restaurado com sucesso`);
        setIsOpen(false);
      }
    } catch (error) {
      console.error(`[RestoreButton] Erro na restauração:`, error);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className={className}
      >
        <RotateCcw className="h-4 w-4" />
        {showText && <span className="ml-2">Restaurar</span>}
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-status-delivered" />
              Restaurar {entityName}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá restaurar o {entityName.toLowerCase()} arquivado.
              <br />
              <br />
              O registro voltará a ficar ativo e visível em todas as operações normais do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={isRestoring}
              className="bg-status-delivered hover:bg-status-delivered/90"
            >
              {isRestoring ? 'Restaurando...' : 'Confirmar Restauração'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
