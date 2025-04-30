import { useStore } from "@/store";
import { PortaledCardTooltip } from "../card-tooltip/card-tooltip-portaled";
import { useRestingTooltip } from "../ui/tooltip.hooks";
import type { Props as ListCardInnerProps } from "./list-card-inner";
import { ListCardInner } from "./list-card-inner";

export interface Props
  extends Omit<
    ListCardInnerProps,
    "figureRef" | "referenceProps" | "cardLevelDisplay"
  > {
  tooltip?: React.ReactNode;
}

export function ListCard(props: Props) {
  const { card, tooltip, ...rest } = props;

  const { refs, referenceProps, isMounted, floatingStyles, transitionStyles } =
    useRestingTooltip();

  const settings = useStore((state) => state.settings);

  if (!card) return null;

  return (
    <>
      <ListCardInner
        {...rest}
        card={card}
        cardLevelDisplay={settings.cardLevelDisplay}
        cardShowCollectionNumber={settings.cardShowCollectionNumber}
        cardSkillIconsDisplay={settings.cardSkillIconsDisplay}
        figureRef={refs.setReference}
        referenceProps={referenceProps}
      />
      {isMounted && (
        <PortaledCardTooltip
          card={card}
          ref={refs.setFloating}
          floatingStyles={floatingStyles}
          transitionStyles={transitionStyles}
          tooltip={tooltip}
        />
      )}
    </>
  );
}
