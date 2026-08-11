import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, Send, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { emitirMDFe, listNFeAutorizadas, type EmitirMDFeInput } from '@/services/fiscal/mdfeService';

const field = 'h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
const digits = (value: FormDataEntryValue | null) => String(value ?? '').replace(/\D/g, '');
const text = (data: FormData, name: string) => String(data.get(name) ?? '').trim();
const optionalNumber = (data: FormData, name: string) => text(data, name) ? Number(text(data, name)) : undefined;

export default function MDFe() {
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [busca, setBusca] = useState('');
  const { data: notas = [], isLoading } = useQuery({ queryKey: ['mdfe-nfes-autorizadas'], queryFn: listNFeAutorizadas });
  const emitir = useMutation({
    mutationFn: emitirMDFe,
    onSuccess: result => {
      toast.success(`MDF-e enviado: ${result.status}.`);
      setSelecionadas([]);
    },
    onError: (error: Error) => toast.error(error.message || 'Falha ao emitir MDF-e.'),
  });
  const filtradas = useMemo(() => notas.filter(nota =>
    `${nota.numero ?? ''} ${nota.chave_acesso}`.includes(busca.replace(/\s/g, '')),
  ), [notas, busca]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selecionadas.length) return toast.error('Selecione ao menos uma NF-e autorizada.');
    const data = new FormData(event.currentTarget);
    const percurso = text(data, 'percursos').toUpperCase().split(',').map(uf => uf.trim()).filter(Boolean);
    const responsavelSeguro = text(data, 'responsavelSeguro') as '1' | '2';
    const input: EmitirMDFeInput = {
      idempotencyKey: crypto.randomUUID(), emitenteTipo: Number(text(data, 'emitenteTipo')) as 1 | 2 | 3,
      transportadorTipo: optionalNumber(data, 'transportadorTipo') as 1 | 2 | 3 | undefined,
      ufInicio: text(data, 'ufInicio').toUpperCase(), ufFim: text(data, 'ufFim').toUpperCase(),
      municipioCarregamento: { codigo: digits(data.get('codigoCarregamento')), nome: text(data, 'nomeCarregamento') },
      municipioDescarregamento: { codigo: digits(data.get('codigoDescarregamento')), nome: text(data, 'nomeDescarregamento') },
      percursos: percurso, dataHoraPrevistoInicioViagem: text(data, 'inicioViagem') ? new Date(text(data, 'inicioViagem')).toISOString() : undefined,
      valorTotalCarga: Number(text(data, 'valorTotalCarga')), pesoBruto: Number(text(data, 'pesoBruto')),
      unidadePeso: text(data, 'unidadePeso') as '01' | '02', tipoCarga: text(data, 'tipoCarga') as EmitirMDFeInput['tipoCarga'],
      descricaoProduto: text(data, 'descricaoProduto'), ncmProduto: digits(data.get('ncmProduto')) || undefined,
      veiculo: {
        codigo: text(data, 'codigoVeiculo') || undefined, placa: text(data, 'placa'), renavam: digits(data.get('renavam')) || undefined,
        tara: Number(text(data, 'tara')), capacidadeKg: optionalNumber(data, 'capacidadeKg'), capacidadeM3: optionalNumber(data, 'capacidadeM3'),
        tipoRodado: text(data, 'tipoRodado') as EmitirMDFeInput['veiculo']['tipoRodado'],
        tipoCarroceria: text(data, 'tipoCarroceria') as EmitirMDFeInput['veiculo']['tipoCarroceria'], ufLicenciamento: text(data, 'ufLicenciamento').toUpperCase(),
      },
      condutores: [{ nome: text(data, 'condutorNome'), cpf: digits(data.get('condutorCpf')) }],
      seguro: {
        responsavelSeguro, cnpjResponsavel: digits(data.get('cnpjResponsavel')) || undefined,
        cpfResponsavel: digits(data.get('cpfResponsavel')) || undefined, nomeSeguradora: text(data, 'nomeSeguradora'),
        cnpjSeguradora: digits(data.get('cnpjSeguradora')), numeroApolice: text(data, 'numeroApolice'), numeroAverbacao: text(data, 'numeroAverbacao'),
      },
      documentoIds: selecionadas,
    };
    emitir.mutate(input);
  };

  return <div className="container mx-auto p-6 space-y-6">
    <div><h1 className="text-3xl font-bold tracking-tight">MDF-e</h1><p className="text-muted-foreground">Manifesto rodoviário de NF-e, veículo, condutor e seguro.</p></div>
    <form onSubmit={onSubmit} className="space-y-6">
      <Card><CardHeader><CardTitle className="flex gap-2"><Truck className="h-5 w-5" /> Viagem e carga</CardTitle><CardDescription>Códigos municipais são IBGE com 7 dígitos.</CardDescription></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <Field label="Tipo emitente"><select name="emitenteTipo" className={field} defaultValue="2"><option value="1">Transportador</option><option value="2">Carga própria</option><option value="3">CT-e globalizado</option></select></Field>
          <Field label="Tipo transportador"><select name="transportadorTipo" className={field} defaultValue=""><option value="">Não informar</option><option value="1">ETC</option><option value="2">TAC</option><option value="3">CTC</option></select></Field>
          <Field label="UF início"><Input name="ufInicio" required maxLength={2} /></Field><Field label="UF fim"><Input name="ufFim" required maxLength={2} /></Field>
          <Field label="Município carregamento"><Input name="nomeCarregamento" required /></Field><Field label="Código IBGE"><Input name="codigoCarregamento" required inputMode="numeric" pattern="\d{7}" /></Field>
          <Field label="Município descarga"><Input name="nomeDescarregamento" required /></Field><Field label="Código IBGE"><Input name="codigoDescarregamento" required inputMode="numeric" pattern="\d{7}" /></Field>
          <Field label="UFs de percurso"><Input name="percursos" placeholder="MS, GO" /></Field><Field label="Início previsto"><Input name="inicioViagem" type="datetime-local" /></Field>
          <Field label="Valor da carga"><Input name="valorTotalCarga" type="number" min="0.01" step="0.01" required /></Field><Field label="Peso bruto"><Input name="pesoBruto" type="number" min="0.0001" step="0.0001" required /></Field>
          <Field label="Unidade"><select name="unidadePeso" className={field}><option value="01">KG</option><option value="02">TON</option></select></Field>
          <Field label="Tipo de carga"><select name="tipoCarga" className={field} defaultValue="05"><option value="05">Carga geral</option><option value="01">Granel sólido</option><option value="02">Granel líquido</option><option value="03">Frigorificada</option><option value="04">Conteinerizada</option><option value="06">Neogranel</option><option value="07">Perigosa: granel sólido</option><option value="08">Perigosa: granel líquido</option><option value="09">Perigosa: frigorificada</option><option value="10">Perigosa: conteinerizada</option><option value="11">Perigosa: carga geral</option><option value="12">Granel pressurizada</option></select></Field>
          <Field label="Produto predominante"><Input name="descricaoProduto" required maxLength={120} /></Field><Field label="NCM predominante"><Input name="ncmProduto" inputMode="numeric" pattern="\d{8}" /></Field>
        </CardContent></Card>
      <Card><CardHeader><CardTitle>Veículo e condutor</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-4">
        <Field label="Placa"><Input name="placa" required maxLength={8} /></Field><Field label="RENAVAM"><Input name="renavam" inputMode="numeric" pattern="\d{9,11}" /></Field><Field label="Código interno"><Input name="codigoVeiculo" maxLength={10} /></Field><Field label="UF licenciamento"><Input name="ufLicenciamento" required maxLength={2} /></Field>
        <Field label="Tara (kg)"><Input name="tara" type="number" min="1" required /></Field><Field label="Capacidade (kg)"><Input name="capacidadeKg" type="number" min="1" /></Field><Field label="Capacidade (m³)"><Input name="capacidadeM3" type="number" min="1" /></Field>
        <Field label="Rodado"><select name="tipoRodado" className={field}><option value="01">Truck</option><option value="02">Toco</option><option value="03">Cavalo mecânico</option><option value="04">VAN</option><option value="05">Utilitário</option><option value="06">Outros</option></select></Field>
        <Field label="Carroceria"><select name="tipoCarroceria" className={field}><option value="00">Não aplicável</option><option value="01">Aberta</option><option value="02">Fechada/Baú</option><option value="03">Granelera</option><option value="04">Porta-contêiner</option><option value="05">Sider</option></select></Field>
        <Field label="Condutor"><Input name="condutorNome" required /></Field><Field label="CPF do condutor"><Input name="condutorCpf" required inputMode="numeric" /></Field>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Seguro obrigatório</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-4">
        <Field label="Responsável"><select name="responsavelSeguro" className={field}><option value="1">Emitente</option><option value="2">Contratante</option></select></Field>
        <Field label="CNPJ contratante"><Input name="cnpjResponsavel" inputMode="numeric" /></Field><Field label="CPF contratante"><Input name="cpfResponsavel" inputMode="numeric" /></Field>
        <Field label="Seguradora"><Input name="nomeSeguradora" required maxLength={30} /></Field><Field label="CNPJ seguradora"><Input name="cnpjSeguradora" required inputMode="numeric" /></Field>
        <Field label="Apólice"><Input name="numeroApolice" required maxLength={20} /></Field><Field label="Averbação"><Input name="numeroAverbacao" required maxLength={40} /></Field>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>NF-e transportadas</CardTitle><CardDescription>Somente NF-e autorizadas com chave válida. Últimas 200.</CardDescription></CardHeader><CardContent className="space-y-3">
        <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar número ou chave" />
        <div className="max-h-64 overflow-auto rounded-md border divide-y">
          {isLoading ? <p className="p-4 text-sm text-muted-foreground">Carregando…</p> : filtradas.map(nota => <label key={nota.id} className="flex items-center gap-3 p-3 text-sm cursor-pointer">
            <input type="checkbox" checked={selecionadas.includes(nota.id)} onChange={e => setSelecionadas(ids => e.target.checked ? [...ids, nota.id] : ids.filter(id => id !== nota.id))} />
            <span>NF-e {nota.numero ?? '—'}/{nota.serie ?? '—'} — {nota.chave_acesso} — {(nota.valor_total ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </label>)}
          {!isLoading && !filtradas.length && <p className="p-4 text-sm text-muted-foreground">Nenhuma NF-e autorizada disponível.</p>}
        </div>
      </CardContent></Card>
      <div className="flex justify-end"><Button type="submit" disabled={emitir.isPending}>{emitir.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Emitir MDF-e</Button></div>
    </form>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
