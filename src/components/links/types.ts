import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

export type LinksData = FunctionReturnType<typeof api.links.list>;
export type LinkItem = LinksData["items"][number];
export type LinkCategory = LinksData["categories"][number];
export type LinkOwner = LinksData["owners"][number];
export type LinksMe = LinksData["me"];

export type LinkDraftUrl = {
  id?: string;
  label: string;
  url: string;
  kind: "link" | "form";
  isPrimary: boolean;
  type?: string;
};

export type LinkDraft = {
  id?: string;
  categoryId: string;
  title: string;
  description: string;
  frequency: string;
  customDays: string;
  lastUpdated: string;
  ownerId: string;
  level: string;
  status: string;
  remarks: string;
  tags: string;
  visibility: string;
  pinned: boolean;
  urls: LinkDraftUrl[];
};
