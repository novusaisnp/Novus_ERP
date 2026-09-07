interface RpcClient {
  rpc(name: string, params: Record<string, string>): PromiseLike<{
    data: unknown;
    error: unknown;
  }>;
}

export async function hasEveryPermission(
  client: RpcClient,
  userId: string,
  permissions: string[],
): Promise<boolean> {
  if (permissions.length === 0) return false;
  const { data: isOwner, error: ownerError } = await client.rpc('has_role', {
    _user_id: userId,
    _role: 'novus_owner',
  });
  if (!ownerError && isOwner) return true;

  const results = await Promise.all(permissions.map((permission) => client.rpc('has_permissao', {
    p_user_id: userId,
    p_permissao: permission,
  })));
  return results.every(({ data, error }) => !error && Boolean(data));
}
