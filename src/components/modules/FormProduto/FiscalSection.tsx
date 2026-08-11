import type { Produto, ProdutoDadosFiscais } from '@/types/produto';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  formData: Produto;
  onChange: <K extends keyof Produto>(field: K, value: Produto[K]) => void;
}

const EMPTY: ProdutoDadosFiscais = {
  icms_situacao_tributaria: '', icms_aliquota: 0,
  pis_situacao_tributaria: '', pis_aliquota: 0,
  cofins_situacao_tributaria: '', cofins_aliquota: 0,
  ibs_cbs_situacao_tributaria: '', ibs_cbs_classificacao_tributaria: '',
  ibs_uf_aliquota: 0, ibs_mun_aliquota: 0, cbs_aliquota: 0,
};

export const FiscalSection = ({ formData, onChange }: Props) => {
  const fiscal = formData.dados_fiscais || EMPTY;
  const setFiscal = <K extends keyof ProdutoDadosFiscais>(field: K, value: ProdutoDadosFiscais[K]) =>
    onChange('dados_fiscais', { ...fiscal, [field]: value });
  const numberField = (field: keyof ProdutoDadosFiscais) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setFiscal(field, Number(event.target.value) as never);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tributação da NF-e</CardTitle>
        <p className="text-sm text-muted-foreground">Informe os códigos definidos pela contabilidade. O ERP não presume enquadramento tributário.</p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div><Label>Origem da mercadoria *</Label><Input value={formData.origem_produto || '0'} maxLength={1} pattern="[0-8]" onChange={(e) => onChange('origem_produto', e.target.value)} /></div>
        <div><Label>CST/CSOSN ICMS *</Label><Input value={fiscal.icms_situacao_tributaria} maxLength={4} pattern="[0-9]{2,4}" onChange={(e) => setFiscal('icms_situacao_tributaria', e.target.value)} /></div>
        <div><Label>Alíquota ICMS (%) *</Label><Input type="number" min={0} max={100} step="0.0001" value={fiscal.icms_aliquota} onChange={numberField('icms_aliquota')} /></div>
        <div><Label>CST PIS *</Label><Input value={fiscal.pis_situacao_tributaria} maxLength={2} pattern="[0-9]{2}" onChange={(e) => setFiscal('pis_situacao_tributaria', e.target.value)} /></div>
        <div><Label>Alíquota PIS (%) *</Label><Input type="number" min={0} max={100} step="0.0001" value={fiscal.pis_aliquota} onChange={numberField('pis_aliquota')} /></div>
        <div><Label>CST COFINS *</Label><Input value={fiscal.cofins_situacao_tributaria} maxLength={2} pattern="[0-9]{2}" onChange={(e) => setFiscal('cofins_situacao_tributaria', e.target.value)} /></div>
        <div><Label>Alíquota COFINS (%) *</Label><Input type="number" min={0} max={100} step="0.0001" value={fiscal.cofins_aliquota} onChange={numberField('cofins_aliquota')} /></div>
        <div><Label>CST IBS/CBS *</Label><Input value={fiscal.ibs_cbs_situacao_tributaria} maxLength={3} pattern="[0-9]{3}" onChange={(e) => setFiscal('ibs_cbs_situacao_tributaria', e.target.value)} /></div>
        <div><Label>Classificação IBS/CBS *</Label><Input value={fiscal.ibs_cbs_classificacao_tributaria} maxLength={6} pattern="[0-9]{6}" onChange={(e) => setFiscal('ibs_cbs_classificacao_tributaria', e.target.value)} /></div>
        <div><Label>Alíquota IBS UF (%) *</Label><Input type="number" min={0} max={100} step="0.0001" value={fiscal.ibs_uf_aliquota} onChange={numberField('ibs_uf_aliquota')} /></div>
        <div><Label>Alíquota IBS Município (%) *</Label><Input type="number" min={0} max={100} step="0.0001" value={fiscal.ibs_mun_aliquota} onChange={numberField('ibs_mun_aliquota')} /></div>
        <div><Label>Alíquota CBS (%) *</Label><Input type="number" min={0} max={100} step="0.0001" value={fiscal.cbs_aliquota} onChange={numberField('cbs_aliquota')} /></div>
      </CardContent>
    </Card>
  );
};
