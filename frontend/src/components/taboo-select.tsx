import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { selectTabooSetOptions } from "@/store/selectors/lists";
import { formatTabooSet } from "@/utils/formatting";
import { Select, type Props as SelectProps } from "./ui/select";

type Props = Omit<SelectProps, "id" | "value" | "options"> & {
  id: string;
  includeLatest?: boolean;
  value?: number | "latest" | null;
};

export function TabooSelect(props: Props) {
  const { id, includeLatest, value, ...rest } = props;

  const { t } = useTranslation();

  const tabooSets = useStore(selectTabooSetOptions);

  const tabooSetOptions = useMemo(() => {
    const sets = tabooSets.map((set) => {
      return { label: formatTabooSet(set), value: set.id };
    });

    if (!includeLatest) return sets;

    return [
      { label: t("settings.general.latest_taboo"), value: "latest" },
      ...sets,
    ];
  }, [tabooSets, t, includeLatest]);

  return (
    <Select
      {...rest}
      data-testid={id}
      emptyLabel={t("common.none")}
      id={id}
      options={tabooSetOptions}
      value={value ?? ""}
    />
  );
}
