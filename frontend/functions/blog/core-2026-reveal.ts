import { isOpenGraphUserAgent, rewriteOpengraphHead } from "../helpers";

export async function onRequest(ctx: EventContext<unknown, string, unknown>) {
  if (!isOpenGraphUserAgent(ctx.request.headers.get("user-agent"))) {
    return ctx.next();
  }

  const title = "Core Set 2026 Reveal · arkham.build";
  const description =
    "Two new cards for Arkham Horror: The Card Game's new core set. While you are here, grab a souvenir!";

  const preview = {
    title,
    description,
    "og:title": title,
    "og:description": description,
    "og:image": "https://arkham.build/assets/blog/core_2026_og.jpg",
    "twitter:card": "summary_large_image",
  };

  try {
    preview["og:url"] = ctx.request.url;
    return rewriteOpengraphHead(await ctx.next(), preview);
  } catch (err) {
    console.error(err);
    return ctx.next();
  }
}
