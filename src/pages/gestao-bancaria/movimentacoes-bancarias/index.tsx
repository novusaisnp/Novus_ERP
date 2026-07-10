import React, { useState } from 'react';
import { MovimentacoesBancariasModal } from '@/components/gestao-bancaria/movimentacoes-bancarias/MovimentacoesBancariasModal';


const MovimentacoesBancarias = () => {
  const [isModalOpen, setIsModalOpen] = useState(true);

  const handleModalClose = () => {
    setIsModalOpen(false);
    // Navegar de volta para o dashboard ou página anterior
    window.history.back();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Movimentações Bancárias</h1>
          <p className="text-muted-foreground mb-4">
            Gerencie depósitos, saques, transferências e extratos bancários
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Abrir Movimentações Bancárias
          </button>
        </div>
      </div>
      
      <MovimentacoesBancariasModal 
        isOpen={isModalOpen} 
        onClose={handleModalClose} 
      />
    </div>
  );
};

export default MovimentacoesBancarias;