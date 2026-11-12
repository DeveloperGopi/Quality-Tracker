/** A tiny hand-off from a guide step to the control it names. */

export type GuideSpotlightRequest = {
  selector: string;
  label: string;
};

const KEY = "nqas.guide.spotlight";

export function requestGuideSpotlight(selector: string, label: string): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ selector, label }));
    window.dispatchEvent(new Event("guide:spotlight"));
  } catch {
    /* private mode — the page still opens */
  }
}

export function takeGuideSpotlight(): GuideSpotlightRequest | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as Partial<GuideSpotlightRequest>;
    if (typeof parsed.selector !== "string" || !parsed.selector) return null;
    return {
      selector: parsed.selector,
      label: typeof parsed.label === "string" ? parsed.label : "This control",
    };
  } catch {
    return null;
  }
}
