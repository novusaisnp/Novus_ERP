import { describe, expect, it } from 'vitest';
import {
  uiStatusPagarToDb,
  uiStatusReceberToDb,
} from './statusMappers';

describe('statusMappers — operações financeiras', () => {
  it('traduz os status da UI para os valores aceitos pelo banco', () => {
    expect(uiStatusPagarToDb('PAGA')).toBe('PAGO');
    expect(uiStatusReceberToDb('RECEBIDA')).toBe('RECEBIDO');
    expect(uiStatusPagarToDb('ABERTA')).toBe('PENDENTE');
    expect(uiStatusReceberToDb('ABERTA')).toBe('PENDENTE');
    expect(uiStatusPagarToDb('CANCELADA')).toBe('CANCELADO');
    expect(uiStatusReceberToDb('CANCELADA')).toBe('CANCELADO');
  });
});
