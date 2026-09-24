/**
 * Minimal, dependency-free CSV parsing shared by the API importers and the
 * web data-sources preview — the same code must run on both sides, or a
 * preview eventually promises an import the server then refuses.
 */
export interface ParsedCsv {
  /** Header names exactly as spelled in the file (trimmed), in file order. */
  columns: string[];
  /** One object per data row, keyed by the trimmed header names. */
  rows: Record<string, string>[];
  /**
   * Every data row (header excluded) as the trimmed cells the file actually
   * contained, before padding/truncation to the header's width. Lets a
   * positional validator see the true cell count, like the server does.
   */
  rawRows: string[][];
}

/** Splits the raw text into records of raw (untrimmed) cells, honouring quotes. */
function splitRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let inQuotes = false;
  // True while only whitespace has been seen in the current field, so a quote
  // that follows leading spaces still opens a quoted field.
  let atFieldStart = true;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && atFieldStart) {
      inQuotes = true;
      atFieldStart = false;
      field = '';
      continue;
    }

    if (char === ',') {
      record.push(field);
      field = '';
      atFieldStart = true;
      continue;
    }

    if (char === '\r') {
      // Swallow the CR of a CRLF pair; a CR inside a quoted field is kept above.
      continue;
    }

    if (char === '\n') {
      record.push(field);
      records.push(record);
      record = [];
      field = '';
      atFieldStart = true;
      continue;
    }

    if (atFieldStart && (char === ' ' || char === '\t')) {
      field += char;
      continue;
    }

    atFieldStart = false;
    field += char;
  }

  record.push(field);
  records.push(record);

  return records;
}

function isBlankRecord(record: string[]): boolean {
  return record.every((cell) => cell.trim() === '');
}

export function parseCsv(text: string): ParsedCsv {
  if (text.trim() === '') {
    return { columns: [], rows: [], rawRows: [] };
  }

  const records = splitRecords(text).filter(
    (record) => !(record.length === 1 && isBlankRecord(record)),
  );

  const [headerRecord, ...dataRecords] = records;
  const columns = (headerRecord ?? []).map((header) => header.trim());

  const rows = dataRecords.map((record) => {
    const row: Record<string, string> = {};
    columns.forEach((column, index) => {
      row[column] = (record[index] ?? '').trim();
    });
    return row;
  });

  const rawRows = dataRecords.map((record) => record.map((cell) => cell.trim()));

  return { columns, rows, rawRows };
}

/**
 * Resolves a wanted column name against the file's own header spelling,
 * case-insensitively. Returns the original spelling (the key rows are
 * indexed by), or `undefined` when the file has no such column.
 */
export function findColumn(columns: string[], name: string): string | undefined {
  const wanted = name.trim().toLowerCase();
  return columns.find((column) => column.trim().toLowerCase() === wanted);
}
