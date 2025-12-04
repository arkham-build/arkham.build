import { CustomizationOption } from "@/components/customizations/customization-option";
import {
  ListCard,
  type Props as ListCardProps,
} from "@/components/list-card/list-card";
import type { ResolvedDeck } from "@/store/lib/types";
import type { CustomizationUpgrade } from "@/store/selectors/decks";
import { displayAttribute } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import css from "./diffs.module.css";

type Props = {
  deck?: ResolvedDeck;
  differences: CustomizationUpgrade[];
  listCardProps?: Partial<ListCardProps>;
  title: React.ReactNode;
  size?: "sm";
};

export function CustomizableDiff(props: Props) {
  const { deck, differences, listCardProps, size, title } = props;

  if (!differences.length) return null;

  return (
    <article className={cx(css["diffs-container"], size && css[size])}>
      <header>
        <h4 className={css["diffs-title"]}>{title}</h4>
      </header>
      <ol className={css["diffs"]}>
        {differences.map(({ card, diff, xpMax }) => (
          <li key={card.code}>
            <ListCard
              {...listCardProps}
              annotation={deck?.annotations[card.code]}
              key={card.code}
              card={card}
            />
            <ol className={css["diff-customizations"]}>
              {diff.map(
                (customization) =>
                  (customization.xp_spent !== 0 ||
                    !card.customization_options?.[customization.index].xp) &&
                  !!card.customization_options &&
                  !!card.real_customization_text && (
                    <li
                      className={css["diff-customization"]}
                      key={customization.index}
                    >
                      <CustomizationOption
                        card={card}
                        index={customization.index}
                        choice={customization}
                        readonly
                        omitOptionText
                        xpMax={xpMax}
                        option={card.customization_options[customization.index]}
                        text={displayAttribute(
                          card,
                          "customization_text",
                        ).split("\n")}
                      />
                    </li>
                  ),
              )}
            </ol>
          </li>
        ))}
      </ol>
    </article>
  );
}
