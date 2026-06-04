/** Local client-side search for Studio asset libraries. */
export function filterStudioAssetsBySearch<T extends { name: string; description: string }>(
  items: T[],
  query: string,
  extraFields: (item: T) => string = () => ""
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return items;
  }
  return items.filter((item) => {
    const hay = `${item.name} ${item.description} ${extraFields(item)}`.toLowerCase();
    return hay.includes(q);
  });
}
