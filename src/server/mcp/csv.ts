/** RFC 4180 parser: quoted fields, doubled quotes, CRLF/LF, optional UTF-8 BOM. Returns rows of cells. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  function readQuoted(char: string, index: number) {
    if (char !== '"') {
      cell += char;
      return index;
    }
    if (text[index + 1] === '"') {
      cell += '"';
      return index + 1;
    }
    quoted = false;
    return index;
  }

  function readNewline(index: number) {
    if (text[index] === "\r" && text[index + 1] === "\n") index++;
    row.push(cell);
    rows.push(row);
    row = [];
    cell = "";
    return index;
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      i = readQuoted(char, i);
    } else if (char === '"' && cell === "") {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      i = readNewline(i);
    } else {
      cell += char;
    }
  }
  if (quoted) throw new Error("CSV has an unterminated quoted field");
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export interface CsvRecord {
  /** 1-based line number of the record in the file (header is line 1). */
  line: number;
  values: Record<string, string>;
}

/** Header row → records keyed by lower-cased header. Blank rows are skipped; cells are trimmed. */
export function csvToRecords(input: string): { headers: string[]; records: CsvRecord[] } {
  const rows = parseCsv(input);
  const [headerRow, ...body] = rows;
  if (!headerRow) return { headers: [], records: [] };
  const headers = headerRow.map((h) => h.trim().toLowerCase());

  const records: CsvRecord[] = [];
  body.forEach((cells, index) => {
    if (cells.every((c) => c.trim() === "")) return;
    const values: Record<string, string> = {};
    headers.forEach((header, i) => {
      if (header) values[header] = (cells[i] ?? "").trim();
    });
    records.push({ line: index + 2, values });
  });
  return { headers, records };
}

const TRUE_VALUES = new Set(["true", "yes", "y", "1", "in stock", "in_stock", "instock"]);
const FALSE_VALUES = new Set(["false", "no", "n", "0", "out of stock", "out_of_stock", "outofstock"]);

/** true/false for recognised spellings, undefined for blank, null for anything else. */
export function parseBoolean(value: string): boolean | undefined | null {
  const v = value.trim().toLowerCase();
  if (!v) return undefined;
  if (TRUE_VALUES.has(v)) return true;
  if (FALSE_VALUES.has(v)) return false;
  return null;
}
