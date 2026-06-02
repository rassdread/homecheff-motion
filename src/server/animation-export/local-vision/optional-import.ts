/** Dynamic import hidden from bundler static analysis (optional native modules). */

export async function importOptionalModule<T = unknown>(
  specifier: string
): Promise<T | null> {
  try {
    const dynamicImport = new Function(
      "specifier",
      "return import(specifier)"
    ) as (specifier: string) => Promise<T>;
    return await dynamicImport(specifier);
  } catch {
    return null;
  }
}
