// Testes unitários (Deno) da comunicação básica com Focus NFe.
// Executar com: `deno test supabase/functions/_shared/fiscal/providers/__tests__/FocusNFeProvider.test.ts`
//
// Cobertura Fase 1: mapeamento de status, payload gerado, tratamento de erro HTTP.

import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { FocusNFeProvider } from '../FocusNFeProvider.ts';
import { FiscalProviderError, NFeEmitPayload } from '../FiscalProvider.ts';

const samplePayload: NFeEmitPayload = {
  idempotencyKey: 'venda-teste-001',
  naturezaOperacao: 'Venda',
  serie: 1,
  numero: 100,
  dataEmissao: '2026-01-15T10:00:00-03:00',
  finalidade: 'normal',
  presencaComprador: 1,
  destinatario: {
    cnpjCpf: '12345678000199',
    nome: 'CLIENTE TESTE LTDA',
    ie: 'ISENTO',
    endereco: {
      logradouro: 'Rua Teste',
      numero: '100',
      bairro: 'Centro',
      municipio: 'São Paulo',
      uf: 'SP',
      cep: '01001000',
    },
  },
  itens: [
    {
      codigo: 'P001',
      descricao: 'Produto Teste',
      ncm: '22030000',
      cfop: '5102',
      unidade: 'UN',
      quantidade: 1,
      valorUnitario: 10,
      valorTotal: 10,
      cst: '00',
      origem: '0',
      aliquotaIcms: 18,
    },
  ],
  valorTotal: 10,
};

function withMockedFetch<T>(handler: (req: Request) => Response | Promise<Response>, fn: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = ((req: Request | string | URL, init?: RequestInit) => {
    const reqObj = req instanceof Request ? req : new Request(req.toString(), init);
    return Promise.resolve(handler(reqObj));
  }) as typeof fetch;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

Deno.test('FocusNFeProvider: emitNFe sucesso mapeia campos', async () => {
  const provider = new FocusNFeProvider('homologation', 'token-teste');
  const result = await withMockedFetch(
    (req) => {
      const url = new URL(req.url);
      assertEquals(url.pathname, '/v2/nfe');
      assertEquals(url.searchParams.get('ref'), 'venda-teste-001');
      return new Response(
        JSON.stringify({
          status: 'processando_autorizacao',
          ref: 'venda-teste-001',
          caminho_xml_nota_fiscal: '/arquivos/xxx.xml',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    },
    () => provider.emitNFe(samplePayload),
  );
  assertEquals(result.status, 'processando');
  assertEquals(result.providerRef, 'venda-teste-001');
  assertEquals(
    result.xmlUrl,
    'https://homologacao.focusnfe.com.br/arquivos/xxx.xml',
  );
});

Deno.test('FocusNFeProvider: emitNFe rejeitada mapeia status', async () => {
  const provider = new FocusNFeProvider('homologation', 'token-teste');
  const result = await withMockedFetch(
    () =>
      new Response(
        JSON.stringify({ status: 'autorizado', chave_nfe: '35240100000000000000550010000000011000000001', protocolo: '999' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    () => provider.emitNFe(samplePayload),
  );
  assertEquals(result.status, 'autorizada');
  assertEquals(result.chaveAcesso, '35240100000000000000550010000000011000000001');
  assertEquals(result.protocoloAutorizacao, '999');
});

Deno.test('FocusNFeProvider: emitNFe erro HTTP lança FiscalProviderError', async () => {
  const provider = new FocusNFeProvider('homologation', 'token-teste');
  await assertRejects(
    () =>
      withMockedFetch(
        () =>
          new Response(JSON.stringify({ codigo: 'invalido', mensagem: 'CNPJ inválido' }), {
            status: 422,
            headers: { 'Content-Type': 'application/json' },
          }),
        () => provider.emitNFe(samplePayload),
      ),
    FiscalProviderError,
    'Focus NFe emitNFe falhou',
  );
});

Deno.test('FocusNFeProvider: fromEnv exige token', () => {
  const prev = Deno.env.get('FISCAL_PROVIDER_API_KEY_HOM');
  Deno.env.delete('FISCAL_PROVIDER_API_KEY_HOM');
  try {
    let threw = false;
    try {
      FocusNFeProvider.fromEnv('homologation');
    } catch {
      threw = true;
    }
    assertEquals(threw, true);
  } finally {
    if (prev) Deno.env.set('FISCAL_PROVIDER_API_KEY_HOM', prev);
  }
});
