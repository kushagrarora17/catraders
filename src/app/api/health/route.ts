import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Liveness probe for Azure App Service / Container Apps. */
export function GET() {
  return NextResponse.json({ status: "ok" });
}
