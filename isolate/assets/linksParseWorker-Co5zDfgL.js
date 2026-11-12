(function () {
  'use strict';

  const MONTH_ABBR = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];
  const MONTH_FULL = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december"
  ];
  (() => {
    const out = {};
    MONTH_ABBR.forEach((name, i) => {
      out[name.toLowerCase()] = i + 1;
    });
    MONTH_FULL.forEach((name, i) => {
      out[name] = i + 1;
      out[name.slice(0, 3)] = i + 1;
    });
    out.sept = 9;
    return out;
  })();

  const LINK_TABLE_ALL_COLUMNS = [
    { key: "serial", label: "S. No", width: "3.25rem", align: "center", optional: true },
    { key: "category", label: "Category", width: "8.75rem", optional: true, sortable: true },
    { key: "report", label: "Report", width: "16.5rem", frozen: true, sortable: true },
    { key: "links", label: "Links", width: "14rem" },
    { key: "schedule", label: "Schedule", width: "12rem" },
    { key: "owner", label: "Owner", width: "9rem", sortable: true },
    { key: "status", label: "Status", width: "8rem", sortable: true },
    { key: "frequency", label: "Frequency", width: "7.5rem", optional: true, sortable: true },
    { key: "lastUpdated", label: "Last Updated", width: "8.25rem", optional: true, sortable: true },
    { key: "nextDue", label: "Next Due", width: "8.5rem", optional: true, sortable: true },
    { key: "form", label: "Form Link", width: "9rem", optional: true },
    { key: "remarks", label: "Remarks", width: "12rem", optional: true },
    { key: "actions", label: "Actions", width: "5.5rem", align: "right" }
  ];
  const DEFAULT_KEYS = ["report", "links", "schedule", "owner", "status", "actions"];
  LINK_TABLE_ALL_COLUMNS.filter(
    (column) => DEFAULT_KEYS.includes(column.key)
  );

  function parseLinksText(text) {
    const normalized = text.replace(/\r\n?/g, "\n").replace(/^\uFEFF/, "");
    const lines = normalized.split("\n").filter((line) => line.trim() !== "");
    if (!lines.length) return [];
    const delimiter = lines.some((line) => line.includes("	")) ? "	" : lines.some((line) => line.includes(",")) ? "," : "	";
    return lines.map((line) => parseDelimitedLine(line, delimiter));
  }
  function parseDelimitedLine(line, delimiter) {
    const out = [];
    let current = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else if (ch === '"') {
          quoted = false;
        } else {
          current += ch;
        }
        continue;
      }
      if (ch === '"' && current === "") {
        quoted = true;
      } else if (ch === delimiter) {
        out.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    out.push(current.trim());
    return out;
  }

  self.onmessage = (event) => {
    try {
      const matrix = parseLinksText(event.data.text);
      self.postMessage({ ok: true, matrix });
    } catch (err) {
      self.postMessage({ ok: false, error: err instanceof Error ? err.message : "Could not read the paste" });
    }
  };

})();
