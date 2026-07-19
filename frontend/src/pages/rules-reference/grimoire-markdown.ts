import { parseCardTextHtml } from "@/utils/card-utils";
import { parseMarkdown } from "@/utils/markdown";

const GRIMOIRE_ASSET_BASE_PATH = "/assets/grimoire";

export function getGrimoireMarkdownHtml(markdown: string) {
  return resolveGrimoireHtmlReferences(
    parseCardTextHtml(parseMarkdown(markdown), { newLines: "skip" }),
  );
}

export function resolveGrimoireHtmlReferences(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");

  for (const image of doc.querySelectorAll("img")) {
    const src = image.getAttribute("src");

    if (!src || !isRelativeGrimoireImageSource(src)) {
      continue;
    }

    image.setAttribute("src", resolveGrimoireImageSource(src));
    image.setAttribute("decoding", "async");
    image.setAttribute("loading", "lazy");
  }

  resolveGrimoireIconClasses(doc);

  return doc.body.innerHTML;
}

function resolveGrimoireIconClasses(doc: Document) {
  for (const iconElement of doc.querySelectorAll("i[data-icon]")) {
    const icon = iconElement.getAttribute("data-icon")?.trim();

    if (!icon || !/^[a-z0-9_-]+$/i.test(icon)) continue;

    iconElement.classList.add(`encounters-${icon}`);
  }
}

function resolveGrimoireImageSource(src: string) {
  const normalizedPath = normalizeGrimoireImagePath(src);

  return `${GRIMOIRE_ASSET_BASE_PATH}/${normalizedPath}`;
}

function isRelativeGrimoireImageSource(src: string) {
  return !/^(?:[a-z]+:|\/\/|\/|#)/i.test(src.trim());
}

function normalizeGrimoireImagePath(src: string) {
  return src
    .trim()
    .replaceAll("\\", "/")
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}
