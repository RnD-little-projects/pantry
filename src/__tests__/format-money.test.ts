import { describe, expect, it } from "vitest";
import { formatMoney } from "../lib/utils";

describe("formatMoney", () => {
  it("prints receipt-style amounts with two decimals and grouping", () => {
    expect(formatMoney(0)).toBe("0.00");
    expect(formatMoney(92)).toBe("92.00");
    expect(formatMoney(1240.5)).toBe("1,240.50");
  });
});
