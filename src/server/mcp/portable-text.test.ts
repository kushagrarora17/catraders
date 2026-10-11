import { describe, expect, test } from "bun:test";
import { blocksToText, textToBlocks } from "./portable-text";

describe("portable text helpers", () => {
  test("splits paragraphs on blank lines and builds valid blocks", () => {
    const blocks = textToBlocks("First line.\nStill first.\r\n\r\nSecond.");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ _type: "block", style: "normal", markDefs: [] });
    expect(blocks[0].children[0]).toMatchObject({ _type: "span", text: "First line.\nStill first.", marks: [] });
    expect(new Set(blocks.flatMap((b) => [b._key, b.children[0]._key])).size).toBe(4);
  });

  test("returns no blocks for blank text", () => {
    expect(textToBlocks("  \n\n ")).toEqual([]);
  });

  test("round-trips plain text", () => {
    const text = "One.\n\nTwo.";
    expect(blocksToText(textToBlocks(text))).toBe(text);
  });

  test("blocksToText tolerates null and missing children", () => {
    expect(blocksToText(null)).toBe("");
    expect(blocksToText([{}, { children: [{ text: "a" }, {}] }])).toBe("a");
  });
});
