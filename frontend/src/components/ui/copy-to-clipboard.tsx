import { CheckIcon, ClipboardCopyIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cx } from "@/utils/cx";
import { useCopyToClipboard } from "@/utils/use-copy-to-clipboard";
import { Button, type Props as ButtonProps } from "./button";
import css from "./copy-to-clipboard.module.css";

interface Props extends Omit<ButtonProps<"button">, "children" | "onClick"> {
  text: string;
  tooltip?: string;
}

export function CopyToClipboard(props: Props) {
  const { text, tooltip, ...rest } = props;
  const { t } = useTranslation();

  const { copyToClipboard, isCopied } = useCopyToClipboard();

  const onClick = () => {
    void copyToClipboard(text).catch(console.error);
  };

  return (
    <Button
      {...rest}
      tooltip={
        isCopied
          ? t("ui.copy_to_clipboard_success")
          : (tooltip ?? t("ui.copy_to_clipboard"))
      }
      iconOnly
      onClick={onClick}
    >
      <span className={css["icon-swap"]} data-copied={isCopied}>
        <ClipboardCopyIcon
          aria-hidden="true"
          className={cx(css["icon"], css["copy"])}
        />
        <CheckIcon
          aria-hidden="true"
          className={cx(css["icon"], css["check"])}
        />
      </span>
    </Button>
  );
}
