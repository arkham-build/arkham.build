import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectMetadata } from "@/store/selectors/shared";
import type { Card } from "@/store/services/queries.types";
import type { Metadata } from "@/store/slices/metadata.types";
import { displayAttribute } from "@/utils/card-utils";
import { isEmpty } from "@/utils/is-empty";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useCardModalContextChecked } from "./card-modal/card-modal-context";
import { CardScanInner } from "./card-scan";

type Props = { card: Card; deck: ResolvedDeck };

export function CustomizableSheet(props: Props) {
  const { card, deck } = props;

  const metadata = useStore(selectMetadata);

  const { t } = useTranslation();
  const modalContext = useCardModalContextChecked();

  const openModal = useCallback(() => {
    modalContext.setOpen({ code: card.code });
  }, [modalContext, card.code]);

  return (
    <div>
      <CardScanInner
        onClick={openModal}
        crossOrigin="anonymous"
        url={customizationSheetUrl(card, deck, metadata)}
        alt={t("deck.customization_sheet", {
          name: displayAttribute(card, "name"),
        })}
        style={
          {
            "--scan-level": 0,
          } as React.CSSProperties
        }
      />
    </div>
  );
}

function customizationSheetUrl(
  card: Card,
  deck: ResolvedDeck,
  metadata: Metadata,
) {
  const base = `${import.meta.env.VITE_API_URL}/v1/public/customization_sheet`;

  const tabooId = deck.taboo_id ?? "0";

  const customizations = deck.metaParsed[`cus_${card.code}`] ?? "";
  const customizationStr = base64(customizations);

  const names = card.customization_options?.reduce(
    (acc, choice, index) => {
      if (choice.choice === "choose_card") {
        const choices =
          deck.customizations?.[card.code][index]?.selections ?? "";

        for (const code of choices.split("^")) {
          const name = metadata.cards[code]?.real_name;
          if (name) acc[code] = name;
        }
      }

      return acc;
    },
    {} as Record<string, string>,
  );

  let params = `${card.code}-${tabooId}-${customizationStr}`;

  if (!isEmpty(names)) {
    const namesStr = JSON.stringify({ names });
    params += `-${base64(namesStr)}`;
  }

  return `${base}/${params}.webp`;
}

function base64(str: string) {
  let encoded = btoa(str);
  // the sheet api uses php and expects base64 without padding, remove trailing `=`
  while (encoded.endsWith("=")) {
    encoded = encoded.slice(0, -1);
  }
  return encoded;
}
