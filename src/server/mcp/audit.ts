import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/server";
import { getDb } from "@/server/db";
import { mcpAuditEvents } from "@/server/db/schema";
import { csvToRecords } from "./csv";
import { fail } from "./tools/util";

type Registration = Parameters<McpServer["registerTool"]>;
type ToolConfig = { annotations?: { readOnlyHint?: boolean } };
type Handler = (input: unknown, context: { http?: { authInfo?: { extra?: Record<string, unknown> } } }) => Promise<unknown>;

function candidateValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === "string") return [entry];
    if (!entry || typeof entry !== "object") return [];
    const object = entry as Record<string, unknown>;
    return [object.id, object.key, object.slug, object.sku].filter((item): item is string => typeof item === "string");
  });
}

function safeTarget(key: string, candidate: string) {
  const normalized = candidate.trim();
  if (!normalized) return undefined;
  const safeValue = /^[A-Za-z0-9._:-]{1,100}$/.test(normalized)
    ? normalized
    : `sha256:${createHash("sha256").update(normalized).digest("hex").slice(0, 24)}`;
  return `${key}:${safeValue}`;
}

function csvTargets(value: unknown) {
  if (typeof value !== "string") return [];
  try {
    const { records } = csvToRecords(value);
    return records.map((record) => `sku:${record.values.sku}`);
  } catch { return []; }
}

function auditTargets(name: string, input: unknown) {
  if (!input || typeof input !== "object") return ["input:unknown"];
  const values = input as Record<string, unknown>;
  const targets = name === "update_service_area" ? ["id:serviceArea"] : [];
  for (const key of ["reference", "key", "id", "slug", "sku", "category", "attribute", "name", "ids", "skus", "products"]) {
    targets.push(...candidateValues(values[key]).map((candidate) => safeTarget(key, candidate)).filter((target): target is string => !!target));
  }
  if (name === "import_products_csv") targets.push(...csvTargets(values.csv));
  if (!targets.length) {
    const serialized = JSON.stringify(input);
    targets.push(`input-sha256:${createHash("sha256").update(serialized).digest("hex").slice(0, 32)}`);
  }
  return [...new Set(targets)];
}

function resultContent(result: unknown): unknown[] | undefined {
  if (!result || typeof result !== "object" || !("content" in result)) return;
  return Array.isArray(result.content) ? result.content : undefined;
}

function blockText(block: unknown) {
  if (!block || typeof block !== "object") return;
  const text = (block as {text?: unknown}).text;
  return typeof text === "string" ? text : undefined;
}

function objectIdentifiers(object: Record<string, unknown>, identifiers: Set<string>) {
  for (const key of ["id", "reference", "referenceNumber", "slug", "sku"]) {
    const candidate = object[key];
    if (typeof candidate === "string" && /^[A-Za-z0-9._:-]{1,120}$/.test(candidate)) identifiers.add(`${key}:${candidate}`);
  }
}

function resolvedTargets(result: unknown, fallback: string[]) {
  const content = resultContent(result);
  if (!content) return fallback;
  const identifiers = new Set<string>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) return value.forEach(visit);
    const object = value as Record<string, unknown>;
    objectIdentifiers(object, identifiers);
    Object.values(object).forEach(visit);
  };
  for (const block of content) {
    const text = blockText(block);
    if (text !== undefined) {
      try { visit(JSON.parse(text)); } catch { /* non-JSON tool text contains no resolved identifiers */ }
    }
  }
  return [...new Set([...fallback, ...identifiers])];
}

export const getAuditTargets = auditTargets;
export const getResolvedAuditTargets = resolvedTargets;

const operatorFromContext = (context: Parameters<Handler>[1]) => context.http?.authInfo?.extra?.operatorEmail;
const toolFailed = (result: unknown) => !!result && typeof result === "object" && "isError" in result && result.isError === true;

export function auditMcpWrites(server: McpServer, dependencies: { getDb?: typeof getDb } = {}) {
  const original = server.registerTool.bind(server) as unknown as (
    name: Registration[0], config: ToolConfig, callback: Handler,
  ) => unknown;
  server.registerTool = ((name: Registration[0], config: ToolConfig, callback: Handler) => {
    if (config.annotations?.readOnlyHint === true) return original(name, config, callback);
    return original(name, config, async (input, context) => {
      const operatorEmail = operatorFromContext(context);
      if (typeof operatorEmail !== "string") return fail("Operator identity is missing; no change was made.");
      const correlationId = randomUUID();
      const action = String(name).slice(0, 128);
      const targets = auditTargets(String(name), input);
      const db = (dependencies.getDb ?? getDb)();
      try {
        await db.insert(mcpAuditEvents).values(targets.map((target) => ({ correlationId, operatorEmail, action, target, outcome: "started" })));
      } catch {
        return fail("Audit storage is unavailable; no change was made.");
      }
      try {
        const result = await callback(input, context);
        const failed = toolFailed(result);
        const resolved = failed ? targets : resolvedTargets(result, targets);
        await db.insert(mcpAuditEvents).values(resolved.map((target) => ({ correlationId, operatorEmail, action, target, outcome: failed ? "failed" : "completed" })));
        return result;
      } catch (error) {
        try { await db.insert(mcpAuditEvents).values(targets.map((target) => ({ correlationId, operatorEmail, action, target, outcome: "failed" }))); } catch { /* the write-ahead record remains */ }
        throw error;
      }
    });
  }) as McpServer["registerTool"];
}
