/**
 * MASTER DATA — Blocks & PHCs.
 *
 * The PHC list was empty while every facility already carried a PHC, so the
 * dropdown had nothing to offer. This module derives the real (block, PHC)
 * pairs from the facilities, previews what seeding would add, suggests
 * near-identical names as MERGE candidates (never merges silently), and backs
 * the one tree card with counts.
 *
 * State Admin only; every write is audited.
 */

import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { canEditAll, requireActivatedUser } from "./facilities";

async function adminFor(ctx: QueryCtx | MutationCtx) {
  const me = await requireActivatedUser(ctx);
  if (!canEditAll(me)) throw new Error("Only the State Admin can manage blocks and PHCs");
  return me;
}

const norm = (s: string | null | undefined) =>
  String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i += 1) {
    const next = [i];
    for (let j = 1; j <= n; j += 1) {
      next[j] = Math.min(
        prev[j] + 1,
        next[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = next;
  }
  return prev[n];
}

/** 0..1 — shared big letters + edit distance; near-identical names score > 0.6. */
export function nameSimilarity(a: string, b: string): number {
  const x = norm(a).replace(/[^a-z0-9]/g, "");
  const y = norm(b).replace(/[^a-z0-9]/g, "");
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x[0] !== y[0]) return 0;
  const max = Math.max(x.length, y.length);
  return Math.max(0, 1 - levenshtein(x, y) / max);
}

type Pair = { block: string; name: string; count: number };

async function facilityPairs(ctx: QueryCtx | MutationCtx): Promise<Pair[]> {
  const facilities = await ctx.db.query("facilities").collect();
  const map = new Map<string, Pair>();
  for (const f of facilities) {
    const block = String(f.block ?? "").trim();
    const name = String(f.phc ?? "").trim();
    if (!block || !name) continue;
    const key = `${norm(block)}::${norm(name)}`;
    const hit = map.get(key);
    if (hit) hit.count += 1;
    else map.set(key, { block, name, count: 1 });
  }
  return [...map.values()].sort(
    (a, b) => a.block.localeCompare(b.block) || a.name.localeCompare(b.name),
  );
}

/** The one tree card: blocks → PHCs, each with its facility count. */
export const tree = query({
  args: {},
  handler: async (ctx) => {
    await adminFor(ctx);
    const [blocks, phcs, pairs] = await Promise.all([
      ctx.db.query("blocks").collect(),
      ctx.db.query("phcs").collect(),
      facilityPairs(ctx),
    ]);
    const blockCount = new Map<string, number>();
    for (const p of pairs) blockCount.set(norm(p.block), (blockCount.get(norm(p.block)) ?? 0) + p.count);
    const phcCount = new Map<string, number>();
    for (const p of pairs) phcCount.set(`${norm(p.block)}::${norm(p.name)}`, p.count);
    const listed = new Set(phcs.map((p) => `${norm(p.block)}::${norm(p.name)}`));

    const rows = blocks
      .map((b) => ({
        id: String(b._id),
        name: b.name,
        count: blockCount.get(norm(b.name)) ?? 0,
        phcs: phcs
          .filter((p) => norm(p.block) === norm(b.name))
          .map((p) => ({
            id: String(p._id),
            name: p.name,
            count: phcCount.get(`${norm(p.block)}::${norm(p.name)}`) ?? 0,
          }))
          .sort((a, b2) => a.name.localeCompare(b2.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Facility PHCs with no phcs row yet — the "seed needed" source.
    const unlisted: Pair[] = [];
    for (const p of pairs) {
      if (!listed.has(`${norm(p.block)}::${norm(p.name)}`)) unlisted.push(p);
    }
    return {
      blocks: rows,
      unlisted,
      totals: { blocks: rows.length, phcs: phcs.length, facilities: pairs.reduce((s, p) => s + p.count, 0) },
    };
  },
});

/** READ-ONLY preview: what seeding adds, and which names look like duplicates. */
export const seedPreview = query({
  args: {},
  handler: async (ctx) => {
    await adminFor(ctx);
    const [phcs, pairs] = await Promise.all([
      ctx.db.query("phcs").collect(),
      facilityPairs(ctx),
    ]);
    const listed = new Set(phcs.map((p) => `${norm(p.block)}::${norm(p.name)}`));
    const missing = pairs.filter((p) => !listed.has(`${norm(p.block)}::${norm(p.name)}`));

    // Candidates per block: existing PHC rows + facility-only names.
    const byBlock = new Map<string, { block: string; names: Set<string> }>();
    for (const p of [...phcs, ...pairs]) {
      const key = norm(p.block);
      const entry = byBlock.get(key) ?? { block: p.block, names: new Set<string>() };
      entry.names.add(String(p.name));
      byBlock.set(key, entry);
    }
    const duplicates: {
      block: string;
      a: string;
      b: string;
      aCount: number;
      bCount: number;
    }[] = [];
    const countOf = (block: string, name: string) =>
      pairs.find((p) => norm(p.block) === norm(block) && norm(p.name) === norm(name))?.count ?? 0;
    for (const { block, names } of byBlock.values()) {
      const list = [...names].sort((x, y) => x.localeCompare(y));
      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          if (nameSimilarity(list[i], list[j]) >= 0.6) {
            duplicates.push({
              block,
              a: list[i],
              b: list[j],
              aCount: countOf(block, list[i]),
              bCount: countOf(block, list[j]),
            });
          }
        }
      }
    }
    return { missing, duplicates, listed: phcs.length, total: pairs.length };
  },
});

/** Insert every facility (block, PHC) that has no phcs row yet. Idempotent. */
export const seedPhcs = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await adminFor(ctx);
    const [phcs, pairs] = await Promise.all([
      ctx.db.query("phcs").collect(),
      facilityPairs(ctx),
    ]);
    const listed = new Set(phcs.map((p) => `${norm(p.block)}::${norm(p.name)}`));
    let added = 0;
    for (const p of pairs) {
      if (listed.has(`${norm(p.block)}::${norm(p.name)}`)) continue;
      await ctx.db.insert("phcs", { name: p.name, block: p.block, active: true });
      listed.add(`${norm(p.block)}::${norm(p.name)}`);
      added += 1;
    }
    await ctx.db.insert("auditLogs", {
      table: "phcs",
      recordId: "seed",
      action: "create",
      field: "PHC list seeded from facilities",
      newValue: `${added} PHC${added === 1 ? "" : "s"}`,
      changedBy: me._id,
      changedByName: me.name ?? me.email ?? "State Admin",
      changedAt: Date.now(),
      source: "Master data",
    });
    return { added };
  },
});

/** Rename a PHC and cascade the new name to its facilities. */
export const renamePhc = mutation({
  args: { phcId: v.id("phcs"), name: v.string() },
  handler: async (ctx, args) => {
    const me = await adminFor(ctx);
    const next = args.name.trim();
    if (!next) throw new Error("PHC name is required");
    const phc = await ctx.db.get(args.phcId);
    if (!phc) throw new Error("PHC not found");
    if (next === phc.name) return { facilities: 0 };
    const clash = (await ctx.db.query("phcs").withIndex("by_block", (q) => q.eq("block", phc.block)).collect())
      .find((p) => p._id !== phc._id && norm(p.name) === norm(next));
    if (clash) throw new Error("A PHC with this name already exists in the block");
    const facilities = await ctx.db
      .query("facilities")
      .withIndex("by_block", (q) => q.eq("block", phc.block))
      .collect();
    let changed = 0;
    for (const f of facilities) {
      if (norm(f.phc) !== norm(phc.name)) continue;
      await ctx.db.patch(f._id, { phc: next });
      changed += 1;
    }
    await ctx.db.patch(phc._id, { name: next });
    await ctx.db.insert("auditLogs", {
      table: "phcs",
      recordId: String(phc._id),
      action: "update",
      field: "PHC name",
      oldValue: phc.name,
      newValue: next,
      changedBy: me._id,
      changedByName: me.name ?? me.email ?? "State Admin",
      changedAt: Date.now(),
      source: "Master data",
    });
    return { facilities: changed };
  },
});

/** Merge one PHC into another (facilities move, source row is removed). */
export const mergePhcs = mutation({
  args: { sourceId: v.id("phcs"), targetId: v.id("phcs") },
  handler: async (ctx, args) => {
    const me = await adminFor(ctx);
    if (args.sourceId === args.targetId) throw new Error("Choose two different PHCs");
    const [source, target] = await Promise.all([
      ctx.db.get(args.sourceId),
      ctx.db.get(args.targetId),
    ]);
    if (!source || !target) throw new Error("PHC not found");
    if (norm(source.block) !== norm(target.block)) throw new Error("PHCs must be in the same block");
    const facilities = await ctx.db
      .query("facilities")
      .withIndex("by_block", (q) => q.eq("block", target.block))
      .collect();
    let moved = 0;
    for (const f of facilities) {
      if (norm(f.phc) !== norm(source.name)) continue;
      await ctx.db.patch(f._id, { phc: target.name });
      moved += 1;
    }
    await ctx.db.delete(source._id);
    await ctx.db.insert("auditLogs", {
      table: "phcs",
      recordId: String(target._id),
      action: "merge",
      field: "PHC merge",
      oldValue: `${source.name} (${source.block})`,
      newValue: `${target.name} (${target.block}) · ${moved} facilit${moved === 1 ? "y" : "ies"}`,
      changedBy: me._id,
      changedByName: me.name ?? me.email ?? "State Admin",
      changedAt: Date.now(),
      source: "Master data",
    });
    return { moved };
  },
});

/** Delete a PHC only when no facility uses it. */
export const removePhcGuarded = mutation({
  args: { phcId: v.id("phcs") },
  handler: async (ctx, args) => {
    const me = await adminFor(ctx);
    const phc = await ctx.db.get(args.phcId);
    if (!phc) return { ok: true };
    const facilities = await ctx.db
      .query("facilities")
      .withIndex("by_block", (q) => q.eq("block", phc.block))
      .collect();
    const used = facilities.filter((f) => norm(f.phc) === norm(phc.name)).length;
    if (used > 0) throw new Error(`${used} facilit${used === 1 ? "y uses" : "ies use"} this PHC — merge or rename it first`);
    await ctx.db.delete(phc._id);
    await ctx.db.insert("auditLogs", {
      table: "phcs",
      recordId: String(phc._id),
      action: "delete",
      field: "PHC",
      oldValue: `${phc.name} (${phc.block})`,
      changedBy: me._id,
      changedByName: me.name ?? me.email ?? "State Admin",
      changedAt: Date.now(),
      source: "Master data",
    });
    return { ok: true };
  },
});
