import type { Metadata } from "next";
import { getDb } from "@/server/db";
import { validateAuthorizeRequest } from "@/server/oauth/authorize";
import { isMcpConfigured } from "@/server/oauth/config";

export const metadata: Metadata = {
  title: "Authorize access",
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** GET /oauth/authorize — consent screen guarded by the shared admin password. */
export default async function AuthorizePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = await searchParams;
  const input = Object.fromEntries(Object.entries(query).map(([key, value]) => [key, first(value)]));

  const result = isMcpConfigured()
    ? await validateAuthorizeRequest(getDb(), input)
    : ({ ok: false, message: "MCP access is not configured on this server." } as const);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-bold">Authorize access</h1>
      {result.ok ? (
        <form method="post" action="/oauth/authorize/submit" className="flex flex-col gap-4">
          <p>
            <strong>{result.clientName}</strong> wants to manage the catalog and quote requests on this site.
          </p>
          {Object.entries(result.params).map(([key, value]) =>
            value === undefined ? null : <input key={key} type="hidden" name={key} value={value} />,
          )}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Admin password</span>
            <input
              type="password"
              name="password"
              required
              autoFocus
              autoComplete="current-password"
              className="rounded border border-current/40 bg-transparent px-3 py-2"
            />
          </label>
          {first(query.error) === "password" && (
            <p role="alert" className="text-sm font-semibold text-red-500">
              Incorrect password, or too many attempts. Try again in a few minutes.
            </p>
          )}
          <button type="submit" className="rounded border border-current px-4 py-2 font-semibold">
            Allow access
          </button>
        </form>
      ) : (
        <p role="alert">{result.message}</p>
      )}
    </main>
  );
}
