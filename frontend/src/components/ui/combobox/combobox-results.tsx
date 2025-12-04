import { XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../button";
import { Tag } from "../tag";
import css from "./combobox.module.css";

type Props<T extends { code: string }> = {
  onRemove?: (index: number) => void;
  items: (T | undefined)[];
  renderResult: (item: T) => React.ReactNode;
};

export function ComboboxResults<T extends { code: string }>(props: Props<T>) {
  const { items, onRemove, renderResult } = props;

  const { t } = useTranslation();

  if (!items.length) return null;

  return (
    <ul className={css["results"]}>
      {items.map((item, idx) => {
        const key = item?.code ?? idx;
        return (
          <Tag key={key} size="xs" data-testid={`combobox-result-${key}`}>
            {item ? renderResult(item) : t("ui.combobox.unknown_option")}
            {onRemove && (
              <Button
                data-testid="combobox-result-remove"
                iconOnly
                onClick={() => {
                  onRemove(idx);
                }}
                size="xs"
                variant="bare"
              >
                <XIcon />
              </Button>
            )}
          </Tag>
        );
      })}
    </ul>
  );
}
