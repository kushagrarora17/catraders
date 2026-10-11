import { NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { authorizeQuery, validateAuthorizeRequest } from "@/server/oauth/authorize";
import { getAdminPassword, getIssuer, isMcpConfigured } from "@/server/oauth/config";
import { allowAction, getClientIp } from "@/server/oauth/rate-limit";
import { createAuthorizationCode } from "@/server/oauth/repository";
import { safeEqual } from "@/server/oauth/tokens";

const MAX_PASSWORD_LENGTH = 256;

/** POST /oauth/authorize/submit — checks the admin password, then redirects back to the client with a code. */
export async function POST(req: Request) {
  if (!isMcpConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const form = await req.formData();
  const input: Record<string, string | undefined> = {};
  for (const [key, value] of form.entries()) if (typeof value === "string") input[key] = value;

  const db = getDb();
  const result = await validateAuthorizeRequest(db, input);
  const origin = getIssuer();
  if (!result.ok) {
    return NextResponse.redirect(`${origin}/oauth/authorize?error=request`, 303);
  }

  const backToForm = () => {
    const query = authorizeQuery(result.params);
    query.set("error", "password");
    return NextResponse.redirect(`${origin}/oauth/authorize?${query}`, 303);
  };

  const password = (input.password ?? "").slice(0, MAX_PASSWORD_LENGTH);
  const allowed = allowAction(`authorize:${getClientIp(req)}`, 10, 15 * 60 * 1000);
  if (!allowed || !safeEqual(password, getAdminPassword())) return backToForm();

  const code = await createAuthorizationCode(db, {
    clientId: result.params.client_id,
    redirectUri: result.params.redirect_uri,
    codeChallenge: result.params.code_challenge,
    resource: result.resource,
  });

  const redirect = new URL(result.params.redirect_uri);
  redirect.searchParams.set("code", code);
  if (result.params.state) redirect.searchParams.set("state", result.params.state);
  redirect.searchParams.set("iss", origin);
  return NextResponse.redirect(redirect, 303);
}
