import {
  createPackCodeBitPositions,
  decodePackCodeMask,
  encodePackCodes,
  sortPacksByReleaseDate,
  type Pack,
} from "@arkham-build/shared";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ConfigureEnvironmentModal } from "@/components/limited-card-pool/configure-environment-modal";
import { PackName } from "@/components/pack-name";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox/combobox";
import { ResultTag } from "@/components/ui/combobox/combobox-results";
import { DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { useStore } from "@/store";
import {
  selectCollectionEnvironmentPackCodes,
  selectLimitedPoolPackOptions,
} from "@/store/selectors/lists";
import { selectMetadata } from "@/store/selectors/shared";
import { official } from "@/utils/card-utils";
import {
  isDeckbuildingPoolPack,
  resolveLimitedPoolPacks,
} from "@/utils/environments";
import { displayPackName } from "@/utils/formatting";
import css from "../browser-decklists.module.css";
import type { DecklistFilterProps } from "./shared";

export function AllowedPacks({ formState, setFormState }: DecklistFilterProps) {
  const { t } = useTranslation();
  const locale = useStore((state) => state.settings.locale);
  const collectionPackCodes = useStore(selectCollectionEnvironmentPackCodes);
  const packOptions = useStore(selectLimitedPoolPackOptions).filter(
    (pack) => official(pack) && isDeckbuildingPoolPack(pack),
  );
  const { onValueChange, orderedPacks } =
    useAllowedPacksValueChange(setFormState);

  const selectedItems = formState.packCodes
    ? decodePackCodeMask(formState.packCodes).map((position) => {
        const pack = orderedPacks[position];
        if (!pack) {
          throw new Error(`Pack mask references unknown position ${position}.`);
        }
        return pack;
      })
    : [];

  const renderPack = (pack: Pack) => <PackName pack={pack} shortenNewFormat />;

  return (
    <Field data-testid="allowed-packs-field" full>
      <Combobox
        id="allowed-packs-combobox"
        items={packOptions}
        itemToString={(pack) => displayPackName(pack).toLowerCase()}
        label={t("decklists.filters.allowed_packs")}
        locale={locale}
        onValueChange={(packs) => onValueChange(packs.map((pack) => pack.code))}
        placeholder={t("filters.pack.placeholder")}
        renderItem={renderPack}
        renderResult={(pack, onRemove) => (
          <ResultTag
            data-testid={`combobox-result-${pack.code}`}
            onRemove={onRemove}
          >
            {renderPack(pack)}
          </ResultTag>
        )}
        resultsCollapsedHeight="12rem"
        selectedItems={selectedItems}
        showLabel
      />
      <div className={css["allowed-packs-actions"]}>
        <Button
          data-testid="allowed-packs-use-collection"
          onClick={() => onValueChange(collectionPackCodes)}
          size="sm"
        >
          {t("decklists.filters.use_collection")}
        </Button>
        <ConfigureEnvironmentButton />
        {!!formState.packCodes && (
          <Button onClick={() => onValueChange([])} size="xs" variant="link">
            {t("common.clear")}
          </Button>
        )}
      </div>
    </Field>
  );
}

export function AllowedPacksDialogContent({
  setFormState,
}: Pick<DecklistFilterProps, "setFormState">) {
  const { onValueChange } = useAllowedPacksValueChange(setFormState);

  return (
    <DialogContent>
      <ConfigureEnvironmentModal onValueChange={onValueChange} />
    </DialogContent>
  );
}

export function ConfigureEnvironmentButton({
  stopPropagation = false,
}: {
  stopPropagation?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <DialogTrigger asChild>
      <Button
        data-testid="allowed-packs-environments"
        onClick={
          stopPropagation
            ? (event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
              }
            : undefined
        }
        size="sm"
      >
        {t("deck_edit.config.card_pool.configure_environment")}
      </Button>
    </DialogTrigger>
  );
}

function useAllowedPacksValueChange(
  setFormState: DecklistFilterProps["setFormState"],
) {
  const metadata = useStore(selectMetadata);
  const orderedPacks = useMemo(
    () =>
      sortPacksByReleaseDate(Object.values(metadata.packs).filter(official)),
    [metadata.packs],
  );
  const bitPositions = useMemo(
    () => createPackCodeBitPositions(orderedPacks),
    [orderedPacks],
  );

  const onValueChange = (values: readonly string[]) => {
    const selectedPackCodes = resolveLimitedPoolPacks(metadata, [...values])
      .map((pack) => pack.code)
      .filter((code) => bitPositions.has(code));

    setFormState((prev) => ({
      ...prev,
      packCodes: selectedPackCodes.length
        ? encodePackCodes(selectedPackCodes, bitPositions)
        : undefined,
    }));
  };

  return { onValueChange, orderedPacks };
}
