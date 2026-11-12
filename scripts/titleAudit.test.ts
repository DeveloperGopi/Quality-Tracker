/**
 * CI GUARD — no native `title` attributes anywhere in the app.
 *
 * The app has ONE tooltip layer (`components/ui/Tip`, `data-tip`). A native
 * `title` makes the browser paint its own black tooltip on top of it — the
 * duplicate "Collapse sidebar (Ctrl+B)" box in the screenshot. This test runs
 * the audit over every source file (the same audit `bun scripts/titleAudit.ts`
 * runs in CI) AND checks the audit itself still catches a DOM title while
 * leaving component `title` props alone.
 *
 * Run: bun test ./scripts/titleAudit.test.ts
 */
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { auditTitles } from "./titleAudit";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === "_generated") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name) && !full.startsWith("src/convex/_generated")) out.push(full);
  }
  return out;
}

describe("native title attributes: audit", () => {
  test("no DOM element in src/ carries a title attribute", () => {
    const hits = walk("src").flatMap((file) => auditTitles(readFileSync(file, "utf8"), file));
    expect(hits.map((h) => `${h.file}:${h.line} <${h.tag}> ${h.text}`)).toEqual([]);
  });

  test("the audit catches a button/svg/span title but not a component prop", () => {
    const source = [
      'export const A = () => <button title="Collapse sidebar">x</button>;',
      'export const B = () => <svg title="icon" />;',
      'export const C = () => <span title="cut text">long</span>;',
      'export const D = () => <Option title="A heading" />;',
    ].join("\n");
    const hits = auditTitles(source);
    expect(hits.map((h) => h.tag)).toEqual(["button", "svg", "span"]);
  });

  test("there is only ONE tooltip implementation (no second library)", () => {
    /* A second tooltip implementation (Radix's `Tooltip`) renders its own
       floating box outside the top layer — the old duplicate-pill bug. Every
       control goes through `data-tip` + components/ui/Tip now. */
    const offenders = walk("src")
      .filter((f) => !f.startsWith("src/components/ui/"))
      .filter((f) => /from\s+"@\/components\/ui\/tooltip"/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  test("the one tooltip layer is mounted exactly once", async () => {
    const shell = readFileSync("src/components/AppShell.tsx", "utf8");
    expect(shell.match(/<TipLayer \/>/g) ?? []).toHaveLength(1);
    const tip = readFileSync("src/components/ui/Tip.tsx", "utf8");
    expect(tip).toContain('role="tooltip"');
    expect(tip).toContain('popover="manual"');
    expect(tip).toContain("createPortal");
    // One manager: every show path goes through the same `setTip`.
    expect(tip).toContain("export function closeTip");
  });
});
