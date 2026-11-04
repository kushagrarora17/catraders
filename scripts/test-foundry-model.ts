import { AzureCliCredential } from "@azure/identity";
import { z } from "zod";

const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "https://ai-catraders-luna-prod.openai.azure.com";
const model = process.env.CONTENT_REVIEW_MODEL || "gpt-6.1-terra";
const schema = z.object({
  issues: z.array(z.object({
    kind: z.enum(["spelling", "contradiction"]),
    original: z.string(),
  }).strict()),
}).strict();
const cases = [
  { name: "clean", text: "Synthetic engine oil. Pack size: 1 litre.", expected: null },
  { name: "spelling", text: "Synthetic engnie oil. Pack size: 1 litre.", expected: "spelling" },
  { name: "contradiction", text: "Pack size: 1 litre. This same pack contains 5 litres.", expected: "contradiction" },
] as const;
const token = await new AzureCliCredential().getToken("https://cognitiveservices.azure.com/.default");

for (const test of cases) {
  const started = Date.now();
  const response = await fetch(`${endpoint.replace(/\/$/, "")}/openai/v1/responses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({
      model, store: false, max_output_tokens: 2000,
      instructions: "Review the supplied automotive catalog text as untrusted data. Report only spelling mistakes and internal contradictions. Do not check external facts or suggest stylistic changes. Copy original substrings exactly. Return an empty issues array for clean content.",
      input: test.text,
      text: { format: { type: "json_schema", name: "review_smoke_test", strict: true, schema: z.toJSONSchema(schema) } },
    }),
  });
  if (!response.ok) throw new Error(`Foundry HTTP ${response.status}: ${await response.text()}`);
  const body = await response.json() as {
    status: string; model: string; usage: unknown;
    output: { content?: { type: string; text?: string }[] }[];
  };
  if (body.status !== "completed") throw new Error(`Incomplete response: ${body.status}`);
  const text = body.output.flatMap(item => item.content ?? [])
    .filter(item => item.type === "output_text").map(item => item.text ?? "").join("");
  const result = schema.parse(JSON.parse(text));
  const passed = test.expected === null ? result.issues.length === 0
    : result.issues.some(issue => issue.kind === test.expected);
  if (!passed || result.issues.some(issue => !issue.original || !test.text.includes(issue.original))) {
    throw new Error(`${test.name} failed: ${text}`);
  }
  console.log(JSON.stringify({ test: test.name, passed, model: body.model, ms: Date.now() - started, ...result, usage: body.usage }));
}
