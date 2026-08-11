import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { setEmpresaAtivaId } from '@/lib/empresaAtiva';
import { empresasRepresentadasService } from '@/services/empresasRepresentadasService';
import { clienteService } from '@/services/clienteService';
import { contratosService } from '@/services/contratosService';
import loginHero from '@/assets/login-hero.png.asset.json';

// ponytail: id fixo da empresa_representada da própria NOVUS (o "vendedor"), seedada uma
// única vez nesta sessão. Se esse tenant for recriado, atualizar aqui — não há hoje nenhuma
// coluna/flag no banco marcando qual representada é a NOVUS, e criar uma pra um valor que só
// muda numa reinstalação seria over-engineering.
const NOVUS_TENANT_EMPRESA_ID = '56b73348-47bc-435b-8da1-34b232e143ed';

interface EmpresaDisponivel {
  representada_id: string;
  representada_nome: string;
  representada_cnpj: string | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
}

interface Satelite {
  id: string;
  codigo: string;
  nome: string;
}

interface RepresentadaForm {
  nome: string;
  cnpj: string;
}

const onlyDigits = (v: string) => v.replace(/\D/g, '');

// Mesma API já usada em EmpresasRepresentadasList.tsx — busca ao sair do campo (onBlur), não
// debounce por tecla, mais simples de coordenar numa lista dinâmica de representadas.
async function buscarRazaoSocialPorCnpj(cnpj: string): Promise<string | null> {
  const cnpjLimpo = onlyDigits(cnpj);
  if (cnpjLimpo.length !== 14) return null;
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.razao_social || null;
  } catch {
    return null;
  }
}

export default function OnboardingCliente() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Passo 1 — Responsável
  const [responsaveisExistentes, setResponsaveisExistentes] = useState<{ id: string; nome: string }[]>([]);
  const [modoResponsavel, setModoResponsavel] = useState<'novo' | 'existente'>('novo');
  const [responsavelExistenteId, setResponsavelExistenteId] = useState('');
  const [responsavelNome, setResponsavelNome] = useState('');
  const [responsavelCnpj, setResponsavelCnpj] = useState('');
  const [buscandoCnpjResponsavel, setBuscandoCnpjResponsavel] = useState(false);

  // Passo 2 — Representada(s)
  const [representadas, setRepresentadas] = useState<RepresentadaForm[]>([{ nome: '', cnpj: '' }]);
  const [buscandoCnpjRepresentada, setBuscandoCnpjRepresentada] = useState<number | null>(null);

  // Passo 3 — Contrato
  const [valorMensal, setValorMensal] = useState<number>(0);
  const [diaVencimento, setDiaVencimento] = useState<number>(10);
  const [renovacaoAutomatica, setRenovacaoAutomatica] = useState(true);

  // Passo 4 — Satélite (opcional)
  const [provisionarSatelite, setProvisionarSatelite] = useState(false);
  const [satelites, setSatelites] = useState<Satelite[]>([]);
  const [sateliteId, setSateliteId] = useState('');
  const [representadaParaSatelite, setRepresentadaParaSatelite] = useState(0);
  const [organizationName, setOrganizationName] = useState('');
  const [adminNome, setAdminNome] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    (async () => {
      const [{ data: disponiveis }, { data: sats }] = await Promise.all([
        supabase.rpc('get_empresas_disponiveis'),
        supabase.rpc('listar_satelites_disponiveis'),
      ]);

      const vistos = new Set<string>();
      const lista: { id: string; nome: string }[] = [];
      for (const row of (disponiveis as EmpresaDisponivel[] | null) ?? []) {
        if (row.responsavel_id && !vistos.has(row.responsavel_id)) {
          vistos.add(row.responsavel_id);
          lista.push({ id: row.responsavel_id, nome: row.responsavel_nome ?? '' });
        }
      }
      setResponsaveisExistentes(lista);
      setSatelites((sats as Satelite[] | null) ?? []);
    })();
  }, []);

  const addRepresentada = () => setRepresentadas((r) => [...r, { nome: '', cnpj: '' }]);
  const removeRepresentada = (idx: number) => setRepresentadas((r) => r.filter((_, i) => i !== idx));
  const updateRepresentada = (idx: number, campo: keyof RepresentadaForm, valor: string) =>
    setRepresentadas((r) => r.map((rep, i) => (i === idx ? { ...rep, [campo]: valor } : rep)));

  const handleBlurCnpjResponsavel = async () => {
    if (responsavelNome.trim()) return;
    setBuscandoCnpjResponsavel(true);
    const razaoSocial = await buscarRazaoSocialPorCnpj(responsavelCnpj);
    if (razaoSocial) setResponsavelNome(razaoSocial);
    setBuscandoCnpjResponsavel(false);
  };

  const handleBlurCnpjRepresentada = async (idx: number) => {
    if (representadas[idx].nome.trim()) return;
    setBuscandoCnpjRepresentada(idx);
    const razaoSocial = await buscarRazaoSocialPorCnpj(representadas[idx].cnpj);
    if (razaoSocial) updateRepresentada(idx, 'nome', razaoSocial);
    setBuscandoCnpjRepresentada(null);
  };

  const nomeResponsavelFinal = modoResponsavel === 'novo'
    ? responsavelNome
    : responsaveisExistentes.find((r) => r.id === responsavelExistenteId)?.nome ?? '';

  const podeAvancarPasso1 = modoResponsavel === 'novo'
    ? responsavelNome.trim().length > 0
    : responsavelExistenteId.length > 0;
  const podeAvancarPasso2 = representadas.every((r) => r.nome.trim().length > 0);
  const podeSalvar = valorMensal > 0 && diaVencimento >= 1 && diaVencimento <= 31 &&
    (!provisionarSatelite || (sateliteId && organizationName && adminNome && adminEmail));

  const handleSalvar = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // 1. Responsável
      let responsavelId = responsavelExistenteId;
      if (modoResponsavel === 'novo') {
        const { data, error } = await supabase.rpc('criar_responsavel_centelha', {
          p_nome: responsavelNome,
          p_cnpj: onlyDigits(responsavelCnpj) || null,
        });
        if (error || !data) throw new Error(error?.message ?? 'Falha ao criar responsável');
        responsavelId = data;
      }

      // 2. Representada(s)
      const representadasCriadas: { id: string; nome: string }[] = [];
      for (const rep of representadas) {
        const criada = await empresasRepresentadasService.save({
          nome: rep.nome,
          cnpj: onlyDigits(rep.cnpj) || null,
          ativo: true,
          responsavel_id: responsavelId,
        });
        representadasCriadas.push({ id: criada.id!, nome: criada.nome });
      }

      // 3. Cliente de cobrança (sob o tenant da própria NOVUS)
      const cliente = await clienteService.createCliente(
        { nome: nomeResponsavelFinal, tipo: 'J', cpfCnpj: onlyDigits(responsavelCnpj) || undefined },
        NOVUS_TENANT_EMPRESA_ID
      );

      // 4. Contrato (gera a 1ª parcela automaticamente via trigger já existente,
      // gerar_titulo_inicial_contrato — não alterado, serve todo o resto do ERP também)
      const numeroContrato = `NOVUS AI-${nomeResponsavelFinal.replace(/[^A-Za-z0-9]+/g, '-').toUpperCase().slice(0, 30)}-${new Date().getFullYear()}`;
      const contrato = await contratosService.save({
        titulo: `Contrato — ${nomeResponsavelFinal}`,
        numero_contrato: numeroContrato,
        status: 'ATIVO',
        empresa_representada_id: NOVUS_TENANT_EMPRESA_ID,
        cliente_id: cliente.id,
        valor_mensal: valorMensal,
        dia_vencimento: diaVencimento,
        renovacao_automatica: renovacaoAutomatica,
        gera_financeiro: true,
        data_inicio: new Date().toISOString().slice(0, 10),
      });

      // Garante recorrência mínima de 12 parcelas na criação (em vez de depender só do cron
      // diário de materialização) — só pros contratos deste wizard, não mexe no trigger nem
      // no cron compartilhados por todo o ERP.
      const hoje = new Date();
      const vencimentos = Array.from({ length: 12 }, (_, i) => ({
        numero: i + 1,
        data: new Date(hoje.getFullYear(), hoje.getMonth() + i, diaVencimento),
      }));

      // A 1ª parcela (M1) já saiu do trigger gerar_titulo_inicial_contrato acima; completa
      // M2 a M12 do lado da NOVUS (contas a receber).
      const parcelasFuturas = vencimentos.slice(1).map(({ numero, data }) => ({
        empresa_representada_id: NOVUS_TENANT_EMPRESA_ID,
        cliente_id: cliente.id,
        descricao: contrato.titulo,
        numero_documento: `${numeroContrato}-M${numero}`,
        valor_original: valorMensal,
        data_emissao: hoje.toISOString().slice(0, 10),
        data_vencimento: data.toISOString().slice(0, 10),
        status: 'PENDENTE',
        recorrente: true,
        periodicidade: 'MENSAL',
        origem_sistema: `CONTRATO_${contrato.id}`,
      }));
      const { error: parcelasError } = await supabase.from('contas_receber').insert(parcelasFuturas);
      if (parcelasError) {
        throw new Error(`Contrato criado, mas falha ao gerar parcelas futuras: ${parcelasError.message}`);
      }

      // Espelho do lado do cliente: a mesma mensalidade que a NOVUS vai RECEBER é uma conta a
      // PAGAR nas contas da representada principal do cliente (double-entry entre os dois
      // tenants do mesmo ERP — sem isso, quem olhar as contas a pagar da representada nunca
      // veria essa obrigação recorrente). NOVUS AI entra como fornecedor da representada.
      const representadaPrincipal = representadasCriadas[0];
      const { data: fornecedorNovus, error: fornecedorError } = await supabase
        .from('entidades')
        .insert({ empresa_representada_id: representadaPrincipal.id, tipo_pessoa: 'PJ', nome: 'NOVUS AI', ativo: true })
        .select('id')
        .single();
      if (fornecedorError || !fornecedorNovus) {
        throw new Error(`Contrato criado, mas falha ao registrar NOVUS AI como fornecedor: ${fornecedorError?.message}`);
      }
      const { error: papelFornecedorError } = await supabase
        .from('entidade_papeis')
        .insert({ entidade_id: fornecedorNovus.id, empresa_representada_id: representadaPrincipal.id, papel: 'FORNECEDOR' });
      if (papelFornecedorError) {
        throw new Error(`Contrato criado, mas falha ao vincular papel Fornecedor da NOVUS AI: ${papelFornecedorError.message}`);
      }

      const parcelasPagar = vencimentos.map(({ numero, data }) => ({
        empresa_representada_id: representadaPrincipal.id,
        fornecedor_id: fornecedorNovus.id,
        descricao: `NOVUS AI — Mensalidade (${numeroContrato})`,
        numero_documento: `${numeroContrato}-M${numero}`,
        numero_parcela: numero,
        total_parcelas: 12,
        valor_original: valorMensal,
        data_emissao: hoje.toISOString().slice(0, 10),
        data_vencimento: data.toISOString().slice(0, 10),
        status: 'PENDENTE',
        recorrente: true,
        periodicidade: 'MENSAL',
      }));
      const { error: pagarError } = await supabase.from('contas_pagar').insert(parcelasPagar);
      if (pagarError) {
        throw new Error(`Contrato criado, mas falha ao espelhar contas a pagar do cliente: ${pagarError.message}`);
      }

      // 5. Satélite (opcional)
      if (provisionarSatelite) {
        const satelite = satelites.find((s) => s.id === sateliteId);
        const alvo = representadasCriadas[representadaParaSatelite];
        const { error: provError } = await supabase.functions.invoke('centelha-provisiona-cliente', {
          body: {
            representada_id: alvo.id,
            contrato_id: contrato.id,
            satelite_codigo: satelite?.codigo,
            organization_name: organizationName,
            admin_nome: adminNome,
            admin_email: adminEmail,
          },
        });
        if (provError) {
          throw new Error(`Empresa criada, mas provisionamento do satélite falhou: ${provError.message}`);
        }
      }

      toast({ title: 'Cliente criado', description: `${nomeResponsavelFinal} cadastrado com sucesso.` });
      setEmpresaAtivaId(representadasCriadas[0].id);
      queryClient.invalidateQueries({ queryKey: ['empresa-representada-atual'] });
      navigate('/', { replace: true });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro inesperado ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 bg-cover bg-center relative"
      style={{ backgroundImage: `url('${loginHero.url}')` }}
    >
      <div className="absolute inset-0 bg-background/70" />
      <div className="max-w-lg w-full space-y-4 relative">
        <Progress value={(step / 5) * 100} />
        <Card>
          <CardHeader className="items-center text-center space-y-3">
            <div className="flex items-center justify-center gap-3">
              <span className="text-xl font-semibold text-primary">ERP</span>
              <img src="/novus-logo.png" alt="NOVUS.AI" className="h-8 w-auto" />
            </div>
            <CardTitle>Nova empresa — passo {step} de 5</CardTitle>
            <CardDescription>
              {step === 1 && 'Empresa responsável — o cliente que contrata a NOVUS.'}
              {step === 2 && 'Empresa(s) representada(s) — os CNPJs operacionais.'}
              {step === 3 && 'Contrato de uso.'}
              {step === 4 && 'Satélite (opcional).'}
              {step === 5 && 'Revisão — confirme antes de salvar.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={modoResponsavel === 'novo' ? 'default' : 'outline'}
                    onClick={() => setModoResponsavel('novo')}
                    className="flex-1"
                  >
                    Novo responsável
                  </Button>
                  <Button
                    type="button"
                    variant={modoResponsavel === 'existente' ? 'default' : 'outline'}
                    onClick={() => setModoResponsavel('existente')}
                    className="flex-1"
                    disabled={responsaveisExistentes.length === 0}
                  >
                    Responsável existente
                  </Button>
                </div>
                {modoResponsavel === 'novo' ? (
                  <>
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input value={responsavelNome} onChange={(e) => setResponsavelNome(e.target.value)} placeholder="Razão social do cliente" />
                    </div>
                    <div className="space-y-2">
                      <Label>CNPJ</Label>
                      <Input
                        value={responsavelCnpj}
                        onChange={(e) => setResponsavelCnpj(e.target.value)}
                        onBlur={handleBlurCnpjResponsavel}
                        placeholder="00.000.000/0000-00"
                      />
                      {buscandoCnpjResponsavel && <p className="text-xs text-muted-foreground">Buscando dados do CNPJ...</p>}
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label>Responsável</Label>
                    <Select value={responsavelExistenteId} onValueChange={setResponsavelExistenteId}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {responsaveisExistentes.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Adiciona uma nova filial/CNPJ a um responsável já cadastrado.</p>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {modoResponsavel === 'novo' && responsavelNome && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      updateRepresentada(0, 'nome', responsavelNome);
                      updateRepresentada(0, 'cnpj', responsavelCnpj);
                    }}
                  >
                    Usar mesmo CNPJ do responsável
                  </Button>
                )}
                {representadas.map((rep, idx) => (
                  <div key={idx} className="flex gap-2 items-start border rounded-md p-3">
                    <div className="flex-1 space-y-2">
                      <Input
                        value={rep.nome}
                        onChange={(e) => updateRepresentada(idx, 'nome', e.target.value)}
                        placeholder={`Nome da ${idx === 0 ? 'representada' : 'filial'}`}
                      />
                      <Input
                        value={rep.cnpj}
                        onChange={(e) => updateRepresentada(idx, 'cnpj', e.target.value)}
                        onBlur={() => handleBlurCnpjRepresentada(idx)}
                        placeholder="CNPJ"
                      />
                      {buscandoCnpjRepresentada === idx && <p className="text-xs text-muted-foreground">Buscando dados do CNPJ...</p>}
                    </div>
                    {representadas.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeRepresentada(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" className="w-full" onClick={addRepresentada}>
                  <Plus className="h-4 w-4 mr-2" /> Adicionar filial
                </Button>
                <p className="text-xs text-muted-foreground">
                  Dados fiscais completos (regime tributário, sócios, certificado) ficam disponíveis depois em Configurações &gt; Empresas.
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Valor mensal</Label>
                  <CurrencyInput value={valorMensal} onValueChange={setValorMensal} />
                </div>
                <div className="space-y-2">
                  <Label>Dia de vencimento</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={diaVencimento}
                    onChange={(e) => setDiaVencimento(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Renovação automática</Label>
                  <Switch checked={renovacaoAutomatica} onCheckedChange={setRenovacaoAutomatica} />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox checked={provisionarSatelite} onCheckedChange={(v) => setProvisionarSatelite(Boolean(v))} />
                  <Label>Provisionar satélite agora</Label>
                </div>
                {provisionarSatelite && (
                  <>
                    <div className="space-y-2">
                      <Label>Satélite</Label>
                      <Select value={sateliteId} onValueChange={setSateliteId}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {satelites.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {satelites.length === 0 && (
                        <p className="text-xs text-muted-foreground">Nenhum satélite cadastrado ainda.</p>
                      )}
                    </div>
                    {representadas.length > 1 && (
                      <div className="space-y-2">
                        <Label>Qual representada recebe o satélite?</Label>
                        <Select value={String(representadaParaSatelite)} onValueChange={(v) => setRepresentadaParaSatelite(Number(v))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {representadas.map((r, idx) => (
                              <SelectItem key={idx} value={String(idx)}>{r.nome || `Representada ${idx + 1}`}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Nome da organização no satélite</Label>
                      <Input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Nome do admin</Label>
                      <Input value={adminNome} onChange={(e) => setAdminNome(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail do admin</Label>
                      <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-2 text-sm">
                <p><strong>Responsável:</strong> {nomeResponsavelFinal || '—'}</p>
                <p><strong>Representada(s):</strong> {representadas.map((r) => r.nome).join(', ') || '—'}</p>
                <p><strong>Contrato:</strong> {valorMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / dia {diaVencimento}</p>
                <p><strong>Satélite:</strong> {provisionarSatelite ? (satelites.find((s) => s.id === sateliteId)?.nome ?? '—') : 'Não provisionar agora'}</p>
                {saveError && <p className="text-destructive">{saveError}</p>}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="ghost" onClick={() => (step === 1 ? navigate('/selecionar-empresa') : setStep(step - 1))} disabled={saving}>
              {step === 1 ? 'Cancelar' : 'Voltar'}
            </Button>
            {step < 5 ? (
              <Button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={(step === 1 && !podeAvancarPasso1) || (step === 2 && !podeAvancarPasso2)}
              >
                Avançar
              </Button>
            ) : (
              <Button type="button" onClick={handleSalvar} disabled={saving || !podeSalvar}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
