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
  emitente: { cnpj: '11222333000181', inscricaoEstadual: '123456789', regimeTributario: 3 },
  localDestino: 1,
  consumidorFinal: 0,
  indicadorIeDestinatario: 1,
  modalidadeFrete: 9,
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
      icmsSituacaoTributaria: '00',
      origem: '0',
      aliquotaIcms: 18,
      pisSituacaoTributaria: '01',
      aliquotaPis: 1.65,
      cofinsSituacaoTributaria: '01',
      aliquotaCofins: 7.6,
      ibsCbsSituacaoTributaria: '000',
      ibsCbsClassificacaoTributaria: '000001',
      aliquotaIbsUf: 0.1,
      aliquotaIbsMunicipio: 0,
      aliquotaCbs: 0.9,
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
    async (req) => {
      const url = new URL(req.url);
      assertEquals(url.pathname, '/v2/nfe');
      assertEquals(url.searchParams.get('ref'), 'venda-teste-001');
      const body = await req.json();
      assertEquals(body.indicador_inscricao_estadual_destinatario, 1);
      assertEquals(body.items[0].pis_situacao_tributaria, '01');
      assertEquals(body.items[0].ibs_cbs_classificacao_tributaria, '000001');
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
    'Focus NFe POST /v2/nfe',
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

Deno.test('FocusNFeProvider: cancelamento chama DELETE real', async () => {
  const provider = new FocusNFeProvider('homologation', 'token-teste');
  const result = await withMockedFetch(
    async (req) => {
      assertEquals(req.method, 'DELETE');
      assertEquals(new URL(req.url).pathname, '/v2/nfe/venda-teste-001');
      assertEquals(await req.json(), { justificativa: 'Emissão feita com dados incorretos' });
      return new Response(JSON.stringify({ status: 'cancelado', protocolo_cancelamento: '135' }), { status: 200 });
    },
    () => provider.cancelNFe({ providerRef: 'venda-teste-001', justificativa: 'Emissão feita com dados incorretos' }),
  );
  assertEquals(result.status, 'cancelada');
});

Deno.test('FocusNFeProvider: CC-e chama endpoint real', async () => {
  const provider = new FocusNFeProvider('homologation', 'token-teste');
  const result = await withMockedFetch(
    async (req) => {
      assertEquals(req.method, 'POST');
      assertEquals(new URL(req.url).pathname, '/v2/nfe/venda-teste-001/carta_correcao');
      assertEquals(await req.json(), { correcao: 'Correção permitida com tamanho válido' });
      return new Response(JSON.stringify({ status: 'autorizado', protocolo: '136' }), { status: 200 });
    },
    () => provider.sendCCe({ providerRef: 'venda-teste-001', correcao: 'Correção permitida com tamanho válido', sequencia: 1 }),
  );
  assertEquals(result.status, 'autorizada');
});

Deno.test('FocusNFeProvider: NFC-e envia pagamento e contingência', async () => {
  const provider = new FocusNFeProvider('homologation', 'token-teste');
  const result = await withMockedFetch(
    async (req) => {
      const url = new URL(req.url);
      assertEquals(url.pathname, '/v2/nfce');
      assertEquals(url.searchParams.get('forma_emissao'), 'offline');
      const body = await req.json();
      assertEquals(body.formas_pagamento, [{ forma_pagamento: '17', valor_pagamento: 10 }]);
      assertEquals(body.codigo_unico, '12345678');
      return new Response(JSON.stringify({
        status: 'autorizado',
        chave_nfce: '51260811222333000181650010000001001234567890',
        caminho_danfce: '/arquivos/nfce.pdf',
      }), { status: 201 });
    },
    () => provider.emitNFCe({
      ...samplePayload,
      pagamentos: [{ formaPagamento: '17', valorPagamento: 10 }],
      contingenciaOffline: { codigoUnico: '12345678' },
    }),
  );
  assertEquals(result.status, 'autorizada');
  assertEquals(result.danfeUrl, 'https://homologacao.focusnfe.com.br/arquivos/nfce.pdf');
});

Deno.test('FocusNFeProvider: MDF-e emite e encerra nos endpoints oficiais', async () => {
  const provider = new FocusNFeProvider('homologation', 'token-teste');
  let chamada = 0;
  await withMockedFetch(
    async (req) => {
      chamada += 1;
      const url = new URL(req.url);
      if (chamada === 1) {
        assertEquals(url.pathname, '/v2/mdfe');
        assertEquals(url.searchParams.get('ref'), 'mdfe-001');
        assertEquals(await req.json(), { tipo_emitente: 2 });
        return new Response(JSON.stringify({ status: 'processando_autorizacao' }), { status: 202 });
      }
      assertEquals(url.pathname, '/v2/mdfe/mdfe-001/encerrar');
      assertEquals(await req.json(), { data: '2026-08-11', sigla_uf: 'MT', nome_municipio: 'Cuiabá' });
      return new Response(JSON.stringify({ status: 'encerrado', caminho_damdfe: '/arquivos/mdfe.pdf' }), { status: 200 });
    },
    async () => {
      assertEquals((await provider.emitMDFe({ idempotencyKey: 'mdfe-001', body: { tipo_emitente: 2 } })).status, 'processando');
      const encerrado = await provider.closeMDFe('mdfe-001', '2026-08-11', 'MT', 'Cuiabá');
      assertEquals(encerrado.status, 'encerrada');
      assertEquals(encerrado.danfeUrl, 'https://homologacao.focusnfe.com.br/arquivos/mdfe.pdf');
    },
  );
});
