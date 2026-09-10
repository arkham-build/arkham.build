/* oxlint-disable jsx-a11y/click-events-have-key-events -- not relevant. */
/* oxlint-disable jsx-a11y/no-static-element-interactions -- not relevant. */
import { ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react";
import { cx } from "@/utils/cx";
import css from "./collapse-sidebar-button.module.css";
import { Button } from "./ui/button";
import { HotkeyTooltip } from "./ui/hotkey";

type Props = {
  className?: string;
  hotkey: string;
  hotkeyLabel: string;
  orientation?: "left" | "right";
  onClick: () => void;
};

export function CollapseSidebarButton(props: Props) {
  const {
    className,
    hotkey,
    hotkeyLabel,
    orientation = "left",
    onClick,
  } = props;
  return (
    <div className={cx(css["collapse-container"], css[orientation], className)}>
      <div className={css["collapse-inner"]} onClick={onClick}>
        <div className={cx(css["highlight"])} />
        <HotkeyTooltip keybind={hotkey} description={hotkeyLabel}>
          <Button
            data-testid="sidebar-collapse-button"
            onClick={onClick}
            iconOnly
            rounded="full"
            tabIndex={-1}
            size="sm"
            className={css["button"]}
          >
            {orientation === "left" ? (
              <ChevronsLeftIcon />
            ) : (
              <ChevronsRightIcon />
            )}
          </Button>
        </HotkeyTooltip>
      </div>
    </div>
  );
}
