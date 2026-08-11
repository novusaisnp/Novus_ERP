import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { emitirMDFeSchema, mdfeToFocusPayload } from '../mdfeToFocusPayload.ts';

Deno.test('mdfeToFocusPayload: valida e agrupa NF-e no município de descarga', () => {
  const input = emitirMDFeSchema.parse({
    idempotencyKey: '00000000-0000-0000-0000-000000000099',
    empresaId: '00000000-0000-0000-0000-000000000001', emitenteTipo: 2,
    ufInicio: 'MT', ufFim: 'GO',
    municipioCarregamento: { codigo: '5103403', nome: 'Cuiabá' },
    municipioDescarregamento: { codigo: '5208707', nome: 'Goiânia' },
    valorTotalCarga: 1000, pesoBruto: 500, unidadePeso: '01', tipoCarga: '05', descricaoProduto: 'Carga geral',
    veiculo: { placa: 'ABC1D23', tara: 3000, tipoRodado: '02', tipoCarroceria: '02', ufLicenciamento: 'MT' },
    condutores: [{ nome: 'João da Silva', cpf: '12345678901' }],
    seguro: { responsavelSeguro: '1', nomeSeguradora: 'Seguradora', cnpjSeguradora: '11222333000181', numeroApolice: 'AP-1', numeroAverbacao: 'AV-1' },
    documentoIds: ['00000000-0000-0000-0000-000000000010'],
  });
  const body = mdfeToFocusPayload(input, {
    cnpj: '11222333000181', inscricaoEstadual: '123456789', serie: 1, rntrc: '12345678',
  }, [{ id: input.documentoIds[0], chave: '51260811222333000181550010000001001234567890' }]);
  assertEquals(body.quantidade_total_nfe, 1);
  assertEquals(body.municipios_descarregamento[0].notas_fiscais[0].chave_nfe.length, 44);
  assertEquals(body.veiculo_tracao.placa_veiculo, 'ABC1D23');
});
