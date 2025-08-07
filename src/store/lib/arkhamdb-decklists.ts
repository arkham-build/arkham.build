function toStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth());
}

export function deckDateRange(): [Date, Date] {
  const minDate = new Date(2016, 8);
  const maxDate = toStartOfMonth(new Date());
  return [minDate, maxDate];
}

export function deckDateTickRange(): [number, number] {
  const [minDate, maxDate] = deckDateRange();
  const monthsBetween =
    (maxDate.getFullYear() - minDate.getFullYear()) * 12 +
    maxDate.getMonth() -
    minDate.getMonth();
  return [0, monthsBetween];
}

export function stringToDeckTick(dateString: string): number {
  const [year, month] = dateString.split("-").map(Number);
  const [min, _] = deckDateRange();
  const date = new Date(year, month - 1);
  return (
    (date.getFullYear() - min.getFullYear()) * 12 +
    date.getMonth() -
    min.getMonth()
  );
}

export function deckTickToString(tick: number): string {
  const [min, _] = deckDateRange();
  const date = new Date(min.getFullYear(), min.getMonth() + tick);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
}
