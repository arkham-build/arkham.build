import { parseCardTextHtml } from "@/utils/card-utils";

type Props = {
  children: string;
};

export function CardTagLabel({ children }: Props) {
  return (
    <span
      // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by parseCardTextHtml.
      dangerouslySetInnerHTML={{
        __html: parseCardTextHtml(children, { newLines: "skip" }),
      }}
    />
  );
}
