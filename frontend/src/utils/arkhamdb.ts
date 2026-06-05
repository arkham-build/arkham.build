import type { ResolvedDeck } from "@/store/lib/types";
import i18n from "./i18n";

export function localizeArkhamDBBaseUrl() {
  const lng = i18n.language;

  const baseUrl = new URL(import.meta.env.VITE_ARKHAMDB_BASE_URL);
  if (lng === "en") return baseUrl.origin;

  // ArkhamDB does not support `zh-cn` yet.
  if (lng === "zh-CN") {
    baseUrl.hostname = `zh.${baseUrl.hostname}`;
  } else {
    baseUrl.hostname = `${lng}.${baseUrl.hostname}`;
  }

  return baseUrl.origin;
}

export function redirectArkhamDBLinks(evt: React.MouseEvent) {
  evt.preventDefault();

  if (evt.target instanceof HTMLElement) {
    const anchor = evt.target?.closest("a") as HTMLAnchorElement;

    if (anchor != null) {
      const href = anchor.getAttribute("href");
      if (!href) return;

      let url: string;
      if (href.startsWith("/card") && !href.includes("#review-")) {
        url = href;
      } else if (href.startsWith("/")) {
        const baseUrl = localizeArkhamDBBaseUrl();
        url = `${baseUrl}${href}`;
      } else {
        url = href;
      }

      window.open(url, "_blank");
    }
  }
}

export function assertCanPublishDeck(_: ResolvedDeck) {
  return true;
}

function parseVersion(str: string) {
  const version = str.split(".").map((v) => Number.parseInt(v, 10));
  if (version.length !== 2) {
    throw new Error("Invalid version format");
  }

  return {
    major: version[0],
    minor: version[1],
  };
}

export function incrementVersion(str: string) {
  try {
    const version = parseVersion(str);
    return `${version.major}.${version.minor + 1}`;
  } catch {
    return "0.1";
  }
}
