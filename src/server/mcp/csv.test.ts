import { describe, expect, test } from "bun:test";
import { csvToRecords, parseBoolean, parseCsv } from "./csv";

describe("parseCsv", () => {
  test("parses plain rows with LF and CRLF endings", () => {
    expect(parseCsv("a,b\n1,2\r\n3,4\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  test("handles quoted fields with commas, newlines and doubled quotes", () => {
    expect(parseCsv('sku,desc\nA1,"Big, bold\nand ""quoted"""\n')).toEqual([
      ["sku", "desc"],
      ["A1", 'Big, bold\nand "quoted"'],
    ]);
  });

  test("strips a UTF-8 BOM and keeps a final row without a newline", () => {
    expect(parseCsv("﻿a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  test("keeps empty cells", () => {
    expect(parseCsv("a,b,c\n1,,3\n")[1]).toEqual(["1", "", "3"]);
  });

  test("rejects an unterminated quote", () => {
    expect(() => parseCsv('a\n"oops')).toThrow(/unterminated/);
  });
});

describe("csvToRecords", () => {
  test("lower-cases headers, trims cells, skips blank rows and reports line numbers", () => {
    const { headers, records } = csvToRecords("SKU, Title \n A1 , Oil\n,\nB2,Filter\n");
    expect(headers).toEqual(["sku", "title"]);
    expect(records).toEqual([
      { line: 2, values: { sku: "A1", title: "Oil" } },
      { line: 4, values: { sku: "B2", title: "Filter" } },
    ]);
  });

  test("treats missing trailing cells as empty", () => {
    expect(csvToRecords("sku,title\nA1\n").records[0].values).toEqual({ sku: "A1", title: "" });
  });
});

describe("parseBoolean", () => {
  test("recognises common spellings", () => {
    expect(parseBoolean("Yes")).toBe(true);
    expect(parseBoolean("out of stock")).toBe(false);
    expect(parseBoolean("")).toBeUndefined();
    expect(parseBoolean("maybe")).toBeNull();
  });
});
