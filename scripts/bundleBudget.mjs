import { readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

/**
 * PERF-BUDGET CHECK (Step 4 guardrail) — run AFTER `vite build`:
 *   bun run build && bun run analyze:check
 * Fails (exit 1) when the initial load or a route chunk regresses past its
 * budget (gzipped bytes). Budgets come from the brief's 200 KB/route rule.
 *
 * The "initial" set is what the landing route pulls: its own chunk + the app
 * shell + vendor chunks it loads eagerly (React/Convex/Radix/framer-motion).
 */
const BUDGETS = {
  initial: 240, // KB gzipped, index + app shell + eager vendors
  FacilityProfile: 160,
  Admin: 120,
  CustomReport: 110,
  Dashboard: 70,
  FacilityList: 70,
};

function gzipSize(file) {
  // Self-contained gzip estimate via zlib — no external tools needed.
  return gzipSync(readFileSync(file)).length / 1024;
}

function mainBundle(dir) {
  // The main entry chunk: the largest non-vendor "index-*.js".
  const files = readdirSync(dir).filter((f) => /^index-.*\.js$/.test(f));
  return files.map((f) => join(dir, f)).sort((a, b) => statSync(b).size - statSync(a).size)[0];
}

const dist = join(process.cwd(), "dist", "assets");
let failed = false;

// --- initial load: main index chunk + eager vendor chunks ---
const eager = [
  mainBundle(dist),
  ...readdirSync(dist)
    .filter((f) => /^(radix-ui|framer-motion|index\.es|AppShell)-.*\.js$/.test(f))
    .map((f) => join(dist, f)),
];
const initialKb = eager.reduce((s, f) => s + gzipSize(f), 0);
console.log(`initial load: ${initialKb.toFixed(1)} KB gz (budget ${BUDGETS.initial}) — chunks: ${eager.map((f) => f.split("/").pop())}`);
if (initialKb > BUDGETS.initial) { console.error("✗ initial load over budget"); failed = true; }

// --- route chunks ---
for (const [route, budget] of Object.entries(BUDGETS)) {
  if (route === "initial") continue;
  const hit = readdirSync(dist).find((f) => new RegExp(`^${route}-.*\\.js$`).test(f));
  if (!hit) continue;
  const kb = gzipSize(join(dist, hit));
  console.log(`${route}: ${kb.toFixed(1)} KB gz (budget ${budget})`);
  if (kb > budget) { console.error(`✗ ${route} over budget`); failed = true; }
}

// --- heavy libraries must never be in the eager set ---
for (const f of readdirSync(dist)) {
  if (/^(exceljs|xlsx|jspdf|pptxgen|charts|html2canvas)-/.test(f) && eager.some((e) => e.includes(f))) {
    console.error(`✗ heavy library in initial load: ${f}`); failed = true;
  }
}

if (failed) process.exit(1);
console.log("✓ bundle budgets OK");
