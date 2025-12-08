import { parse } from "@arkham-build/shared";
import { describe, expect, test } from "vitest";
import type { Card } from "@/store/schemas/card.schema";
import { compile } from "./interpreter";
import { lookups } from "./lookups";

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

describe("Interpreter", () => {
  describe("Binary operators", () => {
    test("strict equals (==) with numbers", () => {
      const expr = parse("xp == 3");
      const filter = compile(expr, { lookups });

      expect(filter(createMockCard({ xp: 3 }))).toBe(true);
      expect(filter(createMockCard({ xp: 2 }))).toBe(false);
      expect(filter(createMockCard({ xp: null }))).toBe(false);
    });

    test("strict not equals (!==) with numbers", () => {
      const expr = parse("xp !== 3");
      const filter = compile(expr, { lookups });

      expect(filter(createMockCard({ xp: 3 }))).toBe(false);
      expect(filter(createMockCard({ xp: 2 }))).toBe(true);
      expect(filter(createMockCard({ xp: null }))).toBe(true);
    });

    test("strict equals (==) with booleans", () => {
      const expr = parse("unique == true");
      const filter = compile(expr, { lookups });

      expect(filter(createMockCard({ is_unique: true }))).toBe(true);
      expect(filter(createMockCard({ is_unique: false }))).toBe(false);
    });

    test("strict equals (==) with false includes null", () => {
      const expr = parse("unique == false");
      const filter = compile(expr, { lookups });

      expect(filter(createMockCard({ is_unique: false }))).toBe(true);
      expect(filter(createMockCard({ is_unique: null }))).toBe(true);
      expect(filter(createMockCard({ is_unique: true }))).toBe(false);
    });

    test("loose equals (=) with strings", () => {
      const expr = parse('name = "test"');
      const filter = compile(expr, { lookups });

      expect(filter(createMockCard({ name: "Test Card" }))).toBe(true);
      expect(filter(createMockCard({ name: "Another Card" }))).toBe(false);
    });

    test("greater than (>)", () => {
      const expr = parse("xp > 2");
      const filter = compile(expr, { lookups });

      expect(filter(createMockCard({ xp: 3 }))).toBe(true);
      expect(filter(createMockCard({ xp: 2 }))).toBe(false);
      expect(filter(createMockCard({ xp: 1 }))).toBe(false);
    });

    test("less than (<)", () => {
      const expr = parse("xp < 2");
      const filter = compile(expr, { lookups });

      expect(filter(createMockCard({ xp: 1 }))).toBe(true);
      expect(filter(createMockCard({ xp: 2 }))).toBe(false);
      expect(filter(createMockCard({ xp: 3 }))).toBe(false);
    });

    test("greater than or equals (>=)", () => {
      const expr = parse("xp >= 2");
      const filter = compile(expr, { lookups });

      expect(filter(createMockCard({ xp: 3 }))).toBe(true);
      expect(filter(createMockCard({ xp: 2 }))).toBe(true);
      expect(filter(createMockCard({ xp: 1 }))).toBe(false);
    });

    test("less than or equals (<=)", () => {
      const expr = parse("xp <= 2");
      const filter = compile(expr, { lookups });

      expect(filter(createMockCard({ xp: 1 }))).toBe(true);
      expect(filter(createMockCard({ xp: 2 }))).toBe(true);
      expect(filter(createMockCard({ xp: 3 }))).toBe(false);
    });

    test("strict contains (??)", () => {
      const expr = parse("xp ?? [1, 3, 5]");
      const filter = compile(expr, { lookups });

      expect(filter(createMockCard({ xp: 1 }))).toBe(true);
      expect(filter(createMockCard({ xp: 3 }))).toBe(true);
      expect(filter(createMockCard({ xp: 2 }))).toBe(false);
    });

    test("strict not contains (??!)", () => {
      const expr = parse("xp ??! [1, 3, 5]");
      const filter = compile(expr, { lookups });

      expect(filter(createMockCard({ xp: 1 }))).toBe(false);
      expect(filter(createMockCard({ xp: 2 }))).toBe(true);
    });

    test("loose contains (?)", () => {
      const expr = parse('trait ? ["tactic", "supply"]');
      const filter = compile(expr, { lookups });

      expect(filter(createMockCard({ traits: "Tactic. Supply." }))).toBe(true);
      expect(filter(createMockCard({ traits: "Item." }))).toBe(false);
    });

    test("loose not contains (?!)", () => {
      const expr = parse('trait ?! ["tactic", "supply"]');
      const filter = compile(expr, { lookups });

      expect(filter(createMockCard({ traits: "Tactic. Supply." }))).toBe(false);
      expect(filter(createMockCard({ traits: "Item." }))).toBe(true);
    });
  });

  describe("Logical operators", () => {
    test("AND (&)", () => {
      const expr = parse("xp > 0 & cost < 3");
      const filter = compile(expr, { lookups });

      expect(filter(createMockCard({ xp: 1, cost: 2 }))).toBe(true);
      expect(filter(createMockCard({ xp: 0, cost: 2 }))).toBe(false);
      expect(filter(createMockCard({ xp: 1, cost: 3 }))).toBe(false);
    });

    test("OR (|)", () => {
      const expr = parse("xp > 3 | cost > 5");
      const filter = compile(expr, { lookups });

      expect(filter(createMockCard({ xp: 4, cost: 1 }))).toBe(true);
      expect(filter(createMockCard({ xp: 1, cost: 6 }))).toBe(true);
      expect(filter(createMockCard({ xp: 1, cost: 1 }))).toBe(false);
    });
  });

  describe("Groups", () => {
    test("groups override precedence", () => {
      const expr = parse("(xp == 0 | xp == 2) & cost < 3");
      const filter = compile(expr, { lookups });

      expect(filter(createMockCard({ xp: 0, cost: 2 }))).toBe(true);
      expect(filter(createMockCard({ xp: 2, cost: 2 }))).toBe(true);
      expect(filter(createMockCard({ xp: 1, cost: 2 }))).toBe(false);
      expect(filter(createMockCard({ xp: 0, cost: 3 }))).toBe(false);
    });
  });

  describe("Arithmetic operators", () => {
    test("addition (+)", () => {
      const expr = parse("health + sanity > 10");
      const filter = compile(expr, { lookups });

      expect(filter(createMockCard({ health: 6, sanity: 5 }))).toBe(true);
      expect(filter(createMockCard({ health: 5, sanity: 5 }))).toBe(false);
    });

    test("subtraction (-)", () => {
      const expr = parse("health - sanity > 2");
      const filter = compile(expr, { lookups });

      expect(filter(createMockCard({ health: 6, sanity: 3 }))).toBe(true);
      expect(filter(createMockCard({ health: 5, sanity: 3 }))).toBe(false);
    });

    test("multiplication (*)", () => {
      const expr = parse("cost * 2 < 10");
      const filter = compile(expr, { lookups });

      expect(filter(createMockCard({ cost: 4 }))).toBe(true);
      expect(filter(createMockCard({ cost: 5 }))).toBe(false);
    });

    test("division (/)", () => {
      const expr = parse("cost / 2 > 2");
      const filter = compile(expr, { lookups });

      expect(filter(createMockCard({ cost: 5 }))).toBe(true);
      expect(filter(createMockCard({ cost: 4 }))).toBe(false);
    });

    test("modulo (%)", () => {
      const expr = parse("cost % 2 == 0");
      const filter = compile(expr, { lookups });

      expect(filter(createMockCard({ cost: 4 }))).toBe(true);
      expect(filter(createMockCard({ cost: 5 }))).toBe(false);
    });
  });

  describe("Field references", () => {
    test("comparing two fields", () => {
      const expr = parse("health > sanity");
      const filter = compile(expr, { lookups });

      expect(filter(createMockCard({ health: 5, sanity: 3 }))).toBe(true);
      expect(filter(createMockCard({ health: 3, sanity: 5 }))).toBe(false);
    });
  });
});
