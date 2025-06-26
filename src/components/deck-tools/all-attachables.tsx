import { Fragment } from "react/jsx-runtime";
import type { ResolvedDeck } from "@/store/lib/types";
import { AttachableCards } from "./attachable-cards";

type Props = {
  deck: ResolvedDeck;
  readonly?: boolean;
};

export function AllAttachables({ deck, readonly }: Props) {
  return deck.availableAttachments?.map((attachment) => (
    <Fragment key={attachment.code}>
      {deck.cards.slots[attachment.code]?.card && (
        <AttachableCards
          card={deck.cards.slots[attachment.code]?.card}
          definition={attachment}
          readonly={readonly}
          resolvedDeck={deck}
        />
      )}
      {deck.investigatorBack.card.code === attachment.code && (
        <AttachableCards
          card={deck.investigatorBack.card}
          definition={attachment}
          readonly={readonly}
          resolvedDeck={deck}
        />
      )}
    </Fragment>
  ));
}
