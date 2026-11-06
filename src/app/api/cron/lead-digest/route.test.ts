import { afterEach, expect, spyOn, test } from "bun:test";
import { POST } from "./route";

const saved = {
  secret: process.env.CRON_SECRET,
  connection: process.env.AZURE_COMMUNICATION_CONNECTION_STRING,
  sender: process.env.EMAIL_SENDER_ADDRESS,
  notify: process.env.QUOTE_NOTIFICATION_EMAIL,
};

afterEach(() => {
  for (const [key, value] of Object.entries({
    CRON_SECRET: saved.secret,
    AZURE_COMMUNICATION_CONNECTION_STRING: saved.connection,
    EMAIL_SENDER_ADDRESS: saved.sender,
    QUOTE_NOTIFICATION_EMAIL: saved.notify,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function request(secret?: string) {
  const headers = new Headers();
  if (secret !== undefined) headers.set("x-cron-secret", secret);
  return POST(new Request("http://localhost/api/cron/lead-digest", { method: "POST", headers }));
}

test("rejects a missing or wrong cron secret", async () => {
  process.env.CRON_SECRET = "test-cron-secret";
  expect((await request()).status).toBe(401);
  expect((await request("nope")).status).toBe(401);
  expect(await (await request("nope")).json()).toEqual({ message: "Unauthorized" });
});

test("reports that the digest is not configured without logging the secret", async () => {
  delete process.env.CRON_SECRET;
  const error = spyOn(console, "error").mockImplementation(() => {});
  try {
    const response = await request("whatever-the-caller-sent");
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: "Digest not configured" });
    const logged = error.mock.calls.flat().join(" ");
    expect(logged).toContain("CRON_SECRET is not set");
    expect(logged).not.toContain("whatever-the-caller-sent");
  } finally {
    error.mockRestore();
  }
});

test("does not send mail when ACS is unset, and names that failure", async () => {
  process.env.CRON_SECRET = "test-cron-secret";
  delete process.env.AZURE_COMMUNICATION_CONNECTION_STRING;
  delete process.env.EMAIL_SENDER_ADDRESS;
  delete process.env.QUOTE_NOTIFICATION_EMAIL;
  const error = spyOn(console, "error").mockImplementation(() => {});
  try {
    const response = await request("test-cron-secret");
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ message: "Email not configured" });
    expect(error.mock.calls.flat().join(" ")).toContain("[email] Failed reference=digest type=digest reason=email_not_configured");
  } finally {
    error.mockRestore();
  }
});
