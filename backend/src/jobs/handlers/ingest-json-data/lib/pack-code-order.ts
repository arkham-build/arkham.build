import {
  PACK_CODES_BIT_COUNT,
  sortPacksByReleaseDate,
  type JsonDataPack,
} from "@arkham-build/shared";

export function validatePackCodeOrder(
  existingPacks: readonly Pick<JsonDataPack, "code" | "date_release">[],
  incomingPacks: readonly Pick<JsonDataPack, "code" | "date_release">[],
): void {
  if (incomingPacks.length > PACK_CODES_BIT_COUNT) {
    throw new Error(
      `Incoming data has ${incomingPacks.length} packs; the limit is ${PACK_CODES_BIT_COUNT}.`,
    );
  }

  for (const pack of [...existingPacks, ...incomingPacks]) {
    if (!pack.date_release) {
      throw new Error(`Pack ${pack.code} has no release date.`);
    }
  }

  const existingCodes = sortPacksByReleaseDate(existingPacks).map(
    ({ code }) => code,
  );
  const incomingCodes = sortPacksByReleaseDate(incomingPacks).map(
    ({ code }) => code,
  );

  for (const [position, existingCode] of existingCodes.entries()) {
    const incomingCode = incomingCodes[position];

    const isTracesToNowhereRename =
      existingCode === "traces_to_nowhere" &&
      incomingCode === "traces_to_nowhere_pack" &&
      !incomingCodes.includes(existingCode);

    if (incomingCode !== existingCode && !isTracesToNowhereRename) {
      throw new Error(
        `Incoming pack order does not preserve pack ${existingCode} at bit position ${position}.`,
      );
    }
  }
}
