import type { GuideArticle } from "@/lib/guide";
import { registerDeckFonts } from "@/lib/pdfFonts";

export function guideTitle(article: GuideArticle | undefined): string {
  return article?.fallbackTitle ?? "Admin Guide";
}

const two = (n: number) => String(n).padStart(2, "0");

export async function downloadGuidePdf(
  articles: GuideArticle[],
  title: string,
  district: string,
  titleOf: (a: GuideArticle) => string,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fonts = await registerDeckFonts(doc);
  const family = fonts.family;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const width = pageW - margin * 2;
  let y = 18;

  const setFont = (style: "normal" | "bold", size: number) => {
    doc.setFont(family, style);
    doc.setFontSize(size);
  };
  const newPage = () => {
    doc.addPage();
    y = 18;
  };
  const need = (h: number) => {
    if (y + h > pageH - 14) newPage();
  };
  const write = (text: string, size = 10, style: "normal" | "bold" = "normal", gap = 2) => {
    setFont(style, size);
    const lines = doc.splitTextToSize(text, width) as string[];
    for (const line of lines) {
      need(gap + 5);
      doc.text(line, margin, y);
      y += gap + 4;
    }
  };
  const heading = (text: string) => {
    need(14);
    y += 3;
    write(text, 14, "bold", 2.8);
  };

  const now = new Date();
  const date = `${two(now.getDate())}-${two(now.getMonth() + 1)}-${now.getFullYear()}`;
  const fileName = `${district} Admin Guide ${date}.pdf`.replace(/[\\/:*?"<>|]/g, "-");

  // Cover / header
  setFont("bold", 20);
  doc.text(`${district} Admin Guide`, margin, y);
  if (title && !/admin guide/i.test(title)) {
    y += 7;
    setFont("normal", 12);
    doc.text(title, margin, y);
  }
  y += 10;
  setFont("normal", 10);
  doc.setTextColor(90, 90, 90);
  doc.text(`Last verified 04-Nov-2026 · ${articles.length} article${articles.length === 1 ? "" : "s"}`, margin, y);
  y += 8;
  doc.setTextColor(20, 20, 20);

  for (const article of articles) {
    need(30);
    heading(titleOf(article));
    write(article.purpose, 11);
    write(`Who can use it: ${article.roles.join(", ")}`, 10);
    heading("Steps");
    article.steps.forEach((s, i) => write(`${i + 1}. ${s.text}`, 10.5, "normal", 1.6));
    heading("What you will see");
    article.see.forEach((s) => write(`• ${s}`, 10.5, "normal", 1.3));
    heading("Tips");
    article.tips.forEach((s) => write(`• ${s}`, 10.5, "normal", 1.3));
    heading("Common problems and fixes");
    article.problems.forEach((p) => write(`${p.problem} — ${p.fix}`, 10.5, "normal", 1.3));
    heading("Related pages");
    write(article.related.join(" · "), 10.5);
    y += 4;
    need(20);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
  }

  // Page numbers
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    setFont("normal", 8);
    doc.setTextColor(130, 130, 130);
    doc.text(`${district} Admin Guide · page ${p} of ${pages}`, margin, pageH - 8);
  }
  doc.save(fileName);
}
