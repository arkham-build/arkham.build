import { tokenize } from "./lexer";
import type { Position, Span, Token, TokenType } from "./lexer.types";
import type {
  BinaryNode,
  BinaryOperator,
  Expr,
  GroupNode,
  IdentifierNode,
  ListNode,
  LiteralNode,
} from "./parser.types";

export class ParserError extends Error {
  constructor(
    message: string,
    public position: Position,
  ) {
    super(`${message} at line ${position.line}, column ${position.column}`);
    this.name = "ParserError";
  }
}

export class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Expr {
    const expr = this.parseOr();

    if (!this.isAtEnd()) {
      throw new ParserError(
        `Unexpected token: '${this.peek().lexeme}'`,
        this.peek().span.start,
      );
    }

    return expr;
  }

  private parseOr(): Expr {
    let left = this.parseAnd();

    while (this.match("OR")) {
      const right = this.parseAnd();
      left = this.createBinaryNode("|", left, right);
    }

    return left;
  }

  private parseAnd(): Expr {
    let left = this.parseComparison();

    while (this.match("AND")) {
      const right = this.parseComparison();
      left = this.createBinaryNode("&", left, right);
    }

    return left;
  }

  private parseComparison(): Expr {
    let left = this.parseAdditive();

    if (
      this.matchAny(
        "STRICT_EQ",
        "LOOSE_EQ",
        "NOT_EQ",
        "STRICT_NOT_EQ",
        "GT",
        "LT",
        "GTE",
        "LTE",
        "STRICT_CONTAINS",
        "STRICT_NOT_CONTAINS",
        "LOOSE_CONTAINS",
        "LOOSE_NOT_CONTAINS",
      )
    ) {
      const operator = this.tokenToBinaryOperator(this.previous().type);
      const right = this.parseAdditive();
      left = this.createBinaryNode(operator, left, right);
    }

    return left;
  }

  private parseAdditive(): Expr {
    let left = this.parseMultiplicative();

    while (this.matchAny("PLUS", "MINUS")) {
      const operator = this.tokenToBinaryOperator(this.previous().type);
      const right = this.parseMultiplicative();
      left = this.createBinaryNode(operator, left, right);
    }

    return left;
  }

  private parseMultiplicative(): Expr {
    let left = this.parsePrimary();

    while (this.matchAny("MULTIPLY", "DIVIDE", "MODULO")) {
      const operator = this.tokenToBinaryOperator(this.previous().type);
      const right = this.parsePrimary();
      left = this.createBinaryNode(operator, left, right);
    }

    return left;
  }

  private parsePrimary(): Expr {
    if (this.match("TRUE")) {
      return this.createLiteralNode(true, this.previous().span);
    }

    if (this.match("FALSE")) {
      return this.createLiteralNode(false, this.previous().span);
    }

    if (this.match("NULL")) {
      return this.createLiteralNode(null, this.previous().span);
    }

    if (this.match("NUMBER")) {
      return this.createLiteralNode(
        this.previous().value as number,
        this.previous().span,
      );
    }

    if (this.match("STRING")) {
      return this.createLiteralNode(
        this.previous().value as string,
        this.previous().span,
      );
    }

    if (this.match("IDENTIFIER")) {
      return this.createIdentifierNode(
        this.previous().value as string,
        this.previous().span,
      );
    }

    if (this.match("LPAREN")) {
      return this.parseGroup();
    }

    if (this.match("LBRACKET")) {
      return this.parseList();
    }

    throw new ParserError(
      `Expected expression, got '${this.peek().lexeme}'`,
      this.peek().span.start,
    );
  }

  private parseGroup(): GroupNode {
    const startPos = this.previous().span.start;
    const expression = this.parseOr();

    if (!this.match("RPAREN")) {
      throw new ParserError(
        "Expected ')' after expression",
        this.peek().span.start,
      );
    }

    const endPos = this.previous().span.end;

    return {
      type: "GROUP",
      expression,
      span: { start: startPos, end: endPos },
    };
  }

  private parseList(): ListNode {
    const startPos = this.previous().span.start;
    const elements: Expr[] = [];

    if (!this.check("RBRACKET")) {
      do {
        elements.push(this.parseOr());
      } while (this.match("COMMA"));
    }

    if (!this.match("RBRACKET")) {
      throw new ParserError(
        "Expected ']' after list elements",
        this.peek().span.start,
      );
    }

    const endPos = this.previous().span.end;

    return {
      type: "LIST",
      elements,
      span: { start: startPos, end: endPos },
    };
  }

  private tokenToBinaryOperator(type: TokenType): BinaryOperator {
    switch (type) {
      case "STRICT_EQ":
        return "==";
      case "LOOSE_EQ":
        return "=";
      case "NOT_EQ":
        return "!=";
      case "STRICT_NOT_EQ":
        return "!==";
      case "GT":
        return ">";
      case "LT":
        return "<";
      case "GTE":
        return ">=";
      case "LTE":
        return "<=";
      case "STRICT_CONTAINS":
        return "??";
      case "STRICT_NOT_CONTAINS":
        return "!??";
      case "LOOSE_CONTAINS":
        return "?";
      case "LOOSE_NOT_CONTAINS":
        return "!?";
      case "PLUS":
        return "+";
      case "MINUS":
        return "-";
      case "MULTIPLY":
        return "*";
      case "DIVIDE":
        return "/";
      case "MODULO":
        return "%";
      case "AND":
        return "&";
      case "OR":
        return "|";
      default:
        throw new ParserError(
          `Unknown operator: ${type}`,
          this.peek().span.start,
        );
    }
  }

  private createBinaryNode(
    operator: BinaryOperator,
    left: Expr,
    right: Expr,
  ): BinaryNode {
    return {
      type: "BINARY",
      operator,
      left,
      right,
      span: { start: left.span.start, end: right.span.end },
    };
  }

  private createLiteralNode(
    value: string | number | boolean | null,
    span: Span,
  ): LiteralNode {
    return {
      type: "LITERAL",
      value,
      span,
    };
  }

  private createIdentifierNode(name: string, span: Span): IdentifierNode {
    return {
      type: "IDENTIFIER",
      name,
      span,
    };
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private matchAny(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === "EOF";
  }

  private peek(): Token {
    const token = this.tokens[this.current];
    if (!token) {
      throw new ParserError("Unexpected end of input", {
        offset: 0,
        line: 1,
        column: 1,
      });
    }
    return token;
  }

  private previous(): Token {
    const token = this.tokens[this.current - 1];
    if (!token) {
      throw new ParserError("No previous token", {
        offset: 0,
        line: 1,
        column: 1,
      });
    }
    return token;
  }
}

export function parseUnchecked(input: string): Expr {
  const tokens = tokenize(input);
  const parsed = new Parser(tokens).parse();
  return parsed;
}

export function parse(input: string) {
  const tokens = tokenize(input);
  const parsed = new Parser(tokens).parse();

  if (parsed.type !== "BINARY" && parsed.type !== "GROUP") {
    throw new ParserError(
      "Expression must be a binary operation or a group",
      parsed.span.start,
    );
  }

  return parsed;
}
