export interface ContatoEmpresa {
  id?: string;
  nome: string;
  telefone: string;
  email: string;
  setorId?: string;
  cargo?: string;
  principal?: boolean;
}

export interface ContatoEmpresaForm extends Omit<ContatoEmpresa, 'id'> {
  id?: string;
}