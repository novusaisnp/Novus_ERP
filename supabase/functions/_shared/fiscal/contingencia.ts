// Geração do código único (tag cNF da chave de acesso) exigido pela Focus NFe quando
// a NFC-e é emitida em contingência offline (forma_emissao=offline). Fora desse modo,
// a Focus gera o cNF sozinha — isto só é usado quando emitimos manualmente.

/** 8 dígitos numéricos, nunca todo-zero (cNF inválido por especificação SEFAZ). */
export function gerarCodigoUnico(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  const numero = bytes[0] % 100_000_000;
  const codigo = numero.toString().padStart(8, '0');
  return codigo === '00000000' ? gerarCodigoUnico() : codigo;
}
