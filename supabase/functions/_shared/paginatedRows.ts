// Keyset pagination keeps processed/excluded rows from hiding later records.
export async function* paginatedRows<T extends { id: string }>(
  fetchPage: (after: string | null, limit: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 500,
): AsyncGenerator<T> {
  let after: string | null = null;
  while (true) {
    const { data, error } = await fetchPage(after, pageSize);
    if (error) throw error;
    const rows = data ?? [];
    for (const row of rows) yield row;
    if (rows.length < pageSize) return;
    const last = rows[rows.length - 1];
    if (!last || last.id === after) throw new Error("Pagination cursor did not advance");
    after = last.id;
  }
}