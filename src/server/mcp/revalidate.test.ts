import { afterEach, describe, expect, mock, test } from "bun:test";
import { createServer, type Server } from "node:http";

mock.module("server-only", () => ({}));

const revalidated: unknown[][] = [];
mock.module("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => {
    revalidated.push(args);
  },
}));

const { CATALOG_TAG } = await import("@/features/catalog/api");
const { SERVICE_AREA_TAG, TESTIMONIALS_TAG } = await import("@/features/landing/api");
const { revalidateCatalog, revalidateReviews, revalidateServiceArea } = await import("./revalidate");
const { POST } = await import("@/app/api/internal/revalidate/route");

describe("MCP cache revalidation", () => {
  let server: Server | undefined;
  const previousPort = process.env.PORT;
  const previousSecret = process.env.SANITY_WEBHOOK_SECRET;

  afterEach(() => {
    server?.close();
    server = undefined;
    revalidated.length = 0;
    if (previousPort === undefined) delete process.env.PORT;
    else process.env.PORT = previousPort;
    if (previousSecret === undefined) delete process.env.SANITY_WEBHOOK_SECRET;
    else process.env.SANITY_WEBHOOK_SECRET = previousSecret;
  });

  function listen(): Promise<{ port: number; hits: { tag?: unknown; token: string | undefined }[] }> {
    const hits: { tag?: unknown; token: string | undefined }[] = [];
    server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        hits.push({
          tag: JSON.parse(Buffer.concat(chunks).toString("utf8")).tag,
          token: req.headers["x-revalidate-token"] as string | undefined,
        });
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ revalidated: true }));
      });
    });
    return new Promise((resolve) => {
      server!.listen(0, "127.0.0.1", () => {
        const address = server!.address();
        if (!address || typeof address === "string") throw new Error("no port");
        resolve({ port: address.port, hits });
      });
    });
  }

  test("posts each tag to the loopback revalidate route before resolving", async () => {
    const { port, hits } = await listen();
    process.env.PORT = String(port);
    process.env.SANITY_WEBHOOK_SECRET = "test-secret";

    await revalidateCatalog();
    await revalidateReviews();
    await revalidateServiceArea();

    expect(hits.map((hit) => hit.tag)).toEqual([CATALOG_TAG, TESTIMONIALS_TAG, SERVICE_AREA_TAG]);
    expect(hits.every((hit) => hit.token === "test-secret")).toBe(true);
  });

  test("rejects when the loopback route does not accept the tag", async () => {
    server = createServer((_req, res) => {
      res.writeHead(401);
      res.end("no");
    });
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("no port");
    process.env.PORT = String(address.port);
    process.env.SANITY_WEBHOOK_SECRET = "test-secret";

    await expect(revalidateReviews()).rejects.toThrow(/401/);
  });

  test("the loopback route expires only a known tag and only with the webhook secret", async () => {
    process.env.SANITY_WEBHOOK_SECRET = "test-secret";
    const unauthorized = await POST(new Request("http://localhost/api/internal/revalidate", { method: "POST", body: "{}" }));
    expect(unauthorized.status).toBe(401);
    expect(revalidated).toEqual([]);

    const unknown = await POST(
      new Request("http://localhost/api/internal/revalidate", {
        method: "POST",
        headers: { "content-type": "application/json", "x-revalidate-token": "test-secret" },
        body: JSON.stringify({ tag: "other" }),
      }),
    );
    expect(unknown.status).toBe(400);
    expect(revalidated).toEqual([]);

    const ok = await POST(
      new Request("http://localhost/api/internal/revalidate", {
        method: "POST",
        headers: { "content-type": "application/json", "x-revalidate-token": "test-secret" },
        body: JSON.stringify({ tag: TESTIMONIALS_TAG }),
      }),
    );
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ revalidated: true, tag: TESTIMONIALS_TAG });
    expect(revalidated).toEqual([[TESTIMONIALS_TAG, { expire: 0 }]]);
  });
});
