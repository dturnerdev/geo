// The manifest signature must cover exactly the same bytes on every platform,
// so the signed body is serialised deterministically (FE02 behaviour 3).
export function canonicalJson(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return JSON.stringify(value);
    case 'number':
      if (!Number.isFinite(value)) {
        throw new TypeError('canonical JSON cannot contain a non-finite number');
      }
      return JSON.stringify(value === 0 ? 0 : value);
    case 'object':
      if (Array.isArray(value)) {
        return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
      }
      return `{${Object.keys(value as Record<string, unknown>)
        .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
        .sort()
        .map(
          (key) =>
            `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`,
        )
        .join(',')}}`;
    default:
      throw new TypeError(`canonical JSON cannot contain ${typeof value}`);
  }
}
