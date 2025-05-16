import type { Card } from "@/store/services/queries.types";
import { localizeArkhamDBBaseUrl } from "@/utils/arkhamdb";
import { MessagesSquareIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, type Props as ButtonProps } from "../ui/button";

type Props = {
  card: Card;
  children: React.ReactNode;
  hash?: string;
} & ButtonProps<"a">;

export function CardArkhamDBLink(props: Props) {
  const { card, children, hash, ...rest } = props;

  if (!card.official) return null;

  return (
    <Button
      {...rest}
      as="a"
      href={`${localizeArkhamDBBaseUrl()}/card/${card.code}${hash ? `#${hash}` : ""}`}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </Button>
  );
}

export function CardReviewsLink(props: Omit<Props, "children">) {
  const { t } = useTranslation();

  return (
    <CardArkhamDBLink hash="reviews-header" {...props}>
      <MessagesSquareIcon />
      {t("card_modal.actions.reviews")}
    </CardArkhamDBLink>
  );
}
