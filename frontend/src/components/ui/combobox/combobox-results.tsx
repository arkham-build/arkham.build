import { XIcon } from "lucide-react";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../button";
import { Tag } from "../tag";
import css from "./combobox.module.css";

export type ResultRenderer<T extends { code: string }> = (
  item: T,
  onRemove?: () => void,
) => React.ReactNode;

type Props<T extends { code: string }> = {
  onRemove?: (index: number) => void;
  items: (T | undefined)[];
  renderResult?: ResultRenderer<T>;
};

type ResultTagProps = React.HTMLAttributes<HTMLLIElement> & {
  onRemove?: () => void;
  size?: "normal" | "sm" | "xs";
};

export function ResultTag(props: ResultTagProps) {
  const { children, onRemove, size = "xs", ...rest } = props;

  return (
    <Tag as="li" size={size === "normal" ? undefined : size} {...rest}>
      {children}
      {onRemove && <ResultRemoveButton onClick={onRemove} />}
    </Tag>
  );
}

export function ResultRemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      className={css["result-remove"]}
      data-testid="combobox-result-remove"
      iconOnly
      onClick={onClick}
      size="xs"
      variant="bare"
    >
      <XIcon />
    </Button>
  );
}

export function ComboboxResults<T extends { code: string }>(props: Props<T>) {
  const { items, onRemove, renderResult } = props;

  const { t } = useTranslation();

  if (!items.length) return null;

  return (
    <ul className={css["results"]}>
      {items.map((item, idx) => {
        const key = item?.code ?? idx;
        const remove = onRemove ? () => onRemove(idx) : undefined;

        if (!item) {
          return (
            <ResultTag
              data-testid={`combobox-result-${key}`}
              key={key}
              onRemove={remove}
            >
              {t("ui.combobox.unknown_option")}
            </ResultTag>
          );
        }

        return (
          <Fragment key={key}>
            {renderResult ? (
              renderResult(item, remove)
            ) : (
              <ResultTag
                data-testid={`combobox-result-${key}`}
                onRemove={remove}
              >
                {item.code}
              </ResultTag>
            )}
          </Fragment>
        );
      })}
    </ul>
  );
}
