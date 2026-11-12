// Workspace → Dashboard layout.
//
// One boolean setting, so it applies the moment it is flipped (with its own
// spinner + tick) instead of joining the page draft — a toggle that says “On”
// but has not been saved yet would be exactly the ambiguity the redesign is
// removing.

import { useState } from "react";
import { useMutation } from "convex/react";
import { LayoutDashboard } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { SaveStatePill, SectionHeader, ToggleRow } from "@/components/admin/AdminUi";

export function DashboardLayoutPanel({ enabled }: { enabled: boolean }) {
  const setSetting = useMutation(api.facilities.setSetting);
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={LayoutDashboard}
        title="Dashboard layout"
        description="Let each user rearrange the Dashboard on their own screen. Their arrangement is remembered in their browser, so nothing changes for anyone else."
        right={<SaveStatePill state={saving ? "saving" : "idle"} />}
      />

      <ToggleRow
        id="dashboard-section-controls"
        icon={LayoutDashboard}
        checked={enabled}
        disabled={saving}
        title="Allow rearranging dashboard sections"
        description="Each section on the Dashboard gets a drag handle to reorder it, plus width, height and collapse controls to shrink it."
        hint="Saved immediately — no “Save all” needed for this one."
        onCheckedChange={async (value) => {
          setSaving(true);
          try {
            await setSetting({ key: "dashboardSectionControls", value });
            toast.success(
              value
                ? "Dashboard rearranging enabled"
                : "Dashboard rearranging disabled",
            );
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not save");
          }
          setSaving(false);
        }}
      />

      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">What users can do when this is on</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Drag a section by its handle to move it up or down.</li>
          <li>Resize a section with the width and height controls.</li>
          <li>Collapse a section they do not need to see every day.</li>
          <li>
            Reset their own layout from the Dashboard — turning this off restores
            the standard order for everyone.
          </li>
        </ul>
      </div>
    </div>
  );
}
