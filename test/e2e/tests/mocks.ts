/** biome-ignore-all lint/suspicious/noExplicitAny: test code */
import type { Page } from "@playwright/test";
import allCardsResponse from "../../fixtures/stubs/all_card.json" with {
  type: "json",
};

import versionsResponse from "../../fixtures/stubs/data_version.json" with {
  type: "json",
};

import fanMadeInvestigatorProject from "../../fixtures/stubs/fan_made_investigator_project.json" with {
  type: "json",
};

import deckResponse from "../../fixtures/stubs/get_deck.json" with {
  type: "json",
};

import metadataResponse from "../../fixtures/stubs/metadata.json" with {
  type: "json",
};

export async function mockApiCalls(page: Page) {
  const apiUrl = process.env.VITE_API_LEGACY_URL ?? "https://api.arkham.build";

  const baseUrl = `${apiUrl}/v1`;

  await Promise.all([
    page.route(`${baseUrl}/cache/cards/en`, async (route) => {
      const json: any = structuredClone(allCardsResponse);
      json.data.all_card.push({
        code: "99999",
        real_name: "Preview Test Card",
        pack_code: "core",
        faction_code: "neutral",
        type_code: "asset",
        id: "99999",
        official: true,
        position: 999,
        preview: true,
        quantity: 1,
      });
      await route.fulfill({ json });
    }),
    page.route(`${baseUrl}/cache/metadata/en`, async (route) => {
      const json = metadataResponse;
      await route.fulfill({ json });
    }),
    page.route(`${baseUrl}/cache/version/en`, async (route) => {
      const json = versionsResponse;
      await route.fulfill({ json });
    }),
    page.route(/\/public\/import/, async (route) => {
      const json = deckResponse;
      await route.fulfill({ json });
    }),
    page.route("https://fan-made-project-mock.example.com", async (route) => {
      const json = fanMadeInvestigatorProject;
      await route.fulfill({ json });
    }),
  ]);
}
