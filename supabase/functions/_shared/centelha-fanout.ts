// Fan-out das portas 0.1 (provisionar acesso admin) e 0.2 (revogar) para todos os
// satélites licenciados de um responsável. Contrato genérico: os alvos saem sempre de
// `centelha.licencas` + `centelha.satelites`, nunca hardcoded — satélite novo (PDV,
// clínica, mercado) é atendido só por existir a licença.

import { hmacSha256Hex } from './outbound-webhook.ts';

export interface LicencaBruta {
  tenant_ref: string | null;
  satelites: {
    codigo: string;
    base_url: string;
    provisioning_secret: string;
    ativo: boolean;
  } | null;
}

export interface AlvoSatelite {
  codigo: string;
  base_url: string;
  provisioning_secret: string;
  tenant_ref: string;
}

export interface ResultadoSatelite {
  codigo: string;
  ok: boolean;
  erro?: string;
}

/**
 * Separa as licenças em alvos acionáveis e resultados já resolvidos como falha.
 * Satélite inativo é ignorado em silêncio (decisão da NOVUS, não erro do cliente);
 * licença sem `tenant_ref` vira falha reportada, porque significa que a organização
 * nunca chegou a ser provisionada naquele satélite.
 */
export function resolverAlvos(licencas: LicencaBruta[]): {
  alvos: AlvoSatelite[];
  falhas: ResultadoSatelite[];
} {
  const alvos: AlvoSatelite[] = [];
  const falhas: ResultadoSatelite[] = [];

  for (const licenca of licencas) {
    const satelite = licenca.satelites;
    if (!satelite || !satelite.ativo) continue;

    if (!licenca.tenant_ref) {
      falhas.push({
        codigo: satelite.codigo,
        ok: false,
        erro: 'Licença sem tenant_ref — organização nunca foi provisionada',
      });
      continue;
    }

    alvos.push({
      codigo: satelite.codigo,
      base_url: satelite.base_url,
      provisioning_secret: satelite.provisioning_secret,
      tenant_ref: licenca.tenant_ref,
    });
  }

  return { alvos, falhas };
}

/**
 * Dispara `endpoint` em cada satélite com o corpo assinado por HMAC. Um satélite fora do
 * ar nunca invalida os outros — o resultado é sempre por satélite.
 */
export async function dispararEmCadaSatelite(
  alvos: AlvoSatelite[],
  endpoint: string,
  montarPayload: (alvo: AlvoSatelite) => Record<string, unknown>,
): Promise<ResultadoSatelite[]> {
  const resultados: ResultadoSatelite[] = [];

  for (const alvo of alvos) {
    const corpo = JSON.stringify(montarPayload(alvo));
    const assinatura = await hmacSha256Hex(corpo, alvo.provisioning_secret);

    try {
      const resposta = await fetch(`${alvo.base_url}/functions/v1/${endpoint}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-webhook-signature': `sha256=${assinatura}`,
        },
        body: corpo,
      });

      if (!resposta.ok) {
        const detalhe = await resposta.text();
        console.error(`Satélite ${alvo.codigo} recusou ${endpoint}:`, resposta.status, detalhe);
        resultados.push({ codigo: alvo.codigo, ok: false, erro: detalhe.slice(0, 300) });
        continue;
      }

      resultados.push({ codigo: alvo.codigo, ok: true });
    } catch (erro) {
      const msg = erro instanceof Error ? erro.message : 'erro desconhecido';
      console.error(`Satélite ${alvo.codigo} inacessível:`, msg);
      resultados.push({ codigo: alvo.codigo, ok: false, erro: msg });
    }
  }

  return resultados;
}
