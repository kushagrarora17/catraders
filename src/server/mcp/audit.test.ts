import { describe, expect, test } from "bun:test";
import type { McpServer } from "@modelcontextprotocol/server";
import { getAuditTargets, getResolvedAuditTargets } from "./audit";
import { auditMcpWrites } from "./audit";

describe("MCP audit targets", () => {
  test("records every batch identifier without storing CSV fields other than SKU", () => {
    const ids = Array.from({ length: 31 }, (_, index) => `product-${index}`);
    expect(getAuditTargets("set_stock", { ids })).toEqual(ids.map((id) => `ids:${id}`));

    const csv = ["sku,title,email", ...Array.from({ length: 32 }, (_, index) => `SKU-${index},Product ${index},private@example.com`)].join("\n");
    const targets = getAuditTargets("import_products_csv", { csv });
    expect(targets).toHaveLength(32);
    expect(targets[31]).toBe("sku:SKU-31");
    expect(targets.join(" ")).not.toContain("private@example.com");
    expect(targets.join(" ")).not.toContain("Product 31");
  });

  test("captures more than twenty created targets from the result", () => {
    const rows = Array.from({ length: 27 }, (_, index) => ({ id: `new-${index}`, sku: `SKU-${index}` }));
    const result = { content: [{ type: "text", text: JSON.stringify({ rows }) }] };
    expect(getResolvedAuditTargets(result, ["input-sha256:abc"])).toHaveLength(55);
    expect(getResolvedAuditTargets(result, ["fallback"])).toContain("id:new-26");
  });

  test("hashes opaque input values instead of persisting content", () => {
    const target = getAuditTargets("create_product", { title: "private contact@example.com" });
    expect(target[0]).toMatch(/^input-sha256:[a-f0-9]{32}$/);
    expect(target.join(" ")).not.toContain("contact@example.com");
  });

  test("uses the stable singleton document ID for service-area mutations", () => {
    expect(getAuditTargets("update_service_area", { description: "Private text" })).toEqual(["id:serviceArea"]);
  });

  test("writes intent before the mutation and appends its resolved target", async () => {
    const events: Record<string, unknown>[] = [];
    let mutationRan = false;
    let registered: ((input: unknown, context: { http?: { authInfo?: { extra?: Record<string, unknown> } } }) => Promise<unknown>) | undefined;
    const server = {
      registerTool: (_name: string, _config: unknown, handler: typeof registered) => { registered = handler; },
    } as unknown as McpServer;
    const fakeDb = {
      insert: () => ({ values: async (rows: Record<string, unknown> | Record<string, unknown>[]) => { events.push(...(Array.isArray(rows) ? rows : [rows])); } }),
    };
    auditMcpWrites(server, { getDb: () => fakeDb as never });
    server.registerTool("create_product", { annotations: { readOnlyHint: false } }, async () => {
      mutationRan = true;
      expect(events[0]?.outcome).toBe("started");
      return { content: [{ type: "text", text: JSON.stringify({ id: "product-9", customerEmail: "private@example.test" }) }] };
    });
    await registered!({ title: "Private product text" }, { http: { authInfo: { extra: { operatorEmail: "owner@example.test" } } } });
    expect(mutationRan).toBe(true);
    expect(events.map((event) => event.outcome)).toEqual(["started", "completed", "completed"]);
    expect(events[0]?.correlationId).toBe(events[1]?.correlationId);
    expect(events[1]?.target).toBe(getAuditTargets("create_product", { title: "Private product text" })[0]);
    expect(events[2]?.target).toBe("id:product-9");
    expect(JSON.stringify(events)).not.toContain("private@example.test");
    expect(JSON.stringify(events)).not.toContain("Private product text");
  });

  test("refuses writes when the intent record cannot be persisted", async () => {
    let mutationRan = false;
    let registered: ((input: unknown, context: { http?: { authInfo?: { extra?: Record<string, unknown> } } }) => Promise<unknown>) | undefined;
    const server = {
      registerTool: (_name: string, _config: unknown, handler: typeof registered) => { registered = handler; },
    } as unknown as McpServer;
    auditMcpWrites(server, { getDb: () => ({ insert: () => ({ values: async () => { throw new Error("offline"); } }) }) as never });
    server.registerTool("set_stock", { annotations: { readOnlyHint: false } }, async () => { mutationRan = true; return { content: [{ type: "text", text: "ok" }] }; });
    const result = await registered!({ ids: ["product-1"] }, { http: { authInfo: { extra: { operatorEmail: "owner@example.test" } } } }) as { isError?: boolean };
    expect(result.isError).toBe(true);
    expect(mutationRan).toBe(false);
  });

  test("records full CSV intent alongside bounded result targets", async () => {
    const events: Record<string, unknown>[] = [];
    let registered: ((input: unknown, context: { http?: { authInfo?: { extra?: Record<string, unknown> } } }) => Promise<unknown>) | undefined;
    const server = { registerTool: (_name: string, _config: unknown, handler: typeof registered) => { registered = handler; } } as unknown as McpServer;
    const fakeDb = { insert: () => ({ values: async (rows: Record<string, unknown> | Record<string, unknown>[]) => { events.push(...(Array.isArray(rows) ? rows : [rows])); } }) };
    auditMcpWrites(server, { getDb: () => fakeDb as never });
    server.registerTool("import_products_csv", { annotations: { readOnlyHint: false } }, async () => ({ content: [{ type: "text", text: JSON.stringify({ rows: [{ sku: "NEW-SKU" }] }) }] }));
    const csv = ["sku,title", ...Array.from({ length: 32 }, (_, index) => `SKU-${index},Product ${index}`)].join("\n");
    await registered!({ csv }, { http: { authInfo: { extra: { operatorEmail: "owner@example.test" } } } });
    expect(events.filter((event) => event.outcome === "started")).toHaveLength(32);
    expect(events.filter((event) => event.outcome === "completed")).toHaveLength(33);
    expect(events.some((event) => event.target === "sku:SKU-31")).toBe(true);
    expect(events.some((event) => event.target === "sku:NEW-SKU")).toBe(true);
  });
});
