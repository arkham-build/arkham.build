import { parseCardTextHtml } from "@/utils/card-utils";

type Props = {
  children: string;
};

export function CardTagLabel({ children }: Props) {
  return (
    <span
      // oxlint-disable-next-line react/no-danger -- SAFETY: escaped
      dangerouslySetInnerHTML={{
        __html: parseCardTextHtml(children, { newLines: "skip" }),
      }}
    />
  );
}
