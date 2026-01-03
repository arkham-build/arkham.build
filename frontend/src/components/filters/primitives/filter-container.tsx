import type { CollapsibleProps } from "@radix-ui/react-collapsible";
import { CircleIcon, LockIcon, XIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "@/utils/cx";
import { Button } from "../../ui/button";
import { Collapsible, CollapsibleContent } from "../../ui/collapsible";
import css from "./filter-container.module.css";

type Props = {
  alwaysShowChanges?: boolean;
  changes?: string;
  children: React.ReactNode;
  className?: string;
  locked?: boolean;
  noChangesLabel?: string;
  nonCollapsibleContent?: React.ReactNode;
  onOpenChange: (val: boolean) => void;
  onReset?: () => void;
  open: boolean;
  title: string;
} & Omit<CollapsibleProps, "title">;

export function FilterContainer(props: Props) {
  const {
    changes,
    children,
    className,
    locked,
    noChangesLabel,
    nonCollapsibleContent,
    alwaysShowChanges,
    open,
    onOpenChange,
    onReset,
    title,
    ...rest
  } = props;

  const { t } = useTranslation();

  const onFilterReset = useCallback(
    (evt: React.MouseEvent) => {
      evt.preventDefault();
      if (onReset) onReset();
    },
    [onReset],
  );

  const active = !!changes;

  return (
    <Collapsible
      {...rest}
      actions={
        locked ? (
          <LockIcon className={css["locked-icon"]} />
        ) : changes && onReset ? (
          <Button
            onClick={onFilterReset}
            iconOnly
            tooltip={t("filters.reset_filter")}
            variant="bare"
          >
            <XIcon />
          </Button>
        ) : undefined
      }
      className={cx(className, locked && css["locked"])}
      onOpenChange={onOpenChange}
      open={open}
      sub={
        alwaysShowChanges || !open
          ? changes || noChangesLabel || t("filters.all")
          : undefined
      }
      title={
        <span className={css["title-container"]}>
          {active && <CircleIcon className={css["active"]} />}
          {title}
        </span>
      }
      variant={active ? "active" : undefined}
    >
      <CollapsibleContent>{children}</CollapsibleContent>
      {nonCollapsibleContent}
    </Collapsible>
  );
}
