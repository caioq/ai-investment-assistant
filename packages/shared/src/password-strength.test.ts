import { describe, expect, it } from "vitest";

import { scorePassword } from "./password-strength";

describe("scorePassword", () => {
  it.each([
    ["", 0, "Too weak"],
    ["abc", 0, "Too weak"],
    ["abcdefgh", 1, "Weak"],
    ["abcdefgh1", 2, "Fair"],
    ["Abcdefgh1", 3, "Good"],
    // Raw score is 5 (>=8, >=12, mixed case, digit, symbol); capped at 4.
    ["Abcdefgh1!xy", 4, "Strong"],
    ["abcdefghijkl", 2, "Fair"],
  ] as const)("scores %j as %i (%s)", (password, score, label) => {
    expect(scorePassword(password)).toEqual({ score, label });
  });
});
