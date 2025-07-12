import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Combobox } from "@/components/ui/combobox/combobox";
import { useStore } from "@/store";
import type { Coded } from "@/store/lib/types";
import { SKILL_KEYS } from "@/utils/constants";

type Props = {
  disabled?: boolean;
  id: string;
  onChange: (value: string[]) => void;
  readonly?: boolean;
  selections: string[];
};

const itemRenderer = (item: Coded & { name: string }) => (
  <>
    <i className={`icon-${item.code}`} /> {item.name}
  </>
);

export function CustomizationChooseSkill(props: Props) {
  const { disabled, id, onChange, readonly, selections } = props;
  const { t } = useTranslation();

  const locale = useStore((state) => state.settings.locale);

  const options = useMemo(
    () =>
      SKILL_KEYS.filter((x) => x !== "wild").map((key) => ({
        code: key,
        name: t(`common.skill.${key}`),
      })),
    [t],
  );

  return (
    <Combobox
      disabled={disabled}
      id={`${id}-choose-skill`}
      items={options}
      label={t("common.skill.title")}
      limit={1}
      locale={locale}
      onValueChange={onChange}
      placeholder={t("deck_edit.customizable.skill_placeholder")}
      readonly={readonly}
      renderItem={itemRenderer}
      renderResult={itemRenderer}
      selectedItems={selections}
    />
  );
}
