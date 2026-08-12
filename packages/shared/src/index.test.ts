import { describe, expect, it } from "vitest";

import { SHARED_PACKAGE_NAME } from "./index";

describe("SHARED_PACKAGE_NAME", () => {
  it("equals the expected package name", () => {
    expect(SHARED_PACKAGE_NAME).toBe("shared");
  });
});
