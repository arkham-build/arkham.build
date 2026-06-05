import { describe, expect, it } from "vitest";
import { rewriteGrimoireImageSources } from "./grimoire-markdown";

describe("rewriteGrimoireImageSources", () => {
  it("rewrites relative grimoire image sources to the public asset path", () => {
    const html = rewriteGrimoireImageSources(
      '<p><img alt="Map" src="map of dunwich.png"></p>',
    );

    expect(html).toContain('src="/assets/grimoire/map%20of%20dunwich.png"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
  });

  it("leaves absolute and external image sources unchanged", () => {
    const html = rewriteGrimoireImageSources(
      '<p><img alt="A" src="/assets/rules/chart.png"><img alt="B" src="https://example.com/chart.png"></p>',
    );

    expect(html).toContain('src="/assets/rules/chart.png"');
    expect(html).toContain('src="https://example.com/chart.png"');
    expect(html).not.toContain('src="/assets/grimoire/assets');
    expect(html).not.toContain('src="/assets/grimoire/https%3A');
  });
});
