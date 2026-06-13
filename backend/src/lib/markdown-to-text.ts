import { marked, TextRenderer } from "marked";

marked.use({ renderer: new TextRenderer() });

export function markdownToText(md: string) {
  return stripHtml(marked(md) as string);
}

function stripHtml(html: string): string {
  return html
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
