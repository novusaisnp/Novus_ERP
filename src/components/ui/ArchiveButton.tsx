
import { useState } from 'react';
import { Archive } from 'lucide-react';
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

interface ArchiveButtonProps {
  onArchive: () => Promise<boolean>;
  entityName: string;
  entityId: string;
  variant?: 'destructive' | 'outline' | 'secondary';
  size?: 'sm' | 'lg' | 'icon' | 'default';
  showText?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Botão padronizado para arquivamento (soft delete) com confirmação
 * Substitui botões de "Excluir" em toda a aplicação
 */
export const ArchiveButton = ({
  onArchive,
  entityName,
  entityId,
  variant = 'destructive',
  size = 'sm',
  showText = true,
  disabled = false,
  className = '',
}: ArchiveButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  console.log(`[ArchiveButton] Renderizado para ${entityName} ID: ${entityId}`);

  const handleArchive = async () => {
    try {
      console.log(`[ArchiveButton] Iniciando arquivamento de ${entityName}`);
      setIsArchiving(true);
      
      const success = await onArchive();
      
      if (success) {
        console.log(`[ArchiveButton] ${entityName} arquivado com sucesso`);
        setIsOpen(false);
      }
    } catch (error) {
      console.error(`[ArchiveButton] Erro no arquivamento:`, error);
    } finally {
      setIsArchiving(false);
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
        <Archive className="h-4 w-4" />
        {showText && <span className="ml-2">Arquivar</span>}
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-amber-500" />
              Arquivar {entityName}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá arquivar o {entityName.toLowerCase()} selecionado.
              <br />
              <br />
              <strong>O registro não será excluído permanentemente</strong> e poderá ser restaurado posteriormente por um administrador.
              <br />
              <br />
              Todos os dados e histórico serão preservados para fins de auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={isArchiving}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isArchiving ? 'Arquivando...' : 'Confirmar Arquivamento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
