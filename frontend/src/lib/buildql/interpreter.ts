import type {
  BinaryNode,
  Expr,
  GroupNode,
  IdentifierNode,
  LiteralNode,
} from "@arkham-build/shared";
import type { Card } from "@/store/schemas/card.schema";
import type { FieldValue, InterpreterContext } from "./interpreter.types";

export class InterpreterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InterpreterError";
  }
}

export class Interpreter {
  private context: InterpreterContext;

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
        );
      }

      case "!==": {
        return !this.strictEquals(
          this.getValue(left, card),
          this.getValue(right, card),
        );
      }

      case "=": {
        return this.looseEquals(
          this.getValue(left, card),
          this.getValue(right, card),
        );
      }
      case "!=": {
        return !this.looseEquals(
          this.getValue(left, card),
          this.getValue(right, card),
        );
      }

      case "??": {
        const leftValue = this.getValue(left, card);
        const rightList = this.getList(right, card);
        return rightList.some((val) => this.strictEquals(leftValue, val));
      }

      case "??!": {
        const leftValue = this.getValue(left, card);
        const rightList = this.getList(right, card);
        return !rightList.some((val) => this.strictEquals(leftValue, val));
      }

      case "?": {
        const leftValue = this.getValue(left, card);
        const rightList = this.getList(right, card);
        return rightList.some((val) => this.looseEquals(leftValue, val));
      }

      case "?!": {
        const leftValue = this.getValue(left, card);
        const rightList = this.getList(right, card);
        return !rightList.some((val) => this.looseEquals(leftValue, val));
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
    const lookup = this.context.lookups[name];

    if (!lookup) {
      throw new InterpreterError(`Unknown field: ${name}`);
    }

    return lookup(card);
  }

  private strictEquals(left: FieldValue, right: FieldValue): boolean {
    if (right === false && (left === false || left === null)) {
      return true;
    }

    if (typeof left === "boolean" && typeof right === "boolean") {
      return left === right;
    }

    if (typeof left === "number" && typeof right === "number") {
      return left === right;
    }

    if (typeof left === "string" && typeof right === "string") {
      return this.normalizeString(left) === this.normalizeString(right);
    }

    return false;
  }

  private looseEquals(left: FieldValue, right: FieldValue): boolean {
    if (right === false && (left === false || left === null)) {
      return true;
    }

    if (typeof left === "boolean" && typeof right === "boolean") {
      return left === right;
    }

    if (typeof left === "number" && typeof right === "number") {
      return left === right;
    }

    if (typeof left === "string" && typeof right === "string") {
      return this.normalizeString(left).includes(this.normalizeString(right));
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

export function compile(
  expr: Expr,
  context: InterpreterContext,
): (card: Card) => boolean {
  const interpreter = new Interpreter(context);
  return interpreter.evaluate(expr);
}
