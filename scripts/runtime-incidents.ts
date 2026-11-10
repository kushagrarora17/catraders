import { execFileSync } from "node:child_process";
import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const signals = {
  "web-availability": "Website availability",
  "studio-availability": "Studio availability",
  "web-http5xx": "Website server errors",
  "database-availability": "Database availability",
  "database-storage": "Database storage pressure",
} as const;

export type RuntimeScope = { subscription: string; resourceGroup: string; rulePrefix: string };
export type Incident = { marker: string; title: string; body: string };
type Alert = { id?: unknown; properties?: { essentials?: Record<string, unknown> } };

/** Only configured signals and opaque Azure alert IDs enter the public incident. */
export function runtimeIncident(alert: Alert, scope: RuntimeScope): Incident | null {
  const essentials = alert?.properties?.essentials;
  if (!essentials || typeof alert.id !== "string") return null;
  const id = alert.id.match(/\/providers\/Microsoft\.AlertsManagement\/alerts\/([0-9a-f-]{36})$/i)?.[1];
  if (!id || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) return null;
  const subscriptionPrefix = `/subscriptions/${scope.subscription}/`;
  if (!alert.id.toLowerCase().startsWith(subscriptionPrefix.toLowerCase())) return null;
  const resourcePrefix = `${subscriptionPrefix}resourceGroups/${scope.resourceGroup}/`.toLowerCase();
  if (typeof essentials.targetResource !== "string" || !essentials.targetResource.toLowerCase().startsWith(resourcePrefix)) return null;
  const rule = essentials.alertRule;
  const signal = (Object.keys(signals) as (keyof typeof signals)[]).find(key => {
    const name = `${scope.rulePrefix}-runtime-${key}`;
    return rule === name || (typeof rule === "string" && rule.toLowerCase() === `${resourcePrefix}providers/Microsoft.Insights/metricAlerts/${name}`.toLowerCase());
  });
  if (!signal || !["Sev0", "Sev1", "Sev2"].includes(String(essentials.severity))) return null;
  if (!["Fired", "Resolved"].includes(String(essentials.monitorCondition))) return null;
  const fired = essentials.startDateTime;
  if (typeof fired !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,7})?Z$/.test(fired) || !Number.isFinite(Date.parse(fired))) return null;
  const marker = `<!-- runtime-alert:${id.toLowerCase()} -->`;
  const condition = essentials.monitorCondition === "Fired" ? "Fired" : "Resolved before triage";
  return {
    marker,
    title: `[Runtime] ${signals[signal]} requires triage`,
    body: [
      marker,
      "An Azure production runtime alert needs owner triage. Resolution of the signal does not establish recovery of the affected capability.",
      "",
      `Capability: ${signals[signal]}`,
      `Severity: ${essentials.severity}`,
      `Signal: ${condition}`,
      `Fired at: ${new Date(fired).toISOString()}`,
      `Azure alert ID: \`${id.toLowerCase()}\``,
      "",
      "Open Azure Monitor > Alerts in the production subscription and locate the alert ID. Inspect its details privately; do not paste request bodies, customer data, logs, notification addresses, or credentials here.",
      "",
      "- [ ] Assess customer impact and priority; owner is the assigned responder",
      "- [ ] Identify the last known good component delivery and follow docs/lifecycle.md",
      "- [ ] Verify the affected capability after recovery; database recovery is separate",
      "- [ ] Record detection, notification, recovery times and linked prevention work before closing",
    ].join("\n"),
  };
}

type Issue = { body: string | null };

export function normalizeAlertPageUrl(candidate: string, base: string) {
  const url = new URL(candidate);
  const expected = new URL(base);
  if (url.origin !== expected.origin || url.pathname.toLowerCase() !== expected.pathname.toLowerCase() || url.username || url.password || url.hash) throw new Error("Invalid alert pagination");
  return url.href;
}

export async function routeRuntimeAlerts(
  alerts: Alert[], scope: RuntimeScope, issues: Issue[], create: (incident: Incident) => Promise<void>,
) {
  let created = 0;
  for (const alert of alerts) {
    const incident = runtimeIncident(alert, scope);
    if (!incident || issues.some(issue => issue.body?.includes(incident.marker))) continue;
    await create(incident);
    issues.push({ body: incident.body });
    created++;
  }
  return created;
}

function command(binary: string, args: string[]) {
  // Provider error responses can contain private details; callers report a fixed failure message.
  return execFileSync(binary, args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], maxBuffer: 16 * 1024 * 1024 });
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const owner = process.env.RUNTIME_INCIDENT_OWNER;
  const resourceGroup = process.env.AZURE_RESOURCE_GROUP;
  const rulePrefix = process.env.RUNTIME_RULE_PREFIX || "catraders-prod";
  if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository) || !owner || !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(owner) || !resourceGroup || !/^[\w.-]+$/.test(resourceGroup)) throw new Error("Runtime routing configuration is missing or invalid");
  const subscription = command("az", ["account", "show", "--query", "id", "-o", "tsv"]).trim();
  if (!/^[0-9a-f-]{36}$/i.test(subscription)) throw new Error("Invalid subscription");
  const scope = { subscription, resourceGroup, rulePrefix };
  const base = `https://management.azure.com/subscriptions/${subscription}/resourceGroups/${resourceGroup}/providers/Microsoft.AlertsManagement/alerts`;
  let next: string | undefined = `${base}?api-version=2019-03-01&timeRange=1d&includeContext=false`;
  const alerts: Alert[] = [];
  const visited = new Set<string>();
  while (next) {
    next = normalizeAlertPageUrl(next, base);
    if (visited.has(next) || visited.size >= 100) throw new Error("Invalid alert pagination");
    visited.add(next);
    const page = JSON.parse(command("az", ["rest", "--method", "get", "--url", next, "-o", "json"]));
    if (!Array.isArray(page.value) || (page.nextLink !== undefined && page.nextLink !== null && typeof page.nextLink !== "string")) throw new Error("Invalid alert response");
    alerts.push(...page.value);
    next = page.nextLink || undefined;
  }
  const pages = JSON.parse(command("gh", ["api", "--paginate", "--slurp", `repos/${repository}/issues?state=all&labels=incident&per_page=100`]));
  const issues: Issue[] = pages.flat().filter((issue: { pull_request?: unknown }) => !issue.pull_request);
  const count = await routeRuntimeAlerts(alerts, scope, issues, async incident => {
    const directory = mkdtempSync(join(tmpdir(), "runtime-incident-"));
    const bodyFile = join(directory, "incident.md");
    try {
      writeFileSync(bodyFile, incident.body, { mode: 0o600 });
      command("gh", ["issue", "create", "--repo", repository!, "--title", incident.title, "--label", "incident", "--label", "infra", "--assignee", owner!, "--body-file", bodyFile]);
    } finally {
      unlinkSync(bodyFile);
      rmdirSync(directory);
    }
  });
  console.log(`Runtime incident routing completed: ${count} new incident(s).`);
}

if (import.meta.main) {
  main().catch(() => {
    console.error("Runtime incident routing failed. Check Azure/GitHub access and routing configuration privately; no provider response was logged.");
    process.exitCode = 1;
  });
}
