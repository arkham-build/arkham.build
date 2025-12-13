/** biome-ignore-all lint/suspicious/noExplicitAny: test code */
import { describe, expect } from "vitest";
import { test } from "./test-utils.ts";

describe("GET /v2/public/recommendations", () => {
  test("responds with a list of recommendations for an investigator", async ({
    dependencies,
  }) => {
    const res = await dependencies.app.request(
      "/v2/public/recommendations/08016-08016",
      {
        method: "GET",
      },
    );

    expect(top(10, await res.json())).toMatchInlineSnapshot(`
      [
        {
          "card_code": "08017",
          "decks_matched": 10,
          "recommendation": 100,
        },
        {
          "card_code": "08018",
          "decks_matched": 10,
          "recommendation": 100,
        },
        {
          "card_code": "08072",
          "decks_matched": 10,
          "recommendation": 100,
        },
        {
          "card_code": "01000",
          "decks_matched": 9,
          "recommendation": 90,
        },
        {
          "card_code": "01073",
          "decks_matched": 8,
          "recommendation": 80,
        },
        {
          "card_code": "01079",
          "decks_matched": 6,
          "recommendation": 60,
        },
        {
          "card_code": "01090",
          "decks_matched": 6,
          "recommendation": 60,
        },
        {
          "card_code": "02157",
          "decks_matched": 6,
          "recommendation": 60,
        },
        {
          "card_code": "08053",
          "decks_matched": 6,
          "recommendation": 60,
        },
        {
          "card_code": "08057",
          "decks_matched": 6,
          "recommendation": 60,
        },
      ]
    `);
  });

  test("responds with percentile ranked recommendations for an investigator", async ({
    dependencies,
  }) => {
    const res = await dependencies.app.request(
      "/v2/public/recommendations/06005-06005?analysis_algorithm=percentile_rank",
      {
        method: "GET",
      },
    );

    expect(top(25, await res.json())).toMatchInlineSnapshot(`
      [
        {
          "card_code": "01060",
          "recommendation": 100,
        },
        {
          "card_code": "01065",
          "recommendation": 100,
        },
        {
          "card_code": "01067",
          "recommendation": 100,
        },
        {
          "card_code": "01076",
          "recommendation": 100,
        },
        {
          "card_code": "03039",
          "recommendation": 100,
        },
        {
          "card_code": "03198",
          "recommendation": 100,
        },
        {
          "card_code": "04029",
          "recommendation": 100,
        },
        {
          "card_code": "04033",
          "recommendation": 100,
        },
        {
          "card_code": "04200",
          "recommendation": 100,
        },
        {
          "card_code": "04272",
          "recommendation": 100,
        },
        {
          "card_code": "05032",
          "recommendation": 100,
        },
        {
          "card_code": "07032",
          "recommendation": 100,
        },
        {
          "card_code": "09108",
          "recommendation": 100,
        },
        {
          "card_code": "09109",
          "recommendation": 100,
        },
        {
          "card_code": "09111",
          "recommendation": 100,
        },
        {
          "card_code": "09122",
          "recommendation": 100,
        },
        {
          "card_code": "01093",
          "recommendation": 75,
        },
        {
          "card_code": "01089",
          "recommendation": 60,
        },
        {
          "card_code": "01064",
          "recommendation": 50,
        },
        {
          "card_code": "01088",
          "recommendation": 50,
        },
        {
          "card_code": "02158",
          "recommendation": 50,
        },
        {
          "card_code": "08125",
          "recommendation": 50,
        },
        {
          "card_code": "01092",
          "recommendation": 33.33,
        },
        {
          "card_code": "01087",
          "recommendation": 20,
        },
        {
          "card_code": "01000",
          "recommendation": 16.67,
        },
      ]
    `);
  });

  test("responds with the same recommendations for duplicate investigators", async ({
    dependencies,
  }) => {
    const a = await dependencies.app.request(
      "/v2/public/recommendations/98010-98010",
      {
        method: "GET",
      },
    );

    const b = await dependencies.app.request(
      "/v2/public/recommendations/05001-05001",
      {
        method: "GET",
      },
    );

    expect(top(20, await a.json())).toEqual(top(20, await b.json()));
  });

  test("can exclude side decks from calculations", async ({ dependencies }) => {
    const a = await dependencies.app.request(
      "/v2/public/recommendations/05001-05001?analyze_side_decks=false",
      {
        method: "GET",
      },
    );

    const b = await dependencies.app.request(
      "/v2/public/recommendations/05001-05001",
      {
        method: "GET",
      },
    );

    const aBody: any = await a.json();
    const bBody: any = await b.json();

    expect(aBody).not.toEqual(bBody);
    expect(top(10, aBody)).toMatchInlineSnapshot(`
      [
        {
          "card_code": "01000",
          "decks_matched": 9,
          "recommendation": 90,
        },
        {
          "card_code": "05007",
          "decks_matched": 8,
          "recommendation": 80,
        },
        {
          "card_code": "05008",
          "decks_matched": 8,
          "recommendation": 80,
        },
        {
          "card_code": "01024",
          "decks_matched": 6,
          "recommendation": 60,
        },
        {
          "card_code": "01065",
          "decks_matched": 6,
          "recommendation": 60,
        },
        {
          "card_code": "03269",
          "decks_matched": 6,
          "recommendation": 60,
        },
        {
          "card_code": "04106",
          "decks_matched": 6,
          "recommendation": 60,
        },
        {
          "card_code": "01030",
          "decks_matched": 5,
          "recommendation": 50,
        },
        {
          "card_code": "01090",
          "decks_matched": 5,
          "recommendation": 50,
        },
        {
          "card_code": "02033",
          "decks_matched": 5,
          "recommendation": 50,
        },
      ]
    `);
  });

  test("can apply a custom date range", async ({ dependencies }) => {
    const a = await dependencies.app.request(
      "/v2/public/recommendations/05001-05001?date_range=2020-01&date_range=2020-12",
      {
        method: "GET",
      },
    );

    const b = await dependencies.app.request(
      "/v2/public/recommendations/05001-05001",
      {
        method: "GET",
      },
    );

    const aBody: any = await a.json();
    const bBody: any = await b.json();

    expect(aBody.data.recommendations.decks_analyzed).toBeLessThan(
      bBody.data.recommendations.decks_analyzed,
    );

    expect(top(10, aBody)).toMatchInlineSnapshot(`
      [
        {
          "card_code": "01000",
          "decks_matched": 1,
          "recommendation": 100,
        },
        {
          "card_code": "01024",
          "decks_matched": 1,
          "recommendation": 100,
        },
        {
          "card_code": "01030",
          "decks_matched": 1,
          "recommendation": 100,
        },
        {
          "card_code": "01037",
          "decks_matched": 1,
          "recommendation": 100,
        },
        {
          "card_code": "01039",
          "decks_matched": 1,
          "recommendation": 100,
        },
        {
          "card_code": "01065",
          "decks_matched": 1,
          "recommendation": 100,
        },
        {
          "card_code": "02033",
          "decks_matched": 1,
          "recommendation": 100,
        },
        {
          "card_code": "02107",
          "decks_matched": 1,
          "recommendation": 100,
        },
        {
          "card_code": "02108",
          "decks_matched": 1,
          "recommendation": 100,
        },
        {
          "card_code": "02117",
          "decks_matched": 1,
          "recommendation": 100,
        },
      ]
    `);
  });

  test("can apply required cards", async ({ dependencies }) => {
    const a = await dependencies.app.request(
      "/v2/public/recommendations/05001-05001?required_cards=01088&required_cards=01093",
      {
        method: "GET",
      },
    );

    const b = await dependencies.app.request(
      "/v2/public/recommendations/05001-05001",
      {
        method: "GET",
      },
    );

    const aBody: any = await a.json();
    const bBody: any = await b.json();

    expect(aBody.data.recommendations.decks_analyzed).toBeLessThan(
      bBody.data.recommendations.decks_analyzed,
    );
    expect(top(10, aBody)).toMatchInlineSnapshot(`
      [
        {
          "card_code": "01000",
          "decks_matched": 1,
          "recommendation": 100,
        },
        {
          "card_code": "01017",
          "decks_matched": 1,
          "recommendation": 100,
        },
        {
          "card_code": "01024",
          "decks_matched": 1,
          "recommendation": 100,
        },
        {
          "card_code": "01039",
          "decks_matched": 1,
          "recommendation": 100,
        },
        {
          "card_code": "01060",
          "decks_matched": 1,
          "recommendation": 100,
        },
        {
          "card_code": "01065",
          "decks_matched": 1,
          "recommendation": 100,
        },
        {
          "card_code": "01088",
          "decks_matched": 1,
          "recommendation": 100,
        },
        {
          "card_code": "01090",
          "decks_matched": 1,
          "recommendation": 100,
        },
        {
          "card_code": "01093",
          "decks_matched": 1,
          "recommendation": 100,
        },
        {
          "card_code": "02033",
          "decks_matched": 1,
          "recommendation": 100,
        },
      ]
    `);
  });
});

function top(n = 10, body: any = undefined) {
  return body.data.recommendations.recommendations
    .sort((a: any, b: any) => b.recommendation - a.recommendation)
    .slice(0, n);
}
