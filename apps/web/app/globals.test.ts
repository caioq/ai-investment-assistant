import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const CSS_PATH = path.join(__dirname, "globals.css");
const css = readFileSync(CSS_PATH, "utf-8");

// Every design token name a component is expected to reference via var(--token-name).
const REQUIRED_TOKENS = [
  "--bg-app",
  "--bg-card",
  "--bg-card-alt",
  "--border",
  "--text-primary",
  "--text-secondary",
  "--text-tertiary",
  "--navy",
  "--navy-2",
  "--blue",
  "--emerald",
  "--emerald-light",
  "--red",
  "--amber",
  "--shadow",
  "--shadow-lg",
];

function extractRootBlocks(source: string): string[] {
  const blocks: string[] = [];
  const rootRegex = /:root\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = rootRegex.exec(source)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

describe("globals.css design tokens", () => {
  const rootDeclarations = extractRootBlocks(css).join("\n");

  it.each(REQUIRED_TOKENS)("declares %s on :root with a non-empty value", (token) => {
    const declarationRegex = new RegExp(
      `(?:^|[\\s;{])${token.replace(/-/g, "\\-")}\\s*:\\s*([^;]+);`,
    );
    const match = rootDeclarations.match(declarationRegex);
    expect(match, `expected ${token} to be declared on :root`).not.toBeNull();
    expect(match![1].trim().length).toBeGreaterThan(0);
  });

  it("declares no hex color literal outside a custom-property declaration", () => {
    const hexRegex = /#[0-9A-Fa-f]{3,8}\b/g;
    const offendingLines = css
      .split("\n")
      .filter((line) => hexRegex.test(line))
      .filter((line) => !/^\s*--[\w-]+\s*:/.test(line));

    expect(offendingLines).toEqual([]);
  });
});
