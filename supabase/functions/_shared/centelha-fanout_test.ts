import { resolverAlvos, type LicencaBruta } from './centelha-fanout.ts';

const satelite = (codigo: string, ativo = true) => ({
  codigo,
  base_url: `https://${codigo}.example`,
  provisioning_secret: 'secret',
  ativo,
});

Deno.test('satélite inativo é ignorado, sem virar falha reportada', () => {
  const licencas: LicencaBruta[] = [{ tenant_ref: crypto.randomUUID(), satelites: satelite('pdv', false) }];
  const { alvos, falhas } = resolverAlvos(licencas);
  if (alvos.length !== 0 || falhas.length !== 0) {
    throw new Error(`esperado nenhum alvo e nenhuma falha, veio ${alvos.length}/${falhas.length}`);
  }
});

Deno.test('licença sem tenant_ref vira falha reportada, não alvo silencioso', () => {
  const licencas: LicencaBruta[] = [{ tenant_ref: null, satelites: satelite('educacional') }];
  const { alvos, falhas } = resolverAlvos(licencas);
  if (alvos.length !== 0 || falhas.length !== 1 || falhas[0].codigo !== 'educacional' || falhas[0].ok) {
    throw new Error('licença sem tenant_ref deveria ser reportada como falha do educacional');
  }
});

Deno.test('um satélite quebrado não derruba os saudáveis', () => {
  const tenant = crypto.randomUUID();
  const licencas: LicencaBruta[] = [
    { tenant_ref: null, satelites: satelite('pdv') },
    { tenant_ref: tenant, satelites: satelite('educacional') },
    { tenant_ref: crypto.randomUUID(), satelites: null },
  ];
  const { alvos, falhas } = resolverAlvos(licencas);
  if (alvos.length !== 1 || alvos[0].codigo !== 'educacional' || alvos[0].tenant_ref !== tenant) {
    throw new Error('o satélite saudável deveria continuar sendo alvo');
  }
  if (falhas.length !== 1 || falhas[0].codigo !== 'pdv') {
    throw new Error('só o pdv deveria ser reportado como falha');
  }
});
