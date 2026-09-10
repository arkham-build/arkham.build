import DOMPurify from "dompurify";
import { marked } from "marked";

type ParseMarkdownOptions = {
  externalEmbeds?: {
    loadLabel: string;
    notice: string;
    title: string;
  };
  noImageReferrer?: boolean;
};

function cleanArkhamdbMarkdown(content: string): string {
  // fix: deck guides using valentin1331 template all contain invalid markdown for bolding in headlines.
  return content.replaceAll(
    /\*\*\s<center>(.*?)<\/center>\s\*\*/g,
    "**<center>$1</center>**",
  );
}

export function parseMarkdown(
  content: string,
  options?: ParseMarkdownOptions,
): string {
  const html = marked.parse(cleanArkhamdbMarkdown(content)) as string;

  return DOMPurify.sanitize(transformMarkdownHtml(html, options), {
    FORBID_TAGS: ["audio", "source", "track", "video"],
  });
}

function transformMarkdownHtml(html: string, options?: ParseMarkdownOptions) {
  if (!options?.externalEmbeds && !options?.noImageReferrer) return html;

  const template = document.createElement("template");
  template.innerHTML = html;

  if (options.externalEmbeds) {
    replaceExternalEmbeds(template, options.externalEmbeds);
  }

  if (options.noImageReferrer) {
    setImageReferrerPolicy(template);
  }

  return template.innerHTML;
}

function replaceExternalEmbeds(
  template: HTMLTemplateElement,
  options: NonNullable<ParseMarkdownOptions["externalEmbeds"]>,
) {
  for (const iframe of template.content.querySelectorAll("iframe")) {
    const embedSrc = getEmbedSrc(iframe.getAttribute("src"));

    if (!embedSrc) {
      iframe.remove();
      continue;
    }

    const placeholder = document.createElement("div");
    placeholder.className = "external-embed-placeholder";
    placeholder.dataset.embedSrc = embedSrc;
    placeholder.dataset.embedTitle =
      iframe.getAttribute("title") ?? options.title;

    const allow = iframe.getAttribute("allow");

    if (allow) {
      placeholder.dataset.embedAllow = allow;
    }

    if (iframe.hasAttribute("allowfullscreen")) {
      placeholder.dataset.embedAllowfullscreen = "true";
    }

    const notice = document.createElement("p");
    notice.textContent = options.notice;

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.loadEmbed = "true";
    button.textContent = options.loadLabel;

    placeholder.append(notice, button);
    iframe.replaceWith(placeholder);
  }
}

function setImageReferrerPolicy(template: HTMLTemplateElement) {
  for (const image of template.content.querySelectorAll("img")) {
    image.setAttribute("referrerpolicy", "no-referrer");
  }
}

function getEmbedSrc(src: string | null) {
  if (!src) return null;

  try {
    const url = new URL(src, window.location.origin);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    if (isYouTubeHost(url.hostname)) {
      url.hostname = "www.youtube-nocookie.com";
    }

    return url.toString();
  } catch {
    return null;
  }
}

function isYouTubeHost(hostname: string) {
  return [
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
  ].includes(hostname.toLowerCase());
}
