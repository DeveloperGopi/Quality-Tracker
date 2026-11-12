/** Web Worker half of the Links Organiser clipboard parser. */

import { parseLinksText, type LinksMatrix } from "./linksImport";

type Request = { kind: "text"; text: string };

self.onmessage = (event: MessageEvent<Request>) => {
  try {
    const matrix: LinksMatrix = parseLinksText(event.data.text);
    self.postMessage({ ok: true, matrix });
  } catch (err) {
    self.postMessage({ ok: false, error: err instanceof Error ? err.message : "Could not read the paste" });
  }
};
