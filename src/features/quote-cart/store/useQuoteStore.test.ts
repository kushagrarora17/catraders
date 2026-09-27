import { beforeEach, describe, expect, test } from "bun:test";
import { useQuoteStore } from "./useQuoteStore";

const oil = { productId: "p1", title: "Synthetic 5W-30", sku: "EO-5W30-4L", slug: "synthetic-5w-30", quantity: 2 };
const coolant = { productId: "p2", title: "OAT Coolant", slug: "oat-coolant", quantity: 1 };

describe("useQuoteStore", () => {
  beforeEach(() => useQuoteStore.getState().clearQuote());

  test("adds items and merges quantities for the same product", () => {
    const { addItem } = useQuoteStore.getState();
    addItem(oil);
    addItem(coolant);
    addItem({ ...oil, quantity: 3 });
    expect(useQuoteStore.getState().items).toEqual([{ ...oil, quantity: 5 }, coolant]);
  });

  test("updates quantity and removes items", () => {
    const { addItem, updateQuantity, removeItem } = useQuoteStore.getState();
    addItem(oil);
    addItem(coolant);
    updateQuantity("p2", 7);
    removeItem("p1");
    expect(useQuoteStore.getState().items).toEqual([{ ...coolant, quantity: 7 }]);
  });

  test("persists under the namespaced localStorage key", () => {
    useQuoteStore.getState().addItem(oil);
    const stored = JSON.parse(localStorage.getItem("automotive-quote-basket")!);
    expect(stored.state.items).toEqual([oil]);
  });
});
