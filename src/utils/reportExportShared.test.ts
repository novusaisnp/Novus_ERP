import { describe, it, expect } from 'vitest';
import type { ReportExportPayload } from '@/utils/reportExportShared';
import { brlPt, percentPt, timestampSuffix } from '@/utils/reportExportShared';

describe('reportExportShared helpers', () => {
  it('brlPt formata moeda em pt-BR', () => {
    const out = brlPt(1234.5);
    expect(out).toContain('1.234,50');
    expect(out).toContain('R$');
  });

  it('brlPt trata zero e negativo', () => {
    expect(brlPt(0)).toContain('0,00');
    expect(brlPt(-10)).toContain('10,00');
  });

  it('percentPt formata percentual com duas casas', () => {
    expect(percentPt(12.345)).toBe('12,35%');
    expect(percentPt(0)).toBe('0,00%');
  });

  it('timestampSuffix devolve YYYY-MM-DD', () => {
    expect(timestampSuffix()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('ReportExportPayload aceita estrutura tipada mínima', () => {
    const payload: ReportExportPayload<{ nome: string }> = {
      title: 'Rel',
      filters: [],
      kpis: [],
      insights: [],
      detail: { columns: [{ header: 'Nome', accessor: (r) => r.nome }], rows: [{ nome: 'x' }] },
      filenameBase: 'rel',
    };
    expect(payload.detail.columns[0].accessor(payload.detail.rows[0])).toBe('x');
  });
});
