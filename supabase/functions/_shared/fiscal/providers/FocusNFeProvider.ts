// Implementação parcial do provedor Focus NFe (https://focusnfe.com.br/doc/).
// Escopo Fase 1: comunicação básica de emissão em homologação.
// Cancel/CCe/Status ficam com stubs (throw) para serem implementados na Fase 2.

import {
  FiscalAssetDownload,
  FiscalEnvironment,
  FiscalProvider,
  FiscalProviderError,
  NFeCCePayload,
  NFeCancelPayload,
  NFeEmitPayload,
  NFeEmitResult,
  NFeStatus,
  NFeStatusResult,
} from './FiscalProvider.ts';

const BASE_URLS: Record<FiscalEnvironment, string> = {
  homologation: 'https://homologacao.focusnfe.com.br',
  production: 'https://api.focusnfe.com.br',
};

const HOM_TOKEN_ENV = 'FISCAL_PROVIDER_API_KEY_HOM';
const PROD_TOKEN_ENV = 'FISCAL_PROVIDER_API_KEY_PROD';

export class FocusNFeProvider implements FiscalProvider {
  readonly name = 'focusnfe' as const;

  constructor(
    public readonly environment: FiscalEnvironment,
    private readonly token: string,
    private readonly baseUrl: string = BASE_URLS[environment],
  ) {
    if (!token) {
      throw new Error('FocusNFeProvider: token vazio.');
    }
  }

  static fromEnv(environment: FiscalEnvironment): FocusNFeProvider {
    const envName = environment === 'homologation' ? HOM_TOKEN_ENV : PROD_TOKEN_ENV;
    const token = Deno.env.get(envName) ?? '';
    if (!token) {
      throw new Error(`FocusNFeProvider: variável ${envName} não configurada.`);
    }
    return new FocusNFeProvider(environment, token);
  }

  private authHeader(): string {
    // Focus NFe usa Basic auth com token como usuário e senha vazia.
    return `Basic ${btoa(`${this.token}:`)}`;
  }

  private mapStatus(situacao?: string): NFeStatus {
    switch ((situacao ?? '').toLowerCase()) {
      case 'autorizado':
        return 'autorizada';
      case 'processando_autorizacao':
      case 'em_processamento':
        return 'processando';
      case 'cancelado':
        return 'cancelada';
      case 'denegado':
        return 'denegada';
      case 'erro_autorizacao':
      case 'rejeitado':
        return 'rejeitada';
      default:
        return 'processando';
    }
  }

  private buildFocusPayload(p: NFeEmitPayload): Record<string, unknown> {
    return {
      natureza_operacao: p.naturezaOperacao,
      data_emissao: p.dataEmissao,
      serie: p.serie,
      numero: p.numero,
      tipo_documento: 1,
      finalidade_emissao: p.finalidade === 'normal' ? 1 : p.finalidade === 'complementar' ? 2 : p.finalidade === 'ajuste' ? 3 : 4,
      presenca_comprador: p.presencaComprador ?? 1,
      cnpj_destinatario: p.destinatario.cnpjCpf.length === 14 ? p.destinatario.cnpjCpf : undefined,
      cpf_destinatario: p.destinatario.cnpjCpf.length === 11 ? p.destinatario.cnpjCpf : undefined,
      nome_destinatario: p.destinatario.nome,
      inscricao_estadual_destinatario: p.destinatario.ie,
      email_destinatario: p.destinatario.email,
      logradouro_destinatario: p.destinatario.endereco.logradouro,
      numero_destinatario: p.destinatario.endereco.numero,
      bairro_destinatario: p.destinatario.endereco.bairro,
      municipio_destinatario: p.destinatario.endereco.municipio,
      uf_destinatario: p.destinatario.endereco.uf,
      cep_destinatario: p.destinatario.endereco.cep,
      valor_total: p.valorTotal,
      informacoes_adicionais_contribuinte: p.observacoes,
      items: p.itens.map((it, idx) => ({
        numero_item: idx + 1,
        codigo_produto: it.codigo,
        descricao: it.descricao,
        cfop: it.cfop,
        unidade_comercial: it.unidade,
        quantidade_comercial: it.quantidade,
        valor_unitario_comercial: it.valorUnitario,
        valor_unitario_tributavel: it.valorUnitario,
        unidade_tributavel: it.unidade,
        quantidade_tributavel: it.quantidade,
        codigo_ncm: it.ncm,
        icms_origem: it.origem ?? '0',
        icms_situacao_tributaria: it.cst,
        icms_modalidade_base_calculo: 3,
        icms_aliquota: it.aliquotaIcms ?? 0,
      })),
    };
  }

  async emitNFe(payload: NFeEmitPayload): Promise<NFeEmitResult> {
    const url = `${this.baseUrl}/v2/nfe?ref=${encodeURIComponent(payload.idempotencyKey)}`;
    const body = this.buildFocusPayload(payload);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { raw: text };
    }

    if (!response.ok) {
      throw new FiscalProviderError(
        `Focus NFe emitNFe falhou [${response.status}]`,
        response.status,
        parsed,
      );
    }

    const data = parsed as Record<string, unknown>;
    const situacao = data.status as string | undefined;
    const status = this.mapStatus(situacao);

    return {
      status,
      providerRef: payload.idempotencyKey,
      chaveAcesso: (data.chave_nfe as string | undefined) ?? undefined,
      protocoloAutorizacao: (data.protocolo as string | undefined) ?? undefined,
      codigoStatusSefaz: (data.status_sefaz as string | undefined) ?? undefined,
      motivoRejeicao: (data.mensagem_sefaz as string | undefined) ?? (data.erros ? JSON.stringify(data.erros) : undefined),
      xmlUrl: (data.caminho_xml_nota_fiscal as string | undefined)
        ? `${this.baseUrl}${data.caminho_xml_nota_fiscal}`
        : undefined,
      danfeUrl: (data.caminho_danfe as string | undefined)
        ? `${this.baseUrl}${data.caminho_danfe}`
        : undefined,
      raw: parsed,
    };
  }

  async consultNFeStatus(providerRef: string): Promise<NFeStatusResult> {
    const url = `${this.baseUrl}/v2/nfe/${encodeURIComponent(providerRef)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: this.authHeader() },
    });
    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { raw: text };
    }
    if (!response.ok) {
      throw new FiscalProviderError(
        `Focus NFe consultNFeStatus falhou [${response.status}]`,
        response.status,
        parsed,
      );
    }
    const data = parsed as Record<string, unknown>;
    return {
      status: this.mapStatus(data.status as string | undefined),
      codigoStatusSefaz: data.status_sefaz as string | undefined,
      motivo: data.mensagem_sefaz as string | undefined,
      raw: parsed,
    };
  }

  cancelNFe(_payload: NFeCancelPayload): Promise<NFeStatusResult> {
    // Implementação prevista para Fase 2.
    return Promise.reject(new Error('FocusNFeProvider.cancelNFe: não implementado na Fase 1.'));
  }

  sendCCe(_payload: NFeCCePayload): Promise<NFeStatusResult> {
    return Promise.reject(new Error('FocusNFeProvider.sendCCe: não implementado na Fase 1.'));
  }

  private async fetchAsset(refOrUrl: string, fallbackType: string): Promise<FiscalAssetDownload> {
    const url = refOrUrl.startsWith('http') ? refOrUrl : `${this.baseUrl}${refOrUrl}`;
    const resp = await fetch(url, { headers: { Authorization: this.authHeader() } });
    if (!resp.ok) {
      throw new FiscalProviderError(
        `Focus NFe download falhou [${resp.status}] ${url}`,
        resp.status,
        await resp.text(),
      );
    }
    const buf = new Uint8Array(await resp.arrayBuffer());
    return { content: buf, contentType: resp.headers.get('content-type') ?? fallbackType };
  }

  downloadXml(refOrUrl: string): Promise<FiscalAssetDownload> {
    return this.fetchAsset(refOrUrl, 'application/xml');
  }

  downloadDanfe(refOrUrl: string): Promise<FiscalAssetDownload> {
    return this.fetchAsset(refOrUrl, 'application/pdf');
  }
}
