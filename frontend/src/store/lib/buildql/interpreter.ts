import type {
  BinaryNode,
  Expr,
  GroupNode,
  IdentifierNode,
  LiteralNode,
} from "@arkham-build/shared";
import { instantiateSearchFromLocale } from "@/store/lib/searching";
import type { Card } from "@/store/schemas/card.schema";
import type {
  FieldType,
  FieldValue,
  InterpreterContext,
} from "./interpreter.types";

export class InterpreterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InterpreterError";
  }
}

export class Interpreter {
  private context: InterpreterContext;

  constructor(
    context: Omit<InterpreterContext, "fuzzyMatcher">,
    locale: string,
  ) {
    this.context = createInterpreterContext(context, locale);
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

      case "??!": {
        const leftValue = this.getValue(left, card);
        return !this.getList(right, card).some((val) =>
          this.strictEquals(leftValue, val, leftType),
        );
      }

      case "?": {
        const leftValue = this.getValue(left, card);
        return this.getList(right, card).some((val) =>
          this.looseEquals(leftValue, val, leftType),
        );
      }

      case "?!": {
        const leftValue = this.getValue(left, card);
        return !this.getList(right, card).some((val) =>
          this.looseEquals(leftValue, val, leftType),
        );
      }

      case ">": {
        const leftNum = this.toNumber(this.getValue(left, card));
        const rightNum = this.toNumber(this.getValue(right, card));
        return leftNum > rightNum;
      }

      case "<": {
        const leftNum = this.toNumber(this.getValue(left, card));
        const rightNum = this.toNumber(this.getValue(right, card));
        return leftNum < rightNum;
      }

      case ">=": {
        const leftNum = this.toNumber(this.getValue(left, card));
        const rightNum = this.toNumber(this.getValue(right, card));
        return leftNum >= rightNum;
      }

      case "<=": {
        const leftNum = this.toNumber(this.getValue(left, card));
        const rightNum = this.toNumber(this.getValue(right, card));
        return leftNum <= rightNum;
      }

      case "+": {
        const leftNum = this.toNumber(this.getValue(left, card));
        const rightNum = this.toNumber(this.getValue(right, card));
        return (leftNum + rightNum) as unknown as boolean;
      }

      case "-": {
        const leftNum = this.toNumber(this.getValue(left, card));
        const rightNum = this.toNumber(this.getValue(right, card));
        return (leftNum - rightNum) as unknown as boolean;
      }

      case "*": {
        const leftNum = this.toNumber(this.getValue(left, card));
        const rightNum = this.toNumber(this.getValue(right, card));
        return (leftNum * rightNum) as unknown as boolean;
      }

      case "/": {
        const leftNum = this.toNumber(this.getValue(left, card));
        const rightNum = this.toNumber(this.getValue(right, card));

        if (rightNum === 0) {
          throw new InterpreterError("Division by zero");
        }

        return (leftNum / rightNum) as unknown as boolean;
      }

      case "%": {
        const leftNum = this.toNumber(this.getValue(left, card));
        const rightNum = this.toNumber(this.getValue(right, card));

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
    const descriptor = this.context.lookups[name];

    if (!descriptor) {
      throw new InterpreterError(`Unknown field: ${name}`);
    }

    return descriptor.lookup(card, this.context.fieldLookupContext);
  }

  private getFieldType(expr: Expr): FieldType | "unknown" {
    if (expr.type === "IDENTIFIER") {
      const descriptor = this.context.lookups[expr.name];
      return descriptor.type;
    }

    return "unknown";
  }

  private strictEquals(
    left: FieldValue,
    right: FieldValue,
    fieldType: FieldType | "unknown",
  ): boolean {
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

      if (fieldType === "text") {
        return normalizedLeft.includes(normalizedRight);
      }

      return normalizedLeft === normalizedRight;
    }

    if (Array.isArray(left) && typeof right === "string") {
      return left.some((val) => this.strictEquals(val, right, fieldType));
    }

    if (typeof left === "string" && Array.isArray(right)) {
      return right.some((val) => this.strictEquals(left, val, fieldType));
    }

    return false;
  }

  private looseEquals(
    left: FieldValue,
    right: FieldValue,
    fieldType: FieldType | "unknown",
  ): boolean {
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

      if (fieldType === "text") {
        return this.context.fuzzyMatcher(normalizedLeft, normalizedRight);
      }

      return normalizedLeft.includes(normalizedRight);
    }

    if (Array.isArray(left) && typeof right === "string") {
      return left.some((val) => this.looseEquals(val, right, fieldType));
    }

    if (typeof left === "string" && Array.isArray(right)) {
      return right.some((val) => this.looseEquals(left, val, fieldType));
    }

    return false;
  }

  private normalizeString(str: string): string {
    return str.toLocaleLowerCase();
  }

  private toNumber(value: FieldValue): number {
    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      const num = Number(value);

      if (Number.isNaN(num)) {
        throw new InterpreterError(`Cannot convert "${value}" to number`);
      }

      return num;
    }

    if (value === null || value === undefined) {
      return 0;
    }

    throw new InterpreterError(`Cannot convert ${typeof value} to number`);
  }
}

function createFuzzyMatcher(
  locale: string,
): (haystack: string, needle: string) => boolean {
  const uf = instantiateSearchFromLocale(locale, {
    interIns: 18,
  });

  return (haystack: string, needle: string) => {
    const results = uf.search([haystack], needle, 0);
    return !!results?.[0]?.length;
  };
}

export function createInterpreterContext(
  context: Omit<InterpreterContext, "fuzzyMatcher">,
  locale: string,
): InterpreterContext {
  return {
    ...context,
    fuzzyMatcher: createFuzzyMatcher(locale),
  };
}

export function compile(
  expr: Expr,
  context: Omit<InterpreterContext, "fuzzyMatcher">,
  locale = "en",
): (card: Card) => boolean {
  const interpreter = new Interpreter(context, locale);
  return interpreter.evaluate(expr);
}
