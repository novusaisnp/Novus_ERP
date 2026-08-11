// Provedor Focus NFe (https://doc.focusnfe.com.br/reference/nfe).

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
  NFCeEmitPayload,
  MDFeEmitPayload,
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
      case 'encerrado':
        return 'encerrada';
      case 'denegado':
        return 'denegada';
      case 'erro_autorizacao':
      case 'rejeitado':
        return 'rejeitada';
      default:
        return 'processando';
    }
  }

  private async request(path: string, init: RequestInit): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/json',
        ...init.headers,
      },
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
        `Focus NFe ${init.method ?? 'GET'} ${path} falhou [${response.status}]`,
        response.status,
        parsed,
      );
    }
    return parsed as Record<string, unknown>;
  }

  private statusResult(data: Record<string, unknown>): NFeStatusResult {
    const absoluteUrl = (value: unknown) => typeof value === 'string'
      ? (value.startsWith('http') ? value : `${this.baseUrl}${value}`)
      : undefined;
    return {
      status: this.mapStatus(data.status as string | undefined),
      codigoStatusSefaz: (data.status_sefaz ?? data.codigo_status_sefaz) as string | undefined,
      motivo: (data.mensagem_sefaz ?? data.mensagem) as string | undefined,
      chaveAcesso: (data.chave_nfe ?? data.chave_nfce ?? data.chave_mdfe) as string | undefined,
      protocoloAutorizacao: (data.protocolo ?? data.protocolo_autorizacao) as string | undefined,
      xmlUrl: absoluteUrl(data.caminho_xml_nota_fiscal ?? data.caminho_xml_nfce ?? data.caminho_xml_mdfe),
      danfeUrl: absoluteUrl(data.caminho_danfe ?? data.caminho_danfce ?? data.caminho_damdfe),
      raw: data,
    };
  }

  private buildFocusPayload(p: NFeEmitPayload): Record<string, unknown> {
    const tax = (base: number, aliquota: number) => Math.round(base * aliquota) / 100;
    return {
      natureza_operacao: p.naturezaOperacao,
      data_emissao: p.dataEmissao,
      serie: p.serie,
      numero: p.numero,
      tipo_documento: 1,
      finalidade_emissao: p.finalidade === 'normal' ? 1 : p.finalidade === 'complementar' ? 2 : p.finalidade === 'ajuste' ? 3 : 4,
      presenca_comprador: p.presencaComprador ?? 1,
      cnpj_emitente: p.emitente.cnpj,
      inscricao_estadual_emitente: p.emitente.inscricaoEstadual,
      regime_tributario_emitente: p.emitente.regimeTributario,
      local_destino: p.localDestino,
      consumidor_final: p.consumidorFinal,
      indicador_inscricao_estadual_destinatario: p.indicadorIeDestinatario,
      modalidade_frete: p.modalidadeFrete,
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
        icms_origem: it.origem,
        icms_situacao_tributaria: it.icmsSituacaoTributaria,
        icms_modalidade_base_calculo: 3,
        icms_base_calculo: it.valorTotal,
        icms_aliquota: it.aliquotaIcms,
        icms_valor: tax(it.valorTotal, it.aliquotaIcms),
        pis_situacao_tributaria: it.pisSituacaoTributaria,
        pis_base_calculo: it.valorTotal,
        pis_aliquota_porcentual: it.aliquotaPis,
        pis_valor: tax(it.valorTotal, it.aliquotaPis),
        cofins_situacao_tributaria: it.cofinsSituacaoTributaria,
        cofins_base_calculo: it.valorTotal,
        cofins_aliquota_porcentual: it.aliquotaCofins,
        cofins_valor: tax(it.valorTotal, it.aliquotaCofins),
        ibs_cbs_situacao_tributaria: it.ibsCbsSituacaoTributaria,
        ibs_cbs_classificacao_tributaria: it.ibsCbsClassificacaoTributaria,
        ibs_cbs_base_calculo: it.valorTotal,
        ibs_uf_aliquota: it.aliquotaIbsUf,
        ibs_uf_valor: tax(it.valorTotal, it.aliquotaIbsUf),
        ibs_mun_aliquota: it.aliquotaIbsMunicipio,
        ibs_mun_valor: tax(it.valorTotal, it.aliquotaIbsMunicipio),
        ibs_valor_total: tax(it.valorTotal, it.aliquotaIbsUf + it.aliquotaIbsMunicipio),
        cbs_aliquota: it.aliquotaCbs,
        cbs_valor: tax(it.valorTotal, it.aliquotaCbs),
      })),
    };
  }

  async emitNFe(payload: NFeEmitPayload): Promise<NFeEmitResult> {
    const data = await this.request(`/v2/nfe?ref=${encodeURIComponent(payload.idempotencyKey)}`, {
      method: 'POST',
      body: JSON.stringify(this.buildFocusPayload(payload)),
    });
    return this.emitResult(data, payload.idempotencyKey);
  }

  async consultNFeStatus(providerRef: string): Promise<NFeStatusResult> {
    const data = await this.request(`/v2/nfe/${encodeURIComponent(providerRef)}?completa=1`, { method: 'GET' });
    return this.statusResult(data);
  }

  private emitResult(data: Record<string, unknown>, providerRef: string): NFeEmitResult {
    const status = this.statusResult(data);
    return {
      status: status.status,
      providerRef,
      chaveAcesso: status.chaveAcesso,
      protocoloAutorizacao: status.protocoloAutorizacao,
      codigoStatusSefaz: status.codigoStatusSefaz,
      motivoRejeicao: status.motivo ?? (data.erros ? JSON.stringify(data.erros) : undefined),
      xmlUrl: status.xmlUrl,
      danfeUrl: status.danfeUrl,
      raw: data,
    };
  }

  async emitNFCe(payload: NFCeEmitPayload): Promise<NFeEmitResult> {
    const query = new URLSearchParams({ ref: payload.idempotencyKey, completa: '1' });
    if (payload.contingenciaOffline) query.set('forma_emissao', 'offline');
    const data = await this.request(`/v2/nfce?${query}`, {
      method: 'POST',
      body: JSON.stringify({
        ...this.buildFocusPayload(payload),
        natureza_operacao: payload.naturezaOperacao || 'VENDA AO CONSUMIDOR',
        formas_pagamento: payload.pagamentos.map(pagamento => ({
          forma_pagamento: pagamento.formaPagamento,
          valor_pagamento: pagamento.valorPagamento,
          bandeira_operadora: pagamento.bandeiraOperadora,
          numero_autorizacao: pagamento.numeroAutorizacao,
        })),
        codigo_unico: payload.contingenciaOffline?.codigoUnico,
      }),
    });
    return this.emitResult(data, payload.idempotencyKey);
  }

  async consultNFCeStatus(providerRef: string): Promise<NFeStatusResult> {
    return this.statusResult(await this.request(`/v2/nfce/${encodeURIComponent(providerRef)}?completa=1`, { method: 'GET' }));
  }

  async cancelNFCe(payload: NFeCancelPayload): Promise<NFeStatusResult> {
    const data = await this.request(`/v2/nfce/${encodeURIComponent(payload.providerRef)}`, {
      method: 'DELETE', body: JSON.stringify({ justificativa: payload.justificativa }),
    });
    return { ...this.statusResult(data), status: 'cancelada' };
  }

  async emitMDFe(payload: MDFeEmitPayload): Promise<NFeEmitResult> {
    const data = await this.request(`/v2/mdfe?ref=${encodeURIComponent(payload.idempotencyKey)}`, {
      method: 'POST', body: JSON.stringify(payload.body),
    });
    return this.emitResult(data, payload.idempotencyKey);
  }

  async consultMDFeStatus(providerRef: string): Promise<NFeStatusResult> {
    return this.statusResult(await this.request(`/v2/mdfe/${encodeURIComponent(providerRef)}`, { method: 'GET' }));
  }

  async cancelMDFe(payload: NFeCancelPayload): Promise<NFeStatusResult> {
    const data = await this.request(`/v2/mdfe/${encodeURIComponent(payload.providerRef)}`, {
      method: 'DELETE', body: JSON.stringify({ justificativa: payload.justificativa }),
    });
    return { ...this.statusResult(data), status: 'cancelada' };
  }

  async closeMDFe(providerRef: string, data: string, uf: string, municipio: string): Promise<NFeStatusResult> {
    const result = await this.request(`/v2/mdfe/${encodeURIComponent(providerRef)}/encerrar`, {
      method: 'POST', body: JSON.stringify({ data, sigla_uf: uf, nome_municipio: municipio }),
    });
    return { ...this.statusResult(result), status: 'encerrada' };
  }

  async addMDFeDriver(providerRef: string, nome: string, cpf: string): Promise<NFeStatusResult> {
    const result = await this.request(`/v2/mdfe/${encodeURIComponent(providerRef)}/inclusao_condutor`, {
      method: 'POST', body: JSON.stringify({ nome, cpf }),
    });
    return { ...this.statusResult(result), status: 'autorizada' };
  }

  async cancelNFe(payload: NFeCancelPayload): Promise<NFeStatusResult> {
    const data = await this.request(`/v2/nfe/${encodeURIComponent(payload.providerRef)}`, {
      method: 'DELETE',
      body: JSON.stringify({ justificativa: payload.justificativa }),
    });
    return { ...this.statusResult(data), status: 'cancelada' };
  }

  async sendCCe(payload: NFeCCePayload): Promise<NFeStatusResult> {
    const data = await this.request(`/v2/nfe/${encodeURIComponent(payload.providerRef)}/carta_correcao`, {
      method: 'POST',
      body: JSON.stringify({ correcao: payload.correcao }),
    });
    return { ...this.statusResult(data), status: 'autorizada' };
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
