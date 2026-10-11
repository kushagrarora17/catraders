import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { getWriteClient } from "@/sanity/write-client";
import { newKey } from "./portable-text";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 15_000;

/** Loopback, private, link-local, CGNAT, multicast and other non-routable addresses (v4 and v6). */
export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (version === 6) {
    const lower = address.toLowerCase();
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return lower === "::" || lower === "::1" || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower) || lower.startsWith("ff");
  }
  return true;
}

/** https only, and every address the host resolves to must be public (blocks internal/metadata hosts). */
async function assertPublicHttpsUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Not a valid URL: ${raw}`);
  }
  if (url.protocol !== "https:") throw new Error(`Image URLs must use https: ${raw}`);
  if (url.username || url.password) throw new Error(`Image URLs can't contain credentials: ${raw}`);
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error(`Image host isn't publicly reachable: ${url.hostname}`);
  }
  return url;
}

async function readLimited(response: Response) {
  const declared = Number(response.headers.get("content-length"));
  if (declared > MAX_IMAGE_BYTES) throw new Error("Image is larger than 10 MB");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Image response had no body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error("Image is larger than 10 MB");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export type UploadedImage = Awaited<ReturnType<typeof uploadImageFromUrl>>;

/** Downloads a public https image (following a few validated redirects) and uploads it to Sanity. */
export async function uploadImageFromUrl(raw: string, alt?: string) {
  let url = await assertPublicHttpsUrl(raw);
  let response: Response | undefined;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    const location = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || !location) break;
    url = await assertPublicHttpsUrl(new URL(location, url).href);
    response = undefined;
  }
  if (!response) throw new Error(`Too many redirects fetching ${raw}`);
  if (!response.ok) throw new Error(`Fetching ${raw} failed with HTTP ${response.status}`);

  const contentType = response.headers.get("content-type")?.split(";")[0].trim() ?? "";
  if (!contentType.startsWith("image/")) throw new Error(`${raw} is not an image (${contentType || "no content type"})`);

  const body = await readLimited(response);
  const filename = decodeURIComponent(url.pathname.split("/").pop() || "image").slice(0, 100);
  const asset = await getWriteClient().assets.upload("image", body, { filename, contentType });
  return {
    _type: "image" as const,
    _key: newKey(),
    asset: { _type: "reference" as const, _ref: asset._id },
    ...(alt ? { alt } : {}),
  };
}
