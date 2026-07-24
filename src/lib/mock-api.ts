export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; hasMore: boolean; total: number } {
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);
  return {
    items: pageItems,
    hasMore: start + pageSize < items.length,
    total: items.length,
  };
}
