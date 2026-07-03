import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { aviWordsBrand, colors } from "../src/theme/tokens";

const repoRoot = new URL("..", import.meta.url).pathname;

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as T;
}

describe("Avi Words public app contract", () => {
  it("keeps the product guest-first with Account AV not configured", () => {
    const packageJson = readJson<{ scripts: Record<string, string>; dependencies: Record<string, string> }>("package.json");
    expect(aviWordsBrand.suiteName).toBe("Apps AV");
    expect(aviWordsBrand.productName).toBe("Avi Words");
    expect(aviWordsBrand.identityMode).toBe("guest-first");
    expect(aviWordsBrand.accountMode).toBe("prepared-not-configured");
    expect(packageJson.dependencies["@clerk/clerk-react"]).toBeUndefined();
    expect(packageJson.scripts["deploy:preview"]).toContain("private AVALSYS runbooks");
    expect(packageJson.scripts.testflight).toContain("web-only");
  });

  it("uses Apps AV-adjacent brand anchors without private assets", () => {
    expect(colors.ink).toBe("#10151F");
    expect(colors.green).toBe("#6DBE45");
    expect(colors.line).toBe("#D8D0BF");
  });
});
