import { NextRequest, NextResponse } from "next/server";
import TurndownService from "turndown";
import { getSiteUrl } from "@/features/site/url";

function quality(accept: string, type: string) {
  const range = accept.split(",").find((part) => part.split(";")[0].trim().toLowerCase() === type);
  if (!range) return 0;
  const q = range.match(/;\s*q\s*=\s*([\d.]+)/i);
  return q ? Number(q[1]) : 1;
}

function varyOnAccept(headers: Headers) {
  const vary = headers.get("Vary");
  if (!vary?.split(",").some((value) => ["accept", "*"].includes(value.trim().toLowerCase()))) {
    headers.set("Vary", vary ? `${vary}, Accept` : "Accept");
  }
}

export async function proxy(request: NextRequest) {
  const next = NextResponse.next();
  varyOnAccept(next.headers);
  const accept = request.headers.get("Accept") ?? "";
  const markdownQuality = quality(accept, "text/markdown");
  if (
    !["GET", "HEAD"].includes(request.method) ||
    request.headers.has("RSC") ||
    markdownQuality <= 0 ||
    markdownQuality < quality(accept, "text/html")
  ) {
    return next;
  }

  // Fetch only the configured origin, with HTML negotiation to avoid re-entering conversion.
  const url = new URL(getSiteUrl());
  url.pathname = request.nextUrl.pathname;
  url.search = request.nextUrl.search;
  let html: Response;
  try {
    html = await fetch(url, {
      headers: { Accept: "text/html" },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return next;
  }
  if (!html.ok || !html.headers.get("Content-Type")?.includes("text/html")) return next;

  const converter = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
  converter.remove(["script", "style", "nav", "header", "footer"]);
  const markdown = converter.turndown(await html.text());
  const headers = new Headers(html.headers);
  for (const name of ["Content-Length", "Content-Encoding", "Content-Range", "Transfer-Encoding", "ETag", "Last-Modified"]) {
    headers.delete(name);
  }
  headers.set("Content-Type", "text/markdown; charset=utf-8");
  headers.set("Cache-Control", "private, no-store");
  varyOnAccept(headers);
  return new NextResponse(request.method === "HEAD" ? null : markdown, { status: html.status, headers });
}

export const config = {
  matcher: ["/", "/products/:path*", "/categories/:path*", "/service-areas/:path*", "/quote"],
};
