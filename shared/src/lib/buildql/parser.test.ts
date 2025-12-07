import { describe, expect, it } from "vitest";
import { ParserError, parse } from "./parser";

describe("Parser", () => {
  describe("literals", () => {
    it("parses true", () => {
      const ast = parse("true");
      expect(ast).toMatchObject({
        type: "LITERAL",
        value: true,
      });
    });

    it("parses false", () => {
      const ast = parse("false");
      expect(ast).toMatchObject({
        type: "LITERAL",
        value: false,
      });
    });

    it("parses integers", () => {
      const ast = parse("42");
      expect(ast).toMatchObject({
        type: "LITERAL",
        value: 42,
      });
    });

    it("parses strings", () => {
      const ast = parse('"hello"');
      expect(ast).toMatchObject({
        type: "LITERAL",
        value: "hello",
      });
    });
  });

  describe("identifiers", () => {
    it("parses simple identifiers", () => {
      const ast = parse("xp");
      expect(ast).toMatchObject({
        type: "IDENTIFIER",
        name: "xp",
      });
    });

    it("parses identifiers with underscores", () => {
      const ast = parse("deck_limit");
      expect(ast).toMatchObject({
        type: "IDENTIFIER",
        name: "deck_limit",
      });
    });
  });

  describe("comparison operators", () => {
    it("parses strict equals (==)", () => {
      const ast = parse("xp == 3");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "==",
        left: { type: "IDENTIFIER", name: "xp" },
        right: { type: "LITERAL", value: 3 },
      });
    });

    it("parses loose equals (=)", () => {
      const ast = parse("xp = 3");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "=",
        left: { type: "IDENTIFIER", name: "xp" },
        right: { type: "LITERAL", value: 3 },
      });
    });

    it("parses not equals (!=)", () => {
      const ast = parse("xp != 3");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "!=",
        left: { type: "IDENTIFIER", name: "xp" },
        right: { type: "LITERAL", value: 3 },
      });
    });

    it("parses greater than (>)", () => {
      const ast = parse("xp > 3");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: ">",
        left: { type: "IDENTIFIER", name: "xp" },
        right: { type: "LITERAL", value: 3 },
      });
    });

    it("parses less than (<)", () => {
      const ast = parse("xp < 3");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "<",
        left: { type: "IDENTIFIER", name: "xp" },
        right: { type: "LITERAL", value: 3 },
      });
    });

    it("parses greater than or equal (>=)", () => {
      const ast = parse("xp >= 3");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: ">=",
        left: { type: "IDENTIFIER", name: "xp" },
        right: { type: "LITERAL", value: 3 },
      });
    });

    it("parses less than or equal (<=)", () => {
      const ast = parse("xp <= 3");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "<=",
        left: { type: "IDENTIFIER", name: "xp" },
        right: { type: "LITERAL", value: 3 },
      });
    });

    it("parses strict contains (??)", () => {
      const ast = parse('trait ?? ["Tactic."]');
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "??",
        left: { type: "IDENTIFIER", name: "trait" },
        right: { type: "LIST" },
      });
    });

    it("parses strict not contains (??!)", () => {
      const ast = parse('trait ??! ["Tactic."]');
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "??!",
      });
    });

    it("parses loose contains (?)", () => {
      const ast = parse('trait ? ["tactic"]');
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "?",
      });
    });

    it("parses loose not contains (?!)", () => {
      const ast = parse('trait ?! ["tactic"]');
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "?!",
      });
    });
  });

  describe("logical operators", () => {
    it("parses AND (&)", () => {
      const ast = parse("xp > 3 & cost < 5");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "&",
        left: {
          type: "BINARY",
          operator: ">",
        },
        right: {
          type: "BINARY",
          operator: "<",
        },
      });
    });

    it("parses OR (|)", () => {
      const ast = parse("xp > 3 | cost < 5");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "|",
        left: {
          type: "BINARY",
          operator: ">",
        },
        right: {
          type: "BINARY",
          operator: "<",
        },
      });
    });
  });

  describe("arithmetic operators", () => {
    it("parses addition (+)", () => {
      const ast = parse("health + sanity");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "+",
        left: { type: "IDENTIFIER", name: "health" },
        right: { type: "IDENTIFIER", name: "sanity" },
      });
    });

    it("parses subtraction (-)", () => {
      const ast = parse("health - 1");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "-",
      });
    });

    it("parses multiplication (*)", () => {
      const ast = parse("cost * 2");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "*",
      });
    });

    it("parses division (/)", () => {
      const ast = parse("cost / 2");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "/",
      });
    });

    it("parses modulo (%)", () => {
      const ast = parse("cost % 2");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "%",
      });
    });
  });

  describe("groups", () => {
    it("parses grouped expression", () => {
      const ast = parse("(xp > 3)");
      expect(ast).toMatchObject({
        type: "GROUP",
        expression: {
          type: "BINARY",
          operator: ">",
          left: { type: "IDENTIFIER", name: "xp" },
          right: { type: "LITERAL", value: 3 },
        },
      });
    });

    it("parses nested groups", () => {
      const ast = parse("((xp > 3))");
      expect(ast).toMatchObject({
        type: "GROUP",
        expression: {
          type: "GROUP",
          expression: {
            type: "BINARY",
            operator: ">",
            left: { type: "IDENTIFIER", name: "xp" },
            right: { type: "LITERAL", value: 3 },
          },
        },
      });
    });
  });

  describe("lists", () => {
    it("parses empty list", () => {
      const ast = parse("[]");
      expect(ast).toMatchObject({
        type: "LIST",
        elements: [],
      });
    });

    it("parses list with single element", () => {
      const ast = parse("[1]");
      expect(ast).toMatchObject({
        type: "LIST",
        elements: [{ type: "LITERAL", value: 1 }],
      });
    });

    it("parses list with multiple elements", () => {
      const ast = parse("[1, 2, 3]");
      expect(ast).toMatchObject({
        type: "LIST",
        elements: [
          { type: "LITERAL", value: 1 },
          { type: "LITERAL", value: 2 },
          { type: "LITERAL", value: 3 },
        ],
      });
    });

    it("parses list with strings", () => {
      const ast = parse('["Tactic.", "Supply."]');
      expect(ast).toMatchObject({
        type: "LIST",
        elements: [
          { type: "LITERAL", value: "Tactic." },
          { type: "LITERAL", value: "Supply." },
        ],
      });
    });
  });

  describe("operator precedence", () => {
    it("AND has higher precedence than OR", () => {
      const ast = parse("a | b & c");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "|",
        left: { type: "IDENTIFIER", name: "a" },
        right: {
          type: "BINARY",
          operator: "&",
          left: { type: "IDENTIFIER", name: "b" },
          right: { type: "IDENTIFIER", name: "c" },
        },
      });
    });

    it("multiplication has higher precedence than addition", () => {
      const ast = parse("a + b * c");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "+",
        left: { type: "IDENTIFIER", name: "a" },
        right: {
          type: "BINARY",
          operator: "*",
          left: { type: "IDENTIFIER", name: "b" },
          right: { type: "IDENTIFIER", name: "c" },
        },
      });
    });

    it("comparison has lower precedence than arithmetic", () => {
      const ast = parse("health + sanity > 10");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: ">",
        left: {
          type: "BINARY",
          operator: "+",
          left: { type: "IDENTIFIER", name: "health" },
          right: { type: "IDENTIFIER", name: "sanity" },
        },
        right: { type: "LITERAL", value: 10 },
      });
    });

    it("groups override precedence", () => {
      const ast = parse("(a | b) & c");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "&",
        left: {
          type: "GROUP",
          expression: {
            type: "BINARY",
            operator: "|",
            left: { type: "IDENTIFIER", name: "a" },
            right: { type: "IDENTIFIER", name: "b" },
          },
        },
        right: { type: "IDENTIFIER", name: "c" },
      });
    });
  });

  describe("left associativity", () => {
    it("OR is left associative", () => {
      const ast = parse("a | b | c");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "|",
        left: {
          type: "BINARY",
          operator: "|",
          left: { type: "IDENTIFIER", name: "a" },
          right: { type: "IDENTIFIER", name: "b" },
        },
        right: { type: "IDENTIFIER", name: "c" },
      });
    });

    it("AND is left associative", () => {
      const ast = parse("a & b & c");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "&",
        left: {
          type: "BINARY",
          operator: "&",
          left: { type: "IDENTIFIER", name: "a" },
          right: { type: "IDENTIFIER", name: "b" },
        },
        right: { type: "IDENTIFIER", name: "c" },
      });
    });

    it("addition is left associative", () => {
      const ast = parse("a + b + c");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "+",
        left: {
          type: "BINARY",
          operator: "+",
          left: { type: "IDENTIFIER", name: "a" },
          right: { type: "IDENTIFIER", name: "b" },
        },
        right: { type: "IDENTIFIER", name: "c" },
      });
    });
  });

  describe("complete expressions from spec", () => {
    it('parses "bonded == true"', () => {
      const ast = parse("bonded == true");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "==",
        left: { type: "IDENTIFIER", name: "bonded" },
        right: { type: "LITERAL", value: true },
      });
    });

    it('parses "xp > 3 & trait = \\"practiced\\""', () => {
      const ast = parse('xp > 3 & trait = "practiced"');
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "&",
        left: {
          type: "BINARY",
          operator: ">",
          left: { type: "IDENTIFIER", name: "xp" },
          right: { type: "LITERAL", value: 3 },
        },
        right: {
          type: "BINARY",
          operator: "=",
          left: { type: "IDENTIFIER", name: "trait" },
          right: { type: "LITERAL", value: "practiced" },
        },
      });
    });

    it('parses "(xp = 0 | xp = 2) & (trait = \\"practiced\\" | trait = \\"innate\\")"', () => {
      const ast = parse(
        '(xp = 0 | xp = 2) & (trait = "practiced" | trait = "innate")',
      );
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "&",
        left: {
          type: "GROUP",
          expression: {
            type: "BINARY",
            operator: "|",
            left: {
              type: "BINARY",
              operator: "=",
              left: { type: "IDENTIFIER", name: "xp" },
              right: { type: "LITERAL", value: 0 },
            },
            right: {
              type: "BINARY",
              operator: "=",
              left: { type: "IDENTIFIER", name: "xp" },
              right: { type: "LITERAL", value: 2 },
            },
          },
        },
        right: {
          type: "GROUP",
          expression: {
            type: "BINARY",
            operator: "|",
            left: {
              type: "BINARY",
              operator: "=",
              left: { type: "IDENTIFIER", name: "trait" },
              right: { type: "LITERAL", value: "practiced" },
            },
            right: {
              type: "BINARY",
              operator: "=",
              left: { type: "IDENTIFIER", name: "trait" },
              right: { type: "LITERAL", value: "innate" },
            },
          },
        },
      });
    });

    it('parses "health + sanity < 14"', () => {
      const ast = parse("health + sanity < 14");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "<",
        left: {
          type: "BINARY",
          operator: "+",
          left: { type: "IDENTIFIER", name: "health" },
          right: { type: "IDENTIFIER", name: "sanity" },
        },
        right: { type: "LITERAL", value: 14 },
      });
    });

    it('parses "cost % 2 = 0"', () => {
      const ast = parse("cost % 2 = 0");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "=",
        left: {
          type: "BINARY",
          operator: "%",
          left: { type: "IDENTIFIER", name: "cost" },
          right: { type: "LITERAL", value: 2 },
        },
        right: { type: "LITERAL", value: 0 },
      });
    });

    it('parses "xp ?? [1, 3, 5, 8]"', () => {
      const ast = parse("xp ?? [1, 3, 5, 8]");
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "??",
        left: { type: "IDENTIFIER", name: "xp" },
        right: {
          type: "LIST",
          elements: [
            { type: "LITERAL", value: 1 },
            { type: "LITERAL", value: 3 },
            { type: "LITERAL", value: 5 },
            { type: "LITERAL", value: 8 },
          ],
        },
      });
    });

    it('parses "health > sanity & trait = \\"ally\\""', () => {
      const ast = parse('health > sanity & trait = "ally"');
      expect(ast).toMatchObject({
        type: "BINARY",
        operator: "&",
        left: {
          type: "BINARY",
          operator: ">",
          left: { type: "IDENTIFIER", name: "health" },
          right: { type: "IDENTIFIER", name: "sanity" },
        },
        right: {
          type: "BINARY",
          operator: "=",
          left: { type: "IDENTIFIER", name: "trait" },
          right: { type: "LITERAL", value: "ally" },
        },
      });
    });
  });

  describe("span tracking", () => {
    it("tracks span for literals", () => {
      const ast = parse("true");
      expect(ast.span).toEqual({
        start: { offset: 0, line: 1, column: 1 },
        end: { offset: 4, line: 1, column: 5 },
      });
    });

    it("tracks span for binary expressions", () => {
      const ast = parse("a > b");
      expect(ast.span).toEqual({
        start: { offset: 0, line: 1, column: 1 },
        end: { offset: 5, line: 1, column: 6 },
      });
    });

    it("tracks span for groups", () => {
      const ast = parse("(a)");
      expect(ast.span).toEqual({
        start: { offset: 0, line: 1, column: 1 },
        end: { offset: 3, line: 1, column: 4 },
      });
    });
  });

  describe("error handling", () => {
    it("throws on unexpected token", () => {
      expect(() => parse("xp >")).toThrow(ParserError);
      expect(() => parse("xp >")).toThrow("Expected expression");
    });

    it("throws on unclosed group", () => {
      expect(() => parse("(xp > 3")).toThrow(ParserError);
      expect(() => parse("(xp > 3")).toThrow("Expected ')'");
    });

    it("throws on unclosed list", () => {
      expect(() => parse("[1, 2")).toThrow(ParserError);
      expect(() => parse("[1, 2")).toThrow("Expected ']'");
    });

    it("throws on trailing tokens", () => {
      expect(() => parse("xp > 3 4")).toThrow(ParserError);
      expect(() => parse("xp > 3 4")).toThrow("Unexpected token");
    });

    it("includes position in error", () => {
      try {
        parse("xp >");
      } catch (e) {
        expect(e).toBeInstanceOf(ParserError);
        expect((e as ParserError).position).toBeDefined();
      }
    });
  });
});
