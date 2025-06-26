import { CheckIcon, ClipboardCopyIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useCopyToClipboard } from "@/utils/use-copy-to-clipboard";
import { Button, type Props as ButtonProps } from "./button";

interface Props extends Omit<ButtonProps<"button">, "children" | "onClick"> {
  text: string;
  tooltip?: string;
}

export function CopyToClipboard(props: Props) {
  const { text, tooltip, ...rest } = props;
  const { t } = useTranslation();

  const { copyToClipboard, isCopied } = useCopyToClipboard();

  const onClick = useCallback(() => {
    copyToClipboard(text);
  }, [copyToClipboard, text]);

  return (
    <Button
      tooltip={
        isCopied
          ? t("ui.copy_to_clipboard_success")
          : (tooltip ?? t("ui.copy_to_clipboard"))
      }
      {...rest}
      iconOnly
      onClick={onClick}
    >
      {isCopied ? <CheckIcon /> : <ClipboardCopyIcon />}
    </Button>
  );
}
