/** Page-group definitions shared by Admin → Pages, the sidebar and the wizard.
 * Built-in ids keep their historical values; labels and order are editable.
 * `main` and `admin` are structural groups and cannot be deleted. */

export type PageGroupDef = { id: string; label: string; order: number };

export const DEFAULT_PAGE_GROUPS: PageGroupDef[] = [
  { id: "main", label: "Main", order: 0 },
  { id: "facilityData", label: "Facility data", order: 10 },
  { id: "tools", label: "Tools", order: 20 },
  { id: "data", label: "Data", order: 30 },
  { id: "admin", label: "Admin", order: 40 },
];

export const PROTECTED_PAGE_GROUPS = new Set(["main", "admin"]);

/** Pages may deliberately sit outside every admin-defined group. "ungrouped"
 *  is a reserved placement, not a row in the editable group list. */
export const UNGROUPED_PAGE_GROUP = "ungrouped";

export function pageGroupId(raw: string, existing: readonly string[]): string {
  const base =
    raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "group";
  if (!existing.includes(base)) return base;
  let n = 2;
  while (existing.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** Accepts stored JSON, a bare array or undefined. Unknown/malformed entries
 * are dropped; labels are trimmed; order is normalised to 0,10,20… */
export function normalizePageGroups(raw: unknown): PageGroupDef[] {
  const source = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { groups?: unknown }).groups)
      ? ((raw as { groups: unknown[] }).groups)
      : null;
  if (!source) return DEFAULT_PAGE_GROUPS.map((group) => ({ ...group }));
  const seen = new Set<string>();
  const out: PageGroupDef[] = [];
  for (const item of source) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string"
      ? row.id.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "")
      : "";
    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label, order: Number.isFinite(Number(row.order)) ? Number(row.order) : 0 });
  }
  if (out.length === 0) return DEFAULT_PAGE_GROUPS.map((group) => ({ ...group }));
  return out
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map((group, index) => ({ ...group, order: index * 10 }));
}

/** Keep a page attached to a visible group even after old admin data is read. */
export function fallbackGroupId(groups: readonly PageGroupDef[]): string {
  return groups.find((group) => group.id === "main")?.id ?? groups[0]?.id ?? "main";
}
