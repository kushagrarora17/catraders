import { describe, expect, test } from "bun:test";
import { normalizeAlertPageUrl, routeRuntimeAlerts, runtimeIncident } from "./runtime-incidents";

const subscription = "11111111-1111-1111-1111-111111111111";
const scope = { subscription, resourceGroup: "rg-catraders-prod", rulePrefix: "catraders-prod" };
const alert = () => ({
  id: `/subscriptions/${subscription}/providers/Microsoft.AlertsManagement/alerts/22222222-2222-2222-2222-222222222222`,
  name: "customer@example.com secret-value",
  properties: { essentials: {
    alertRule: "catraders-prod-runtime-web-http5xx",
    targetResource: `/subscriptions/${subscription}/resourceGroups/rg-catraders-prod/providers/Microsoft.Web/sites/app`,
    severity: "Sev1", monitorCondition: "Fired", startDateTime: "2026-11-09T12:00:00Z",
    description: "customer@example.com secret-value", alertContext: { requestBody: "customer@example.com secret-value" },
  } },
});

describe("runtime incident boundary", () => {
  test("publishes only static capabilities, severity, canonical time and opaque alert id", () => {
    const incident = runtimeIncident(alert(), scope)!;
    expect(incident.title).toBe("[Runtime] Website server errors requires triage");
    expect(incident.body).toContain("2026-11-09T12:00:00.000Z");
    expect(JSON.stringify(incident)).not.toContain("customer@example.com");
    expect(JSON.stringify(incident)).not.toContain("secret-value");
    expect(incident.body).not.toContain(subscription);
  });

  test("accepts scoped rule ARM IDs while rejecting the same name in a foreign group", () => {
    const sample = alert();
    const name = sample.properties.essentials.alertRule;
    sample.properties.essentials.alertRule = `/subscriptions/${subscription}/resourceGroups/rg-catraders-prod/providers/Microsoft.Insights/metricAlerts/${name}`;
    expect(runtimeIncident(sample, scope)).not.toBeNull();
    sample.properties.essentials.alertRule = sample.properties.essentials.alertRule.replace("rg-catraders-prod", "other");
    expect(runtimeIncident(sample, scope)).toBeNull();
  });

  test("normalizes Azure default-port pagination and rejects foreign origins, paths and credentials", () => {
    const base = `https://management.azure.com/subscriptions/${subscription}/resourceGroups/rg-catraders-prod/providers/Microsoft.AlertsManagement/alerts`;
    expect(normalizeAlertPageUrl(`${base.replace(".com/", ".com:443/")}?next=1`, base)).toBe(`${base}?next=1`);
    for (const candidate of [base.replace(".com/", ".com.attacker.test/"), base.replace("https:", "http:"), base.replace(".com/", ".com:444/"), `${base}/other`, base.replace("https://", "https://user@"), `${base}#fragment`]) {
      expect(() => normalizeAlertPageUrl(candidate, base)).toThrow();
    }
  });

  test("ignores foreign resources, unknown rules, low priority and malformed metadata", () => {
    const invalid = [
      { targetResource: `/subscriptions/${subscription}/resourceGroups/other/providers/Microsoft.Web/sites/app` },
      { alertRule: "customer@example.com" }, { severity: "Sev3" }, { severity: "Sev1\nsecret-value" },
      { monitorCondition: "Unknown" }, { startDateTime: "customer@example.com" },
      { startDateTime: "2026-99-99T12:00:00Z" },
    ];
    for (const changes of invalid) {
      const sample = alert();
      Object.assign(sample.properties.essentials, changes);
      expect(runtimeIncident(sample, scope)).toBeNull();
    }
    expect(runtimeIncident({ ...alert(), id: "/untrusted/22222222-2222-2222-2222-222222222222" }, scope)).toBeNull();
  });

  test("retains short failures already resolved before the polling run", () => {
    const sample = alert();
    sample.properties.essentials.monitorCondition = "Resolved";
    expect(runtimeIncident(sample, scope)?.body).toContain("Resolved before triage");
  });

  test("repeated polling and duplicate pages create one incident", async () => {
    const issues: { body: string | null }[] = [];
    const created: string[] = [];
    const create = async (incident: { body: string }) => { created.push(incident.body); };
    expect(await routeRuntimeAlerts([alert(), alert()], scope, issues, create)).toBe(1);
    expect(await routeRuntimeAlerts([alert()], scope, issues, create)).toBe(0);
    expect(created).toHaveLength(1);
  });

  test("a manually closed incident is not recreated, and human notes are untouched", async () => {
    const body = `${runtimeIncident(alert(), scope)!.body}\nOwner notes`;
    const issues = [{ body }]; // Caller includes open and closed issues.
    expect(await routeRuntimeAlerts([alert()], scope, issues, async () => { throw new Error("unexpected create"); })).toBe(0);
    expect(issues[0].body).toBe(body);
  });

  test("a GitHub write failure propagates without marking the alert delivered", async () => {
    const issues: { body: string | null }[] = [];
    await expect(routeRuntimeAlerts([alert()], scope, issues, async () => { throw new Error("unavailable"); })).rejects.toThrow("unavailable");
    expect(issues).toHaveLength(0);
  });
});
