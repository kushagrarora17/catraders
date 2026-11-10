import type { Metadata } from "next";
import { getDb } from "@/server/db";
import { authorizeQuery, validateAuthorizeRequest } from "@/server/oauth/authorize";
import { isMcpConfigured } from "@/server/oauth/config";

export const metadata: Metadata = {
  title: "Authorize access",
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** GET /oauth/authorize — validates MCP client request before offering operator sign-in. */
export default async function AuthorizePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = await searchParams;
  const input = Object.fromEntries(Object.entries(query).map(([key, value]) => [key, first(value)]));

  const result = isMcpConfigured()
    ? await validateAuthorizeRequest(getDb(), input)
    : ({ ok: false, message: "MCP access is not configured on this server." } as const);
  const loginParams = result.ok ? authorizeQuery(result.params) : new URLSearchParams();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-bold">Authorize access</h1>
      {result.ok ? (
        <div className="flex flex-col gap-4">
          <p>
            <strong>{result.clientName}</strong> wants to manage the catalog and quote requests on this site.
          </p>
          {(["google", "microsoft"] as const).map((provider) => (
            <form key={provider} method="post" action={`/oauth/login/${provider}`}>
              {[...loginParams.entries()].map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
              <button type="submit" className="w-full rounded border border-current px-4 py-2 font-semibold">
                Continue with {provider === "google" ? "Google" : "Microsoft"}
              </button>
            </form>
          ))}
        </div>
      ) : (
        <p role="alert">{result.message}</p>
      )}
    </main>
  );
}
