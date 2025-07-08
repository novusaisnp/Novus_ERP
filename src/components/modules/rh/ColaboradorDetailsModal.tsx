
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Colaborador } from '@/types/rh';
import { rhUtils } from '@/utils/rhUtils';
import { Separator } from '@/components/ui/separator';
import { User, Calendar, MapPin, Phone, Mail, Briefcase, CreditCard } from 'lucide-react';

interface ColaboradorDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaborador: Colaborador | null;
}

export const ColaboradorDetailsModal: React.FC<ColaboradorDetailsModalProps> = ({
  open,
  onOpenChange,
  colaborador
}) => {
  if (!colaborador) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <User className="h-5 w-5" />
            Detalhes do Colaborador
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{colaborador.nomeCompleto}</h3>
              <Badge variant={colaborador.situacao ? "default" : "secondary"}>
                {colaborador.situacao ? "Ativo" : "Inativo"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>Data de Nascimento:</strong> {colaborador.dataNascimento.toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>CPF:</strong> {rhUtils.formatCPF(colaborador.cpf)}
                </span>
              </div>
              {colaborador.rg && (
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>RG:</strong> {colaborador.rg}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Contato */}
          <div className="space-y-3">
            <h4 className="font-medium">Contato</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {colaborador.telefone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{colaborador.telefone}</span>
                </div>
              )}
              {colaborador.emailPessoal && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{colaborador.emailPessoal}</span>
                </div>
              )}
              {colaborador.emailCorporativo && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{colaborador.emailCorporativo}</span>
                </div>
              )}
            </div>
          </div>

          {/* Endereço */}
          {colaborador.endereco && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereço
                </h4>
                <div className="text-sm space-y-1">
                  <p>{colaborador.endereco.logradouro}, {colaborador.endereco.numero}</p>
                  {colaborador.endereco.complemento && <p>{colaborador.endereco.complemento}</p>}
                  <p>{colaborador.endereco.bairro} - {colaborador.endereco.cidade}/{colaborador.endereco.uf}</p>
                  <p>CEP: {colaborador.endereco.cep}</p>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Informações Profissionais */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Informações Profissionais
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Data de Admissão:</strong> {colaborador.dataAdmissao.toLocaleDateString('pt-BR')}
              </div>
              <div>
                <strong>Regime:</strong> {colaborador.regimeContratacao}
              </div>
              {colaborador.dataDemissao && (
                <div>
                  <strong>Data de Demissão:</strong> {colaborador.dataDemissao.toLocaleDateString('pt-BR')}
                </div>
              )}
              {colaborador.salarioBase && (
                <div>
                  <strong>Salário Base:</strong> {rhUtils.formatCurrency(colaborador.salarioBase)}
                </div>
              )}
              {colaborador.tipoContrato && (
                <div>
                  <strong>Tipo de Contrato:</strong> {colaborador.tipoContrato}
                </div>
              )}
              {colaborador.regimeTrabalho && (
                <div>
                  <strong>Regime de Trabalho:</strong> {colaborador.regimeTrabalho}
                </div>
              )}
              {colaborador.localTrabalho && (
                <div>
                  <strong>Local de Trabalho:</strong> {colaborador.localTrabalho}
                </div>
              )}
            </div>
          </div>

          {/* Jornada */}
          {colaborador.jornada && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium">Jornada de Trabalho</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Horas Diárias:</strong> {colaborador.jornada.horasDiarias}h
                  </div>
                  <div>
                    <strong>Dias na Semana:</strong> {colaborador.jornada.diasSemana}
                  </div>
                  {colaborador.jornada.horarioInicio && (
                    <div>
                      <strong>Horário de Início:</strong> {colaborador.jornada.horarioInicio}
                    </div>
                  )}
                  {colaborador.jornada.horarioFim && (
                    <div>
                      <strong>Horário de Fim:</strong> {colaborador.jornada.horarioFim}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Adicionais */}
          {colaborador.adicionais && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium">Adicionais</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {colaborador.adicionais.adicionalNoturno && (
                    <div>
                      <strong>Adicional Noturno:</strong> {colaborador.adicionais.adicionalNoturno}%
                    </div>
                  )}
                  {colaborador.adicionais.insalubridade && (
                    <div>
                      <strong>Insalubridade:</strong> {colaborador.adicionais.insalubridade}%
                    </div>
                  )}
                  {colaborador.adicionais.periculosidade && (
                    <div>
                      <strong>Periculosidade:</strong> {colaborador.adicionais.periculosidade}%
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Documentação Bancária */}
          {colaborador.documentacao?.dadosBancarios && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium">Dados Bancários</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Banco:</strong> {colaborador.documentacao.dadosBancarios.banco}
                  </div>
                  <div>
                    <strong>Agência:</strong> {colaborador.documentacao.dadosBancarios.agencia}
                  </div>
                  <div>
                    <strong>Conta:</strong> {colaborador.documentacao.dadosBancarios.conta}
                  </div>
                  <div>
                    <strong>Tipo:</strong> {colaborador.documentacao.dadosBancarios.tipoConta}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Compliance */}
          <Separator />
          <div className="space-y-3">
            <h4 className="font-medium">Compliance</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>LGPD:</strong> {colaborador.compliance.aceiteLgpd ? 'Aceito' : 'Pendente'}
              </div>
              <div>
                <strong>Consentimento de Dados:</strong> {colaborador.compliance.consentimentoDados ? 'Sim' : 'Não'}
              </div>
              {colaborador.compliance.dataAceite && (
                <div>
                  <strong>Data do Aceite:</strong> {colaborador.compliance.dataAceite.toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
