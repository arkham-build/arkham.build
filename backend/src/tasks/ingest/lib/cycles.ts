import type { JsonDataCycle } from "@arkham-build/shared";
import type { WithItemTranslations } from "./json-data.types.ts";

type IgnoredAttributes = {
  size?: number;
};

export function resolveCycles(
  cycles: WithItemTranslations<JsonDataCycle & IgnoredAttributes>[],
) {
  return cycles.map(({ size, ...cycle }) => cycle);
}
