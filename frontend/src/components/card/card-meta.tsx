import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { CardWithRelations, ResolvedCard } from "@/store/lib/types";
import type { Card } from "@/store/schemas/card.schema";
import { selectPrintingsForCard } from "@/store/selectors/shared";
import { cx } from "@/utils/cx";
import EncounterIcon from "../icons/encounter-icon";
import { Printing, PrintingInner } from "../printing";
import { Button } from "../ui/button";
import css from "./card.module.css";

type Props = {
  hideCollectorInfo?: boolean;
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
  const { onPrintingSelect, resolvedCard, size } = props;

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
          onPrintingSelect={onPrintingSelect}
          resolvedCard={resolvedCard}
          size={size}
        />
      ) : (
        <PlayerEntry
          onPrintingSelect={onPrintingSelect}
          resolvedCard={resolvedCard}
          size={size}
        />
      )}
    </footer>
  );
}

function PlayerEntry(props: Props) {
  const { onPrintingSelect, resolvedCard } = props;

  const { t } = useTranslation();

  const printings = useStore((state) =>
    selectPrintingsForCard(state, resolvedCard.card.code),
  );

  const cardCode = resolvedCard.card.code;

  return (
    <>
      <hr className={css["meta-divider"]} />

      {printings?.map((printing) => {
        const active = cardCode === printing.card.code;

        const hasVersions =
          printings.filter((p) => p.card.code !== cardCode).length > 0;

        return (
          <p className={css["meta-property"]} key={printing.id}>
            <Printing
              active={active && hasVersions}
              key={printing.id}
              printing={printing}
              actionNode={
                !active && hasVersions && onPrintingSelect ? (
                  <Button
                    size="xxs"
                    onClick={() => onPrintingSelect(printing.card)}
                  >
                    {t("common.select")}
                  </Button>
                ) : undefined
              }
            />
          </p>
        );
      })}
    </>
  );
}

function EncounterEntry(props: Props) {
  const { resolvedCard } = props;

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
            <a
              className="link-current"
              href={`/browse/encounter_set/${encounterSet.code}`}
              target="_blank"
              rel="noreferrer"
            >
              {encounterSet.name}
            </a>
          }
          position={getEncounterPositions(
            card.encounter_position ?? 1,
            card.quantity,
          )}
        />
      </p>
      <hr className={css["meta-divider"]} />
      {printings?.map((printing) => {
        const active = cardCode === printing.card.code;

        const hasVersions =
          printings.filter((p) => p.card.code !== cardCode).length > 0;

        return (
          <p className={css["meta-property"]} key={printing.id}>
            <Printing
              active={active && hasVersions}
              key={printing.id}
              printing={printing}
            />
          </p>
        );
      })}
    </>
  );
}

function getEncounterPositions(position: number, quantity: number) {
  if (quantity === 1) return position;
  const start = position;
  const end = position + quantity - 1;
  return `${start}-${end}`;
}
