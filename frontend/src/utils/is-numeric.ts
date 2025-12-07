// biome-ignore lint/suspicious/noExplicitAny: is a safe check.
export function isNumeric(value: any): value is number {
  return !Number.isNaN(value - Number.parseFloat(value));
}
