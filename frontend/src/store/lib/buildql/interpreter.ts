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

      case "REGEX": {
        throw new InterpreterError("Regex cannot be evaluated as boolean");
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
        return this.evaluateComparison(left, right, card, operator, (l, r) =>
          this.strictEquals(l, r, fieldType),
        );
      }

      case "!==": {
        return this.evaluateComparison(
          left,
          right,
          card,
          operator,
          (l, r) => !this.strictEquals(l, r, fieldType),
        );
      }

      case "=": {
        return this.evaluateComparison(left, right, card, operator, (l, r) =>
          this.looseEquals(l, r, fieldType),
        );
      }

      case "!=": {
        return this.evaluateComparison(
          left,
          right,
          card,
          operator,
          (l, r) => !this.looseEquals(l, r, fieldType),
        );
      }

      case "??": {
        return this.evaluateListComparison(
          left,
          right,
          card,
          operator,
          (leftValue, rightList) =>
            rightList.some((val) =>
              this.strictEquals(leftValue, val, leftType),
            ),
        );
      }

      case "!??": {
        return this.evaluateListComparison(
          left,
          right,
          card,
          operator,
          (leftValue, rightList) =>
            !rightList.some((val) =>
              this.strictEquals(leftValue, val, leftType),
            ),
        );
      }

      case "?": {
        return this.evaluateListComparison(
          left,
          right,
          card,
          operator,
          (leftValue, rightList) =>
            rightList.some((val) =>
              this.looseEquals(leftValue, val, fieldType),
            ),
        );
      }

      case "!?": {
        return this.evaluateListComparison(
          left,
          right,
          card,
          operator,
          (leftValue, rightList) =>
            !rightList.some((val) =>
              this.looseEquals(leftValue, val, fieldType),
            ),
        );
      }

      case ">": {
        return this.evaluateNumericComparison(
          left,
          right,
          card,
          operator,
          (l, r) => l > r,
        );
      }

      case "<": {
        return this.evaluateNumericComparison(
          left,
          right,
          card,
          operator,
          (l, r) => l < r,
        );
      }

      case ">=": {
        return this.evaluateNumericComparison(
          left,
          right,
          card,
          operator,
          (l, r) => l >= r,
        );
      }

      case "<=": {
        return this.evaluateNumericComparison(
          left,
          right,
          card,
          operator,
          (l, r) => l <= r,
        );
      }

      case "+": {
        return this.evaluateArithmetic(
          left,
          right,
          card,
          operator,
          (l, r) => l + r,
        );
      }

      case "-": {
        return this.evaluateArithmetic(
          left,
          right,
          card,
          operator,
          (l, r) => l - r,
        );
      }

      case "*": {
        return this.evaluateArithmetic(
          left,
          right,
          card,
          operator,
          (l, r) => l * r,
        );
      }

      case "/": {
        return this.evaluateArithmetic(left, right, card, operator, (l, r) => {
          if (r === 0) {
            throw new InterpreterError("Division by zero");
          }
          return l / r;
        });
      }

      case "%": {
        return this.evaluateArithmetic(left, right, card, operator, (l, r) => {
          if (r === 0) {
            throw new InterpreterError("Modulo by zero");
          }
          return l % r;
        });
      }
    }
  }

  private evaluateComparison(
    left: Expr,
    right: Expr,
    card: Card,
    operator: string,
    compare: (left: FieldValue | RegExp, right: FieldValue | RegExp) => boolean,
  ): boolean {
    const leftValue = this.getValue(left, card);

    const rightValue = this.getValue(right, card, {
      operator,
      otherValue: leftValue,
    });

    const leftValueWithContext = this.getValue(left, card, {
      operator,
      otherValue: rightValue,
    });

    return compare(leftValueWithContext, rightValue);
  }

  private evaluateListComparison(
    left: Expr,
    right: Expr,
    card: Card,
    operator: string,
    compare: (
      left: FieldValue | RegExp,
      right: (FieldValue | RegExp)[],
    ) => boolean,
  ): boolean {
    const rightList = this.getList(right, card);
    const leftValue = this.getValue(left, card, {
      operator,
      otherValue: rightList,
    });
    return compare(leftValue, rightList);
  }

  private evaluateNumericComparison(
    left: Expr,
    right: Expr,
    card: Card,
    operator: string,
    compare: (left: number, right: number) => boolean,
  ): boolean {
    const leftValue = this.getValue(left, card);
    const rightValue = this.getValue(right, card, {
      operator,
      otherValue: leftValue,
    });
    const leftValueWithContext = this.getValue(left, card, {
      operator,
      otherValue: rightValue,
    });
    const leftNum = this.toNumber(leftValueWithContext);
    const rightNum = this.toNumber(rightValue);
    if (leftNum == null || rightNum == null) return false;
    return compare(leftNum, rightNum);
  }

  private evaluateArithmetic(
    left: Expr,
    right: Expr,
    card: Card,
    operator: string,
    compute: (left: number, right: number) => number,
  ): boolean {
    const leftValue = this.getValue(left, card);
    const rightValue = this.getValue(right, card, {
      operator,
      otherValue: leftValue,
    });
    const leftValueWithContext = this.getValue(left, card, {
      operator,
      otherValue: rightValue,
    });
    const leftNum = this.toNumber(leftValueWithContext);
    const rightNum = this.toNumber(rightValue);
    if (leftNum == null || rightNum == null) return false;
    return compute(leftNum, rightNum) as unknown as boolean;
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

  private getValue(
    expr: Expr,
    card: Card,
    comparisonContext?: {
      operator?: string;
      otherValue?: FieldValue | RegExp | (FieldValue | RegExp)[];
    },
  ): FieldValue | RegExp {
    switch (expr.type) {
      case "LITERAL": {
        return expr.value;
      }

      case "REGEX": {
        return new RegExp(expr.pattern, "iu");
      }

      case "IDENTIFIER": {
        return this.lookupField(expr.name, card, comparisonContext);
      }

      case "GROUP": {
        return this.getValue(expr.expression, card, comparisonContext);
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

  private getList(expr: Expr, card: Card): (FieldValue | RegExp)[] {
    if (expr.type !== "LIST") {
      throw new InterpreterError("Expected list expression");
    }

    return expr.elements.map((element) => this.getValue(element, card));
  }

  private lookupField(
    name: string,
    card: Card,
    comparisonContext?: {
      operator?: string;
      otherValue?: FieldValue | RegExp | (FieldValue | RegExp)[];
    },
  ): FieldValue {
    const descriptor = this.context.fields[name];

    if (!descriptor) {
      throw new InterpreterError(`Unknown field: ${name}`);
    }

    return descriptor.lookup(
      card,
      this.context.fieldLookupContext,
      comparisonContext,
    );
  }

  private getFieldType(expr: Expr): FieldType | "unknown" {
    if (expr.type === "IDENTIFIER") {
      const descriptor = this.context.fields[expr.name];
      return descriptor.type;
    }

    return "unknown";
  }

  private equals(
    left: FieldValue | RegExp,
    right: FieldValue | RegExp,
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

    if (right instanceof RegExp) {
      if (typeof left === "string") {
        return right.test(left);
      }
      return false;
    }

    if (left instanceof RegExp) {
      if (typeof right === "string") {
        return left.test(right);
      }
      return false;
    }

    // Number fields can have string-like values, or be null (* / - / ?)
    // Check if we have a mixed comparison first as `null` maps to `-`.

    if (fieldType === "number" && typeof right === "string") {
      try {
        const rightNum = this.toNumber(right);
        return left === rightNum;
      } catch {}
    } else if (fieldType === "number" && typeof left === "string") {
      try {
        const leftNum = this.toNumber(left);
        return leftNum === right;
      } catch {}
    }

    if (typeof left === "number" && typeof right === "number") {
      return left === right;
    }

    if (typeof left === "boolean" && typeof right === "boolean") {
      return !!left === !!right;
    }

    if (typeof left === "string" && typeof right === "string") {
      const normalizedLeft = this.normalizeString(left);
      const normalizedRight = this.normalizeString(right);

      if (!normalizedLeft || !normalizedRight) {
        return normalizedLeft === normalizedRight;
      }

      if (mode === "loose") {
        const needleStr = normalizedRight;

        const cachedNeedle = this.needleCache.get(needleStr);

        const needle = cachedNeedle ?? prepareNeedle(needleStr);
        if (!needle) return false;

        if (!cachedNeedle) {
          if (this.needleCache.size > 1000) this.needleCache.clear();
          this.needleCache.set(needleStr, needle);
        }

        const matchStr = normalizedLeft;
        return fuzzyMatch([matchStr], needle);
      }

      if (fieldType === "text") {
        return normalizedLeft.includes(normalizedRight);
      }

      return normalizedLeft === normalizedRight;
    }

    // In the context of the card data, null and empty string are equivalent

    if (left == null || right == null || left === "" || right === "") {
      const l = left === "" ? null : (left ?? null);
      const r = right === "" ? null : (right ?? null);
      return l === r;
    }

    return false;
  }

  private strictEquals(
    left: FieldValue | RegExp,
    right: FieldValue | RegExp,
    fieldType: FieldType | "unknown",
  ): boolean {
    return this.equals(left, right, "strict", fieldType);
  }

  private looseEquals(
    left: FieldValue | RegExp,
    right: FieldValue | RegExp,
    fieldType: FieldType | "unknown",
  ): boolean {
    return this.equals(left, right, "loose", fieldType);
  }

  private normalizeString(str: string): string {
    return str.toLocaleLowerCase().trim();
  }

  private toNumber(value: FieldValue | RegExp): number | null {
    if (value instanceof RegExp) {
      throw new InterpreterError("Cannot convert regex to number");
    }

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
