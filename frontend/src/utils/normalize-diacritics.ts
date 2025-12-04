export function normalizeDiacritics(str: string) {
  return str.normalize("NFKD").replace(/\p{Diacritic}/gu, "");
}
