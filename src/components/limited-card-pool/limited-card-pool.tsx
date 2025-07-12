import { BookLockIcon, XIcon } from "lucide-react";
import { useCallback, useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { createSelector } from "reselect";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import type { SealedDeck } from "@/store/lib/types";
import type { Pack } from "@/store/schemas/pack.schema";
import {
  selectLimitedPoolPackOptions,
  selectPackOptions,
} from "@/store/selectors/lists";
import { selectMetadata } from "@/store/selectors/shared";
import type { StoreState } from "@/store/slices";
import { assert } from "@/utils/assert";
import { displayPackName } from "@/utils/formatting";
import { isEmpty } from "@/utils/is-empty";
import { parseCsv } from "@/utils/parse-csv";
import { useResolvedDeck } from "@/utils/use-resolved-deck";
import { ListCardInner } from "../list-card/list-card-inner";
import { PackName } from "../pack-name";
import { Button } from "../ui/button";
import { Combobox } from "../ui/combobox/combobox";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { Field, FieldLabel } from "../ui/field";
import { FileInput } from "../ui/file-input";
import { Tag } from "../ui/tag";
import { useToast } from "../ui/toast.hooks";
import {
  DefaultTooltip,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";
import { ChooseCampaignModal } from "./choose-campaign-modal";
import css from "./limited-card-pool.module.css";

const selectLimitedCardPoolCards = createSelector(
  selectMetadata,
  (_: StoreState, cardPool: string[] | undefined) => cardPool,
  (metadata, cardPool) => {
    return cardPool
      ?.filter((str) => str.startsWith("card:"))
      .map((str) => metadata.cards[str.replace("card:", "")]);
  },
);

export function LimitedCardPoolTag() {
  const ctx = useResolvedDeck();
  const { t } = useTranslation();

  const cardPool = ctx.resolvedDeck?.cardPool;

  const selectedPacks = useStore(
    useShallow((state) =>
      selectPackOptions(state, ctx.resolvedDeck).filter((pack) =>
        cardPool?.includes(pack.code),
      ),
    ),
  );

  const selectedCards = useStore((state) =>
    selectLimitedCardPoolCards(state, cardPool),
  );

  if (isEmpty(selectedPacks)) return null;

  return (
    <DefaultTooltip
      options={{ placement: "bottom-start" }}
      tooltip={
        <ol className={css["packs"]}>
          {selectedPacks.map((pack) => {
            return pack ? (
              <li className={css["pack"]} key={pack.code}>
                <PackName pack={pack} shortenNewFormat />
              </li>
            ) : null;
          })}
          {!isEmpty(selectedCards) &&
            selectedCards.map((card) => (
              <li className={css["pack"]} key={card.code}>
                <ListCardInner
                  cardShowCollectionNumber
                  cardLevelDisplay="icon-only"
                  size="xs"
                  omitBorders
                  omitThumbnail
                  card={card}
                />
              </li>
            ))}
        </ol>
      }
    >
      <Tag as="li" size="xs" data-testid="limited-card-pool-tag">
        {t("deck.tags.limited_pool")}
      </Tag>
    </DefaultTooltip>
  );
}

export function LimitedCardPoolField(props: {
  onValueChange: (value: string[]) => void;
  selectedItems: string[];
}) {
  const { onValueChange, selectedItems } = props;
  const { t } = useTranslation();

  const packs = useStore(selectLimitedPoolPackOptions);

  const locale = useStore((state) => state.settings.locale);

  const items = useMemo(
    () =>
      packs.filter(
        (pack) =>
          pack.cycle_code !== "parallel" &&
          pack.cycle_code !== "promotional" &&
          pack.cycle_code !== "side_stories",
      ),
    [packs],
  );

  const packRenderer = useCallback(
    (pack: Pack) => <PackName pack={pack} shortenNewFormat />,
    [],
  );

  const packToString = useCallback(
    (pack: Pack) => displayPackName(pack).toLowerCase(),
    [],
  );

  return (
    <Dialog>
      <Field
        data-testid="limited-card-pool-field"
        full
        padded
        helpText={
          <>
            <p>{t("deck_edit.config.card_pool.help")}</p>
            <div className={css["cpa-actions"]}>
              <DialogTrigger asChild>
                <Button variant="link" size="xs">
                  {t("deck_edit.config.card_pool.use_preset")}
                </Button>
              </DialogTrigger>
              {!isEmpty(selectedItems) && (
                <Button
                  onClick={() => onValueChange([])}
                  size="xs"
                  variant="link"
                >
                  {t("common.clear")}
                </Button>
              )}
            </div>
          </>
        }
      >
        <Combobox
          id="card-pool-combobox"
          items={items}
          itemToString={packToString}
          label={t("deck_edit.config.card_pool.title")}
          locale={locale}
          onValueChange={onValueChange}
          placeholder={t("deck_edit.config.card_pool.placeholder")}
          renderItem={packRenderer}
          renderResult={packRenderer}
          showLabel
          selectedItems={selectedItems}
        />
      </Field>
      <DialogContent>
        <ChooseCampaignModal onValueChange={onValueChange} />
      </DialogContent>
    </Dialog>
  );
}

export function SealedDeckField(props: {
  onValueChange: (payload: SealedDeck | undefined) => void;
  value?: SealedDeck;
}) {
  const { onValueChange, value } = props;

  const { t } = useTranslation();
  const toast = useToast();

  const onChangeFile = useCallback(
    async (evt: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = evt.target;
      if (!files || !files.length) return;

      const file = files[0];
      const fileText = await file.text();

      try {
        const parsed = parseCsv(fileText);
        assert(
          parsed.every(isCardRow),
          "File is not a sealed deck definition.",
        );
        onValueChange({
          name: file.name.split(".csv")[0],
          cards: parsed.reduce(
            (acc, curr) => {
              acc[curr.code] = curr.quantity;
              return acc;
            },
            {} as Record<string, number>,
          ),
        });
      } catch (err) {
        toast.show({
          children:
            (err as Error)?.message ??
            "Unknown error while parsing sealed deck.",
          variant: "error",
          duration: 5000,
        });
      }
    },
    [onValueChange, toast.show],
  );

  return (
    <Field
      data-testid="sealed-deck-field"
      full
      padded
      helpText={
        <Trans
          t={t}
          i18nKey="deck_edit.config.sealed.help"
          components={{
            a: (
              // biome-ignore lint/a11y/useAnchorContent: interpolation.
              <a
                href="https://www.arkhamsealed.com/"
                target="_blank"
                rel="noopener noreferrer"
              />
            ),
          }}
        />
      }
    >
      <FieldLabel as="div">{t("deck_edit.config.sealed.title")}</FieldLabel>
      <div className={css["sealed"]}>
        <div>
          <FileInput
            id="sealed-deck"
            accept="text/csv"
            onChange={onChangeFile}
            size="sm"
          >
            <BookLockIcon /> {t("deck_edit.config.sealed.add")}
          </FileInput>
        </div>
        {value && (
          <Tag size="xs">
            {value.name} ({Object.keys(value.cards).length} cards)
            <Button
              data-testid="sealed-deck-remove"
              onClick={() => onValueChange(undefined)}
              iconOnly
              size="xs"
              variant="bare"
            >
              <XIcon />
            </Button>
          </Tag>
        )}
      </div>
    </Field>
  );
}

type CardRow = {
  code: string;
  quantity: number;
};

function isCardRow(x: unknown): x is CardRow {
  return (
    typeof x === "object" &&
    x != null &&
    "code" in x &&
    "quantity" in x &&
    typeof x.code === "string" &&
    typeof x.quantity === "string" &&
    x.code.length > 0 &&
    x.code.length < 10 &&
    Number.isSafeInteger(Number.parseInt(x.quantity, 10))
  );
}

export function SealedDeckTag() {
  const ctx = useResolvedDeck();
  const { t } = useTranslation();

  const value = ctx.resolvedDeck?.sealedDeck;
  if (!value) return null;

  const count = Object.keys(value.cards).length;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Tag size="xs">{t("deck.tags.sealed")}</Tag>
      </TooltipTrigger>
      <TooltipContent>
        {value.name} ({count} {t("common.card", { count })})
      </TooltipContent>
    </Tooltip>
  );
}
