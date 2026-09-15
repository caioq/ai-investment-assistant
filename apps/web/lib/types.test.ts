import { describe, expect, expectTypeOf, it } from "vitest";
import { ALLOCATION_COLOR_PALETTE, type AllocationSlice } from "./types";

describe("lib/types", () => {
  it("re-exports ALLOCATION_COLOR_PALETTE from @ai-investment-assistant/shared as a non-empty array", () => {
    expect(Array.isArray(ALLOCATION_COLOR_PALETTE)).toBe(true);
    expect(ALLOCATION_COLOR_PALETTE.length).toBeGreaterThan(0);
  });

  it("re-exports AllocationSlice with the label/value/pct/color shape AllocationDonut consumes", () => {
    expectTypeOf<AllocationSlice>().toHaveProperty("label").toEqualTypeOf<string>();
    expectTypeOf<AllocationSlice>().toHaveProperty("value").toEqualTypeOf<number>();
    expectTypeOf<AllocationSlice>().toHaveProperty("pct").toEqualTypeOf<number>();
    expectTypeOf<AllocationSlice>().toHaveProperty("color").toEqualTypeOf<string>();
  });
});
