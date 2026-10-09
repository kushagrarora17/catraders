import { describe, expect, test } from "bun:test";
import { quoteRequestSchema } from "./schema";

const valid = {
  customer: { name: "  Jane Doe ", email: "jane@example.com", phone: "+19876543210", city: "London", company: "Apex Tuning" },
  items: [{ productId: "abc123", title: "Synthetic 5W-30 Engine Oil 4 L", sku: "EO-5W30-4L", quantity: 4 }],
  notes: "Looking for bulk delivery timeline estimates.",
};

describe("quoteRequestSchema", () => {
  test("accepts a valid request and trims strings", () => {
    const result = quoteRequestSchema.parse(valid);
    expect(result.customer.name).toBe("Jane Doe");
    expect(result.items[0].quantity).toBe(4);
  });

  test("turns empty optional fields into undefined", () => {
    const result = quoteRequestSchema.parse({ ...valid, notes: "   " });
    expect(result.notes).toBeUndefined();
  });

  test("strips unknown keys", () => {
    const result = quoteRequestSchema.parse({ ...valid, status: "quoted" });
    expect(result).not.toHaveProperty("status");
  });

  test.each([
    ["missing name", { ...valid, customer: { ...valid.customer, name: " " } }, "customer.name"],
    ["missing business", { ...valid, customer: { ...valid.customer, company: " " } }, "customer.company"],
    ["bad email", { ...valid, customer: { ...valid.customer, email: "nope" } }, "customer.email"],
    ["bad phone", { ...valid, customer: { ...valid.customer, phone: "call me" } }, "customer.phone"],
    ["missing city", { ...valid, customer: { ...valid.customer, city: " " } }, "customer.city"],
    ["no items", { ...valid, items: [] }, "items"],
    ["zero quantity", { ...valid, items: [{ ...valid.items[0], quantity: 0 }] }, "items.0.quantity"],
    ["fractional quantity", { ...valid, items: [{ ...valid.items[0], quantity: 1.5 }] }, "items.0.quantity"],
    ["injected product id", { ...valid, items: [{ ...valid.items[0], productId: "a' OR 1=1" }] }, "items.0.productId"],
    ["duplicate products", { ...valid, items: [valid.items[0], valid.items[0]] }, "items"],
  ])("rejects %s", (_, input, path) => {
    const result = quoteRequestSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path.join("."))).toContain(path);
  });
});
