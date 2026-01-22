export interface Env {
  VITE_API_LEGACY_URL: string;
}

type Context = EventContext<Env, string, unknown>;

type PreviewResponse = Record<string, string>;

export function makePreviewRoute(
  type: "card" | "deck" | "decklist",
): PagesFunction<Env> {
  return async function onRequest(ctx: Context) {
    const id = Array.isArray(ctx.params.id) ? ctx.params.id[0] : ctx.params.id;

    if (!isOpenGraphUserAgent(ctx.request.headers.get("user-agent"))) {
      return ctx.next();
    }

    try {
      const preview = await fetchPreview(ctx.env.VITE_API_LEGACY_URL, type, id);
      preview["og:url"] = ctx.request.url;
      return rewriteOpengraphHead(await ctx.next(), preview);
    } catch (err) {
      console.error(err);
      return ctx.next();
    }
  };
}

const OPEN_GRAPH_USER_AGENTS = [
  // Discord
  /Discordbot/i,
  // +Signal
  /WhatsApp/i,
  /redditbot/i,
  // Facebook
  /facebookexternalhit|Facebot/i,
  /Applebot/i,
  /TelegramBot/i,
  /Twitterbot/i,
  /yandex/i,
  /Googlebot/i,
  /bingbot/i,
  /DuckDuckBot/i,
  /Slackbot/i,
  /Baiduspider/i,
  /Sogou/i,
  /Embedly/i,
  /ZoomBot/i,
];

export function isOpenGraphUserAgent(userAgent: string) {
  return OPEN_GRAPH_USER_AGENTS.some((regex) => regex.test(userAgent));
}

async function fetchPreview(
  apiUrl: string,
  type: string,
  id: string,
): Promise<PreviewResponse> {
  const url = `${apiUrl}/v1/public/preview/${type}/${id}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch preview: ${res.statusText}`);

  return await res.json();
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

class ElementHandler {
  constructor(private preview: PreviewResponse) {}

  element(element: Element) {
    const tag = element.tagName;

    if (tag === "head") {
      element.onEndTag((el) => {
        const tags = Object.entries(this.preview)
          .map(([key, value]) => {
            const content = escapeHtml(value);

            if (key === "description") {
              return `<meta name="description" content="${content}">`;
            }

            if (key === "title") {
              return `<title>${content}</title>`;
            }

            return `<meta property="${key}" content="${content}">`;
          })
          .join("\n");

        el.before(tags, { html: true });
      });
    } else if (tag === "meta") {
      const prop =
        element.getAttribute("property") || element.getAttribute("name");

      if (prop && prop in this.preview) element.remove();
    } else if (tag === "title" && this.preview.title) {
      element.remove();
    }
  }
}

export function rewriteOpengraphHead(res: Response, preview: PreviewResponse) {
  return new HTMLRewriter().on("*", new ElementHandler(preview)).transform(res);
}
