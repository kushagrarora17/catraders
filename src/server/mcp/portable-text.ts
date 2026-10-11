import { randomUUID } from "node:crypto";

const key = () => randomUUID().replaceAll("-", "").slice(0, 12);

export interface TextBlock {
  _type: "block";
  _key: string;
  style: "normal";
  markDefs: never[];
  children: { _type: "span"; _key: string; text: string; marks: never[] }[];
}

/** Plain text → Portable Text: blank lines separate paragraphs, single newlines stay as line breaks. */
export function textToBlocks(text: string): TextBlock[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => ({
      _type: "block",
      _key: key(),
      style: "normal",
      markDefs: [],
      children: [{ _type: "span", _key: key(), text: paragraph, marks: [] }],
    }));
}

/** Portable Text → plain text (formatting is dropped), paragraphs separated by blank lines. */
export function blocksToText(blocks: { children?: { text?: string }[] }[] | null | undefined) {
  return (blocks ?? [])
    .map((block) => (block.children ?? []).map((child) => child.text ?? "").join(""))
    .filter(Boolean)
    .join("\n\n");
}

export const newKey = key;
