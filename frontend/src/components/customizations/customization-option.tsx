import type {
  Card,
  CustomizationOption as CustomizationOptionType,
} from "@arkham-build/shared";
import { useCallback, useId, useMemo } from "react";
import type { Customization } from "@/store/lib/types";
import type { CustomizationEdit } from "@/store/slices/deck-edits.types";
import { parseCustomizationTextHtml } from "@/utils/card-utils";
import { range } from "@/utils/range";
import { Checkbox } from "../ui/checkbox";
import { CustomizationChooseCards } from "./customization-choose-cards";
import { CustomizationChooseSkill } from "./customization-choose-skill";
import { CustomizationChooseTraits } from "./customization-choose-trait";
import { CustomizationRemoveSlot } from "./customization-remove-slot";
import css from "./customizations.module.css";

type Props = {
  card: Card;
  choice?: Customization;
  disabled?: boolean;
  index: number;
  omitOptionText?: boolean;
  onChange?: (index: number, edit: CustomizationEdit) => void;
  option: CustomizationOptionType;
  readonly?: boolean;
  text: string[];
  xpMax?: number;
};

export function CustomizationOption(props: Props) {
  const {
    card,
    choice,
    disabled,
    index,
    onChange,
    omitOptionText,
    option,
    readonly,
    text,
    xpMax,
  } = props;

  const id = useId();
  const xpSpent = choice?.xp_spent ?? 0;

  const selections = choice?.selections?.split("^").filter((x) => x) ?? [];

  const cssVariables = useMemo(
    () => ({
      "--customization-xp-max": xpMax,
    }),
    [xpMax],
  );

  const unlocked = xpSpent >= option.xp;

  const onChangeSelection = useCallback(
    (selections: string[]) => {
      if (onChange) onChange(index, { selections });
    },
    [onChange, index],
  );

  const htmlText = omitOptionText
    ? (/(<b>.*<\/b>)/.exec(text[index])?.[1] ?? "")
    : text[index];

  return (
    <div
      className={css["customization"]}
      data-testid={`customization-${index}`}
      style={cssVariables as React.CSSProperties}
    >
      <div className={css["checks"]}>
        {!!option.xp &&
          range(0, option.xp).map((i) => (
            <Checkbox
              checked={i < xpSpent}
              data-testid={`customization-${index}-xp-${i}`}
              disabled={disabled}
              hideLabel
              id={id}
              key={i}
              label=""
              onCheckedChange={
                onChange
                  ? (val) => {
                      if (val) {
                        onChange(index, { xp_spent: i + 1 });
                      } else {
                        onChange(index, { xp_spent: i });
                      }
                    }
                  : undefined
              }
            />
          ))}
      </div>
      <div className={css["content"]}>
        {htmlText && (
          <p
            // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is from trusted source.
            dangerouslySetInnerHTML={{
              __html: parseCustomizationTextHtml(htmlText),
            }}
          />
        )}

        {unlocked && option.choice === "choose_skill" && (
          <CustomizationChooseSkill
            disabled={disabled || !onChange}
            id={id}
            readonly={readonly}
            onChange={onChangeSelection}
            selections={selections}
          />
        )}

        {unlocked && option.choice === "remove_slot" && (
          <CustomizationRemoveSlot
            card={card}
            disabled={disabled || !onChange}
            id={id}
            readonly={readonly}
            onChange={onChangeSelection}
            selections={selections}
          />
        )}

        {unlocked && option.choice === "choose_trait" && (
          <CustomizationChooseTraits
            disabled={disabled || !onChange}
            id={id}
            limit={option.quantity ?? 1}
            readonly={readonly}
            onChange={onChangeSelection}
            selections={selections}
          />
        )}

        {unlocked && option.choice === "choose_card" && option.card && (
          <CustomizationChooseCards
            config={option.card}
            disabled={disabled || !onChange}
            id={id}
            limit={option.quantity ?? 1}
            readonly={readonly}
            onChange={onChangeSelection}
            selections={selections}
          />
        )}
      </div>
    </div>
  );
}
