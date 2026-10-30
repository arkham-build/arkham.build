import type { Card } from "@arkham-build/shared";

const PORTRAITS: Record<string, string> = {
  "01002": "daisy",
  "01003": "skids",
  "01004": "agnes",
  "03006": "lola",
  "07005": "silas",
  "09001": "carson",
};

export function halloweenImageUrl(
  card: Card,
  kind: "scan" | "thumbnail",
  suffix?: string,
) {
  if (
    card.type_code !== "investigator" ||
    card.official === false ||
    card.parallel ||
    suffix
  )
    return undefined;

  const date = new Date();
  if (date.getMonth() !== 9 || date.getDate() !== 31) return undefined;

  const name = PORTRAITS[card.duplicate_of_code ?? card.code];
  return name
    ? `${import.meta.env.BASE_URL}assets/halloween/${name}-${kind}.webp`
    : undefined;
}
