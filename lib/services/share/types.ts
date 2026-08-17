export type ShareSitePayload = {
  siteId: string;
  siteName: string;
  dateLabel: string; // e.g. "Jun 2026"
};

export type ShareResult =
  | { ok: true; mode: "image" | "text"; shared: true }
  | { ok: false; mode: "image" | "text"; error: string };
