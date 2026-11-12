/**
 * THE permission matrix — one table used by the roles screen, the Admin Guide
 * and the page guard. `verified: false` means the matrix is a description of
 * intent that could not be proved against a server guard; the UI marks those
 * cells "Check" instead of pretending.
 */

export type RoleKey = "admin" | "dqc" | "dqmo" | "entry" | "viewer";

export type Capability = {
  id: string;
  label: string;
  group: "Pages" | "Facility data" | "Documents" | "Reports" | "Administration";
  description: string;
  /** Roles the API allows. */
  roles: RoleKey[];
  /** false → the matrix prints “Check”. */
  verified: boolean;
};

export const DEFAULT_ROLES: {
  key: RoleKey;
  label: string;
  description: string;
  sort: number;
  blockScope: string;
}[] = [
  {
    key: "admin",
    label: "State Admin",
    description: "Owns settings, users, imports and every facility in the state.",
    sort: 10,
    blockScope: "All blocks",
  },
  {
    key: "dqc",
    label: "DQC",
    description: "District Quality Consultant — reviews and edits every facility.",
    sort: 20,
    blockScope: "All blocks",
  },
  {
    key: "dqmo",
    label: "DQMO",
    description: "District Quality Medical Officer — reviews and edits every facility.",
    sort: 30,
    blockScope: "All blocks",
  },
  {
    key: "entry",
    label: "Data Entry",
    description: "Updates facilities in the blocks assigned to them.",
    sort: 40,
    blockScope: "Assigned blocks only",
  },
  {
    key: "viewer",
    label: "Viewer",
    description: "Reads the tracker and downloads reports. Cannot change data.",
    sort: 50,
    blockScope: "All blocks (read-only)",
  },
];

export const ROLE_LABEL_FALLBACK: Record<string, string> = Object.fromEntries(
  DEFAULT_ROLES.map((r) => [r.key, r.label]),
);

/** Human label for any role key, including legacy ones. */
export function roleLabel(key: string | null | undefined): string {
  if (!key) return "No role";
  return ROLE_LABEL_FALLBACK[key] ?? key;
}

export const CAPABILITIES: Capability[] = [
  {
    id: "viewPages",
    label: "View pages",
    group: "Pages",
    description: "Every page shared with the role in Admin → Pages.",
    roles: ["admin", "dqc", "dqmo", "entry", "viewer"],
    verified: true,
  },
  {
    id: "adminSettings",
    label: "Admin settings",
    group: "Administration",
    description: "Open Admin Settings and change workspace configuration.",
    roles: ["admin"],
    verified: true,
  },
  {
    id: "manageUsers",
    label: "Manage users",
    group: "Administration",
    description: "Approve, invite, re-role, disable or delete accounts.",
    roles: ["admin"],
    verified: true,
  },
  {
    id: "editFacilities",
    label: "Edit facility data",
    group: "Facility data",
    description: "Create and update facility records (within block scope).",
    roles: ["admin", "dqc", "dqmo", "entry"],
    verified: true,
  },
  {
    id: "uploadDocuments",
    label: "Upload documents",
    group: "Documents",
    description: "Upload and replace documents in the Document Library.",
    roles: ["admin", "dqc", "dqmo", "entry"],
    verified: true,
  },
  {
    id: "zipDownload",
    label: "Download ZIP",
    group: "Documents",
    description: "Download a ZIP of documents in the current scope.",
    roles: ["admin", "dqc", "dqmo", "entry", "viewer"],
    verified: true,
  },
  {
    id: "importData",
    label: "Import facility data",
    group: "Administration",
    description: "Import the facility master, SaQsham status and IA scores.",
    roles: ["admin", "entry"],
    verified: true,
  },
  {
    id: "importIa",
    label: "Import IA scores",
    group: "Administration",
    description: "Bulk-import Internal Assessment quarter scores.",
    roles: ["admin", "dqc", "dqmo", "entry"],
    verified: false,
  },
  {
    id: "exportData",
    label: "Export data",
    group: "Reports",
    description: "Download Excel, PDF and CSV exports.",
    roles: ["admin", "dqc", "dqmo", "entry", "viewer"],
    verified: true,
  },
  {
    id: "editAssessors",
    label: "Edit assessors",
    group: "Administration",
    description: "Rename or confirm assessor names in data checks.",
    roles: ["admin"],
    verified: true,
  },
  {
    id: "manageLinks",
    label: "Manage Links Organiser",
    group: "Administration",
    description: "Add, edit and archive report / data-collection links.",
    roles: ["admin", "dqc", "dqmo", "entry"],
    verified: false,
  },
  {
    id: "createPages",
    label: "Create custom pages",
    group: "Administration",
    description: "Create, edit and remove pages in Admin → Pages.",
    roles: ["admin"],
    verified: true,
  },
  {
    id: "deleteFacilities",
    label: "Delete facilities",
    group: "Administration",
    description: "Delete a facility and the danger-zone bulk delete.",
    roles: ["admin"],
    verified: true,
  },
  {
    id: "viewGuide",
    label: "Open Admin Guide",
    group: "Pages",
    description: "Read the guide and open its context help.",
    roles: ["admin", "dqc", "dqmo", "entry", "viewer"],
    verified: false,
  },
];

export function roleCan(role: string | null | undefined, capabilityId: string): boolean {
  const cap = CAPABILITIES.find((c) => c.id === capabilityId);
  if (!cap) return false;
  return cap.roles.includes((role ?? "viewer") as RoleKey);
}

/** Internal sidebar tiers stay three; real roles map on top of them. */
export function roleTier(role: string | null | undefined): "admin" | "editor" | "viewer" {
  if (role === "admin") return "admin";
  if (role === "entry" || role === "dqc" || role === "dqmo") return "editor";
  return "viewer";
}
