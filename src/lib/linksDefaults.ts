/** Default lists for the Links Organiser importer/template. Kept separate so
 *  Convex's bundler never needs to resolve a UI-only module. */
export const DEFAULT_LINK_CATEGORIES = [
  { name: "Basic Data", colour: "teal", icon: "Database" },
  { name: "Quality Status", colour: "blue", icon: "BadgeCheck" },
  { name: "Building Status", colour: "amber", icon: "Building2" },
  { name: "Doc. Collection", colour: "violet", icon: "FolderOpen" },
] as const;

export const DEFAULT_LINK_OWNERS = ["NHSRC", "Quality", "State Sheet", "District Sheet"] as const;
