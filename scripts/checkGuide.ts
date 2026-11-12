/**
 * BUILD-TIME GUIDE CHECK — warns (never fails) when a sidebar page has no
 * article or a sentence is too long. Run: bun scripts/checkGuide.ts
 */
import { GUIDE_ARTICLES } from "../src/lib/guide";
import { NAV_ITEMS } from "../src/lib/sidebarConfig";

const missing = NAV_ITEMS.filter(
  (item) => !GUIDE_ARTICLES.some((a) => a.route === item.to),
);
const long: string[] = [];
for (const article of GUIDE_ARTICLES) {
  const sentences = [
    article.purpose,
    ...article.steps.map((s) => s.text),
    ...article.tips,
    ...article.problems.flatMap((p) => [p.problem, p.fix]),
  ];
  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/).filter(Boolean).length;
    if (words > 15) long.push(`${article.route}: “${sentence}” (${words} words)`);
  }
}

let warned = false;
if (missing.length) {
  warned = true;
  console.warn(`\nGuide: ${missing.length} sidebar page(s) have no article:`);
  for (const item of missing) console.warn(`  ${item.to}`);
}
if (long.length) {
  warned = true;
  console.warn(`\nGuide: ${long.length} sentence(s) over 15 words:`);
  for (const row of long.slice(0, 20)) console.warn(`  ${row}`);
}
if (!warned) console.log("Guide: every sidebar page has an article; sentences are short.");
