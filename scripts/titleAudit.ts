/**
 * CI GUARD — no native `title` tooltips on DOM elements.
 *
 * The app has ONE tooltip layer (`components/ui/Tip`), driven by `data-tip`.
 * A native `title` attribute draws the browser's own black tooltip on top of
 * it (the duplicate "Collapse sidebar (Ctrl+B)" box in the screenshot), so it
 * is banned on anything that reaches the DOM — lowercase tags AND our
 * DOM-forwarding components (`<Button title>`, `<Link title>`,
 * `<DropdownMenuItem title>`), which React passes straight through.
 *
 * Components whose `title` is a *heading* prop (`<AppShell title>`,
 * `<Option title>`, `<Slide title>`, …) are allowed: they never reach an
 * attribute.
 *
 * The scanner walks each JSX opening tag and reads its attributes at brace
 * depth 0, and inside `{…}` it understands strings, template literals and
 * comments — so an apostrophe in a JSX comment no longer swallows the rest of
 * the file (the old scanner silently missed real hits that way).
 *
 * Usage:  bun scripts/titleAudit.ts          (exit 1 when a DOM title is found)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src";
const SKIP = new Set(["node_modules", "dist"]);
/** `<Component title>` where `title` is a heading prop, not a DOM attribute. */
const HEADING_PROP_COMPONENTS = new Set([
  "AppShell",
  "Option",
  "Slide",
  "SectionCard",
  "RecordSection",
  "PrintTable",
  "SectionHeader",
  "EmptyState",
  "ToggleRow",
  "FormSection",
  "ModuleRecords",
]);

export type TitleHit = { file: string; line: number; tag: string; text: string };

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (SKIP.has(name) || name === "_generated") continue;
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

/** Skip a quoted run starting at `i` (the opening quote). Returns the index
 *  after the closing quote. */
function skipQuoted(src: string, i: number): number {
  const quote = src[i];
  let j = i + 1;
  while (j < src.length) {
    const ch = src[j];
    if (ch === "\\") {
      j += 2;
      continue;
    }
    if (ch === quote) return j + 1;
    if (ch === "\n" && quote !== "`") return j + 1; // unterminated: give up early
    j += 1;
  }
  return j;
}

/** Skip a comment starting at `i` (either `//` or `/*`). */
function skipComment(src: string, i: number): number {
  if (src[i + 1] === "/") {
    const nl = src.indexOf("\n", i);
    return nl < 0 ? src.length : nl + 1;
  }
  const end = src.indexOf("*/", i + 2);
  return end < 0 ? src.length : end + 2;
}

/** Every `title=` attribute that reaches the DOM. */
export function auditTitles(source: string, file = "src/x.tsx"): TitleHit[] {
  const hits: TitleHit[] = [];
  const lineOf = (index: number) => source.slice(0, index).split("\n").length;
  const open = /<([A-Za-z][\w.:-]*)(?=[\s/>])/g;
  let m: RegExpExecArray | null;
  while ((m = open.exec(source))) {
    const tag = m[1];
    const isDom = /^[a-z]/.test(tag);
    const headingProp = HEADING_PROP_COMPONENTS.has(tag);
    let i = m.index + m[0].length;
    let depth = 0;
    while (i < source.length) {
      const ch = source[i];
      if (depth === 0) {
        // Attribute level: quotes only wrap an attribute value, a `>` closes
        // the tag and `{` opens an expression.
        if (ch === ">") {
          i += 1;
          break;
        }
        if (ch === '"' || ch === "'") {
          i = skipQuoted(source, i);
          continue;
        }
        if (ch === "{") {
          depth = 1;
          i += 1;
          continue;
        }
        if (
          ch === "t" &&
          /^title\s*=/.test(source.slice(i, i + 8)) &&
          !/[\w$.-]/.test(source[i - 1] ?? "") &&
          (isDom || !headingProp)
        ) {
          const line = lineOf(i);
          const text = (source.split("\n")[line - 1] ?? "").trim();
          if (!/^(\/\/|\*)/.test(text)) hits.push({ file, line, tag, text });
          i += 5;
          continue;
        }
        i += 1;
        continue;
      }
      // Inside `{…}`: expressions, strings, templates and comments.
      if (ch === "/" && (source[i + 1] === "/" || source[i + 1] === "*")) {
        i = skipComment(source, i);
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        i = skipQuoted(source, i);
        continue;
      }
      if (ch === "{") depth += 1;
      else if (ch === "}") depth -= 1;
      i += 1;
    }
    open.lastIndex = Math.max(i, m.index + m[0].length);
  }
  return hits;
}

if (import.meta.main) {
  const files = walk(ROOT);
  const hits = files.flatMap((f) => auditTitles(readFileSync(f, "utf8"), f));
  if (hits.length) {
    console.error(`Native title attributes on DOM elements: ${hits.length}`);
    for (const h of hits) console.error(`  ${h.file}:${h.line} <${h.tag}> ${h.text}`);
    process.exit(1);
  }
  console.log("OK — no native title attributes on DOM elements.");
}
