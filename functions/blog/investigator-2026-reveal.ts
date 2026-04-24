import { isOpenGraphUserAgent, rewriteOpengraphHead } from "../helpers";

export async function onRequest(ctx: EventContext<unknown, string, unknown>) {
  if (!isOpenGraphUserAgent(ctx.request.headers.get("user-agent"))) {
    return ctx.next();
  }

  const title = "Investigator Starter Decks 2026 Reveal · arkham.build";
  const description =
    "Presenting four mint cards from Arkham Horror: The Card Game's upcoming Marie Lambeau Investigator Deck.";

  const preview = {
    title,
    description,
    "og:title": title,
    "og:description": description,
    "og:image": "https://arkham.build/assets/blog/investigator_2026_og.jpg",
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
