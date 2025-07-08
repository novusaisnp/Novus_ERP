
import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { validarCPF, formatarCPF } from '@/services/cnpjApi';

interface FormUsuarioProps {
  nomeCompleto: string;
  cpf: string;
  email: string;
  senhaTemporaria: string;
  obrigarTrocaSenha: boolean;
  ativo: boolean;
  isColaboradorVinculado: boolean;
  onNomeChange: (nome: string) => void;
  onCpfChange: (cpf: string) => void;
  onEmailChange: (email: string) => void;
  onSenhaChange: (senha: string) => void;
  onObrigarTrocaSenhaChange: (obrigar: boolean) => void;
  onAtivoChange: (ativo: boolean) => void;
}

const FormUsuario: React.FC<FormUsuarioProps> = ({
  nomeCompleto,
  cpf,
  email,
  senhaTemporaria,
  obrigarTrocaSenha,
  ativo,
  isColaboradorVinculado,
  onNomeChange,
  onCpfChange,
  onEmailChange,
  onSenhaChange,
  onObrigarTrocaSenhaChange,
  onAtivoChange
}) => {
  const [mostrarSenha, setMostrarSenha] = useState(false);

  console.log('[Usuarios] FormUsuario - Colaborador vinculado:', isColaboradorVinculado);

  const gerarSenhaTemporaria = () => {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%';
    let senha = '';
    for (let i = 0; i < 8; i++) {
      senha += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    onSenhaChange(senha);
    console.log('[Usuarios] Senha temporária gerada');
  };

  return (
    <div className="space-y-6">
      {/* Dados Pessoais */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary border-b pb-2">Dados do Usuário</h3>
        
        <div className="space-y-2">
          <Label htmlFor="nomeCompleto" className="text-sm font-medium">Nome Completo *</Label>
          <Input
            id="nomeCompleto"
            value={nomeCompleto}
            onChange={(e) => onNomeChange(e.target.value)}
            placeholder="Nome completo do usuário"
            className="w-full"
            readOnly={isColaboradorVinculado}
            required
          />
          {isColaboradorVinculado && (
            <p className="text-xs text-gray-500">Preenchido automaticamente com base no colaborador selecionado</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cpf" className="text-sm font-medium">CPF *</Label>
            <Input
              id="cpf"
              value={formatarCPF(cpf)}
              onChange={(e) => onCpfChange(e.target.value.replace(/\D/g, ''))}
              placeholder="000.000.000-00"
              maxLength={14}
              className="w-full"
              readOnly={isColaboradorVinculado}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="usuario@email.com"
              className="w-full"
              required
            />
          </div>
        </div>
      </div>

      {/* Configuração de Senha */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary border-b pb-2">Configuração de Acesso</h3>
        
        <div className="space-y-2">
          <Label htmlFor="senhaTemporaria" className="text-sm font-medium">Senha Inicial *</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="senhaTemporaria"
                type={mostrarSenha ? "text" : "password"}
                value={senhaTemporaria}
                onChange={(e) => onSenhaChange(e.target.value)}
                placeholder="Digite ou gere uma senha"
                className="w-full pr-10"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-8 w-8 p-0"
                onClick={() => setMostrarSenha(!mostrarSenha)}
              >
                {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={gerarSenhaTemporaria}
              className="px-3"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="obrigarTrocaSenha"
              checked={obrigarTrocaSenha}
              onChange={(e) => onObrigarTrocaSenhaChange(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <Label htmlFor="obrigarTrocaSenha" className="text-sm font-medium">
              Obrigar troca de senha no primeiro acesso
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="ativo"
              checked={ativo}
              onChange={(e) => onAtivoChange(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <Label htmlFor="ativo" className="text-sm font-medium">Usuário Ativo</Label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormUsuario;
