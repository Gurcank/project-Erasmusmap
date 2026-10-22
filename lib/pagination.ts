/**
 * A page number from a query string. Anything that is not a positive whole
 * number is the first page, and a page past the end is clamped by the caller
 * with `clampPage`, so a stale link or a hand-typed value never errors.
 */
export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d{1,6}$/.test(raw)) return 1;
  return Math.max(1, Number(raw));
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function clampPage(page: number, pages: number): number {
  return Math.min(Math.max(1, page), pages);
}

/** The `skip` for a one-based page. */
export function pageOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}
