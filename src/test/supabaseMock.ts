/**
 * Chainable Supabase mock builder — cobre .from().select().order()/.eq().single()/.maybeSingle(),
 * .insert().select().single(), .update().eq().select().single(), .delete().eq(), .rpc().
 * Cada método retorna `this` (thenable via Promise final).
 */
import { vi } from 'vitest';

export type MockResult<T = any> = { data: T | null; error: any };

export function createSupabaseMock(opts: {
  from?: (table: string) => MockResult | Record<string, MockResult>;
  rpc?: (fn: string, args?: any) => MockResult;
} = {}) {
  const calls: Array<{ table?: string; op: string; args?: any }> = [];
  let currentTable = '';
  let opResult: MockResult = { data: null, error: null };

  const resolveResult = () => Promise.resolve(opResult);

  const chain: any = {
    _calls: calls,
    from(table: string) {
      currentTable = table;
      calls.push({ table, op: 'from' });
      const r = opts.from?.(table);
      if (r) {
        if ('data' in r || 'error' in r) opResult = r as MockResult;
        else {
          // per-op map
          (chain as any)._perOp = r;
        }
      }
      return chain;
    },
    select(cols?: string) {
      calls.push({ table: currentTable, op: 'select', args: cols });
      return chain;
    },
    insert(payload: any) {
      calls.push({ table: currentTable, op: 'insert', args: payload });
      if ((chain as any)._perOp?.insert) opResult = (chain as any)._perOp.insert;
      return chain;
    },
    update(payload: any) {
      calls.push({ table: currentTable, op: 'update', args: payload });
      if ((chain as any)._perOp?.update) opResult = (chain as any)._perOp.update;
      return chain;
    },
    delete() {
      calls.push({ table: currentTable, op: 'delete' });
      if ((chain as any)._perOp?.delete) opResult = (chain as any)._perOp.delete;
      return chain;
    },
    eq(col: string, val: any) {
      calls.push({ table: currentTable, op: 'eq', args: { col, val } });
      return chain;
    },
    order(col: string, o?: any) {
      calls.push({ table: currentTable, op: 'order', args: { col, o } });
      return resolveResult();
    },
    single() {
      return resolveResult();
    },
    maybeSingle() {
      return resolveResult();
    },
    then(resolve: any, reject: any) {
      return resolveResult().then(resolve, reject);
    },
    rpc: vi.fn((fn: string, args?: any) => {
      calls.push({ op: 'rpc', args: { fn, args } });
      return Promise.resolve(opts.rpc ? opts.rpc(fn, args) : { data: null, error: null });
    }),
  };

  return chain;
}
