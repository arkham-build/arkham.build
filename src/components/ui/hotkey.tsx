import { parseHotkey } from "@/utils/use-hotkey";
import {
  ArrowBigUp,
  CommandIcon,
  CornerDownLeftIcon,
  DeleteIcon,
  OptionIcon,
  SquareArrowDownIcon,
  SquareArrowLeftIcon,
  SquareArrowRightIcon,
  SquareArrowUpIcon,
} from "lucide-react";
import { cloneElement } from "react";
import css from "./hotkey.module.css";
import { DefaultTooltip, type DefaultTooltipProps } from "./tooltip";

type Props = {
  description: string;
  keybind: string;
};

const isMac = navigator.platform.indexOf("Mac") > -1;

function renderKey(key: string) {
  switch (key) {
    case "cmd":
      return isMac ? <CommandIcon /> : "Ctrl";
    case "ctrl":
      return "Ctrl";
    case "shift":
      return <ArrowBigUp />;
    case "alt":
      return <OptionIcon />;
    case "backspace":
      return <DeleteIcon />;
    case "enter":
      return <CornerDownLeftIcon />;
    case "arrowup":
      return <SquareArrowUpIcon />;
    case "arrowdown":
      return <SquareArrowDownIcon />;
    case "arrowleft":
      return <SquareArrowLeftIcon />;
    case "arrowright":
      return <SquareArrowRightIcon />;
    case "escape":
      return "Esc";
    default:
      return key.toUpperCase();
  }
}

export function Keybind(props: Pick<Props, "keybind">) {
  const parsed = parseHotkey(props.keybind);
  if (!parsed) return null;

  return (
    <span className={css["keybind"]}>
      {parsed.modifiers.map((mod) => (
        <kbd key={mod}>{renderKey(mod)}</kbd>
      ))}
      <kbd>{renderKey(parsed.key)}</kbd>
    </span>
  );
}

export function Hotkey(props: Props) {
  const { keybind, description } = props;

  return (
    <span className={css["hotkey"]}>
      {description}
      <Keybind keybind={keybind} />
    </span>
  );
}

const TOOLTIP_OPTIONS = {
  placement: "top-start" as const,
};

export function HotkeyTooltip(
  props: Props & {
    children: DefaultTooltipProps["children"];
    paused?: DefaultTooltipProps["paused"];
  },
) {
  const { children, keybind, description, paused, ...rest } = props;

  return (
    <DefaultTooltip
      tooltip={<Hotkey keybind={keybind} description={description} />}
      options={TOOLTIP_OPTIONS}
      paused={paused}
    >
      {cloneElement(children as React.ReactElement, rest)}
    </DefaultTooltip>
  );
}
