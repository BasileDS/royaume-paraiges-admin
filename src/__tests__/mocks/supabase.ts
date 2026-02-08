import { vi } from "vitest";

type MockResult = { data: unknown; error: null; count?: number };

/**
 * Creates a chainable mock that records all method calls and returns
 * a configurable result when the query resolves.
 */
export function createMockQueryBuilder(result: MockResult = { data: [], error: null }) {
  const calls: { method: string; args: unknown[] }[] = [];

  const builder: Record<string, unknown> = {};
  const chainableMethods = [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "like",
    "ilike",
    "is",
    "in",
    "not",
    "or",
    "and",
    "order",
    "limit",
    "range",
    "single",
    "maybeSingle",
  ];

  for (const method of chainableMethods) {
    builder[method] = vi.fn((...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    });
  }

  // Make the builder thenable so `await query` resolves to the result
  builder.then = (resolve: (value: MockResult) => void) => {
    resolve(result);
  };

  return { builder, calls };
}

/**
 * Creates a mock Supabase client with `.from()` and `.rpc()` methods.
 */
export function createMockSupabaseClient() {
  const queryBuilders: Map<string, ReturnType<typeof createMockQueryBuilder>> = new Map();
  const rpcCalls: { fnName: string; args: unknown }[] = [];

  let rpcResult: MockResult = { data: null, error: null };

  const client = {
    from: vi.fn((table: string) => {
      if (!queryBuilders.has(table)) {
        queryBuilders.set(table, createMockQueryBuilder());
      }
      return queryBuilders.get(table)!.builder;
    }),
    rpc: vi.fn((fnName: string, args: unknown) => {
      rpcCalls.push({ fnName, args });
      return Promise.resolve(rpcResult);
    }),
  };

  return {
    client,
    /** Set the result for a specific table's query builder */
    setTableResult(table: string, result: MockResult) {
      queryBuilders.set(table, createMockQueryBuilder(result));
    },
    /** Set the result for RPC calls */
    setRpcResult(result: MockResult) {
      rpcResult = result;
    },
    /** Get recorded calls for a specific table */
    getTableCalls(table: string) {
      return queryBuilders.get(table)?.calls ?? [];
    },
    /** Get recorded RPC calls */
    getRpcCalls() {
      return rpcCalls;
    },
  };
}
