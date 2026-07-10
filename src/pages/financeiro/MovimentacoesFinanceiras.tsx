import { useState, useEffect } from 'react';
import { MovimentacoesModal } from '@/components/financeiro/MovimentacoesModal';


const MovimentacoesFinanceiras = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Abrir o modal automaticamente quando a página carrega
  useEffect(() => {
    setIsModalOpen(true);
  }, []);

  const handleModalClose = () => {
    setIsModalOpen(false);
    // Navegar de volta para o dashboard ou última página
    window.history.back();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Movimentações Financeiras</h1>
          <p className="text-muted-foreground mb-4">
            Gerencie títulos de contas a pagar e receber
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Abrir Movimentações
          </button>
        </div>
      </div>
      
      <MovimentacoesModal 
        isOpen={isModalOpen} 
        onClose={handleModalClose} 
      />
    </div>
  );
};

export default MovimentacoesFinanceiras;