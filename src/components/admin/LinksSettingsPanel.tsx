import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Bell, CircleDot, Link2, Plus, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LINK_COLOURS,
  LINK_VISIBILITIES,
  LINK_VISIBILITY_LABEL,
  DEFAULT_LINKS_CONFIG,
  normalizeLinksConfig,
  type LinksConfig,
  type LinkStatusDef,
} from "@/lib/links";

export function LinksSettingsPanel() {
  const data = useQuery(api.links.list, {});
  const saveCategory = useMutation(api.links.saveCategory);
  const saveOwner = useMutation(api.links.saveOwner);
  const saveConfig = useMutation(api.links.saveConfig);
  const seed = useMutation(api.links.seedDefaults);
  const [config, setConfig] = useState<LinksConfig>(DEFAULT_LINKS_CONFIG);
  const [categoryName, setCategoryName] = useState("");
  const [categoryColour, setCategoryColour] = useState("teal");
  const [ownerName, setOwnerName] = useState("");
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusTone, setNewStatusTone] = useState<LinkStatusDef["tone"]>("blue");
  const [newFrequencyLabel, setNewFrequencyLabel] = useState("");
  const [newFrequencyMonths, setNewFrequencyMonths] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (data?.config) setConfig(normalizeLinksConfig(data.config));
  }, [data?.config]);

  if (!data) return <p className="text-sm text-muted-foreground">Loading link settings…</p>;
  if (!data.me.isAdmin) {
    return <p className="text-sm text-muted-foreground">Only a State Admin can manage Links Organiser settings.</p>;
  }

  const run = async (key: string, fn: () => Promise<unknown>, success: string) => {
    setSaving(key);
    try {
      await fn();
      toast.success(success);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(null);
    }
  };

  const updateStatus = (index: number, patch: Partial<LinkStatusDef>) =>
    setConfig((current) => ({
      ...current,
      statuses: current.statuses.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));

  return (
    <div className="space-y-4" data-testid="links-settings">
      <section className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Link2 className="size-4 text-primary" /> Categories</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Colour chips on the page and in exports. Archive a category instead of deleting it so existing reports keep their label.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void run("seed", () => seed({}), "Default categories and owners restored")}>
            <RotateCcw className="mr-1 size-3.5" /> Seed defaults if empty
          </Button>
        </div>
        <ul className="mt-3 space-y-1.5">
          {data.categories.map((category) => (
            <li key={category.id} className="grid gap-1.5 rounded-lg border border-border/50 p-2 sm:grid-cols-[minmax(0,1fr)_9rem_7rem_auto] sm:items-center">
              <Input defaultValue={category.name} aria-label={`Name of ${category.name}`} onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== category.name) {
                  void run(`cat-${category.id}`, () => saveCategory({ id: category.id as Id<"link_category">, name: e.target.value, colour: category.colour, icon: category.icon ?? undefined, order: category.order, active: category.active }), "Category renamed");
                }
              }} />
              <select
                defaultValue={category.colour}
                aria-label={`Colour of ${category.name}`}
                className="h-10 rounded-md border border-input bg-background px-2 text-xs"
                onChange={(e) => void run(`cat-colour-${category.id}`, () => saveCategory({ id: category.id as Id<"link_category">, name: category.name, colour: e.target.value, icon: category.icon ?? undefined, order: category.order, active: category.active }), "Category colour saved")}
              >
                {Object.entries(LINK_COLOURS).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
              </select>
              <label className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  defaultChecked={category.active}
                  onChange={(e) => void run(`cat-active-${category.id}`, () => saveCategory({ id: category.id as Id<"link_category">, name: category.name, colour: category.colour, icon: category.icon ?? undefined, order: category.order, active: e.target.checked }), e.target.checked ? "Category shown" : "Category archived")}
                /> Active
              </label>
              <span className={cnSaving(saving === `cat-${category.id}`)}>{saving === `cat-${category.id}` ? "Saving…" : ""}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex flex-wrap items-end gap-2 border-t border-border/40 pt-2">
          <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="New category name" className="h-9 max-w-64" aria-label="New category name" />
          <select value={categoryColour} onChange={(e) => setCategoryColour(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-xs" aria-label="New category colour">
            {Object.entries(LINK_COLOURS).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
          </select>
          <Button size="sm" disabled={!categoryName.trim()} onClick={() => void run("add-cat", async () => {
            await saveCategory({ name: categoryName, colour: categoryColour });
            setCategoryName("");
          }, "Category added")}><Plus className="mr-1 size-3.5" /> Add category</Button>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="text-sm font-semibold">Owners</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">The team named on the sheet (NHSRC, Quality, State Sheet, District Sheet). Levels are separate.</p>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {data.owners.map((owner) => (
            <li key={owner.id} className="flex items-center gap-2 rounded-lg border border-border/50 p-2">
              <Input defaultValue={owner.name} aria-label={`Name of ${owner.name}`} onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== owner.name) {
                  void run(`owner-${owner.id}`, () => saveOwner({ id: owner.id as Id<"link_owner">, name: e.target.value, active: owner.active }), "Owner renamed");
                }
              }} className="h-9" />
              <label className="flex shrink-0 items-center gap-1 text-xs">
                <input type="checkbox" defaultChecked={owner.active} onChange={(e) => void run(`owner-active-${owner.id}`, () => saveOwner({ id: owner.id as Id<"link_owner">, name: owner.name, active: e.target.checked }), "Owner saved")} /> Active
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex gap-2 border-t border-border/40 pt-2">
          <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="New owner" className="h-9 max-w-64" aria-label="New owner" />
          <Button size="sm" disabled={!ownerName.trim()} onClick={() => void run("add-owner", async () => {
            await saveOwner({ name: ownerName });
            setOwnerName("");
          }, "Owner added")}><Plus className="mr-1 size-3.5" /> Add owner</Button>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><CircleDot className="size-4 text-primary" /> Statuses and due reminders</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">“Counts as open” decides whether a recurring report in that status can become due. Colour always has an icon and text.</p>
        <ul className="mt-3 space-y-1.5">
          {config.statuses.map((status, index) => (
            <li key={status.name} className="grid gap-1.5 rounded-lg border border-border/50 p-2 sm:grid-cols-[minmax(0,1fr)_8rem_9rem_auto] sm:items-center">
              <span className="text-sm font-medium">{status.name}</span>
              <select value={status.tone} onChange={(e) => updateStatus(index, { tone: e.target.value as LinkStatusDef["tone"] })} className="h-8 rounded-md border border-input bg-background px-1 text-xs" aria-label={`Tone for ${status.name}`}>
                {["teal", "green", "amber", "slate", "blue", "rose"].map((tone) => <option key={tone} value={tone}>{tone}</option>)}
              </select>
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={status.countsAsOpen} onChange={(e) => updateStatus(index, { countsAsOpen: e.target.checked })} /> Counts as open
              </label>
              {!["Active", "Completed", "On hold", "Archived"].includes(status.name) ? (
                <span className="text-[10px] text-muted-foreground">Custom</span>
              ) : <span className="text-[10px] text-muted-foreground">Default</span>}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border/40 pt-2">
          <Input
            value={newStatusName}
            onChange={(e) => setNewStatusName(e.target.value)}
            placeholder="New status name"
            className="h-9 max-w-48"
            aria-label="New status name"
          />
          <select
            value={newStatusTone}
            onChange={(e) => setNewStatusTone(e.target.value as LinkStatusDef["tone"])}
            className="h-9 rounded-md border border-input bg-background px-2 text-xs"
            aria-label="New status tone"
          >
            {["teal", "green", "amber", "slate", "blue", "rose"].map((tone) => (
              <option key={tone} value={tone}>{tone}</option>
            ))}
          </select>
          <Button
            size="sm"
            disabled={!newStatusName.trim() || config.statuses.some((s) => s.name.toLowerCase() === newStatusName.trim().toLowerCase())}
            onClick={() =>
              setConfig((current) => ({
                ...current,
                statuses: [...current.statuses, { name: newStatusName.trim(), tone: newStatusTone, icon: "Circle", countsAsOpen: true }],
              }))
            }
          >
            <Plus className="mr-1 size-3.5" /> Add status
          </Button>
        </div>
        <div className="mt-3 grid gap-2 border-t border-border/40 pt-2 sm:grid-cols-2">
          <label className="text-xs text-muted-foreground">
            Due-soon window (days)
            <Input type="number" min={0} max={60} value={config.dueSoonDays} onChange={(e) => setConfig((c) => ({ ...c, dueSoonDays: Number(e.target.value) }))} className="mt-1 h-9" />
          </label>
          <label className="text-xs text-muted-foreground">
            Default visibility for new links
            <select value={config.defaultVisibility} onChange={(e) => setConfig((c) => ({ ...c, defaultVisibility: e.target.value as LinksConfig["defaultVisibility"] }))} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              {LINK_VISIBILITIES.map((v) => <option key={v} value={v}>{LINK_VISIBILITY_LABEL[v]}</option>)}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Bell notifications
            <select value={config.notifyMode} onChange={(e) => setConfig((c) => ({ ...c, notifyMode: e.target.value as LinksConfig["notifyMode"] }))} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              <option value="editors">All editors</option>
              <option value="owners">Item owner list (falls back to editors)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 self-end text-xs">
            <input type="checkbox" checked={config.sidebarBadge} onChange={(e) => setConfig((c) => ({ ...c, sidebarBadge: e.target.checked }))} /> Sidebar badge (optional)
          </label>
          <label className="flex items-center gap-2 self-end text-xs text-muted-foreground">
            <input type="checkbox" checked={config.linkCheckEnabled} onChange={(e) => setConfig((c) => ({ ...c, linkCheckEnabled: e.target.checked }))} /> Enable link checker (SSRF-guarded)
          </label>
          <label className="flex items-center gap-2 self-end text-xs text-muted-foreground">
            <input type="checkbox" checked={config.linkCheckWeekly} disabled={!config.linkCheckEnabled} onChange={(e) => setConfig((c) => ({ ...c, linkCheckWeekly: e.target.checked }))} /> Weekly job (off by default)
          </label>
          <fieldset className="sm:col-span-2 border-t border-border/40 pt-2">
            <legend className="px-1 text-xs text-muted-foreground">Default page filters (Admin → Filters)</legend>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {[
                ["category", "Category"],
                ["owner", "Owner"],
                ["status", "Status"],
                ["frequency", "Frequency"],
                ["due", "Due state"],
                ["linkType", "Link type"],
                ["level", "Level"],
                ["lastUpdated", "Last updated"],
                ["pinned", "Pinned"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={config.defaultFilters.includes(key)}
                    onChange={(e) =>
                      setConfig((current) => ({
                        ...current,
                        defaultFilters: e.target.checked
                          ? [...current.defaultFilters, key]
                          : current.defaultFilters.filter((value) => value !== key),
                      }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="mt-2 flex justify-end">
          <Button size="sm" disabled={saving === "config"} onClick={() => void run("config", () => saveConfig({ value: config }), "Links settings saved")}>
            <Save className="mr-1 size-3.5" /> Save settings
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-4">
        <h2 className="text-sm font-semibold">Frequency options</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Calendar intervals. A monthly/quarterly date clamps to the end of the target month; custom days is exact.</p>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {config.frequencies.map((frequency, index) => (
            <li key={frequency.value} className="flex items-center gap-2 rounded-lg border border-border/50 p-2 text-xs">
              <span className="min-w-0 flex-1">{frequency.label}</span>
              <Input
                type="number"
                aria-label={`Months for ${frequency.label}`}
                value={frequency.months ?? ""}
                placeholder={frequency.days ? `${frequency.days} d` : "-"}
                onChange={(e) => setConfig((current) => ({
                  ...current,
                  frequencies: current.frequencies.map((f, i) => i === index ? { ...f, months: e.target.value ? Number(e.target.value) : undefined } : f),
                }))}
                className="h-8 w-20"
              />
              <span className="text-[10px] text-muted-foreground">months</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border/40 pt-2">
          <Input
            value={newFrequencyLabel}
            onChange={(e) => setNewFrequencyLabel(e.target.value)}
            placeholder="New frequency label (e.g. Fortnightly)"
            className="h-9 max-w-64"
            aria-label="New frequency label"
          />
          <Input
            type="number"
            min={0}
            value={newFrequencyMonths}
            onChange={(e) => setNewFrequencyMonths(e.target.value)}
            placeholder="months"
            className="h-9 w-24"
            aria-label="Months for the new frequency"
          />
          <Button
            size="sm"
            disabled={!newFrequencyLabel.trim() || !Number(newFrequencyMonths)}
            onClick={() =>
              setConfig((current) => ({
                ...current,
                frequencies: [
                  ...current.frequencies,
                  {
                    value: `custom-${current.frequencies.length + 1}`,
                    label: newFrequencyLabel.trim(),
                    months: Number(newFrequencyMonths),
                  },
                ],
              }))
            }
          >
            <Plus className="mr-1 size-3.5" /> Add frequency
          </Button>
        </div>
        <div className="mt-2 flex justify-end">
          <Button size="sm" variant="outline" disabled={saving === "config-freq"} onClick={() => void run("config-freq", () => saveConfig({ value: config }), "Frequency options saved")}>
            <Save className="mr-1 size-3.5" /> Save frequencies
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-950">
        <p className="flex items-center gap-1.5 font-semibold"><ShieldCheck className="size-3.5" /> Permission summary</p>
        <p className="mt-1">Viewer — browse, search, open and copy. District Editor — add/edit, mark updated, import, archive/restore. State Admin — categories, owners, statuses, frequency intervals, visibility, permanent delete and export of every visible link.</p>
        <p className="mt-1 flex items-center gap-1.5"><Bell className="size-3.5" /> Readers only receive links their role can see; Admin-only links never leave the server for other roles.</p>
      </section>
    </div>
  );
}

function cnSaving(active: boolean) {
  return active ? "text-[10px] text-primary" : "text-[10px] text-transparent";
}
