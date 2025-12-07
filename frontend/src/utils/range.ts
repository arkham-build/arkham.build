export function range(start: number, length: number): number[] {
  return Array.from({ length }, (_, index) => start + index);
}
