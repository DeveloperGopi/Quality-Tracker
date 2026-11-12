/**
 * PART 0 — THE RENAME GUARD.
 *
 * "State Health Department" was retired in favour of ORG_NAME
 * ("District Quality Assurance Unit"). This test fails the build if the old
 * wording appears in source, styles, HTML or i18n copy, and checks that the
 * export/document surfaces read the ONE constant instead of a hard-coded
 * string.
 *
 * Role names ("State Admin") and stage names ("State Assessment") are not
 * organisation names and are deliberately allowed.
 *
 * Run: bun test ./scripts/orgName.test.ts
 */
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ORG_NAME, ORG_SIGNATURE, RETIRED_ORG_NAMES } from "../src/lib/org";
import { DEPARTMENT_DEFAULT } from "../src/lib/masterExport";

const ROOT = process.cwd();

/** Files allowed to contain the retired wording: the config that declares the
 *  list of retired names, and this guard itself. */
const ALLOWED = new Set(["src/lib/org.ts", "scripts/orgName.test.ts"]);

const SCAN_DIRS = ["src", "scripts", "docs", "public"];
const SCAN_FILES = ["index.html", "README.md"];
const TEXT_EXT = /\.(ts|tsx|js|jsx|css|json|md|html)$/;

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (TEXT_EXT.test(name)) out.push(full);
  }
  return out;
}

function sourceFiles(): string[] {
  const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));
  for (const f of SCAN_FILES) {
    try {
      statSync(join(ROOT, f));
      files.push(join(ROOT, f));
    } catch {
      /* optional file */
    }
  }
  return files;
}

describe("organisation rename (Part 0)", () => {
  test("the config is the single source of truth", () => {
    expect(ORG_NAME).toBe("District Quality Assurance Unit");
    expect(ORG_SIGNATURE).toBe("District Quality Assurance Unit · Quality Assurance");
  });

  test("no user-visible surface still says the retired name", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const rel = relative(ROOT, file).replaceAll("\\", "/");
      if (ALLOWED.has(rel)) continue;
      const text = readFileSync(file, "utf8");
      for (const retired of RETIRED_ORG_NAMES) {
        if (text.includes(retired)) {
          const line = text.slice(0, text.indexOf(retired)).split("\n").length;
          offenders.push(`${rel}:${line} — "${retired}"`);
          break;
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  test("Excel/CSV covers and the facility sheet read the constant", () => {
    expect(DEPARTMENT_DEFAULT).toBe(ORG_SIGNATURE);
    const sheet = readFileSync(join(ROOT, "src/lib/facilitySheet.ts"), "utf8");
    expect(sheet).toContain('import { ORG_SIGNATURE } from "@/lib/org"');
    expect(sheet).toContain("const DEPARTMENT = ORG_SIGNATURE");
    // The deck's cover and every footer read the constant through the slide
    // model (deckRender/deckPdf render `model.meta.orgName`).
    const deckModel = readFileSync(join(ROOT, "src/lib/deckModel.ts"), "utf8");
    expect(deckModel).toContain("ORG_NAME");
    expect(deckModel).toContain("signature: ORG_SIGNATURE");
    const pdf = readFileSync(join(ROOT, "src/lib/deckPdf.ts"), "utf8");
    expect(pdf).toContain("model.meta.orgName");
  });

  test("role and stage names were not renamed", () => {
    const users = readFileSync(join(ROOT, "src/lib/sidebarConfig.ts"), "utf8");
    // "State Admin" is a role; it must survive the rename untouched.
    expect(users.toLowerCase()).toContain("state admin");
  });
});
