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
  return combinedGuarantee(node, predicate);
}

function combinedGuarantee(node: ExprNode, predicate: (node: ExprNode) => boolean): boolean {
  if (node.type === "And") return [node.left, node.right].some(child => guarantees(child, predicate));
  if (node.type === "Or") return [node.left, node.right].every(child => guarantees(child, predicate));
  return false;
}

type AttributeNode = Extract<ExprNode, { type: "AccessAttribute" }>;
function attribute(node: ExprNode | undefined, name: string): node is AttributeNode {
  if (!node) return false;
  return node.type === "AccessAttribute" && node.name === name;
}

function rootAttribute(node: ExprNode | undefined, name: string) {
  return attribute(node, name) && !node.base;
}

function parentAttribute(node: ExprNode | undefined, name: string) {
  return attribute(node, name) && node.base?.type === "Parent";
}

function literal(node: ExprNode | undefined, value: string) {
  if (!node) return false;
  return node.type === "Value" && node.value === value;
}

function isEquality(node: ExprNode): node is Extract<ExprNode, { type: "OpCall" }> {
  return node.type === "OpCall" && node.op === "==";
}

function equality(node: ExprNode, field: string, value: string): boolean {
  if (!isEquality(node)) return false;
  return [[node.left, node.right], [node.right, node.left]].some(([left, right]) =>
    rootAttribute(left, field) && literal(right, value));
}

function inheritedReference(node: ExprNode) {
  return attribute(node, "_ref") && rootAttribute(node.base, "attribute");
}

function inheritedAttribute(expr: ExprNode, scoped: boolean) {
  return scoped && guarantees(expr, n => equality(n, "_type", "attributeValue")) &&
    guarantees(expr, n => {
      if (!isEquality(n)) return false;
      return inheritedReference(n.left) && parentAttribute(n.right, "_id");
    });
}

function stringSplit(node: ExprNode): node is Extract<ExprNode, { type: "FuncCall" }> {
  if (node.type !== "FuncCall") return false;
  return node.namespace === "string" && node.name === "split";
}

function draftSplit(node: ExprNode) {
  if (!stringSplit(node)) return false;
  return parentAttribute(node.args[0], "_id") && literal(node.args[1], "drafts.");
}

function publishedId(node: ExprNode) {
  if (node.type !== "AccessElement") return false;
  return node.index === 1 && draftSplit(node.base);
}

function publishedCounterpart(expr: ExprNode, scoped: boolean) {
  return scoped && guarantees(expr, n => {
    if (!isEquality(n)) return false;
    return rootAttribute(n.left, "_id") && publishedId(n.right);
  });
}

function everythingFilter(node: ExprNode): node is Extract<ExprNode, { type: "Filter" }> {
  return node.type === "Filter" && node.base.type === "Everything";
}

function scopedInput(node: ExprNode): boolean {
  if (everythingFilter(node)) return guarantees(node.expr, n => equality(n, "vertical", "automotive"));
  return baseScope(node);
}

function baseScope(node: ExprNode): boolean {
  if (!("base" in node)) return false;
  if (!node.base) return false;
  return typeof node.base === "object" ? scopedInput(node.base as ExprNode) : false;
}

function privateOperatorDirectory(expr: ExprNode, label: string) {
  return label === "src/server/oauth/operators.ts" && guarantees(expr, n => equality(n, "_type", "mcpOperator"));
}

function allowedSelector(expr: ExprNode, scoped: boolean, label: string, vertical: boolean) {
  return [
    () => vertical,
    () => privateOperatorDirectory(expr, label),
    () => inheritedAttribute(expr, scoped),
    () => publishedCounterpart(expr, scoped),
  ].some(check => check());
}

function selectorScope(node: ExprNode, scoped: boolean, label: string) {
  if (!everythingFilter(node)) return scoped;
  const vertical = guarantees(node.expr, n => equality(n, "vertical", "automotive"));
  if (!allowedSelector(node.expr, scoped, label, vertical)) fail(`${label}: document selector does not guarantee vertical == "automotive"`);
  return scoped || vertical;
}

type ProjectionNode = Extract<ExprNode, { type: "Projection" | "Map" | "FlatMap" }>;
function isProjection(node: ExprNode): node is ProjectionNode {
  return ["Projection", "Map", "FlatMap"].includes(node.type);
}

function validateQuery(query: string, label: string) {
  const visit = (value: unknown, scoped = false) => {
    if (!value || typeof value !== "object") return;
    visitNode(value as ExprNode, scoped);
  };
  const visitNode = (node: ExprNode, scoped: boolean) => {
    scoped = selectorScope(node, scoped, label);
    if (isProjection(node)) {
      visit(node.base, scoped);
      // A projection receives the scope established by its input selector.
      visit(node.expr, scoped || scopedInput(node.base));
      return;
    }
    for (const child of Object.values(node)) visitChild(child, scoped);
  };
  const visitChild = (child: unknown, scoped: boolean) => {
    if (Array.isArray(child)) child.forEach(item => visit(item, scoped));
    else visit(child, scoped);
  };
  visit(parse(query, { params: { start: 0, end: 1 } }));
}

const names = new Map<string, string>();

function importsCreateClient(element: ts.ImportSpecifier) {
  return !element.isTypeOnly && (element.propertyName ?? element.name).text === "createClient";
}

function createsClient(clause: ts.ImportClause) {
  if (clause.name) return true;
  const bindings = clause.namedBindings;
  if (!bindings) return false;
  if (ts.isNamespaceImport(bindings)) return true;
  return bindings.elements.some(importsCreateClient);
}

function valueCreatesClient(clause: ts.ImportClause | undefined) {
  if (!clause) return false;
  return !clause.isTypeOnly && createsClient(clause);
}

function clientImportAllowed(specifier: string, file: string) {
  return !["@sanity/client", "next-sanity"].includes(specifier) ||
    ["src/sanity/client.ts", "src/sanity/write-client-core.ts"].includes(file);
}

function checkClientImport(node: ts.Node, specifier: string, file: string) {
  if (!ts.isImportDeclaration(node)) return;
  if (clientImportAllowed(specifier, file)) return;
  if (valueCreatesClient(node.importClause)) fail(`${file}: use the shared Sanity clients`);
}

function importOrExport(node: ts.Node): node is ts.ImportDeclaration | ts.ExportDeclaration {
  return ts.isImportDeclaration(node) || ts.isExportDeclaration(node);
}

function moduleSpecifier(node: ts.Node) {
  if (!importOrExport(node)) return;
  if (!node.moduleSpecifier) return;
  return ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : undefined;
}

function importTarget(specifier: string, file: string) {
  const target = specifier.startsWith("@/") ? resolve("src", specifier.slice(2)) : resolve(dirname(file), specifier);
  return target.replace(/\.[cm]?[jt]sx?$/, "");
}

const boundaries = [
  { path: "src/sanity/client", allowed: ["src/features/catalog/api.ts", "src/features/landing/api.ts", "src/server/oauth/operators.ts"], message: "use the catalog/landing API instead of the read client" },
  { path: "src/features/catalog/queries", allowed: ["src/features/catalog/api.ts"], message: "use the catalog API instead of catalog queries" },
  { path: "src/sanity/write-client-core", allowed: ["src/sanity/write-client.ts"], message: "use src/sanity/write-client" },
];
function checkBoundaries(target: string, file: string) {
  for (const rule of boundaries) {
    if (target === resolve(rule.path) && !rule.allowed.includes(file)) fail(`${file}: ${rule.message}`);
  }
}

function checkImport(node: ts.Node, file: string) {
  const specifier = moduleSpecifier(node);
  if (specifier === undefined) return;
  checkBoundaries(importTarget(specifier, file), file);
  checkClientImport(node, specifier, file);
}

function defineQueryCall(node: ts.Node): node is ts.CallExpression {
  if (!ts.isCallExpression(node)) return false;
  return ts.isIdentifier(node.expression) && node.expression.text === "defineQuery";
}

function queryName(node: ts.Node, file: string) {
  if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name)) {
    fail(`${file}: defineQuery must have a unique variable name`);
    return;
  }
  return node.name.text;
}

function recordQueryName(name: string, file: string) {
  if (names.has(name)) fail(`${file}: duplicate query name ${name} (also in ${names.get(name)})`);
  names.set(name, file);
}

function recordQuery(node: ts.Node, file: string) {
  if (!defineQueryCall(node)) return false;
  const name = queryName(node.parent, file);
  if (name !== undefined) recordQueryName(name, file);
  return true;
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
