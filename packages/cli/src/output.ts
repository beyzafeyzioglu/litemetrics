export type Format = 'json' | 'table' | 'csv';

export function resolveFormat(format?: string): Format {
  if (format === 'json' || format === 'table' || format === 'csv') return format;
  if (process.env.LITEMETRICS_FORMAT === 'json') return 'json';
  return process.stdout.isTTY ? 'table' : 'json';
}

export function outputJSON(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function outputTable(headers: string[], rows: string[][], footer?: string): void {
  if (rows.length === 0) {
    console.log('No data found.');
    return;
  }

  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length))
  );

  const line = (cells: string[]) =>
    cells.map((c, i) => ` ${String(c).padEnd(widths[i])} `).join('|');

  const sep = widths.map(w => '-'.repeat(w + 2)).join('+');

  console.log(line(headers));
  console.log(sep);
  rows.forEach(r => console.log(line(r)));

  if (footer) {
    console.log(sep);
    console.log(footer);
  }
}

export function outputCSV(headers: string[], rows: string[][]): void {
  const escape = (s: string) => {
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  console.log(headers.map(escape).join(','));
  rows.forEach(r => console.log(r.map(escape).join(',')));
}

export interface TableData {
  headers: string[];
  rows: string[][];
  footer?: string;
}

export function output(data: unknown, format: Format, table: TableData): void {
  switch (format) {
    case 'json':
      outputJSON(data);
      break;
    case 'csv':
      outputCSV(table.headers, table.rows);
      break;
    case 'table':
      outputTable(table.headers, table.rows, table.footer);
      break;
  }
}

export function parseFilters(filterArgs?: string[]): Record<string, string> | undefined {
  if (!filterArgs || filterArgs.length === 0) return undefined;
  const filters: Record<string, string> = {};
  for (const f of filterArgs) {
    const idx = f.indexOf('=');
    if (idx > 0) {
      filters[f.slice(0, idx)] = f.slice(idx + 1);
    }
  }
  return Object.keys(filters).length > 0 ? filters : undefined;
}

export function handleError(err: unknown, format: Format): void {
  const message = err instanceof Error ? err.message : String(err);
  if (format === 'json') {
    console.error(JSON.stringify({ error: message }));
  } else {
    console.error(`Error: ${message}`);
  }
  process.exit(1);
}
