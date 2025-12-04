import DOMPurify from "dompurify";
import { marked } from "marked";

function cleanArkhamdbMarkdown(content: string): string {
  // fix: deck guides using valentin1331 template all contain invalid markdown for bolding in headlines.
  return content.replaceAll(
    /\*\*\s<center>(.*?)<\/center>\s\*\*/g,
    "**<center>$1</center>**",
  );
}

export function parseMarkdown(content: string): string {
  return DOMPurify.sanitize(
    marked.parse(cleanArkhamdbMarkdown(content)) as string,
  );
}
