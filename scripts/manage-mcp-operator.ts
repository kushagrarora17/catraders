import { createHash } from "node:crypto";
import { createClient } from "@sanity/client";

const [action, rawEmail, issuer, subject] = process.argv.slice(2);
const email = rawEmail?.trim().normalize("NFKC").toLowerCase();
const projectId = process.env.SANITY_OPERATOR_PROJECT_ID;
const dataset = process.env.SANITY_OPERATOR_DATASET;
const token = process.env.SANITY_OPERATOR_ADMIN_TOKEN;
const catalogProjectId = process.env.SANITY_PROJECT_ID || "51ngrb7a";

if (!action || !email || !projectId || projectId === catalogProjectId || !dataset || !token) {
  throw new Error("Set the separate private operator project/dataset and SANITY_OPERATOR_ADMIN_TOKEN; provide an action and operator email.");
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid operator email address.");

const id = `mcpOperator.${createHash("sha256").update(email).digest("hex")}`;
const client = createClient({ projectId, dataset, token, apiVersion: "2026-09-01", useCdn: false });

if (action === "enroll-google") {
  await client.createIfNotExists({ _id: id, _type: "mcpOperator", email, enabled: true });
} else {
  const current = await client.getDocument<{ _type: string; email: string }>(id);
  if (!current || current._type !== "mcpOperator" || current.email !== email) throw new Error("The canonical operator entry does not exist; enroll the verified email first.");
  if (action === "revoke") await client.patch(id).set({ enabled: false }).commit();
  else if (action === "restore") await client.patch(id).set({ enabled: true }).commit();
  else if (action === "bind-microsoft" || action === "bind-google") {
    if (!issuer || !subject) throw new Error("Provider binding requires the verified OIDC issuer and subject.");
    const microsoft = action === "bind-microsoft";
    await client.patch(id).set(microsoft
      ? { microsoftIssuer: issuer, microsoftSubject: subject }
      : { googleIssuer: issuer, googleSubject: subject }).commit();
  } else {
    throw new Error("Use enroll-google, bind-google, bind-microsoft, revoke, or restore.");
  }
}

console.log(`Updated private MCP operator entry ${id}.`);
