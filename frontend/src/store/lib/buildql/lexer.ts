import type { Position, Token, TokenType } from "./lexer.types";

export class LexerError extends Error {
  constructor(
    message: string,
    public position: Position,
  ) {
    super(`${message} at line ${position.line}, column ${position.column}`);
    this.name = "LexerError";
  }
}

class Lexer {
  private input: string;
  private position = 0;
  private line = 1;
  private column = 1;

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (!this.isAtEnd()) {
      this.skipWhitespace();
      if (!this.isAtEnd()) {
        tokens.push(this.nextToken());
      }
    }

    tokens.push(this.createToken("EOF", "", null));
    return tokens;
  }

  private nextToken(): Token {
    const char = this.peek();

    if (char === '"' || char === "'") {
      return this.readString(char);
    }

    if (this.isDigit(char)) {
      return this.readNumber();
    }

    if (char === "-" && !this.isAtEnd() && this.isDigit(this.peekNext())) {
      return this.readNumber();
    }

    if (this.isAlpha(char)) {
      return this.readIdentifier();
    }

    return this.readOperator();
  }

  private readString(quote: '"' | "'"): Token {
    const startPos = this.currentPosition();
    this.advance();

    let value = "";

    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === "\\") {
        this.advance();
        if (!this.isAtEnd()) {
          const escaped = this.advance();
          switch (escaped) {
            case "n":
              value += "\n";
              break;
            case "t":
              value += "\t";
              break;
            case "r":
              value += "\r";
              break;
            case "\\":
              value += "\\";
              break;
            case '"':
              value += '"';
              break;
            case "'":
              value += "'";
              break;
            default:
              value += escaped;
          }
        }
      } else {
        value += this.advance();
      }
    }

    if (this.isAtEnd()) {
      throw new LexerError("Unterminated string literal", startPos);
    }

    this.advance();
    const endPos = this.currentPosition();
    const lexeme = this.input.slice(startPos.offset, endPos.offset);

    return {
      type: "STRING",
      lexeme,
      value,
      span: { start: startPos, end: endPos },
    };
  }

  private readNumber(): Token {
    const startPos = this.currentPosition();
    let value = "";

    if (this.peek() === "-") {
      value += this.advance();
    }

    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      value += this.advance();
    }

    const endPos = this.currentPosition();
    return {
      type: "NUMBER",
      lexeme: value,
      value: Number.parseInt(value, 10),
      span: { start: startPos, end: endPos },
    };
  }

  private readIdentifier(): Token {
    const startPos = this.currentPosition();
    let value = "";

    while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
      value += this.advance();
    }

    const endPos = this.currentPosition();
    const lowerValue = value.toLowerCase();

    if (lowerValue === "true") {
      return {
        type: "TRUE",
        lexeme: value,
        value: true,
        span: { start: startPos, end: endPos },
      };
    }

    if (lowerValue === "false") {
      return {
        type: "FALSE",
        lexeme: value,
        value: false,
        span: { start: startPos, end: endPos },
      };
    }

    if (lowerValue === "null") {
      return {
        type: "NULL",
        lexeme: value,
        value: null,
        span: { start: startPos, end: endPos },
      };
    }

    return {
      type: "IDENTIFIER",
      lexeme: value,
      value: lowerValue,
      span: { start: startPos, end: endPos },
    };
  }

  private readOperator(): Token {
    const startPos = this.currentPosition();
    const char = this.advance();

    switch (char) {
      case "=": {
        if (this.match("=")) {
          return this.createTokenAt("STRICT_EQ", "==", null, startPos);
        }

        return this.createTokenAt("LOOSE_EQ", "=", null, startPos);
      }

      case "!": {
        if (this.match("?")) {
          if (this.match("?")) {
            return this.createTokenAt(
              "STRICT_NOT_CONTAINS",
              "!??",
              null,
              startPos,
            );
          }
          return this.createTokenAt("LOOSE_NOT_CONTAINS", "!?", null, startPos);
        }

        if (this.match("=")) {
          if (this.match("=")) {
            return this.createTokenAt("STRICT_NOT_EQ", "!==", null, startPos);
          }

          return this.createTokenAt("NOT_EQ", "!=", null, startPos);
        }

        throw new LexerError(`Unexpected character: '!'`, startPos);
      }

      case "?": {
        if (this.match("?")) {
          return this.createTokenAt("STRICT_CONTAINS", "??", null, startPos);
        }

        return this.createTokenAt("LOOSE_CONTAINS", "?", null, startPos);
      }

      case ">": {
        if (this.match("=")) {
          return this.createTokenAt("GTE", ">=", null, startPos);
        }

        return this.createTokenAt("GT", ">", null, startPos);
      }

      case "<": {
        if (this.match("=")) {
          return this.createTokenAt("LTE", "<=", null, startPos);
        }

        return this.createTokenAt("LT", "<", null, startPos);
      }

      case "&": {
        return this.createTokenAt("AND", "&", null, startPos);
      }

      case "|": {
        return this.createTokenAt("OR", "|", null, startPos);
      }

      case "+": {
        return this.createTokenAt("PLUS", "+", null, startPos);
      }

      case "-": {
        return this.createTokenAt("MINUS", "-", null, startPos);
      }

      case "*": {
        return this.createTokenAt("MULTIPLY", "*", null, startPos);
      }

      case "/": {
        return this.createTokenAt("DIVIDE", "/", null, startPos);
      }

      case "%": {
        return this.createTokenAt("MODULO", "%", null, startPos);
      }

      case "(": {
        return this.createTokenAt("LPAREN", "(", null, startPos);
      }

      case ")": {
        return this.createTokenAt("RPAREN", ")", null, startPos);
      }

      case "[": {
        return this.createTokenAt("LBRACKET", "[", null, startPos);
      }

      case "]": {
        return this.createTokenAt("RBRACKET", "]", null, startPos);
      }

      case ",": {
        return this.createTokenAt("COMMA", ",", null, startPos);
      }

      default: {
        throw new LexerError(`Unexpected character: '${char}'`, startPos);
      }
    }
  }

  private isAtEnd(): boolean {
    return this.position >= this.input.length;
  }

  private peek(): string {
    if (this.isAtEnd()) return "\0";
    return this.input.charAt(this.position);
  }

  private peekNext(): string {
    if (this.position + 1 >= this.input.length) return "\0";
    return this.input.charAt(this.position + 1);
  }

  private advance(): string {
    const char = this.input.charAt(this.position);
    this.position++;

    if (char === "\n") {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }

    return char;
  }

  private match(expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.input.charAt(this.position) !== expected) return false;
    this.advance();
    return true;
  }

  private skipWhitespace(): void {
    while (!this.isAtEnd()) {
      const char = this.peek();
      if (char === " " || char === "\t" || char === "\r" || char === "\n") {
        this.advance();
      } else {
        break;
      }
    }
  }

  private isDigit(char: string): boolean {
    return char >= "0" && char <= "9";
  }

  private isAlpha(char: string): boolean {
    return /^\p{Letter}$/u.test(char) || char === "_";
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char) || char === ":";
  }

  private currentPosition(): Position {
    return {
      offset: this.position,
      line: this.line,
      column: this.column,
    };
  }

  private createToken(
    type: TokenType,
    lexeme: string,
    value: string | number | boolean | null,
  ): Token {
    const pos = this.currentPosition();
    return {
      type,
      lexeme,
      value,
      span: { start: pos, end: pos },
    };
  }

  private createTokenAt(
    type: TokenType,
    lexeme: string,
    value: string | number | boolean | null,
    startPos: Position,
  ): Token {
    return {
      type,
      lexeme,
      value,
      span: { start: startPos, end: this.currentPosition() },
    };
  }
}

export function tokenize(input: string): Token[] {
  const lexer = new Lexer(input);
  return lexer.tokenize();
}
