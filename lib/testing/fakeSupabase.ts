// A stand-in for the Supabase client in unit tests: each from("table") call hands back
// the next prepared answer for that table (in the order the code asks), and any
// query-builder call (select, eq, order, upsert, …) chains on until the query is awaited.
// An answer can be plain data, or { error } to make that query fail.

type Answer = unknown | { error: { code?: string | null; message?: string } };

const isErrorAnswer = (a: unknown): a is { error: { code?: string | null; message?: string } } =>
  typeof a === "object" && a !== null && "error" in a && Object.keys(a).length === 1;

export function fakeSupabase(answers: Record<string, Answer[]>) {
  const queues = Object.fromEntries(Object.entries(answers).map(([table, rows]) => [table, [...rows]]));
  const asked: string[] = []; // tables in the order they were queried
  const client = {
    asked,
    from(table: string) {
      asked.push(table);
      const answer = queues[table]?.shift() ?? null;
      const result = isErrorAnswer(answer) ? { data: null, error: answer.error } : { data: answer, error: null };
      const chain: unknown = new Proxy(
        {},
        {
          get: (_target, prop) =>
            prop === "then" ? (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) : () => chain,
        },
      );
      return chain;
    },
  };
  return client as typeof client & never;
}
