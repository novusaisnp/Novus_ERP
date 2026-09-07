import { assertEquals } from 'jsr:@std/assert@1';
import { hasEveryPermission } from './permissions.ts';

Deno.test('requires every granular permission unless caller is novus_owner', async () => {
  const client = {
    rpc: (name: string, params: Record<string, string>) => Promise.resolve({
      data: name === 'has_role'
        ? false
        : params.p_permissao === 'fiscal.read',
      error: null,
    }),
  };

  assertEquals(await hasEveryPermission(client, 'user', ['fiscal.read']), true);
  assertEquals(await hasEveryPermission(client, 'user', ['fiscal.read', 'fiscal.update']), false);
  assertEquals(await hasEveryPermission(client, 'user', []), false);
});
