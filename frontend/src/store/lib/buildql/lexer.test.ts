import { describe, expect, it } from "vitest";
import { LexerError, tokenize } from "./lexer";
import type { Token } from "./lexer.types";

function prepareSnapshot(tokens: Token[]) {
  return tokens.map(({ span: _, ...rest }) => rest);
}

describe("Lexer", () => {
  describe("literals", () => {
    it("tokenizes boolean true", () => {
      const tokens = tokenize("true");
      expect(prepareSnapshot(tokens)).toMatchInlineSnapshot(`
        [
          {
            "lexeme": "true",
            "type": "TRUE",
            "value": true,
          },
          {
            "lexeme": "",
            "type": "EOF",
            "value": null,
          },
        ]
      `);
    });

    it("tokenizes boolean false", () => {
      const tokens = tokenize("false");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "false",
          "type": "FALSE",
          "value": false,
        }
      `);
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

    it("tokenizes null", () => {
      const tokens = tokenize("null");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "null",
          "type": "NULL",
          "value": null,
        }
      `);
    });

    it("tokenizes null case-insensitively", () => {
      expect(tokenize("NULL")[0]).toMatchObject({
        type: "NULL",
        value: null,
      });
      expect(tokenize("Null")[0]).toMatchObject({
        type: "NULL",
        value: null,
      });
    });

    it("tokenizes integer numbers", () => {
      const tokens = tokenize("42");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "42",
          "type": "NUMBER",
          "value": 42,
        }
      `);
    });

    it("tokenizes zero", () => {
      const tokens = tokenize("0");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "0",
          "type": "NUMBER",
          "value": 0,
        }
      `);
    });

    it("tokenizes negative numbers", () => {
      const tokens = tokenize("-5");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "-5",
          "type": "NUMBER",
          "value": -5,
        }
      `);
    });

    it("tokenizes negative zero", () => {
      const tokens = tokenize("-0");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "-0",
          "type": "NUMBER",
          "value": -0,
        }
      `);
    });

    it("tokenizes string literals", () => {
      const tokens = tokenize('"hello world"');
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": ""hello world"",
          "type": "STRING",
          "value": "hello world",
        }
      `);
    });

    it("tokenizes empty strings", () => {
      const tokens = tokenize('""');
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": """",
          "type": "STRING",
          "value": "",
        }
      `);
    });

    it("handles escape sequences in strings", () => {
      const tokens = tokenize('"hello\\nworld"');
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": ""hello\\nworld"",
          "type": "STRING",
          "value": "hello
        world",
        }
      `);
    });

    it("handles escaped quotes in strings", () => {
      const tokens = tokenize('"say \\"hello\\""');
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": ""say \\"hello\\""",
          "type": "STRING",
          "value": "say "hello"",
        }
      `);
    });

    it("handles escaped backslashes in strings", () => {
      const tokens = tokenize('"path\\\\to\\\\file"');
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": ""path\\\\to\\\\file"",
          "type": "STRING",
          "value": "path\\to\\file",
        }
      `);
    });

    it("tokenizes single-quoted strings", () => {
      const tokens = tokenize("'hello world'");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "'hello world'",
          "type": "STRING",
          "value": "hello world",
        }
      `);
    });

    it("handles escaped single quotes in single-quoted strings", () => {
      const tokens = tokenize("'it\\'s working'");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "'it\\'s working'",
          "type": "STRING",
          "value": "it's working",
        }
      `);
    });
  });

  describe("identifiers", () => {
    it("tokenizes simple identifiers", () => {
      const tokens = tokenize("name");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "name",
          "type": "IDENTIFIER",
          "value": "name",
        }
      `);
    });

    it("normalizes identifiers to lowercase", () => {
      const tokens = tokenize("XP");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "XP",
          "type": "IDENTIFIER",
          "value": "xp",
        }
      `);
    });

    it("tokenizes identifiers with underscores", () => {
      const tokens = tokenize("deck_limit");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "deck_limit",
          "type": "IDENTIFIER",
          "value": "deck_limit",
        }
      `);
    });

    it("tokenizes identifiers with numbers", () => {
      const tokens = tokenize("field1");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "field1",
          "type": "IDENTIFIER",
          "value": "field1",
        }
      `);
    });

    it("tokenizes identifiers starting with underscore", () => {
      const tokens = tokenize("_private");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "_private",
          "type": "IDENTIFIER",
          "value": "_private",
        }
      `);
    });

    it("tokenizes unicode identifiers", () => {
      const tokens = tokenize("健康 生命值 santé");
      expect(prepareSnapshot(tokens)).toMatchInlineSnapshot(`
        [
          {
            "lexeme": "健康",
            "type": "IDENTIFIER",
            "value": "健康",
          },
          {
            "lexeme": "生命值",
            "type": "IDENTIFIER",
            "value": "生命值",
          },
          {
            "lexeme": "santé",
            "type": "IDENTIFIER",
            "value": "santé",
          },
          {
            "lexeme": "",
            "type": "EOF",
            "value": null,
          },
        ]
      `);
    });
  });

  describe("comparison operators", () => {
    it("tokenizes strict equals (==)", () => {
      const tokens = tokenize("==");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "==",
          "type": "STRICT_EQ",
          "value": null,
        }
      `);
    });

    it("tokenizes loose equals (=)", () => {
      const tokens = tokenize("=");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "=",
          "type": "LOOSE_EQ",
          "value": null,
        }
      `);
    });

    it("tokenizes not equals (!=)", () => {
      const tokens = tokenize("!=");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "!=",
          "type": "NOT_EQ",
          "value": null,
        }
      `);
    });

    it("tokenizes strict not equals (!==)", () => {
      const tokens = tokenize("!==");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "!==",
          "type": "STRICT_NOT_EQ",
          "value": null,
        }
      `);
    });

    it("tokenizes greater than (>)", () => {
      const tokens = tokenize(">");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": ">",
          "type": "GT",
          "value": null,
        }
      `);
    });

    it("tokenizes less than (<)", () => {
      const tokens = tokenize("<");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "<",
          "type": "LT",
          "value": null,
        }
      `);
    });

    it("tokenizes greater than or equal (>=)", () => {
      const tokens = tokenize(">=");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": ">=",
          "type": "GTE",
          "value": null,
        }
      `);
    });

    it("tokenizes less than or equal (<=)", () => {
      const tokens = tokenize("<=");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "<=",
          "type": "LTE",
          "value": null,
        }
      `);
    });

    it("tokenizes strict contains (??)", () => {
      const tokens = tokenize("??");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "??",
          "type": "STRICT_CONTAINS",
          "value": null,
        }
      `);
    });

    it("tokenizes strict not contains (!??)", () => {
      const tokens = tokenize("!??");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "!??",
          "type": "STRICT_NOT_CONTAINS",
          "value": null,
        }
      `);
    });

    it("tokenizes loose contains (?)", () => {
      const tokens = tokenize("?");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "?",
          "type": "LOOSE_CONTAINS",
          "value": null,
        }
      `);
    });

    it("tokenizes loose not contains (!?)", () => {
      const tokens = tokenize("!?");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "!?",
          "type": "LOOSE_NOT_CONTAINS",
          "value": null,
        }
      `);
    });
  });

  describe("logical operators", () => {
    it("tokenizes and (&)", () => {
      const tokens = tokenize("&");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "&",
          "type": "AND",
          "value": null,
        }
      `);
    });

    it("tokenizes or (|)", () => {
      const tokens = tokenize("|");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "|",
          "type": "OR",
          "value": null,
        }
      `);
    });
  });

  describe("arithmetic operators", () => {
    it("tokenizes plus (+)", () => {
      const tokens = tokenize("+");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "+",
          "type": "PLUS",
          "value": null,
        }
      `);
    });

    it("tokenizes minus (-)", () => {
      const tokens = tokenize("-");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "-",
          "type": "MINUS",
          "value": null,
        }
      `);
    });

    it("tokenizes multiply (*)", () => {
      const tokens = tokenize("*");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "*",
          "type": "MULTIPLY",
          "value": null,
        }
      `);
    });

    it("tokenizes divide (/)", () => {
      const tokens = tokenize("/");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "/",
          "type": "DIVIDE",
          "value": null,
        }
      `);
    });

    it("tokenizes modulo (%)", () => {
      const tokens = tokenize("%");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "%",
          "type": "MODULO",
          "value": null,
        }
      `);
    });
  });

  describe("delimiters", () => {
    it("tokenizes left paren", () => {
      const tokens = tokenize("(");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "(",
          "type": "LPAREN",
          "value": null,
        }
      `);
    });

    it("tokenizes right paren", () => {
      const tokens = tokenize(")");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": ")",
          "type": "RPAREN",
          "value": null,
        }
      `);
    });

    it("tokenizes left bracket", () => {
      const tokens = tokenize("[");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "[",
          "type": "LBRACKET",
          "value": null,
        }
      `);
    });

    it("tokenizes right bracket", () => {
      const tokens = tokenize("]");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "]",
          "type": "RBRACKET",
          "value": null,
        }
      `);
    });

    it("tokenizes comma", () => {
      const tokens = tokenize(",");
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": ",",
          "type": "COMMA",
          "value": null,
        }
      `);
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
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "",
          "type": "EOF",
          "value": null,
        }
      `);
    });

    it("handles whitespace-only input", () => {
      const tokens = tokenize("   \t\n  ");
      expect(tokens).toHaveLength(1);
      expect(prepareSnapshot(tokens)[0]).toMatchInlineSnapshot(`
        {
          "lexeme": "",
          "type": "EOF",
          "value": null,
        }
      `);
    });
  });

  describe("complete expressions", () => {
    it('tokenizes "xp > 3"', () => {
      const tokens = tokenize("xp > 3");
      expect(tokens).toHaveLength(4);
      expect(prepareSnapshot(tokens)).toMatchInlineSnapshot(`
        [
          {
            "lexeme": "xp",
            "type": "IDENTIFIER",
            "value": "xp",
          },
          {
            "lexeme": ">",
            "type": "GT",
            "value": null,
          },
          {
            "lexeme": "3",
            "type": "NUMBER",
            "value": 3,
          },
          {
            "lexeme": "",
            "type": "EOF",
            "value": null,
          },
        ]
      `);
    });

    it('tokenizes "xp > 3 & trait = \\"practiced\\""', () => {
      const tokens = tokenize('xp > 3 & trait = "practiced"');
      expect(tokens).toHaveLength(8);
      expect(prepareSnapshot(tokens)).toMatchInlineSnapshot(`
        [
          {
            "lexeme": "xp",
            "type": "IDENTIFIER",
            "value": "xp",
          },
          {
            "lexeme": ">",
            "type": "GT",
            "value": null,
          },
          {
            "lexeme": "3",
            "type": "NUMBER",
            "value": 3,
          },
          {
            "lexeme": "&",
            "type": "AND",
            "value": null,
          },
          {
            "lexeme": "trait",
            "type": "IDENTIFIER",
            "value": "trait",
          },
          {
            "lexeme": "=",
            "type": "LOOSE_EQ",
            "value": null,
          },
          {
            "lexeme": ""practiced"",
            "type": "STRING",
            "value": "practiced",
          },
          {
            "lexeme": "",
            "type": "EOF",
            "value": null,
          },
        ]
      `);
    });

    it("tokenizes grouped expression", () => {
      const tokens = tokenize("(xp = 0 | xp = 2)");
      expect(tokens).toHaveLength(10);
      expect(prepareSnapshot(tokens)).toMatchInlineSnapshot(`
        [
          {
            "lexeme": "(",
            "type": "LPAREN",
            "value": null,
          },
          {
            "lexeme": "xp",
            "type": "IDENTIFIER",
            "value": "xp",
          },
          {
            "lexeme": "=",
            "type": "LOOSE_EQ",
            "value": null,
          },
          {
            "lexeme": "0",
            "type": "NUMBER",
            "value": 0,
          },
          {
            "lexeme": "|",
            "type": "OR",
            "value": null,
          },
          {
            "lexeme": "xp",
            "type": "IDENTIFIER",
            "value": "xp",
          },
          {
            "lexeme": "=",
            "type": "LOOSE_EQ",
            "value": null,
          },
          {
            "lexeme": "2",
            "type": "NUMBER",
            "value": 2,
          },
          {
            "lexeme": ")",
            "type": "RPAREN",
            "value": null,
          },
          {
            "lexeme": "",
            "type": "EOF",
            "value": null,
          },
        ]
      `);
    });

    it("tokenizes contains expression with list", () => {
      const tokens = tokenize('trait ?? ["Tactic.", "Supply."]');
      expect(prepareSnapshot(tokens)).toMatchInlineSnapshot(`
        [
          {
            "lexeme": "trait",
            "type": "IDENTIFIER",
            "value": "trait",
          },
          {
            "lexeme": "??",
            "type": "STRICT_CONTAINS",
            "value": null,
          },
          {
            "lexeme": "[",
            "type": "LBRACKET",
            "value": null,
          },
          {
            "lexeme": ""Tactic."",
            "type": "STRING",
            "value": "Tactic.",
          },
          {
            "lexeme": ",",
            "type": "COMMA",
            "value": null,
          },
          {
            "lexeme": ""Supply."",
            "type": "STRING",
            "value": "Supply.",
          },
          {
            "lexeme": "]",
            "type": "RBRACKET",
            "value": null,
          },
          {
            "lexeme": "",
            "type": "EOF",
            "value": null,
          },
        ]
      `);
    });

    it("tokenizes arithmetic expression", () => {
      const tokens = tokenize("health + sanity < 14");
      expect(prepareSnapshot(tokens)).toMatchInlineSnapshot(`
        [
          {
            "lexeme": "health",
            "type": "IDENTIFIER",
            "value": "health",
          },
          {
            "lexeme": "+",
            "type": "PLUS",
            "value": null,
          },
          {
            "lexeme": "sanity",
            "type": "IDENTIFIER",
            "value": "sanity",
          },
          {
            "lexeme": "<",
            "type": "LT",
            "value": null,
          },
          {
            "lexeme": "14",
            "type": "NUMBER",
            "value": 14,
          },
          {
            "lexeme": "",
            "type": "EOF",
            "value": null,
          },
        ]
      `);
    });

    it("tokenizes modulo expression", () => {
      const tokens = tokenize("cost % 2 = 0");
      expect(prepareSnapshot(tokens)).toMatchInlineSnapshot(`
        [
          {
            "lexeme": "cost",
            "type": "IDENTIFIER",
            "value": "cost",
          },
          {
            "lexeme": "%",
            "type": "MODULO",
            "value": null,
          },
          {
            "lexeme": "2",
            "type": "NUMBER",
            "value": 2,
          },
          {
            "lexeme": "=",
            "type": "LOOSE_EQ",
            "value": null,
          },
          {
            "lexeme": "0",
            "type": "NUMBER",
            "value": 0,
          },
          {
            "lexeme": "",
            "type": "EOF",
            "value": null,
          },
        ]
      `);
    });

    it("tokenizes bonded == true", () => {
      const tokens = tokenize("bonded == true");
      expect(prepareSnapshot(tokens)).toMatchInlineSnapshot(`
        [
          {
            "lexeme": "bonded",
            "type": "IDENTIFIER",
            "value": "bonded",
          },
          {
            "lexeme": "==",
            "type": "STRICT_EQ",
            "value": null,
          },
          {
            "lexeme": "true",
            "type": "TRUE",
            "value": true,
          },
          {
            "lexeme": "",
            "type": "EOF",
            "value": null,
          },
        ]
      `);
    });

    it("tokenizes expression with negative numbers", () => {
      const tokens = tokenize("xp > -3");
      expect(prepareSnapshot(tokens)).toMatchInlineSnapshot(`
        [
          {
            "lexeme": "xp",
            "type": "IDENTIFIER",
            "value": "xp",
          },
          {
            "lexeme": ">",
            "type": "GT",
            "value": null,
          },
          {
            "lexeme": "-3",
            "type": "NUMBER",
            "value": -3,
          },
          {
            "lexeme": "",
            "type": "EOF",
            "value": null,
          },
        ]
      `);
    });

    it("distinguishes minus operator from negative number", () => {
      const tokens = tokenize("5 - 3");
      expect(prepareSnapshot(tokens)).toMatchInlineSnapshot(`
        [
          {
            "lexeme": "5",
            "type": "NUMBER",
            "value": 5,
          },
          {
            "lexeme": "-",
            "type": "MINUS",
            "value": null,
          },
          {
            "lexeme": "3",
            "type": "NUMBER",
            "value": 3,
          },
          {
            "lexeme": "",
            "type": "EOF",
            "value": null,
          },
        ]
      `);
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
