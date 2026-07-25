export function csvCell(value: unknown): string {
  const text =
    value == null
      ? ""
      : value instanceof Date
        ? value.toISOString()
        : Array.isArray(value)
          ? value.join(" | ")
          : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function csvRow(values: readonly unknown[]): string {
  return values.map(csvCell).join(",");
}

