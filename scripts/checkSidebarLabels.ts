/**
 * BUILD-TIME CHECK — sidebar label budget.
 *
 * Nav labels render on ONE 44px line with an ellipsis, so a label longer than
 * SIDEBAR_LABEL_MAX (24 characters) will be cut. This check warns for every
 * over-budget label in every language (English + Tamil) during `bun run build`
 * and never fails the build: a long label is a design smell, not a breakage.
 *
 * Run directly: bun scripts/checkSidebarLabels.ts
 */
import {
  SIDEBAR_LABEL_MAX,
  SIDEBAR_LANGUAGES,
  checkSidebarLabelLengths,
} from "../src/lib/sidebarLabels";

const issues = checkSidebarLabelLengths();

if (issues.length === 0) {
  console.log(
    `✓ sidebar labels: all ${SIDEBAR_LANGUAGES.length} languages within ${SIDEBAR_LABEL_MAX} characters`,
  );
} else {
  for (const issue of issues) {
    console.warn(
      `⚠ sidebar label too long (${issue.length}/${issue.max} chars) [${issue.lang}] ${issue.key}: “${issue.label}”`,
    );
  }
  console.warn(
    `⚠ ${issues.length} sidebar label(s) will be truncated with an ellipsis — shorten them in src/lib/sidebarLabels.ts`,
  );
}

// A warning only: the build continues.
process.exit(0);
