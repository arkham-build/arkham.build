import type { Span } from "./lexer.types";

export type NodeType = "BINARY" | "GROUP" | "LIST" | "LITERAL" | "IDENTIFIER";

export type BinaryOperator =
  | "=="
  | "="
  | "!="
  | "!=="
  | "??"
  | "!??"
  | "?"
  | "!?"
  | ">"
  | "<"
  | ">="
  | "<="
  | "&"
  | "|"
  | "+"
  | "-"
  | "*"
  | "/"
  | "%";

interface BaseNode {
  span: Span;
}

export interface BinaryNode extends BaseNode {
  type: "BINARY";
  operator: BinaryOperator;
  left: Expr;
  right: Expr;
}

export interface GroupNode extends BaseNode {
  type: "GROUP";
  expression: Expr;
}

export interface ListNode extends BaseNode {
  type: "LIST";
  elements: Expr[];
}

export interface LiteralNode extends BaseNode {
  type: "LITERAL";
  value: string | number | boolean | null;
}

export interface IdentifierNode extends BaseNode {
  type: "IDENTIFIER";
  name: string;
}

export type Expr =
  | BinaryNode
  | GroupNode
  | ListNode
  | LiteralNode
  | IdentifierNode;
