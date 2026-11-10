import "server-only";
import { createHash } from "node:crypto";
import { client } from "@/sanity/client";
import { projectId as catalogProjectId } from "@/sanity/env";

export function normalizeOperatorEmail(email: string) {
  return email.trim().normalize("NFKC").toLowerCase();
}

function operatorClient() {
  const projectId = process.env.SANITY_OPERATOR_PROJECT_ID;
  const dataset = process.env.SANITY_OPERATOR_DATASET;
  const token = process.env.SANITY_OPERATOR_API_READ_TOKEN;
  if (!projectId || !isSeparateOperatorProject(projectId, catalogProjectId) || !dataset || !token) {
    throw new Error("Separate private MCP operator Sanity project is not configured");
  }
  return client.withConfig({ projectId, dataset, token, useCdn: false, perspective: "published" });
}

export const isSeparateOperatorProject = (operatorProjectId: string | undefined, catalogId: string) =>
  !!operatorProjectId && operatorProjectId !== catalogId;

function emailDocumentId(email: string) {
  return `mcpOperator.${createHash("sha256").update(normalizeOperatorEmail(email)).digest("hex")}`;
}

type OperatorIdentity = {
  _rev: string;
  email: string;
  enabled: boolean;
  microsoftIssuer?: string;
  microsoftSubject?: string;
  googleIssuer?: string;
  googleSubject?: string;
};

async function findOperatorByEmail(email: string): Promise<OperatorIdentity | null> {
  const normalized = normalizeOperatorEmail(email);
  const operator = await operatorClient().getDocument<OperatorIdentity & { _type?: string }>(emailDocumentId(normalized));
  if (!operator || operator._type !== "mcpOperator" || operator.enabled !== true || typeof operator._rev !== "string" || normalizeOperatorEmail(operator.email) !== normalized) return null;
  return operator;
}

export async function authorizeGoogleOperator(email: string, verified: boolean, issuer: string, subject: string, hostedDomain?: string) {
  if (!verified) return null;
  const normalized = normalizeOperatorEmail(email);
  const domain = normalized.split("@")[1];
  const gmail = domain === "gmail.com";
  const verifiedWorkspace = !!hostedDomain && hostedDomain.toLowerCase() === domain;
  const operator = await findOperatorByEmail(normalized);
  if (!operator) return null;
  if (gmail || verifiedWorkspace) return operator;
  return operator.googleIssuer === issuer && operator.googleSubject === subject ? operator : null;
}

export async function authorizeMicrosoftOperator(issuer: string, subject: string) {
  const operator = await operatorClient().fetch<OperatorIdentity & { _type?: string } | null>(
    '*[_type == "mcpOperator" && enabled == true && microsoftIssuer == $issuer && microsoftSubject == $subject][0]',
    { issuer, subject },
  );
  if (!operator || operator._type !== "mcpOperator" || operator.enabled !== true) return null;
  if (operator.microsoftIssuer !== issuer || operator.microsoftSubject !== subject) return null;
  return operator;
}

export async function isActiveOperator(email: string, revision: string) {
  return (await findOperatorByEmail(email))?._rev === revision;
}
