import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

type RecommenderRelativityToggleProps = {
  investigator: string;
};

export function RecommenderRelativityToggle(
  props: RecommenderRelativityToggleProps,
) {
  const { t } = useTranslation();
  const isRelative = useStore((state) => state.recommender.isRelative);
  const setIsRelative = useStore((state) => state.setIsRelative);

  const onToggleChange = useCallback(
    (value: string) => {
      setIsRelative(value === "true");
    },
    [setIsRelative],
  );
  return (
    <ToggleGroup
      type="single"
      onValueChange={onToggleChange}
      value={isRelative ? "true" : "false"}
    >
      <ToggleGroupItem
        value={"false"}
        tooltip={t("deck_edit.recommendations.absolute_help", {
          name: props.investigator,
        })}
      >
        {t("deck_edit.recommendations.absolute")}
      </ToggleGroupItem>
      <ToggleGroupItem
        value={"true"}
        tooltip={t("deck_edit.recommendations.relative_help", {
          name: props.investigator,
        })}
      >
        {t("deck_edit.recommendations.relative")}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
