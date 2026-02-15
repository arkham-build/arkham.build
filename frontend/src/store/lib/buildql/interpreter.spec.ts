import type { Card } from "@arkham-build/shared";
import type { i18n, TFunction } from "i18next";
import { beforeAll, describe, expect, test } from "vitest";
import { selectLookupTables, selectMetadata } from "@/store/selectors/shared";
import { getMockStore } from "@/test/get-mock-store";
import { fields } from "./fields";
import { Interpreter } from "./interpreter";
import type { InterpreterContext } from "./interpreter.types";
import { parse } from "./parser";

function createMockCard(overrides: Partial<Card> = {}): Card {
  return {
    code: "01001",
    name: "Test Card",
    faction_code: "guardian",
    type_code: "asset",
    pack_code: "core",
    position: 1,
    quantity: 2,
    id: "01001",
    real_name: "Test Card",
    ...overrides,
  } as Card;
}

function compile(expr: ReturnType<typeof parse>, ctx: InterpreterContext) {
  const interpreter = new Interpreter(ctx);
  return interpreter.evaluate(expr);
}

describe("Interpreter", () => {
  let ctx: InterpreterContext;

  beforeAll(async () => {
    const mockStore = await getMockStore();
    ctx = {
      fields,
      fieldLookupContext: {
        deck: undefined,
        matchBacks: false,
        i18n: {
          language: "en",
          t: ((key: string) => key) as TFunction,
        } as i18n,
        metadata: selectMetadata(mockStore.getState()),
        lookupTables: selectLookupTables(mockStore.getState()),
      },
    };
  });

  describe("Binary operators", () => {
    test("strict equals (==) with numbers", () => {
      const expr = parse("xp == 3");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ xp: 3 }))).toBe(true);
      expect(filter(createMockCard({ xp: 2 }))).toBe(false);
      expect(filter(createMockCard({ xp: null }))).toBe(false);
    });

    test("strict not equals (!==) with numbers", () => {
      const expr = parse("xp !== 3");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ xp: 3 }))).toBe(false);
      expect(filter(createMockCard({ xp: 2 }))).toBe(true);
      expect(filter(createMockCard({ xp: null }))).toBe(true);
    });

    test("strict equals (==) with booleans", () => {
      const expr = parse("unique == true");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ is_unique: true }))).toBe(true);
      expect(filter(createMockCard({ is_unique: false }))).toBe(false);
    });

    test("strict equals (==) with false includes null", () => {
      const expr = parse("unique == false");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ is_unique: false }))).toBe(true);
      expect(filter(createMockCard({ is_unique: null }))).toBe(true);
      expect(filter(createMockCard({ is_unique: true }))).toBe(false);
    });

    test("loose equals (=) with strings", () => {
      const expr = parse('name = "test"');
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ name: "Test Card" }))).toBe(true);
      expect(filter(createMockCard({ name: "Another Card" }))).toBe(false);
    });

    test("greater than (>)", () => {
      const expr = parse("xp > 2");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ xp: 3 }))).toBe(true);
      expect(filter(createMockCard({ xp: 2 }))).toBe(false);
      expect(filter(createMockCard({ xp: 1 }))).toBe(false);
    });

    test("less than (<)", () => {
      const expr = parse("xp < 2");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ xp: 1 }))).toBe(true);
      expect(filter(createMockCard({ xp: 2 }))).toBe(false);
      expect(filter(createMockCard({ xp: 3 }))).toBe(false);
    });

    test("greater than or equals (>=)", () => {
      const expr = parse("xp >= 2");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ xp: 3 }))).toBe(true);
      expect(filter(createMockCard({ xp: 2 }))).toBe(true);
      expect(filter(createMockCard({ xp: 1 }))).toBe(false);
    });

    test("less than or equals (<=)", () => {
      const expr = parse("xp <= 2");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ xp: 1 }))).toBe(true);
      expect(filter(createMockCard({ xp: 2 }))).toBe(true);
      expect(filter(createMockCard({ xp: 3 }))).toBe(false);
    });

    test("strict contains (??)", () => {
      const expr = parse("xp ?? [1, 3, 5]");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ xp: 1 }))).toBe(true);
      expect(filter(createMockCard({ xp: 3 }))).toBe(true);
      expect(filter(createMockCard({ xp: 2 }))).toBe(false);
    });

    test("strict not contains (!??)", () => {
      const expr = parse("xp !?? [1, 3, 5]");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ xp: 1 }))).toBe(false);
      expect(filter(createMockCard({ xp: 2 }))).toBe(true);
    });

    test("loose contains (?)", () => {
      const expr = parse('trait ? ["tactic", "supply"]');
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ traits: "Tactic. Supply." }))).toBe(true);
      expect(filter(createMockCard({ traits: "Item." }))).toBe(false);
    });

    test("loose not contains (!?)", () => {
      const expr = parse('trait !? ["tactic", "supply"]');
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ traits: "Tactic. Supply." }))).toBe(false);
      expect(filter(createMockCard({ traits: "Item." }))).toBe(true);
    });
  });

  describe("Logical operators", () => {
    test("AND (&)", () => {
      const expr = parse("xp > 0 & cost < 3");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ xp: 1, cost: 2 }))).toBe(true);
      expect(filter(createMockCard({ xp: 0, cost: 2 }))).toBe(false);
      expect(filter(createMockCard({ xp: 1, cost: 3 }))).toBe(false);
    });

    test("OR (|)", () => {
      const expr = parse("xp > 3 | cost > 5");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ xp: 4, cost: 1 }))).toBe(true);
      expect(filter(createMockCard({ xp: 1, cost: 6 }))).toBe(true);
      expect(filter(createMockCard({ xp: 1, cost: 1 }))).toBe(false);
    });
  });

  describe("Groups", () => {
    test("groups override precedence", () => {
      const expr = parse("(xp == 0 | xp == 2) & cost < 3");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ xp: 0, cost: 2 }))).toBe(true);
      expect(filter(createMockCard({ xp: 2, cost: 2 }))).toBe(true);
      expect(filter(createMockCard({ xp: 1, cost: 2 }))).toBe(false);
      expect(filter(createMockCard({ xp: 0, cost: 3 }))).toBe(false);
    });
  });

  describe("Arithmetic operators", () => {
    test("addition (+)", () => {
      const expr = parse("health + sanity > 10");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ health: 6, sanity: 5 }))).toBe(true);
      expect(filter(createMockCard({ health: 5, sanity: 5 }))).toBe(false);
    });

    test("subtraction (-)", () => {
      const expr = parse("health - sanity > 2");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ health: 6, sanity: 3 }))).toBe(true);
      expect(filter(createMockCard({ health: 5, sanity: 3 }))).toBe(false);
    });

    test("multiplication (*)", () => {
      const expr = parse("cost * 2 < 10");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ cost: 4 }))).toBe(true);
      expect(filter(createMockCard({ cost: 5 }))).toBe(false);
    });

    test("division (/)", () => {
      const expr = parse("cost / 2 > 2");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ cost: 5 }))).toBe(true);
      expect(filter(createMockCard({ cost: 4 }))).toBe(false);
    });

    test("modulo (%)", () => {
      const expr = parse("cost % 2 == 0");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ cost: 4 }))).toBe(true);
      expect(filter(createMockCard({ cost: 5 }))).toBe(false);
    });
  });

  describe("Field references", () => {
    test("comparing two fields", () => {
      const expr = parse("health > sanity");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ health: 5, sanity: 3 }))).toBe(true);
      expect(filter(createMockCard({ health: 3, sanity: 5 }))).toBe(false);
    });
  });

  describe("Text vs String field handling", () => {
    test("strict equals (==) on text fields uses substring match", () => {
      const expr = parse('text == "fight"');
      const filter = compile(expr, ctx);

      expect(
        filter(
          createMockCard({
            text: "<b>Fight.</b> You get +1 [combat] for this test.",
          }),
        ),
      ).toBe(true);
      expect(filter(createMockCard({ text: "Parley. Investigate." }))).toBe(
        false,
      );
    });

    test("strict equals (==) on string fields uses exact match", () => {
      const expr = parse('name == "Roland Banks"');
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ name: "Roland Banks" }))).toBe(true);
      expect(filter(createMockCard({ name: "Roland" }))).toBe(false);
    });

    test("loose equals (=) on text fields uses fuzzy match", () => {
      const expr = parse('text = "fight combat"');
      const filter = compile(expr, ctx);

      expect(
        filter(
          createMockCard({
            text: "<b>Fight.</b> You get +1 [combat] for this test.",
          }),
        ),
      ).toBe(true);
      expect(filter(createMockCard({ text: "Investigate." }))).toBe(false);
    });

    test("loose equals (=) on string fields uses substring match", () => {
      const expr = parse('name = "roland"');
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ name: "Roland Banks" }))).toBe(true);
      expect(filter(createMockCard({ name: "Wendy Adams" }))).toBe(false);
    });

    test("throws error when comparing text field with string field", () => {
      const expr = parse("text == name");
      const filter = compile(expr, ctx);

      expect(() =>
        filter(createMockCard({ text: "test", name: "test" })),
      ).toThrow("Type mismatch: cannot compare text field with string field");
    });

    test("allows comparing string literals with text fields", () => {
      const expr = parse('text == "fight"');
      const filter = compile(expr, ctx);

      expect(
        filter(createMockCard({ text: "<b>Fight.</b> You get +1 [combat]" })),
      ).toBe(true);
    });
  });

  describe("Regex matching", () => {
    test("regex matches with loose equals (=)", () => {
      const expr = parse("name = /^test/");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ name: "Test Card" }))).toBe(true);
      expect(filter(createMockCard({ name: "Another Test" }))).toBe(false);
    });

    test("regex with not equals (!=)", () => {
      const expr = parse("name != /^test/");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ name: "Test Card" }))).toBe(false);
      expect(filter(createMockCard({ name: "Another Card" }))).toBe(true);
    });

    test("regex is case-insensitive", () => {
      const expr = parse("name = /test/");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ name: "Test Card" }))).toBe(true);
      expect(filter(createMockCard({ name: "TEST CARD" }))).toBe(true);
      expect(filter(createMockCard({ name: "Another Card" }))).toBe(false);
    });

    test("regex with alternation", () => {
      const expr = parse("trait = /^(spell|ritual)$/");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ traits: "Spell." }))).toBe(true);
      expect(filter(createMockCard({ traits: "Ritual." }))).toBe(true);
      expect(filter(createMockCard({ traits: "Tactic." }))).toBe(false);
    });

    test("regex with contains operator (?)", () => {
      const expr = parse("name ? [/^the/, /^a/]");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ name: "The Test" }))).toBe(true);
      expect(filter(createMockCard({ name: "A Card" }))).toBe(true);
      expect(filter(createMockCard({ name: "Another Test" }))).toBe(true);
      expect(filter(createMockCard({ name: "Test" }))).toBe(false);
    });

    test("regex with digit class", () => {
      const expr = parse("text = /\\d+ damage/");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ text: "Deal 3 damage" }))).toBe(true);
      expect(filter(createMockCard({ text: "Deal damage" }))).toBe(false);
    });

    test("regex supports unicode", () => {
      const expr = parse("name = /健康/");
      const filter = compile(expr, ctx);

      expect(filter(createMockCard({ name: "健康卡" }))).toBe(true);
      expect(filter(createMockCard({ name: "Another Card" }))).toBe(false);
    });
  });

  describe("Bidirectional comparison context", () => {
    test("investigator_access field works with investigator code on left side", () => {
      const expr = parse('investigator_access = "01001"');
      const filter = compile(expr, ctx);

      const rolandCard = createMockCard({
        code: "01006",
        name: ".45 Automatic",
        type_code: "asset",
        faction_code: "guardian",
        xp: 0,
      });

      expect(filter(rolandCard)).toBe(true);
    });

    test("investigator_access field works with investigator code on right side", () => {
      const expr = parse('"01001" = investigator_access');
      const filter = compile(expr, ctx);

      const rolandCard = createMockCard({
        code: "01006",
        name: ".45 Automatic",
        type_code: "asset",
        faction_code: "guardian",
        xp: 0,
      });

      expect(filter(rolandCard)).toBe(true);
    });
  });
});
