"use node";

/**
 * OPTIONAL LINK CHECK — Node action, OFF by default (Admin → Links).
 *
 * Every URL, and every redirect hop, passes `guardLinkCheckUrl` plus a DNS
 * resolution check before `fetch` is called: private, loopback, link-local and
 * metadata addresses are refused (SSRF guard). At most 3 redirects, 5 s
 * timeout, 64 KB response sample, 4 checks in parallel, a polite user agent,
 * 24-hour cache. A check never touches `link_item.status`.
 */

import { lookup } from "node:dns/promises";

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { internal, api } from "./_generated/api";
import {
  LINK_CHECK_BYTE_LIMIT,
  LINK_CHECK_MAX_REDIRECTS,
  LINK_CHECK_PARALLEL,
  LINK_CHECK_TIMEOUT_MS,
  guardLinkCheckUrl,
  isBlockedAddress,
  statusFromResponse,
  type LinkCheckStatus,
} from "../lib/linkCheck";

type CheckRow = { id: Id<"link_url">; url: string; title: string };
type LinkCheckSettings = { enabled: boolean; weekly: boolean; lastRunAt: number };
type LinkCheckRunResult = {
  checked: number;
  skipped: number;
  enabled: boolean;
  reason?: string;
  statuses?: Record<string, number>;
};

const USER_AGENT = "SaQsham-LinkCheck/1.0 (+district-quality-check)";

async function assertPublicHost(hostname: string): Promise<void> {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const addresses = await lookup(host, { all: true, verbatim: true });
  if (!addresses.length) throw new Error("No address");
  for (const address of addresses) {
    if (isBlockedAddress(address.address)) throw new Error("Blocked address");
  }
}

async function readLimited(response: Response): Promise<void> {
  if (!response.body) return;
  const reader = response.body.getReader();
  let bytes = 0;
  try {
    while (bytes < LINK_CHECK_BYTE_LIMIT) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value?.byteLength ?? 0;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

async function checkOne(rawUrl: string): Promise<LinkCheckStatus> {
  const first = guardLinkCheckUrl(rawUrl);
  if (!first.ok) return "not_checked";
  if (first.loginGated) return "not_checked";

  let current = first.url;
  try {
    for (let hop = 0; hop <= LINK_CHECK_MAX_REDIRECTS; hop += 1) {
      const guarded = guardLinkCheckUrl(current.toString());
      if (!guarded.ok) return "not_checked";
      await assertPublicHost(guarded.url.hostname);

      const response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(LINK_CHECK_TIMEOUT_MS),
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        },
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        response.body?.cancel().catch(() => undefined);
        if (!location || hop === LINK_CHECK_MAX_REDIRECTS) return "not_checked";
        current = new URL(location, current);
        continue;
      }

      await readLimited(response);
      return statusFromResponse(response.status);
    }
    return "not_checked";
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") return "timeout";
    return "not_checked";
  }
}

async function mapLimit<T, R>(
  rows: T[],
  limit: number,
  fn: (row: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(rows.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, rows.length)) }, async () => {
    while (next < rows.length) {
      const index = next;
      next += 1;
      out[index] = await fn(rows[index]);
    }
  });
  await Promise.all(workers);
  return out;
}

async function runCheck(ctx: ActionCtx, manual: boolean): Promise<LinkCheckRunResult> {
  const settings: LinkCheckSettings = await ctx.runQuery(internal.links.linkCheckSettings, {});
  if (manual && !settings.enabled) {
    return { checked: 0, skipped: 0, enabled: false, reason: "Link checker is off" };
  }
  if (!manual) {
    const now = Date.now();
    const sixDays = 6 * 24 * 60 * 60 * 1000;
    if (!settings.enabled || !settings.weekly || now - settings.lastRunAt < sixDays) {
      return { checked: 0, skipped: 0, enabled: settings.enabled, reason: "not due" };
    }
    await ctx.runMutation(internal.links.markLinkCheckRun, { at: now });
  }

  const targetData = await ctx.runQuery(internal.links.linkCheckTargets, {});
  const rows = targetData.targets as CheckRow[];
  const now = Date.now();
  const results = await mapLimit(rows, LINK_CHECK_PARALLEL, async (row) => ({
    id: row.id,
    status: await checkOne(row.url),
    checkedAt: now,
  }));
  if (results.length) {
    await ctx.runMutation(internal.links.setCheckResultInternal, { urls: results });
  }
  return {
    checked: results.length,
    skipped: rows.length - results.length,
    enabled: settings.enabled,
    statuses: results.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1;
      return acc;
    }, {}),
  };
}

/** Public page title for the quick-add draft. Login-gated hosts return null
 *  immediately (no request); the draft falls back to pasted text or the URL
 *  words. Same SSRF guard and timeout as the checker. */
export const pageTitle = action({
  args: { url: v.string() },
  handler: async (ctx, { url }): Promise<{ title: string | null }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in first");
    const guarded = guardLinkCheckUrl(url);
    if (!guarded.ok || guarded.loginGated) return { title: null };
    try {
      await assertPublicHost(guarded.url.hostname);
      const response = await fetch(guarded.url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(LINK_CHECK_TIMEOUT_MS),
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        },
      });
      if (!response.ok || !response.body) return { title: null };
      const type = response.headers.get("content-type") ?? "";
      if (!type.includes("text/html")) {
        response.body.cancel().catch(() => undefined);
        return { title: null };
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      let bytes = 0;
      while (bytes < LINK_CHECK_BYTE_LIMIT) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value?.byteLength ?? 0;
        text += decoder.decode(value, { stream: true });
        if (/<\/title>/i.test(text)) break;
      }
      await reader.cancel().catch(() => undefined);
      const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(text)?.[1]
        ?.replace(/\s+/g, " ")
        .trim()
        .slice(0, 180);
      return { title: title || null };
    } catch {
      return { title: null };
    }
  },
});

/** Manual “Check links” action (State Admin, only when Admin → Links enables it). */
export const run = action({
  args: { manual: v.optional(v.boolean()) },
  handler: async (ctx, args): Promise<LinkCheckRunResult> => runCheck(ctx, args.manual === true),
});

/** Internal twin for the weekly cron; cadence and switches are enforced here. */
export const runScheduled = internalAction({
  args: {},
  handler: async (ctx): Promise<LinkCheckRunResult> => runCheck(ctx, false),
});


