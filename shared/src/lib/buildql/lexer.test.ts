import { describe, expect, it } from "vitest";
import { LexerError, tokenize } from "./lexer";

describe("Lexer", () => {
  describe("literals", () => {
    it("tokenizes boolean true", () => {
      const tokens = tokenize("true");
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toMatchObject({
        type: "TRUE",
        lexeme: "true",
        value: true,
      });
      expect(tokens[1]).toMatchObject({ type: "EOF" });
    });

    it("tokenizes boolean false", () => {
      const tokens = tokenize("false");
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toMatchObject({
        type: "FALSE",
        lexeme: "false",
        value: false,
      });
    });

    it("tokenizes boolean keywords case-insensitively", () => {
      expect(tokenize("TRUE")[0]).toMatchObject({
        type: "TRUE",
        value: true,
      });
      expect(tokenize("False")[0]).toMatchObject({
        type: "FALSE",
        value: false,
      });
    });

    it("tokenizes integer numbers", () => {
      const tokens = tokenize("42");
      expect(tokens[0]).toMatchObject({
        type: "NUMBER",
        lexeme: "42",
        value: 42,
      });
    });

    it("tokenizes zero", () => {
      const tokens = tokenize("0");
      expect(tokens[0]).toMatchObject({
        type: "NUMBER",
        value: 0,
      });
    });

    it("tokenizes string literals", () => {
      const tokens = tokenize('"hello world"');
      expect(tokens[0]).toMatchObject({
        type: "STRING",
        lexeme: '"hello world"',
        value: "hello world",
      });
    });

    it("tokenizes empty strings", () => {
      const tokens = tokenize('""');
      expect(tokens[0]).toMatchObject({
        type: "STRING",
        value: "",
      });
    });

    it("handles escape sequences in strings", () => {
      const tokens = tokenize('"hello\\nworld"');
      expect(tokens[0]).toMatchObject({
        type: "STRING",
        value: "hello\nworld",
      });
    });

    it("handles escaped quotes in strings", () => {
      const tokens = tokenize('"say \\"hello\\""');
      expect(tokens[0]).toMatchObject({
        type: "STRING",
        value: 'say "hello"',
      });
    });

    it("handles escaped backslashes in strings", () => {
      const tokens = tokenize('"path\\\\to\\\\file"');
      expect(tokens[0]).toMatchObject({
        type: "STRING",
        value: "path\\to\\file",
      });
    });

    it("tokenizes single-quoted strings", () => {
      const tokens = tokenize("'hello world'");
      expect(tokens[0]).toMatchObject({
        type: "STRING",
        lexeme: "'hello world'",
        value: "hello world",
      });
    });

    it("handles escaped single quotes in single-quoted strings", () => {
      const tokens = tokenize("'it\\'s working'");
      expect(tokens[0]).toMatchObject({
        type: "STRING",
        value: "it's working",
      });
    });
  });

  describe("identifiers", () => {
    it("tokenizes simple identifiers", () => {
      const tokens = tokenize("name");
      expect(tokens[0]).toMatchObject({
        type: "IDENTIFIER",
        lexeme: "name",
        value: "name",
      });
    });

    it("normalizes identifiers to lowercase", () => {
      const tokens = tokenize("XP");
      expect(tokens[0]).toMatchObject({
        type: "IDENTIFIER",
        lexeme: "XP",
        value: "xp",
      });
    });

    it("tokenizes identifiers with underscores", () => {
      const tokens = tokenize("deck_limit");
      expect(tokens[0]).toMatchObject({
        type: "IDENTIFIER",
        lexeme: "deck_limit",
        value: "deck_limit",
      });
    });

    it("tokenizes identifiers with numbers", () => {
      const tokens = tokenize("field1");
      expect(tokens[0]).toMatchObject({
        type: "IDENTIFIER",
        lexeme: "field1",
        value: "field1",
      });
    });

    it("tokenizes identifiers starting with underscore", () => {
      const tokens = tokenize("_private");
      expect(tokens[0]).toMatchObject({
        type: "IDENTIFIER",
        value: "_private",
      });
    });

    it("tokenizes unicode identifiers", () => {
      expect(tokenize("건강")[0]).toMatchObject({
        type: "IDENTIFIER",
        lexeme: "건강",
        value: "건강",
      });

      expect(tokenize("生命值")[0]).toMatchObject({
        type: "IDENTIFIER",
        lexeme: "生命值",
        value: "生命值",
      });

      expect(tokenize("santé")[0]).toMatchObject({
        type: "IDENTIFIER",
        lexeme: "santé",
        value: "santé",
      });
    });
  });

  describe("comparison operators", () => {
    it("tokenizes strict equals (==)", () => {
      const tokens = tokenize("==");
      expect(tokens[0]).toMatchObject({
        type: "STRICT_EQ",
        lexeme: "==",
      });
    });

    it("tokenizes loose equals (=)", () => {
      const tokens = tokenize("=");
      expect(tokens[0]).toMatchObject({
        type: "LOOSE_EQ",
        lexeme: "=",
      });
    });

    it("tokenizes not equals (!=)", () => {
      const tokens = tokenize("!=");
      expect(tokens[0]).toMatchObject({
        type: "NOT_EQ",
        lexeme: "!=",
      });
    });

    it("tokenizes greater than (>)", () => {
      const tokens = tokenize(">");
      expect(tokens[0]).toMatchObject({
        type: "GT",
        lexeme: ">",
      });
    });

    it("tokenizes less than (<)", () => {
      const tokens = tokenize("<");
      expect(tokens[0]).toMatchObject({
        type: "LT",
        lexeme: "<",
      });
    });

    it("tokenizes greater than or equal (>=)", () => {
      const tokens = tokenize(">=");
      expect(tokens[0]).toMatchObject({
        type: "GTE",
        lexeme: ">=",
      });
    });

    it("tokenizes less than or equal (<=)", () => {
      const tokens = tokenize("<=");
      expect(tokens[0]).toMatchObject({
        type: "LTE",
        lexeme: "<=",
      });
    });

    it("tokenizes strict contains (??)", () => {
      const tokens = tokenize("??");
      expect(tokens[0]).toMatchObject({
        type: "STRICT_CONTAINS",
        lexeme: "??",
      });
    });

    it("tokenizes strict not contains (??!)", () => {
      const tokens = tokenize("??!");
      expect(tokens[0]).toMatchObject({
        type: "STRICT_NOT_CONTAINS",
        lexeme: "??!",
      });
    });

    it("tokenizes loose contains (?)", () => {
      const tokens = tokenize("?");
      expect(tokens[0]).toMatchObject({
        type: "LOOSE_CONTAINS",
        lexeme: "?",
      });
    });

    it("tokenizes loose not contains (?!)", () => {
      const tokens = tokenize("?!");
      expect(tokens[0]).toMatchObject({
        type: "LOOSE_NOT_CONTAINS",
        lexeme: "?!",
      });
    });
  });

  describe("logical operators", () => {
    it("tokenizes and (&)", () => {
      const tokens = tokenize("&");
      expect(tokens[0]).toMatchObject({
        type: "AND",
        lexeme: "&",
      });
    });

    it("tokenizes or (|)", () => {
      const tokens = tokenize("|");
      expect(tokens[0]).toMatchObject({
        type: "OR",
        lexeme: "|",
      });
    });

    it("tokenizes not (!)", () => {
      const tokens = tokenize("!");
      expect(tokens[0]).toMatchObject({
        type: "NOT",
        lexeme: "!",
      });
    });
  });

  describe("arithmetic operators", () => {
    it("tokenizes plus (+)", () => {
      const tokens = tokenize("+");
      expect(tokens[0]).toMatchObject({
        type: "PLUS",
        lexeme: "+",
      });
    });

    it("tokenizes minus (-)", () => {
      const tokens = tokenize("-");
      expect(tokens[0]).toMatchObject({
        type: "MINUS",
        lexeme: "-",
      });
    });

    it("tokenizes multiply (*)", () => {
      const tokens = tokenize("*");
      expect(tokens[0]).toMatchObject({
        type: "MULTIPLY",
        lexeme: "*",
      });
    });

    it("tokenizes divide (/)", () => {
      const tokens = tokenize("/");
      expect(tokens[0]).toMatchObject({
        type: "DIVIDE",
        lexeme: "/",
      });
    });

    it("tokenizes modulo (%)", () => {
      const tokens = tokenize("%");
      expect(tokens[0]).toMatchObject({
        type: "MODULO",
        lexeme: "%",
      });
    });
  });

  describe("delimiters", () => {
    it("tokenizes left paren", () => {
      const tokens = tokenize("(");
      expect(tokens[0]).toMatchObject({
        type: "LPAREN",
        lexeme: "(",
      });
    });

    it("tokenizes right paren", () => {
      const tokens = tokenize(")");
      expect(tokens[0]).toMatchObject({
        type: "RPAREN",
        lexeme: ")",
      });
    });

    it("tokenizes left bracket", () => {
      const tokens = tokenize("[");
      expect(tokens[0]).toMatchObject({
        type: "LBRACKET",
        lexeme: "[",
      });
    });

    it("tokenizes right bracket", () => {
      const tokens = tokenize("]");
      expect(tokens[0]).toMatchObject({
        type: "RBRACKET",
        lexeme: "]",
      });
    });

    it("tokenizes comma", () => {
      const tokens = tokenize(",");
      expect(tokens[0]).toMatchObject({
        type: "COMMA",
        lexeme: ",",
      });
    });
  });

  describe("whitespace handling", () => {
    it("skips spaces", () => {
      const tokens = tokenize("  true  ");
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toMatchObject({ type: "TRUE" });
    });

    it("skips tabs", () => {
      const tokens = tokenize("\ttrue\t");
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toMatchObject({ type: "TRUE" });
    });

    it("skips newlines", () => {
      const tokens = tokenize("\ntrue\n");
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toMatchObject({ type: "TRUE" });
    });

    it("handles empty input", () => {
      const tokens = tokenize("");
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({ type: "EOF" });
    });

    it("handles whitespace-only input", () => {
      const tokens = tokenize("   \t\n  ");
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({ type: "EOF" });
    });
  });

  describe("complete expressions", () => {
    it('tokenizes "xp > 3"', () => {
      const tokens = tokenize("xp > 3");
      expect(tokens).toHaveLength(4);
      expect(tokens[0]).toMatchObject({
        type: "IDENTIFIER",
        value: "xp",
      });
      expect(tokens[1]).toMatchObject({ type: "GT" });
      expect(tokens[2]).toMatchObject({ type: "NUMBER", value: 3 });
      expect(tokens[3]).toMatchObject({ type: "EOF" });
    });

    it('tokenizes "xp > 3 & trait = \\"practiced\\""', () => {
      const tokens = tokenize('xp > 3 & trait = "practiced"');
      expect(tokens).toHaveLength(8);
      expect(tokens[0]).toMatchObject({
        type: "IDENTIFIER",
        value: "xp",
      });
      expect(tokens[1]).toMatchObject({ type: "GT" });
      expect(tokens[2]).toMatchObject({ type: "NUMBER", value: 3 });
      expect(tokens[3]).toMatchObject({ type: "AND" });
      expect(tokens[4]).toMatchObject({
        type: "IDENTIFIER",
        value: "trait",
      });
      expect(tokens[5]).toMatchObject({ type: "LOOSE_EQ" });
      expect(tokens[6]).toMatchObject({
        type: "STRING",
        value: "practiced",
      });
      expect(tokens[7]).toMatchObject({ type: "EOF" });
    });

    it("tokenizes grouped expression", () => {
      const tokens = tokenize("(xp = 0 | xp = 2)");
      expect(tokens).toHaveLength(10);
      expect(tokens[0]).toMatchObject({ type: "LPAREN" });
      expect(tokens[1]).toMatchObject({
        type: "IDENTIFIER",
        value: "xp",
      });
      expect(tokens[2]).toMatchObject({ type: "LOOSE_EQ" });
      expect(tokens[3]).toMatchObject({ type: "NUMBER", value: 0 });
      expect(tokens[4]).toMatchObject({ type: "OR" });
      expect(tokens[5]).toMatchObject({
        type: "IDENTIFIER",
        value: "xp",
      });
      expect(tokens[6]).toMatchObject({ type: "LOOSE_EQ" });
      expect(tokens[7]).toMatchObject({ type: "NUMBER", value: 2 });
      expect(tokens[8]).toMatchObject({ type: "RPAREN" });
      expect(tokens[9]).toMatchObject({ type: "EOF" });
    });

    it("tokenizes contains expression with list", () => {
      const tokens = tokenize('trait ?? ["Tactic.", "Supply."]');
      expect(tokens).toHaveLength(8);
      expect(tokens[0]).toMatchObject({
        type: "IDENTIFIER",
        value: "trait",
      });
      expect(tokens[1]).toMatchObject({ type: "STRICT_CONTAINS" });
      expect(tokens[2]).toMatchObject({ type: "LBRACKET" });
      expect(tokens[3]).toMatchObject({
        type: "STRING",
        value: "Tactic.",
      });
      expect(tokens[4]).toMatchObject({ type: "COMMA" });
      expect(tokens[5]).toMatchObject({
        type: "STRING",
        value: "Supply.",
      });
      expect(tokens[6]).toMatchObject({ type: "RBRACKET" });
      expect(tokens[7]).toMatchObject({ type: "EOF" });
    });

    it("tokenizes arithmetic expression", () => {
      const tokens = tokenize("health + sanity < 14");
      expect(tokens).toHaveLength(6);
      expect(tokens[0]).toMatchObject({
        type: "IDENTIFIER",
        value: "health",
      });
      expect(tokens[1]).toMatchObject({ type: "PLUS" });
      expect(tokens[2]).toMatchObject({
        type: "IDENTIFIER",
        value: "sanity",
      });
      expect(tokens[3]).toMatchObject({ type: "LT" });
      expect(tokens[4]).toMatchObject({ type: "NUMBER", value: 14 });
      expect(tokens[5]).toMatchObject({ type: "EOF" });
    });

    it("tokenizes modulo expression", () => {
      const tokens = tokenize("cost % 2 = 0");
      expect(tokens).toHaveLength(6);
      expect(tokens[0]).toMatchObject({
        type: "IDENTIFIER",
        value: "cost",
      });
      expect(tokens[1]).toMatchObject({ type: "MODULO" });
      expect(tokens[2]).toMatchObject({ type: "NUMBER", value: 2 });
      expect(tokens[3]).toMatchObject({ type: "LOOSE_EQ" });
      expect(tokens[4]).toMatchObject({ type: "NUMBER", value: 0 });
      expect(tokens[5]).toMatchObject({ type: "EOF" });
    });

    it("tokenizes negation expression", () => {
      const tokens = tokenize("!(cost > 3)");
      expect(tokens).toHaveLength(7);
      expect(tokens[0]).toMatchObject({ type: "NOT" });
      expect(tokens[1]).toMatchObject({ type: "LPAREN" });
      expect(tokens[2]).toMatchObject({
        type: "IDENTIFIER",
        value: "cost",
      });
      expect(tokens[3]).toMatchObject({ type: "GT" });
      expect(tokens[4]).toMatchObject({ type: "NUMBER", value: 3 });
      expect(tokens[5]).toMatchObject({ type: "RPAREN" });
      expect(tokens[6]).toMatchObject({ type: "EOF" });
    });

    it("tokenizes bonded == true", () => {
      const tokens = tokenize("bonded == true");
      expect(tokens).toHaveLength(4);
      expect(tokens[0]).toMatchObject({
        type: "IDENTIFIER",
        value: "bonded",
      });
      expect(tokens[1]).toMatchObject({ type: "STRICT_EQ" });
      expect(tokens[2]).toMatchObject({ type: "TRUE", value: true });
      expect(tokens[3]).toMatchObject({ type: "EOF" });
    });
  });

  describe("position tracking", () => {
    it("tracks position for single token", () => {
      const tokens = tokenize("true");
      expect(tokens[0]?.span).toEqual({
        start: { offset: 0, line: 1, column: 1 },
        end: { offset: 4, line: 1, column: 5 },
      });
    });

    it("tracks position with leading whitespace", () => {
      const tokens = tokenize("  true");
      expect(tokens[0]?.span.start).toEqual({
        offset: 2,
        line: 1,
        column: 3,
      });
    });

    it("tracks position across multiple lines", () => {
      const tokens = tokenize("true\nfalse");
      expect(tokens[0]?.span.start).toEqual({
        offset: 0,
        line: 1,
        column: 1,
      });
      expect(tokens[1]?.span.start).toEqual({
        offset: 5,
        line: 2,
        column: 1,
      });
    });
  });

  describe("error handling", () => {
    it("throws on unterminated string", () => {
      expect(() => tokenize('"hello')).toThrow(LexerError);
      expect(() => tokenize('"hello')).toThrow("Unterminated string literal");
    });

    it("throws on unexpected character", () => {
      expect(() => tokenize("@")).toThrow(LexerError);
      expect(() => tokenize("@")).toThrow("Unexpected character");
    });

    it("includes position in error", () => {
      try {
        tokenize("  @");
      } catch (e) {
        expect(e).toBeInstanceOf(LexerError);
        expect((e as LexerError).position).toEqual({
          offset: 2,
          line: 1,
          column: 3,
        });
      }
    });
  });
});
