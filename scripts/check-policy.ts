import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parse, type ExprNode } from "groq-js";
import ts from "typescript";
import { checkWorkflowChains } from "./check-workflow-chains";

const errors: string[] = [];
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
const files = git("ls-files", "--cached", "--others", "--exclude-standard", "-z").split("\0").filter(file => file && existsSync(file));
const fail = (message: string) => errors.push(message);

for (const error of await checkWorkflowChains(files)) fail(error);

for (const file of files) {
  if (/(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml)$/.test(file)) {
    fail(`${file}: only Bun lockfiles are allowed`);
  }
}

const workflow = Bun.YAML.parse(await Bun.file(".github/workflows/ci.yml").text()) as {
  jobs: Record<string, { needs?: string | string[]; uses?: string }>;
};
const needs = workflow.jobs["ci-ok"]?.needs;
const dependencies = new Set(typeof needs === "string" ? [needs] : needs ?? []);
const deployments: Record<string, string> = {
  "deploy-azure": "./.github/workflows/azure-deploy.yml",
  "deploy-studio": "./.github/workflows/studio-deploy.yml",
};
for (const job of Object.keys(workflow.jobs)) {
  if (job in deployments) {
    const config = workflow.jobs[job];
    const required = typeof config.needs === "string" ? [config.needs] : config.needs ?? [];
    if (!required.includes("ci-ok") || config.uses !== deployments[job] || dependencies.has(job)) {
      fail(`${job} must call its deployment workflow after ci-ok`);
    }
    continue;
  }
  if (job !== "ci-ok" && !dependencies.has(job)) fail(`ci-ok.needs is missing ${job}`);
}
for (const job of dependencies) {
  if (job === "ci-ok" || !workflow.jobs[job]) fail(`ci-ok.needs has invalid job ${job}`);
}

const base = process.env.POLICY_BASE_REF;
if (base) {
  const existing = new Set(git("ls-tree", "-r", "--name-only", base, "--", "drizzle").split("\n"));
  for (const file of git("diff", "--name-only", "--no-renames", base, "--", "drizzle").split("\n")) {
    if (existing.has(file) && file !== "drizzle/meta/_journal.json") fail(`${file}: existing migrations and snapshots are immutable; generate a new migration`);
  }
  const journal = "drizzle/meta/_journal.json";
  if (existing.has(journal)) {
    const previous = JSON.parse(git("show", `${base}:${journal}`));
    const current = await Bun.file(journal).json();
    if (current.version !== previous.version || current.dialect !== previous.dialect ||
      JSON.stringify(current.entries.slice(0, previous.entries.length)) !== JSON.stringify(previous.entries)) {
      fail(`${journal}: existing migration entries are immutable`);
    }
  }
}

function guarantees(node: ExprNode, predicate: (node: ExprNode) => boolean): boolean {
  if (predicate(node)) return true;
  if (node.type === "Group") return guarantees(node.base, predicate);
  if (node.type === "And") return guarantees(node.left, predicate) || guarantees(node.right, predicate);
  if (node.type === "Or") return guarantees(node.left, predicate) && guarantees(node.right, predicate);
  return false;
}

function equality(node: ExprNode, field: string, value: string): boolean {
  if (node.type !== "OpCall" || node.op !== "==") return false;
  return [[node.left, node.right], [node.right, node.left]].some(([left, right]) =>
    left.type === "AccessAttribute" && !left.base && left.name === field && right.type === "Value" && right.value === value);
}

function inheritedAttribute(expr: ExprNode, scoped: boolean) {
  return scoped && guarantees(expr, n => equality(n, "_type", "attributeValue")) &&
        guarantees(expr, n => n.type === "OpCall" && n.op === "==" &&
          n.left.type === "AccessAttribute" && n.left.name === "_ref" &&
          n.left.base?.type === "AccessAttribute" && n.left.base.name === "attribute" && !n.left.base.base &&
          n.right.type === "AccessAttribute" && n.right.name === "_id" && n.right.base?.type === "Parent");
}

function publishedCounterpart(expr: ExprNode, scoped: boolean) {
  return scoped && guarantees(expr, n => n.type === "OpCall" && n.op === "==" &&
        n.left.type === "AccessAttribute" && n.left.name === "_id" && !n.left.base &&
        n.right.type === "AccessElement" && n.right.index === 1 && n.right.base.type === "FuncCall" &&
        n.right.base.namespace === "string" && n.right.base.name === "split" &&
        n.right.base.args[0]?.type === "AccessAttribute" && n.right.base.args[0].name === "_id" &&
        n.right.base.args[0].base?.type === "Parent" &&
        n.right.base.args[1]?.type === "Value" && n.right.base.args[1].value === "drafts.");
}

function validateQuery(query: string, label: string) {
  const scopedInput = (node: ExprNode): boolean => {
    if (node.type === "Filter" && node.base.type === "Everything") return guarantees(node.expr, n => equality(n, "vertical", "automotive"));
    if ("base" in node && node.base && typeof node.base === "object") return scopedInput(node.base as ExprNode);
    return false;
  };
  const visit = (value: unknown, scoped = false) => {
    if (!value || typeof value !== "object") return;
    const node = value as ExprNode;
      if (node.type === "Filter" && node.base.type === "Everything") {
      const vertical = guarantees(node.expr, n => equality(n, "vertical", "automotive"));
      const privateOperatorDirectory = label === "src/server/oauth/operators.ts" && guarantees(node.expr, n => equality(n, "_type", "mcpOperator"));
      if (!vertical && !privateOperatorDirectory && !inheritedAttribute(node.expr, scoped) && !publishedCounterpart(node.expr, scoped)) fail(`${label}: document selector does not guarantee vertical == "automotive"`);
      scoped ||= vertical;
    }
    if (node.type === "Projection" || node.type === "Map" || node.type === "FlatMap") {
      visit(node.base, scoped);
      // A projection receives the scope established by its input selector.
      visit(node.expr, scoped || scopedInput(node.base));
      return;
    }
    for (const child of Object.values(value)) {
      if (Array.isArray(child)) child.forEach(item => visit(item, scoped));
      else visit(child, scoped);
    }
  };
  visit(parse(query, { params: { start: 0, end: 1 } }));
}

const names = new Map<string, string>();

function checkClientImport(node: ts.Node, specifier: string, file: string) {
      if (["@sanity/client", "next-sanity"].includes(specifier) && !["src/sanity/client.ts", "src/sanity/write-client-core.ts"].includes(file) && ts.isImportDeclaration(node)) {
        const bindings = node.importClause?.namedBindings;
        if (!node.importClause?.isTypeOnly && (node.importClause?.name ||
          (bindings && ts.isNamespaceImport(bindings)) ||
          (bindings && ts.isNamedImports(bindings) && bindings.elements.some(e => !e.isTypeOnly && (e.propertyName ?? e.name).text === "createClient")))) fail(`${file}: use the shared Sanity clients`);
      }
}

function checkImport(node: ts.Node, file: string) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      const target = specifier.startsWith("@/") ? resolve("src", specifier.slice(2)) : resolve(dirname(file), specifier);
      const at = (path: string) => target.replace(/\.[cm]?[jt]sx?$/, "") === resolve(path);
      if (at("src/sanity/client") && !["src/features/catalog/api.ts", "src/features/landing/api.ts", "src/server/oauth/operators.ts"].includes(file)) fail(`${file}: use the catalog/landing API instead of the read client`);
      if (at("src/features/catalog/queries") && file !== "src/features/catalog/api.ts") fail(`${file}: use the catalog API instead of catalog queries`);
      if (at("src/sanity/write-client-core") && file !== "src/sanity/write-client.ts") fail(`${file}: use src/sanity/write-client`);
      checkClientImport(node, specifier, file);

    }
}

function recordQuery(node: ts.Node, file: string) {
  let found = false;
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "defineQuery") {
      found = true;
      if (!ts.isVariableDeclaration(node.parent) || !ts.isIdentifier(node.parent.name)) fail(`${file}: defineQuery must have a unique variable name`);
      else {
        const name = node.parent.name.text;
        if (names.has(name)) fail(`${file}: duplicate query name ${name} (also in ${names.get(name)})`);
        names.set(name, file);
      }
    }
  return found;
}


for (const file of files.filter(f => /^src\/.*\.[cm]?tsx?$/.test(f) && !f.endsWith(".test.ts") && f !== "src/sanity/types.ts")) {
  const source = ts.createSourceFile(file, await Bun.file(file).text(), ts.ScriptTarget.Latest, true);
  let hasQueries = false;
  const visit = (node: ts.Node) => {
    checkImport(node, file);
    hasQueries = recordQuery(node, file) || hasQueries;
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (hasQueries) {
    const exports = await import(pathToFileURL(resolve(file)).href);
    for (const [name, query] of Object.entries(exports)) {
      if (typeof query === "string") validateQuery(query, `${file}:${name}`);
      if (name === "productListQueryWithFilters" && typeof query === "function") validateQuery(query("&& true"), `${file}:${name}`);
    }
    for (const [name, location] of names) {
      if (location === file && typeof exports[name] !== "string") fail(`${file}:${name}: queries must be exported for validation`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
