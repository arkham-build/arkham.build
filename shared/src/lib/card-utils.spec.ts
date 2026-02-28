import { readFileSync } from "node:fs";
import path from "node:path";
import { type Card, countExperience } from "@arkham-build/shared";
import { describe, expect, it } from "vitest";

function allCardsStub() {
  const allCards = JSON.parse(
    readFileSync(
      path.join(__dirname, "../../../test/fixtures/stubs/all_card.json"),
      "utf-8",
    ),
  ).data.all_card;

  return allCards;
}

describe("countExperience", () => {
  const cards = Object.fromEntries(
    allCardsStub().map((c: Card) => [c.code, c]),
  );

  it("handles base case", () => {
    const card = cards["60127"];
    expect(countExperience(card, 2)).toEqual(6);
  });

  it("handles case: chained", () => {
    const card = cards["60127"];
    card.taboo_xp = -1;
    expect(countExperience(card, 2)).toEqual(4);
  });

  it("handles myriad", () => {
    const card = cards["06328"];
    expect(countExperience(card, 3)).toEqual(2);
  });

  it("handles exceptional: base case", () => {
    const card = cards["08053"];
    expect(countExperience(card, 1)).toEqual(4);
  });

  it("handles exceptional: chained", () => {
    const card = cards["08053"];
    card.taboo_xp = 1;
    expect(countExperience(card, 1)).toEqual(5);
  });
});
