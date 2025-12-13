import type { Card } from "@/store/schemas/card.schema";
import { fuzzyMatch, prepareNeedle } from "@/utils/fuzzy";
import type {
  FieldType,
  FieldValue,
  InterpreterContext,
} from "./interpreter.types";
import type {
  BinaryNode,
  Expr,
  GroupNode,
  IdentifierNode,
  LiteralNode,
} from "./parser.types";

export class InterpreterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InterpreterError";
  }
}

export class Interpreter {
  private context: InterpreterContext;
  private needleCache: Map<string, RegExp> = new Map();

  constructor(context: InterpreterContext) {
    this.context = context;
  }

  evaluate(expr: Expr): (card: Card) => boolean {
    return (card: Card) => this.evaluateExpr(expr, card);
  }

  private evaluateExpr(expr: Expr, card: Card): boolean {
    switch (expr.type) {
      case "BINARY": {
        return this.evaluateBinary(expr, card);
      }

      case "GROUP": {
        return this.evaluateGroup(expr, card);
      }

      case "LIST": {
        throw new InterpreterError("Lists cannot be evaluated as boolean");
      }

      case "LITERAL": {
        return this.evaluateLiteral(expr);
      }

      case "IDENTIFIER": {
        return this.evaluateIdentifier(expr, card);
      }
    }
  }

  private evaluateBinary(node: BinaryNode, card: Card): boolean {
    const { operator, left, right } = node;

    const leftType = this.getFieldType(left);
    const rightType = this.getFieldType(right);

    if (
      leftType !== "unknown" &&
      rightType !== "unknown" &&
      leftType !== rightType
    ) {
      throw new InterpreterError(
        `Type mismatch: cannot compare ${leftType} field with ${rightType} field`,
      );
    }

    const fieldType = leftType !== "unknown" ? leftType : rightType;

    switch (operator) {
      case "&": {
        return this.evaluateExpr(left, card) && this.evaluateExpr(right, card);
      }

      case "|": {
        return this.evaluateExpr(left, card) || this.evaluateExpr(right, card);
      }

      case "==": {
        return this.strictEquals(
          this.getValue(left, card),
          this.getValue(right, card),
          fieldType,
        );
      }

      case "!==": {
        return !this.strictEquals(
          this.getValue(left, card),
          this.getValue(right, card),
          fieldType,
        );
      }

      case "=": {
        return this.looseEquals(
          this.getValue(left, card),
          this.getValue(right, card),
          fieldType,
        );
      }
      case "!=": {
        return !this.looseEquals(
          this.getValue(left, card),
          this.getValue(right, card),
          fieldType,
        );
      }

      case "??": {
        const leftValue = this.getValue(left, card);
        return this.getList(right, card).some((val) =>
          this.strictEquals(leftValue, val, leftType),
        );
      }

      case "!??": {
        const leftValue = this.getValue(left, card);
        return !this.getList(right, card).some((val) =>
          this.strictEquals(leftValue, val, leftType),
        );
      }

      case "?": {
        const leftValue = this.getValue(left, card);
        return this.getList(right, card).some((val) =>
          this.looseEquals(leftValue, val, fieldType),
        );
      }

      case "!?": {
        const leftValue = this.getValue(left, card);
        return !this.getList(right, card).some((val) =>
          this.looseEquals(leftValue, val, fieldType),
        );
      }

      case ">": {
        const leftNum = this.toNumber(this.getValue(left, card));
        const rightNum = this.toNumber(this.getValue(right, card));
        if (leftNum == null || rightNum == null) return false;
        return leftNum > rightNum;
      }

      case "<": {
        const leftNum = this.toNumber(this.getValue(left, card));
        const rightNum = this.toNumber(this.getValue(right, card));
        if (leftNum == null || rightNum == null) return false;
        return leftNum < rightNum;
      }

      case ">=": {
        const leftNum = this.toNumber(this.getValue(left, card));
        const rightNum = this.toNumber(this.getValue(right, card));
        if (leftNum == null || rightNum == null) return false;
        return leftNum >= rightNum;
      }

      case "<=": {
        const leftNum = this.toNumber(this.getValue(left, card));
        const rightNum = this.toNumber(this.getValue(right, card));
        if (leftNum == null || rightNum == null) return false;
        return leftNum <= rightNum;
      }

      case "+": {
        const leftNum = this.toNumber(this.getValue(left, card));
        const rightNum = this.toNumber(this.getValue(right, card));
        if (leftNum == null || rightNum == null) return false;
        return (leftNum + rightNum) as unknown as boolean;
      }

      case "-": {
        const leftNum = this.toNumber(this.getValue(left, card));
        const rightNum = this.toNumber(this.getValue(right, card));
        if (leftNum == null || rightNum == null) return false;
        return (leftNum - rightNum) as unknown as boolean;
      }

      case "*": {
        const leftNum = this.toNumber(this.getValue(left, card));
        const rightNum = this.toNumber(this.getValue(right, card));
        if (leftNum == null || rightNum == null) return false;
        return (leftNum * rightNum) as unknown as boolean;
      }

      case "/": {
        const leftNum = this.toNumber(this.getValue(left, card));
        const rightNum = this.toNumber(this.getValue(right, card));
        if (leftNum == null || rightNum == null) return false;

        if (rightNum === 0) {
          throw new InterpreterError("Division by zero");
        }

        return (leftNum / rightNum) as unknown as boolean;
      }

      case "%": {
        const leftNum = this.toNumber(this.getValue(left, card));
        const rightNum = this.toNumber(this.getValue(right, card));
        if (leftNum == null || rightNum == null) return false;

        if (rightNum === 0) {
          throw new InterpreterError("Modulo by zero");
        }

        return (leftNum % rightNum) as unknown as boolean;
      }
    }
  }

  private evaluateGroup(node: GroupNode, card: Card): boolean {
    return this.evaluateExpr(node.expression, card);
  }

  private evaluateLiteral(node: LiteralNode): boolean {
    return !!node.value;
  }

  private evaluateIdentifier(node: IdentifierNode, card: Card): boolean {
    const value = this.lookupField(node.name, card);
    return !!value;
  }

  private getValue(expr: Expr, card: Card): FieldValue {
    switch (expr.type) {
      case "LITERAL": {
        return expr.value;
      }

      case "IDENTIFIER": {
        return this.lookupField(expr.name, card);
      }

      case "GROUP": {
        return this.getValue(expr.expression, card);
      }

      case "BINARY": {
        const { operator, left, right } = expr;

        if (["+", "-", "*", "/", "%"].includes(operator)) {
          const leftNum = this.toNumber(this.getValue(left, card));
          const rightNum = this.toNumber(this.getValue(right, card));
          if (leftNum == null || rightNum == null) {
            return null;
          }

          switch (operator) {
            case "+": {
              return leftNum + rightNum;
            }

            case "-": {
              return leftNum - rightNum;
            }

            case "*": {
              return leftNum * rightNum;
            }

            case "/": {
              if (rightNum === 0) {
                throw new InterpreterError("Division by zero");
              }

              return leftNum / rightNum;
            }

            case "%": {
              if (rightNum === 0) {
                throw new InterpreterError("Modulo by zero");
              }

              return leftNum % rightNum;
            }
          }
        }
        throw new InterpreterError(
          `Cannot get value from binary operator: ${operator}`,
        );
      }

      case "LIST": {
        throw new InterpreterError("Cannot get value from list");
      }
    }
  }

  private getList(expr: Expr, card: Card): FieldValue[] {
    if (expr.type !== "LIST") {
      throw new InterpreterError("Expected list expression");
    }

    return expr.elements.map((element) => this.getValue(element, card));
  }

  private lookupField(name: string, card: Card): FieldValue {
    const descriptor = this.context.fields[name];

    if (!descriptor) {
      throw new InterpreterError(`Unknown field: ${name}`);
    }

    return descriptor.lookup(card, this.context.fieldLookupContext);
  }

  private getFieldType(expr: Expr): FieldType | "unknown" {
    if (expr.type === "IDENTIFIER") {
      const descriptor = this.context.fields[expr.name];
      return descriptor.type;
    }

    return "unknown";
  }

  private equals(
    left: FieldValue,
    right: FieldValue,
    mode: "strict" | "loose",
    fieldType: FieldType | "unknown",
  ): boolean {
    // Arrays represent:
    // - Fields that have multiple values
    // - Cards that have different values on front and back

    if (Array.isArray(left)) {
      return left.some((val) => this.equals(val, right, mode, fieldType));
    }

    if (Array.isArray(right)) {
      return right.some((val) => this.equals(left, val, mode, fieldType));
    }

    // Number fields can have string-like values, or be null (* / - / ?)
    // Check if we have a mixed comparison first as `null` maps to `-`.

    if (left != null && typeof left !== "string" && typeof right === "string") {
      try {
        const rightNum = this.toNumber(right);
        return left === rightNum;
      } catch {}
    }

    if (
      right != null &&
      typeof right !== "string" &&
      typeof left === "string"
    ) {
      try {
        const leftNum = this.toNumber(left);
        return leftNum === right;
      } catch {}
    }

    // In the context of the card data, null and empty string are equivalent

    if (left == null || right == null || left === "" || right === "") {
      // biome-ignore lint/suspicious/noDoubleEquals: null check.
      return (left || null) == (right || null);
    }

    if (typeof left === "boolean" || typeof right === "boolean") {
      // biome-ignore lint/suspicious/noDoubleEquals: intentional
      return !!left == !!right;
    }

    if (typeof left === "number" && typeof right === "number") {
      return left === right;
    }

    if (typeof left === "string" && typeof right === "string") {
      const normalizedLeft = this.normalizeString(left);
      const normalizedRight = this.normalizeString(right);

      if (!normalizedLeft || !normalizedRight) {
        return normalizedLeft === normalizedRight;
      }

      // Use the shorter string as needle for fuzzy matching.
      const needleRight = normalizedRight.length < normalizedLeft.length;

      if (mode === "loose") {
        const needleStr = needleRight ? normalizedRight : normalizedLeft;

        const cachedNeedle = this.needleCache.get(needleStr);

        const needle = cachedNeedle ?? prepareNeedle(needleStr);
        if (!needle) return false;

        if (!cachedNeedle) {
          if (this.needleCache.size > 1000) this.needleCache.clear();
          this.needleCache.set(needleStr, needle);
        }

        const matchStr = needleRight ? normalizedLeft : normalizedRight;
        return fuzzyMatch([matchStr], needle);
      }

      if (fieldType === "text") {
        return needleRight
          ? normalizedLeft.includes(normalizedRight)
          : normalizedRight.includes(normalizedLeft);
      }

      return normalizedLeft === normalizedRight;
    }

    return false;
  }

  private strictEquals(
    left: FieldValue,
    right: FieldValue,
    fieldType: FieldType | "unknown",
  ): boolean {
    return this.equals(left, right, "strict", fieldType);
  }

  private looseEquals(
    left: FieldValue,
    right: FieldValue,
    fieldType: FieldType | "unknown",
  ): boolean {
    return this.equals(left, right, "loose", fieldType);
  }

  private normalizeString(str: string): string {
    return str.toLocaleLowerCase().trim();
  }

  private toNumber(value: FieldValue): number | null {
    if (typeof value === "number") return value;

    if (typeof value === "string") {
      const val = value.trim().toLowerCase();

      if (val === "-") return null;
      if (val === "x") return -2;
      if (val === "*") return -3;
      if (val === "?") return -4;

      const num = Number(val);
      if (Number.isNaN(num)) {
        throw new InterpreterError(`Cannot convert "${value}" to number`);
      }

      return num;
    }

    if (value == null) return null;

    throw new InterpreterError(`Cannot convert ${typeof value} to number`);
  }
}
