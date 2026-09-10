import type { Card } from "@arkham-build/shared";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { CardWithRelations, ResolvedCard } from "@/store/lib/types";
import {
  type Printing as CardPrinting,
  selectPrintingsForCard,
} from "@/store/selectors/shared";
import { groupPrintingsByChapter } from "@/utils/chapters";
import { cx } from "@/utils/cx";
import { displayPackName } from "@/utils/formatting";
import EncounterIcon from "../icons/encounter-icon";
import { Printing, PrintingInner } from "../printing";
import { Button } from "../ui/button";
import css from "./card.module.css";

type Props = {
  hideCollectorInfo?: boolean;
  linked?: boolean;
  resolvedCard: ResolvedCard | CardWithRelations;
  onPrintingSelect?: (card: Card) => void;
  size: "tooltip" | "compact" | "full";
};

export function CardMetaBack(props: { illustrator?: string | null }) {
  if (!props.illustrator) return null;

  return (
    <footer className={css["meta"]}>
      <p className={css["meta-property"]}>
        <i className="icon-paintbrush" /> {props.illustrator}
      </p>
    </footer>
  );
}

export function CardMeta(props: Props) {
  const { linked = true, onPrintingSelect, resolvedCard, size } = props;

  const showCopyId = useStore(
    (state) => state.settings.devModeEnabled && size !== "tooltip",
  );

  const illustrator = resolvedCard.card.illustrator;

  const { card } = resolvedCard;

  return (
    <footer className={cx(css["meta"], css[size])}>
      {size === "full" && illustrator && (
        <p className={css["meta-property"]}>
          <i className="icon-paintbrush" /> {illustrator}
        </p>
      )}
      {card.encounter_code ? (
        <EncounterEntry
          linked={linked}
          onPrintingSelect={onPrintingSelect}
          resolvedCard={resolvedCard}
          size={size}
          showCopyId={showCopyId}
        />
      ) : (
        <PlayerEntry
          linked={linked}
          onPrintingSelect={onPrintingSelect}
          resolvedCard={resolvedCard}
          size={size}
          showCopyId={showCopyId}
        />
      )}
    </footer>
  );
}

function PlayerEntry(props: Props & { showCopyId: boolean }) {
  const { linked = true, onPrintingSelect, resolvedCard, showCopyId } = props;

  const { t } = useTranslation();

  const printings = useStore((state) =>
    selectPrintingsForCard(state, resolvedCard.card.code),
  );

  const cardCode = resolvedCard.card.code;

  return (
    <>
      <hr className={css["meta-divider"]} />
      <PrintingGroups
        cardCode={cardCode}
        linked={linked}
        onPrintingSelect={onPrintingSelect}
        printings={printings}
        showCopyId={showCopyId}
        selectLabel={t("common.select")}
      />
    </>
  );
}

function EncounterEntry(props: Props & { showCopyId: boolean }) {
  const { linked = true, resolvedCard, showCopyId } = props;

  const printings = useStore((state) =>
    selectPrintingsForCard(state, resolvedCard.card.code),
  );

  const { card, encounterSet } = resolvedCard;

  if (!encounterSet) return null;

  const cardCode = resolvedCard.card.code;

  return (
    <>
      <hr className={css["meta-divider"]} />
      <p className={css["meta-property"]}>
        <PrintingInner
          card={card}
          icon={<EncounterIcon code={card.encounter_code} />}
          name={
            linked ? (
              <a
                className="link-current"
                href={`/browse/encounter_set/${encounterSet.code}`}
                target="_blank"
                rel="noreferrer"
              >
                {displayPackName(encounterSet)}
              </a>
            ) : (
              <span>{displayPackName(encounterSet)}</span>
            )
          }
          position={getEncounterPositions(
            card.encounter_position ?? 1,
            card.quantity,
          )}
        />
      </p>
      <hr className={css["meta-divider"]} />
      <PrintingGroups
        cardCode={cardCode}
        linked={linked}
        printings={printings}
        showCopyId={showCopyId}
      />
    </>
  );
}

function PrintingGroups(props: {
  cardCode: string;
  linked: boolean;
  onPrintingSelect?: (card: Card) => void;
  printings: CardPrinting[];
  selectLabel?: string;
  showCopyId: boolean;
}) {
  const { t } = useTranslation();

  const {
    cardCode,
    linked,
    onPrintingSelect,
    printings,
    selectLabel,
    showCopyId,
  } = props;

  const hasVersions = printings.some(
    (printing) => printing.card.code !== cardCode,
  );
  const printingsByChapter = groupPrintingsByChapter(printings);

  return printingsByChapter.map(([chapter, chapterPrintings]) => (
    <div className={css["meta-printing-group"]} key={chapter}>
      {chapter <= 2 && (
        <p className={cx(css["meta-property"], css["meta-chapter"])}>
          {t("settings.collection.chapter", {
            number: chapter,
          })}
        </p>
      )}
      {chapterPrintings.map((printing) => {
        const active = cardCode === printing.card.code;

        return (
          <p className={css["meta-property"]} key={printing.id}>
            <Printing
              active={active && hasVersions}
              key={printing.id}
              linked={linked}
              printing={printing}
              showCopyId={showCopyId}
              actionNode={
                !active && hasVersions && onPrintingSelect ? (
                  <Button
                    size="xxs"
                    onClick={() => onPrintingSelect(printing.card)}
                  >
                    {selectLabel}
                  </Button>
                ) : undefined
              }
            />
          </p>
        );
      })}
    </div>
  ));
}

function getEncounterPositions(position: number, quantity: number) {
  if (quantity === 1) return position;
  const start = position;
  const end = position + quantity - 1;
  return `${start}-${end}`;
}
