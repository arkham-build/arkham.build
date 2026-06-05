import { describe, expect } from "vitest";
import type { Database } from "../db/db.ts";
import { test } from "./test-utils.ts";

describe("GET /v2/public/grimoire", () => {
  test("responds with grimoire data", async ({ dependencies }) => {
    await insertRulesVersions(dependencies.db, [
      "test faq 1",
      "test faq 2",
      "test errata 1",
      "test errata 2",
      "test rr 1",
    ]);

    await dependencies.db
      .insertInto("cycle")
      .values([
        {
          code: "test-grimoire-cycle-a",
          name: "Test Cycle A",
          position: 9991,
          translations: [],
        },
        {
          code: "test-grimoire-cycle-b",
          name: "Test Cycle B",
          position: 9992,
          translations: [],
        },
      ])
      .execute();

    await dependencies.db
      .insertInto("scenario")
      .values({
        code: "test-grimoire-scenario-a",
        campaign_code: null,
        name: "Test Scenario A",
        translations: [],
      })
      .execute();

    const secondFaq = await dependencies.db
      .insertInto("faq")
      .values({
        citation: "test faq 2",
        position: 2,
        question: "Second question?",
        ruling: "Second ruling.",
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    const firstFaq = await dependencies.db
      .insertInto("faq")
      .values({
        citation: "test faq 1",
        position: 1,
        question: "First question?",
        ruling: "First ruling.",
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    await dependencies.db
      .insertInto("faq_card")
      .values([{ card_id: "01001", faq_id: secondFaq.id, position: 1 }])
      .execute();

    await dependencies.db
      .insertInto("faq_cycle")
      .values([
        {
          cycle_code: "test-grimoire-cycle-a",
          faq_id: firstFaq.id,
          position: 1,
        },
        {
          cycle_code: "test-grimoire-cycle-b",
          faq_id: secondFaq.id,
          position: 2,
        },
        {
          cycle_code: "test-grimoire-cycle-a",
          faq_id: secondFaq.id,
          position: 1,
        },
      ])
      .execute();

    await dependencies.db
      .insertInto("faq_scenario")
      .values([
        {
          scenario_code: "test-grimoire-scenario-a",
          faq_id: secondFaq.id,
          position: 1,
        },
      ])
      .execute();

    const cardErrata = await dependencies.db
      .insertInto("errata")
      .values({
        citation: "test errata 2",
        position: 2,
        ruling: "Updated card text.",
        section: null,
        type: "card_errata",
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    const campaignErrata = await dependencies.db
      .insertInto("errata")
      .values({
        citation: "test errata 1",
        position: 1,
        ruling: "Updated campaign text.",
        section: null,
        type: "campaign_errata",
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    await dependencies.db
      .insertInto("errata")
      .values({
        citation: "test rr 1",
        position: 3,
        ruling: "Updated rulebook text.",
        section: "Fight",
        type: "rulebook_errata",
      })
      .execute();

    await dependencies.db
      .insertInto("errata_card")
      .values([{ card_id: "01001", errata_id: cardErrata.id, position: 1 }])
      .execute();

    await dependencies.db
      .insertInto("errata_cycle")
      .values([
        {
          cycle_code: "test-grimoire-cycle-b",
          errata_id: campaignErrata.id,
          position: 2,
        },
        {
          cycle_code: "test-grimoire-cycle-a",
          errata_id: campaignErrata.id,
          position: 1,
        },
      ])
      .execute();

    await dependencies.db
      .insertInto("errata_scenario")
      .values([
        {
          scenario_code: "test-grimoire-scenario-a",
          errata_id: campaignErrata.id,
          position: 1,
        },
      ])
      .execute();

    await dependencies.db
      .insertInto("grimoire_section")
      .values([
        {
          citation: "test rr 1",
          id: "keywords",
          position: 1,
          text: "Keyword glossary.",
          title: "Keywords",
          translations: [],
        },
        {
          citation: null,
          id: "timing",
          position: 2,
          text: null,
          title: "Timing",
          translations: [],
        },
      ])
      .execute();

    await dependencies.db
      .insertInto("grimoire_entry")
      .values([
        {
          citation: "test rr 1",
          id: "1.1",
          section: "keywords",
          text: "Enemies with aloof do not engage investigators.",
          title: "Alert",
          translations: [],
        },
        {
          citation: "test rr 1",
          id: "1.2",
          section: "keywords",
          text: null,
          title: "Aloof",
          translations: [],
        },
      ])
      .execute();

    await dependencies.db
      .insertInto("grimoire_entry_reference")
      .values({ source_id: "1.1", target_id: "1.2", position: 1 })
      .execute();

    const res = await dependencies.app.request("/v2/public/grimoire");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      entries: [
        {
          citation: "test rr 1",
          id: "1.1",
          references: ["1.2"],
          section: "keywords",
          text: "Enemies with aloof do not engage investigators.",
          title: "Alert",
        },
        {
          citation: "test rr 1",
          id: "1.2",
          section: "keywords",
          text: null,
          title: "Aloof",
        },
      ],
      errata: [
        {
          citation: "test errata 1",
          cycles: ["test-grimoire-cycle-a", "test-grimoire-cycle-b"],
          ruling: "Updated campaign text.",
          scenario_codes: ["test-grimoire-scenario-a"],
          type: "campaign_errata",
        },
        {
          card_codes: ["01001"],
          citation: "test errata 2",
          ruling: "Updated card text.",
          type: "card_errata",
        },
        {
          citation: "test rr 1",
          ruling: "Updated rulebook text.",
          section: "Fight",
          type: "rulebook_errata",
        },
      ],
      faq: [
        {
          citation: "test faq 1",
          cycles: ["test-grimoire-cycle-a"],
          id: firstFaq.id,
          position: 1,
          question: "First question?",
          ruling: "First ruling.",
          type: "faq",
        },
        {
          card_codes: ["01001"],
          citation: "test faq 2",
          cycles: ["test-grimoire-cycle-a", "test-grimoire-cycle-b"],
          id: secondFaq.id,
          position: 2,
          question: "Second question?",
          ruling: "Second ruling.",
          scenario_codes: ["test-grimoire-scenario-a"],
          type: "faq",
        },
      ],
      sections: [
        {
          citation: "test rr 1",
          id: "keywords",
          position: 1,
          text: "Keyword glossary.",
          title: "Keywords",
        },
        {
          citation: null,
          id: "timing",
          position: 2,
          text: null,
          title: "Timing",
        },
      ],
    });
  });

  test("responds with empty grimoire collections", async ({ dependencies }) => {
    const res = await dependencies.app.request("/v2/public/grimoire");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      entries: [],
      errata: [],
      faq: [],
      sections: [],
    });
  });
});

describe("GET /v2/public/faq/card", () => {
  test("responds with faq for a card", async ({ dependencies }) => {
    await insertRulesVersions(dependencies.db, [
      "test faq card 1",
      "test faq card 2",
    ]);

    const first = await dependencies.db
      .insertInto("faq")
      .values({
        citation: "test faq card 1",
        position: 2,
        question: "Second question?",
        ruling: "Second ruling.",
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    const second = await dependencies.db
      .insertInto("faq")
      .values({
        citation: "test faq card 2",
        position: 1,
        question: "First question?",
        ruling: "First ruling.",
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    await dependencies.db
      .insertInto("faq_card")
      .values([
        { card_id: "01001", faq_id: first.id, position: 1 },
        { card_id: "01001", faq_id: second.id, position: 1 },
      ])
      .execute();

    const res = await dependencies.app.request("/v2/public/faq/card/01001");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      {
        citation: "test faq card 2",
        id: second.id,
        position: 1,
        question: "First question?",
        ruling: "First ruling.",
        type: "faq",
      },
      {
        citation: "test faq card 1",
        id: first.id,
        position: 2,
        question: "Second question?",
        ruling: "Second ruling.",
        type: "faq",
      },
    ]);
  });

  test("responds with an empty array when no faq exists", async ({
    dependencies,
  }) => {
    const res = await dependencies.app.request("/v2/public/faq/card/01001");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

describe("GET /v2/public/errata/card", () => {
  test("responds with errata for a card", async ({ dependencies }) => {
    await insertRulesVersions(dependencies.db, ["test errata card 1"]);

    const errata = await dependencies.db
      .insertInto("errata")
      .values({
        citation: "test errata card 1",
        position: 1,
        ruling: "Updated text.",
        section: null,
        type: "card_errata",
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    await dependencies.db
      .insertInto("errata_card")
      .values({ card_id: "01001", errata_id: errata.id, position: 1 })
      .execute();

    const res = await dependencies.app.request("/v2/public/errata/card/01001");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      {
        citation: "test errata card 1",
        id: errata.id,
        position: 1,
        ruling: "Updated text.",
        type: "card_errata",
      },
    ]);
  });

  test("responds with an empty array when no errata exists", async ({
    dependencies,
  }) => {
    const res = await dependencies.app.request("/v2/public/errata/card/01001");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

async function insertRulesVersions(db: Database, citations: string[]) {
  await db
    .insertInto("rules_version")
    .values(
      citations.map((citation, index) => ({
        citation,
        date: new Date(2024, 0, index + 1),
      })),
    )
    .execute();
}
