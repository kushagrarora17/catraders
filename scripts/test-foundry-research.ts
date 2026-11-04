import { reviewContent } from "../src/server/content-review/model";

process.env.AZURE_OPENAI_ENDPOINT ||= "https://ai-catraders-luna-prod.openai.azure.com";
process.env.CONTENT_REVIEW_MODEL ||= "gpt-6.1-terra";

const cases = [
  { name: "incorrect manufacturer specification", title: "NGK CPR8EA-9 spark plug", description: "Spark gap: 9.0 mm.", factual: true },
  { name: "correct manufacturer specification", title: "NGK CPR8EA-9 spark plug", description: "Spark gap: 0.9 mm.", factual: false },
  { name: "unknown product", title: "CATRADERS TEST-NONEXISTENT-2026 spark plug", description: "Spark gap: 0.9 mm.", factual: false },
] as const;

for (const test of cases) {
  const started = Date.now();
  const result = await reviewContent({
    updatedAt: "2026-11-04T00:00:00Z",
    fields: [
      { documentId: "synthetic-research-test", path: "title", text: test.title },
      { documentId: "synthetic-research-test", path: "description", text: test.description },
    ],
  });
  const factual = result.findings.filter(finding => finding.kind === "factual");
  if (test.factual ? !factual.length : factual.length > 0) {
    throw new Error(`${test.name}: unexpected factual findings: ${JSON.stringify(result)}`);
  }
  if (factual.some(finding => !finding.evidence.length || finding.evidence.some(evidence => {
    const host = new URL(evidence.url).hostname;
    return !["ngkntk.com", "ngksparkplugs.com", "ngksparkplugs.co.za"].some(domain => host === domain || host.endsWith(`.${domain}`));
  }))) throw new Error("Factual evidence did not come from the manufacturer");
  console.log(JSON.stringify({ test: test.name, passed: true, ms: Date.now() - started, ...result }));
}
