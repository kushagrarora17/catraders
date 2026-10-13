// Stand-in for the Sanity HTTP API (and the Azure Communication Services email API) used by the
// Playwright run, so the app can be exercised end to end without network access or real content.
// Queries are evaluated with groq-js against an in-memory dataset seeded from ./fixtures.
//
//   bun e2e/sanity-mock/server.ts      (HTTP on MOCK_PORT, default 4010; HTTPS on MOCK_TLS_PORT, default 4011)
//
// The Azure SDK only talks HTTPS, so the same routes are also served over TLS with a throwaway
// self-signed certificate (generated with openssl into MOCK_CERT_DIR), which the app under test
// trusts through NODE_EXTRA_CA_CERTS.
// Test-only endpoints: POST /__reset restores the seed data, GET /__docs/:id returns a document
// (raw), GET /__emails lists the emails the app tried to send.
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { evaluate, parse } from "groq-js";
import { type Doc, seedDocuments } from "./fixtures";

const port = Number(process.env.MOCK_PORT ?? 4010);
const tlsPort = Number(process.env.MOCK_TLS_PORT ?? 4011);
const certDir = process.env.MOCK_CERT_DIR ?? "coverage/e2e-certs";

let docs = new Map<string, Doc>();
let emails: unknown[] = [];
let rev = 0;

function reset() {
  docs = new Map();
  const now = new Date("2026-09-01T00:00:00Z").toISOString();
  for (const doc of seedDocuments()) docs.set(doc._id, { _createdAt: now, _updatedAt: now, _rev: "seed", ...doc });
  emails = [];
}
reset();

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers });

// --- queries -----------------------------------------------------------------------------------

async function runQuery(query: string, params: Record<string, unknown>, perspective: string) {
  const dataset = [...docs.values()].filter((d) => perspective === "raw" || !d._id.startsWith("drafts."));
  const tree = parse(query, { params });
  const value = await evaluate(tree, { dataset, params });
  return value.get();
}

async function handleQuery(req: Request, url: URL) {
  let query: string;
  let params: Record<string, unknown> = {};
  if (req.method === "POST") {
    const body = (await req.json()) as { query: string; params?: Record<string, unknown> };
    query = body.query;
    params = body.params ?? {};
  } else {
    query = url.searchParams.get("query") ?? "";
    for (const [key, raw] of url.searchParams) if (key.startsWith("$")) params[key.slice(1)] = JSON.parse(raw);
  }
  const perspective = url.searchParams.get("perspective") ?? "raw";
  try {
    return json({ result: await runQuery(query, params, perspective), ms: 1, query });
  } catch (error) {
    return json({ error: { description: String(error), type: "queryParseError" } }, 400);
  }
}

// --- mutations ---------------------------------------------------------------------------------

type Patch = {
  id: string;
  set?: Record<string, unknown>;
  unset?: string[];
  setIfMissing?: Record<string, unknown>;
  insert?: { after?: string; before?: string; replace?: string; items: unknown[] };
  inc?: Record<string, number>;
};
type Mutation =
  | { create: Doc }
  | { createOrReplace: Doc }
  | { createIfNotExists: Doc }
  | { delete: { id: string } }
  | { patch: Patch };

const pathParts = (path: string) => path.split(".");

function getPath(doc: Record<string, unknown>, path: string) {
  return pathParts(path).reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], doc);
}

function setPath(doc: Record<string, unknown>, path: string, value: unknown) {
  const parts = pathParts(path);
  let node = doc;
  for (const key of parts.slice(0, -1)) node = (node[key] ??= {}) as Record<string, unknown>;
  node[parts.at(-1)!] = value;
}

function unsetPath(doc: Record<string, unknown>, path: string) {
  const parts = pathParts(path);
  const parent = parts.slice(0, -1).reduce<Record<string, unknown> | undefined>(
    (node, key) => node?.[key] as Record<string, unknown> | undefined,
    doc,
  );
  if (parent) delete parent[parts.at(-1)!];
}

function applyPatch(doc: Doc, patch: Patch) {
  for (const [path, value] of Object.entries(patch.setIfMissing ?? {})) {
    if (getPath(doc, path) === undefined) setPath(doc, path, structuredClone(value));
  }
  for (const [path, value] of Object.entries(patch.set ?? {})) setPath(doc, path, structuredClone(value));
  for (const path of patch.unset ?? []) unsetPath(doc, path);
  for (const [path, by] of Object.entries(patch.inc ?? {})) setPath(doc, path, Number(getPath(doc, path) ?? 0) + by);
  if (patch.insert) {
    const { items, ...where } = patch.insert;
    const [position, selector] = Object.entries(where)[0] as [string, string];
    const match = selector.match(/^(.+)\[(-?\d+)\]$/);
    if (!match) throw new Error(`Unsupported insert selector ${selector}`);
    const list = [...((getPath(doc, match[1]) as unknown[] | undefined) ?? [])];
    let index = Number(match[2]);
    if (index < 0) index += list.length;
    const at = position === "before" ? index : index + 1;
    list.splice(position === "replace" ? index : Math.max(0, at), position === "replace" ? 1 : 0, ...items);
    setPath(doc, match[1], list);
  }
}

function stamp(doc: Doc, created?: string): Doc {
  const now = new Date().toISOString();
  return { ...doc, _createdAt: created ?? (doc._createdAt as string) ?? now, _updatedAt: now, _rev: `rev${++rev}` };
}

async function handleMutate(req: Request) {
  const { mutations } = (await req.json()) as { mutations: Mutation[] };
  const next = new Map([...docs].map(([id, doc]) => [id, structuredClone(doc)]));
  const results: { id: string; operation: string; document?: Doc }[] = [];
  try {
    for (const mutation of mutations) {
      if ("create" in mutation) {
        const doc = { ...mutation.create, _id: mutation.create._id ?? randomUUID() };
        if (next.has(doc._id)) throw new Error(`Document by ID "${doc._id}" already exists`);
        next.set(doc._id, stamp(doc));
        results.push({ id: doc._id, operation: "create", document: next.get(doc._id) });
      } else if ("createOrReplace" in mutation) {
        const doc = mutation.createOrReplace;
        next.set(doc._id, stamp(doc, next.get(doc._id)?._createdAt as string | undefined));
        results.push({ id: doc._id, operation: "createOrReplace", document: next.get(doc._id) });
      } else if ("createIfNotExists" in mutation) {
        const doc = mutation.createIfNotExists;
        if (!next.has(doc._id)) next.set(doc._id, stamp(doc));
        results.push({ id: doc._id, operation: "create", document: next.get(doc._id) });
      } else if ("delete" in mutation) {
        next.delete(mutation.delete.id);
        results.push({ id: mutation.delete.id, operation: "delete" });
      } else {
        const doc = next.get(mutation.patch.id);
        if (!doc) throw new Error(`Cannot modify document "${mutation.patch.id}" because it does not exist`);
        applyPatch(doc, mutation.patch);
        next.set(doc._id, stamp(doc));
        results.push({ id: doc._id, operation: "update", document: next.get(doc._id) });
      }
    }
  } catch (error) {
    return json({ error: { description: String((error as Error).message), type: "mutationError" } }, 409);
  }
  docs = next;
  return json({ transactionId: `tx${rev}`, results: structuredClone(results) });
}

// --- documents and assets ----------------------------------------------------------------------

function handleDocs(ids: string) {
  const list = decodeURIComponent(ids).split(",");
  return json({
    documents: list.flatMap((id) => (docs.has(id) ? [docs.get(id)] : [])),
    omitted: list.filter((id) => !docs.has(id)).map((id) => ({ id, reason: "existence" })),
  });
}

async function handleUpload(req: Request, url: URL) {
  const body = new Uint8Array(await req.arrayBuffer());
  const hash = createHash("sha1").update(body).digest("hex");
  const ext = (req.headers.get("content-type") ?? "image/png").split("/")[1] ?? "png";
  const id = `image-${hash}-1x1-${ext}`;
  const asset: Doc = {
    _id: id,
    _type: "sanity.imageAsset",
    originalFilename: url.searchParams.get("filename"),
    mimeType: req.headers.get("content-type"),
    url: `https://cdn.sanity.io/images/mock/production/${hash}-1x1.${ext}`,
  };
  docs.set(id, stamp(asset));
  return json({ document: docs.get(id) });
}

// --- Azure Communication Services email --------------------------------------------------------

async function handleEmailSend(req: Request) {
  emails.push(await req.json());
  const id = randomUUID();
  return json({ id, status: "Running" }, 202, {
    "operation-location": `https://127.0.0.1:${tlsPort}/emails/operations/${id}?api-version=2025-09-01`,
    "retry-after": "0",
  });
}

// --- router ------------------------------------------------------------------------------------

async function route(req: Request) {
  const url = new URL(req.url);
  const path = url.pathname;
  let m: RegExpMatchArray | null;

  if (path === "/__reset" && req.method === "POST") return reset(), json({ ok: true });
  if (path === "/__emails") return json(emails);
  if ((m = path.match(/^\/__docs\/(.+)$/))) return json(docs.get(decodeURIComponent(m[1])) ?? null);
  if (path === "/__health") return json({ ok: true });

  if ((m = path.match(/^\/v[^/]+\/data\/query\/[^/]+$/))) return handleQuery(req, url);
  if ((m = path.match(/^\/v[^/]+\/data\/mutate\/[^/]+$/))) return handleMutate(req);
  if ((m = path.match(/^\/v[^/]+\/data\/doc\/[^/]+\/(.+)$/))) return handleDocs(m[1]);
  if ((m = path.match(/^\/v[^/]+\/assets\/images\/[^/]+$/))) return handleUpload(req, url);

  if (path === "/emails:send" && req.method === "POST") return handleEmailSend(req);
  if ((m = path.match(/^\/emails\/operations\/(.+)$/))) return json({ id: m[1], status: "Succeeded" });

  return json({ error: { description: `Mock has no route for ${req.method} ${path}` } }, 404);
}

const keyFile = join(certDir, "mock.key");
const certFile = join(certDir, "mock.crt");
{
  mkdirSync(certDir, { recursive: true });
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "30",
    "-keyout", keyFile, "-out", certFile,
    "-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1",
  ], { stdio: "ignore" });
}

Bun.serve({ port, hostname: "127.0.0.1", fetch: route });
Bun.serve({
  port: tlsPort,
  hostname: "127.0.0.1",
  tls: { key: readFileSync(keyFile, "utf8"), cert: readFileSync(certFile, "utf8") },
  fetch: route,
});

console.log(`[sanity-mock] listening on http://127.0.0.1:${port} and https://127.0.0.1:${tlsPort}`);
