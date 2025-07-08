
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArchiveButton } from '@/components/ui/ArchiveButton';
import { RestoreButton } from '@/components/ui/RestoreButton';
import { ContaBancaria } from '@/types/contaBancaria';
import { MoreVertical, Edit, Building2, Vault, CreditCard } from 'lucide-react';

interface ContaBancariaCardProps {
  conta: ContaBancaria;
  onEdit: (conta: ContaBancaria) => void;
  onArchive: (id: string) => Promise<boolean>;
  onRestore: (id: string) => Promise<boolean>;
  isArchiving: boolean;
  isRestoring: boolean;
}

export const ContaBancariaCard = ({
  conta,
  onEdit,
  onArchive,
  onRestore,
  isArchiving,
  isRestoring,
}: ContaBancariaCardProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ATIVA':
        return 'bg-green-100 text-green-800';
      case 'INATIVA':
        return 'bg-red-100 text-red-800';
      case 'BLOQUEADA':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'CORRENTE':
        return <CreditCard className="h-4 w-4" />;
      case 'POUPANCA':
        return <Building2 className="h-4 w-4" />;
      default:
        return <Building2 className="h-4 w-4" />;
    }
  };

  const isArquivada = !!conta.deleted_at;

  return (
    <Card className={`${isArquivada ? 'opacity-60' : ''}`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          {conta.conta_cofre ? (
            <Vault className="h-4 w-4 text-purple-600" />
          ) : (
            getTipoIcon(conta.tipo_conta)
          )}
          <CardTitle className="text-sm font-medium">
            {conta.conta_cofre ? 'Conta Cofre' : conta.tipo_conta}
          </CardTitle>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(conta)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            {isArquivada ? (
              <RestoreButton
                onRestore={() => onRestore(conta.id)}
                entityName="conta bancária"
                entityId={conta.id}
              />
            ) : (
              <ArchiveButton
                onArchive={() => onArchive(conta.id)}
                entityName="conta bancária"
                entityId={conta.id}
              />
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">
              {conta.numero_conta}-{conta.digito_verificador}
            </span>
            <Badge className={getStatusColor(conta.status)}>
              {conta.status}
            </Badge>
          </div>
          
          <div>
            <p className="font-medium">{conta.titular}</p>
            <p className="text-sm text-gray-600">{conta.cpf_cnpj_titular}</p>
          </div>

          {!conta.conta_cofre && conta.agencia && (
            <div className="text-sm text-gray-600">
              <p>Agência: {conta.agencia.numero_agencia} - {conta.agencia.descricao}</p>
              <p>Banco: {conta.agencia.banco.codigo} - {conta.agencia.banco.nome}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Saldo:</span>
              <p className="font-medium">{formatCurrency(conta.saldo_atual)}</p>
            </div>
            {conta.limite_credito && (
              <div>
                <span className="text-gray-600">Limite:</span>
                <p className="font-medium">{formatCurrency(conta.limite_credito)}</p>
              </div>
            )}
          </div>

          {conta.descricao_conta && (
            <p className="text-sm text-gray-600 line-clamp-2">{conta.descricao_conta}</p>
          )}

          {isArquivada && (
            <Badge variant="secondary" className="mt-2">
              Arquivada
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
