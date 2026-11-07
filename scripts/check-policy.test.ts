import { afterAll, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const roots: string[] = [];
afterAll(() => roots.forEach(root => rmSync(root, { recursive: true, force: true })));

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "catraders-policy-"));
  roots.push(root);
  const write = (path: string, value: string) => {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), value);
  };
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
  git("init", "-q");
  write(".github/workflows/ci.yml", "jobs:\n  web: {}\n  ci-ok:\n    needs: [web]\n");
  const run = (base?: string) => spawnSync(process.execPath, [resolve("scripts/check-policy.ts")], {
    cwd: root, encoding: "utf8", env: { ...process.env, POLICY_BASE_REF: base ?? "" },
  });
  return { write, git, run };
}

test("accepts a valid policy fixture and rejects foreign lockfiles in subprojects", () => {
  const f = fixture();
  expect(f.run().status).toBe(0);
  f.write("studio/package-lock.json", "{}");
  expect(f.run().stderr).toContain("only Bun lockfiles");
});

test("rejects CI jobs omitted from the required gate", () => {
  const f = fixture();
  f.write(".github/workflows/ci.yml", "jobs:\n  web: {}\n  added: {}\n  ci-ok:\n    needs: [web]\n");
  expect(f.run().stderr).toContain("ci-ok.needs is missing added");
});

test("deployment jobs must call the deployment workflow after ci-ok", () => {
  const f = fixture();
  const ci = "jobs:\n  web: {}\n  ci-ok:\n    needs: [web]\n";
  f.write(".github/workflows/ci.yml", ci + "  deploy-azure:\n    needs: ci-ok\n    uses: ./.github/workflows/azure-deploy.yml\n");
  expect(f.run().status).toBe(0);
  f.write(".github/workflows/ci.yml", ci + "  deploy-azure:\n    needs: web\n    uses: ./.github/workflows/azure-deploy.yml\n");
  expect(f.run().stderr).toContain("must call its deployment workflow after ci-ok");
});

test("resolves relative imports before checking catalog boundaries", () => {
  const f = fixture();
  f.write("src/features/catalog/bypass.ts", 'import { client } from "../../sanity/client";');
  expect(f.run().stderr).toContain("use the catalog/landing API");
});

test("checks every GROQ selector and every OR branch", () => {
  const f = fixture();
  f.write("src/queries.ts", 'import query from "./query.json"; const defineQuery = (q: string) => q; export const QUERY = defineQuery(query);');
  const query = (value: string) => f.write("src/query.json", JSON.stringify(value));
  query('*[vertical == "automotive" && _type == "product"]');
  expect(f.run().status).toBe(0);
  query('*[vertical == "automotive" || _type == "product"]');
  expect(f.run().stderr).toContain("does not guarantee vertical");
  query('*[vertical == "automotive"] {"children": *[_type == "product"]}');
  expect(f.run().stderr).toContain("does not guarantee vertical");
  query('*[vertical == "automotive" && _type == "attribute"] {"values": *[_type == "attributeValue" && attribute._ref == ^._id]}');
  expect(f.run().status).toBe(0);
});

test("rejects duplicate query names across files", () => {
  const f = fixture();
  const source = 'const defineQuery = (q: string) => q; export const QUERY = defineQuery(\'*[vertical == "automotive"]\');';
  f.write("src/one.ts", source);
  f.write("src/two.ts", source);
  expect(f.run().stderr).toContain("duplicate query name QUERY");
});

test("allows new migrations and appended journal entries but rejects rewriting history", () => {
  const f = fixture();
  f.write("drizzle/0000_initial.sql", "select 1;");
  f.write("drizzle/meta/_journal.json", JSON.stringify({ version: "7", dialect: "postgresql", entries: [{ idx: 0 }] }));
  f.git("add", ".");
  f.git("-c", "user.name=Policy", "-c", "user.email=policy@example.test", "commit", "-qm", "base");
  f.write("drizzle/0001_next.sql", "select 2;");
  f.write("drizzle/meta/_journal.json", JSON.stringify({ version: "7", dialect: "postgresql", entries: [{ idx: 0 }, { idx: 1 }] }));
  expect(f.run("HEAD").status).toBe(0);
  f.write("drizzle/0000_initial.sql", "select 3;");
  expect(f.run("HEAD").stderr).toContain("existing migrations and snapshots are immutable");
});
