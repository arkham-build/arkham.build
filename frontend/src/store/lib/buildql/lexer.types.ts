export type TokenType =
  | "TRUE"
  | "FALSE"
  | "NULL"
  | "NUMBER"
  | "STRING"
  | "IDENTIFIER"
  | "STRICT_EQ"
  | "LOOSE_EQ"
  | "NOT_EQ"
  | "STRICT_NOT_EQ"
  | "STRICT_CONTAINS"
  | "STRICT_NOT_CONTAINS"
  | "LOOSE_CONTAINS"
  | "LOOSE_NOT_CONTAINS"
  | "GT"
  | "LT"
  | "GTE"
  | "LTE"
  | "AND"
  | "OR"
  | "NOT"
  | "PLUS"
  | "MINUS"
  | "MULTIPLY"
  | "DIVIDE"
  | "MODULO"
  | "LPAREN"
  | "RPAREN"
  | "LBRACKET"
  | "RBRACKET"
  | "COMMA"
  | "EOF";

export interface Position {
  offset: number;
  line: number;
  column: number;
}

export interface Span {
  start: Position;
  end: Position;
}

export interface Token {
  type: TokenType;
  lexeme: string;
  value: string | number | boolean | null;
  span: Span;
}
