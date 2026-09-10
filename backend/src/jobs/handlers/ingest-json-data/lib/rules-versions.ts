import type { JsonDataRulesVersion } from "@arkham-build/shared";

export function resolveRulesVersions(versions: JsonDataRulesVersion[]) {
  return versions.map((version) => ({
    citation: version.citation,
    date: version.date,
  }));
}
