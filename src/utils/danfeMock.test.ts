import { describe, expect, it } from 'vitest';
import { buildDanfeMockHtml, buildDanfceMockHtml, buildDamdfeMockHtml, type DanfeMockData } from './danfeMock';

const data: DanfeMockData = {
  tipo: 'NFE', numero: 42, serie: 1, ambiente: 'homologation', valor_total: 125,
  emitente: { nome: 'Representada Teste', cnpj: '12345678000190', logo_url: 'https://example.test/logo.png' },
  destinatario: { nome: 'Cliente Teste', cpf: '12345678901' },
  itens: [{ codigo: 'P1', descricao: 'Produto', ncm: '12345678', cfop: '5102', quantidade: 1, preco_unitario: 125, valor_total: 125 }],
};

describe('documentos auxiliares fiscais simulados', () => {
  it('gera leiautes próprios, com marca e sem códigos fiscais falsos', () => {
    const danfe = buildDanfeMockHtml(data);
    const danfce = buildDanfceMockHtml({ ...data, tipo: 'NFCE' });
    const damdfe = buildDamdfeMockHtml({ ...data, tipo: 'MDFE', mdfe: { uf_inicio: 'MT', uf_fim: 'GO' } });

    for (const html of [danfe, danfce, damdfe]) {
      expect(html).toContain('Representada Teste');
      expect(html).toContain('https://example.test/logo.png');
      expect(html).toContain('SEM VALOR FISCAL');
      expect(html).not.toContain('Libre Barcode');
    }
    expect(danfe).toContain('Documento Auxiliar da Nota Fiscal Eletrônica');
    expect(danfce).toContain('DANFCE — DOCUMENTO AUXILIAR DA NFC-e');
    expect(damdfe).toContain('Documento Auxiliar do Manifesto Eletrônico');
    expect(danfe).toContain('12345678');
  });
});
