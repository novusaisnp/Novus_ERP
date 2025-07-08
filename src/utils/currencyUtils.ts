
export const currencyUtils = {
  // Função para formatar valor como moeda
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  },

  // Função para converter moeda em número
  parseCurrency(value: string): number {
    if (!value) return 0;
    // Remove todos os caracteres não numéricos, exceto vírgula e ponto
    const numericValue = value
      .replace(/[^\d,.-]/g, '') // Remove tudo exceto números, vírgula, ponto e hífen
      .replace(/\./g, '') // Remove pontos (separadores de milhares)
      .replace(',', '.'); // Substitui vírgula por ponto (decimal)
    
    const parsed = parseFloat(numericValue);
    return isNaN(parsed) ? 0 : parsed;
  }
};
