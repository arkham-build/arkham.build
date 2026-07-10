// oxlint-disable-next-line typescript/no-explicit-any -- is a safe check.
export function isNumeric(value: any): value is number {
  return !Number.isNaN(value - Number.parseFloat(value));
}
