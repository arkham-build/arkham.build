import type { Card } from "@arkham-build/shared";
import { useCallback } from "react";
import { Link } from "wouter";
import { PortaledCardTooltip } from "@/components/card-tooltip/card-tooltip-portaled";
import { useRestingTooltip } from "@/components/ui/tooltip.hooks";
import { useStore } from "@/store";
import { preventLeftClick } from "@/utils/prevent-links";
import { useAccentColor } from "@/utils/use-accent-color";
import css from "./card-link.module.css";

export function CardLink({
  children,
  card,
}: {
  children?: React.ReactNode;
  card: Card;
}) {
  const accentColor = useAccentColor(card);

  const openCardModal = useStore((state) => state.openCardModal);

  const { refs, referenceProps, isMounted, floatingStyles, transitionStyles } =
    useRestingTooltip();

  const onClick = useCallback(
    (evt: React.MouseEvent) => {
      const linkPrevented = preventLeftClick(evt);
      if (linkPrevented) {
        openCardModal(card.code);
      }
    },
    [openCardModal, card.code],
  );

  return (
    <>
      <Link
        {...referenceProps}
        className={css["card-link"]}
        onClick={onClick}
        href={`~/card/${card.code}`}
        ref={refs.setReference}
        style={accentColor}
      >
        {card.parallel && <i className="icon-parallel" />}
        {children}
      </Link>
      {isMounted && (
        <PortaledCardTooltip
          card={card}
          ref={refs.setFloating}
          floatingStyles={floatingStyles}
          transitionStyles={transitionStyles}
        />
      )}
    </>
  );
}
