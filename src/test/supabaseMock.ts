/**
 * Chainable Supabase mock builder — cobre .from().select().order()/.eq().single()/.maybeSingle(),
 * .insert().select().single(), .update().eq().select().single(), .delete().eq(), .rpc().
 * Cada método retorna `this` (thenable via Promise final).
 */
import { vi } from 'vitest';

export type MockResult<T = unknown> = { data: T | null; error: unknown };

export interface SupabaseMockChain {
  _calls: Array<{ table?: string; op: string; args?: unknown }>;
  _perOp?: Record<string, MockResult>;
  from(table: string): SupabaseMockChain;
  select(cols?: string): SupabaseMockChain;
  insert(payload: unknown): SupabaseMockChain;
  update(payload: unknown): SupabaseMockChain;
  delete(): SupabaseMockChain;
  eq(col: string, val: unknown): SupabaseMockChain;
  is(col: string, val: unknown): SupabaseMockChain;
  order(col: string, o?: { ascending?: boolean }): Promise<MockResult>;
  single(): Promise<MockResult>;
  maybeSingle(): Promise<MockResult>;
  then<TResult1 = MockResult, TResult2 = never>(
    resolve?: ((value: MockResult) => TResult1 | PromiseLike<TResult1>) | null,
    reject?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2>;
  rpc: ReturnType<typeof vi.fn>;
}

export function createSupabaseMock(opts: {
  from?: (table: string) => MockResult | Record<string, MockResult>;
  rpc?: (fn: string, args?: unknown) => MockResult;
} = {}): SupabaseMockChain {
  const calls: Array<{ table?: string; op: string; args?: unknown }> = [];
  let currentTable = '';
  let opResult: MockResult = { data: null, error: null };

  const resolveResult = () => Promise.resolve(opResult);

  const chain: SupabaseMockChain = {
    _calls: calls,
    from(table: string) {
      currentTable = table;
      calls.push({ table, op: 'from' });
      const r = opts.from?.(table);
      if (r) {
        if ('data' in r || 'error' in r) opResult = r as MockResult;
        else {
          // per-op map
          chain._perOp = r;
        }
      }
      return chain;
    },
    select(cols?: string) {
      calls.push({ table: currentTable, op: 'select', args: cols });
      return chain;
    },
    insert(payload: unknown) {
      calls.push({ table: currentTable, op: 'insert', args: payload });
      if (chain._perOp?.insert) opResult = chain._perOp.insert;
      return chain;
    },
    update(payload: unknown) {
      calls.push({ table: currentTable, op: 'update', args: payload });
      if (chain._perOp?.update) opResult = chain._perOp.update;
      return chain;
    },
    delete() {
      calls.push({ table: currentTable, op: 'delete' });
      if (chain._perOp?.delete) opResult = chain._perOp.delete;
      return chain;
    },
    eq(col: string, val: unknown) {
      calls.push({ table: currentTable, op: 'eq', args: { col, val } });
      return chain;
    },
    is(col: string, val: unknown) {
      calls.push({ table: currentTable, op: 'is', args: { col, val } });
      return chain;
    },
    order(col: string, o?: { ascending?: boolean }) {
      calls.push({ table: currentTable, op: 'order', args: { col, o } });
      return resolveResult();
    },
    single() {
      return resolveResult();
    },
    maybeSingle() {
      return resolveResult();
    },
    then(resolve, reject) {
      return resolveResult().then(resolve, reject);
    },
    rpc: vi.fn((fn: string, args?: unknown) => {
      calls.push({ op: 'rpc', args: { fn, args } });
      return Promise.resolve(opts.rpc ? opts.rpc(fn, args) : { data: null, error: null });
    }),
  };

  return chain;
}
