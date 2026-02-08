import { describe, it, expect } from "vitest";
import { formatCurrency, formatPercentage, getPeriodIdentifier } from "../utils";

describe("formatCurrency", () => {
  it("formats cents to EUR currency string", () => {
    expect(formatCurrency(500)).toBe("5,00\u00a0€");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("0,00\u00a0€");
  });

  it("formats single cent", () => {
    expect(formatCurrency(1)).toBe("0,01\u00a0€");
  });

  it("formats large amounts", () => {
    expect(formatCurrency(123456)).toBe("1\u202f234,56\u00a0€");
  });

  it("formats negative amounts", () => {
    expect(formatCurrency(-500)).toBe("-5,00\u00a0€");
  });
});

describe("formatPercentage", () => {
  it("formats a percentage value", () => {
    expect(formatPercentage(15)).toBe("15%");
  });

  it("formats zero percent", () => {
    expect(formatPercentage(0)).toBe("0%");
  });

  it("formats 100 percent", () => {
    expect(formatPercentage(100)).toBe("100%");
  });
});

describe("getPeriodIdentifier", () => {
  it("returns year for yearly period", () => {
    const date = new Date(2026, 1, 8); // Feb 8, 2026
    expect(getPeriodIdentifier("yearly", date)).toBe("2026");
  });

  it("returns year-month for monthly period", () => {
    const date = new Date(2026, 1, 8); // Feb 8, 2026
    expect(getPeriodIdentifier("monthly", date)).toBe("2026-02");
  });

  it("pads single-digit months", () => {
    const date = new Date(2026, 0, 15); // Jan 15, 2026
    expect(getPeriodIdentifier("monthly", date)).toBe("2026-01");
  });

  it("returns year-Wxx for weekly period", () => {
    const date = new Date(2026, 1, 8); // Feb 8, 2026
    const result = getPeriodIdentifier("weekly", date);
    expect(result).toMatch(/^2026-W\d{2}$/);
  });

  it("pads single-digit week numbers", () => {
    const date = new Date(2026, 0, 3); // Jan 3, 2026 - early week
    const result = getPeriodIdentifier("weekly", date);
    expect(result).toMatch(/^2026-W0\d$/);
  });

  it("uses current date when no date provided", () => {
    const result = getPeriodIdentifier("yearly");
    expect(result).toBe(String(new Date().getFullYear()));
  });
});
