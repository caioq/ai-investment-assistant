import { describe, expect, it } from "vitest";

import { isValidEmail } from "./validation";

describe("isValidEmail", () => {
  it.each(["ana@example.com", "a.b+c@sub.domain.com.br"])(
    "returns true for %j",
    (email) => {
      expect(isValidEmail(email)).toBe(true);
    },
  );

  it.each([
    "",
    "ana@",
    "ana@example",
    "@example.com",
    "ana example@x.com",
    "ana@@example.com",
  ])("returns false for %j", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});
