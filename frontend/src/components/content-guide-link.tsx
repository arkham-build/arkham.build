import { pdfUrlAtPage } from "@/utils/content";
import { Button } from "./ui/button";
import css from "./content-guide-link.module.css";

export function ContentGuideLink({
  children,
  page,
  url,
}: {
  children: React.ReactNode;
  page?: number | null;
  url: string;
}) {
  return (
    <Button
      as="a"
      className={css["button"]}
      href={pdfUrlAtPage(url, page)}
      rel="noreferrer"
      size="sm"
      target="_blank"
      variant="bare"
    >
      <span className={css["label"]}>{children}</span>
      <span className={css["pdf-icon"]}>PDF</span>
    </Button>
  );
}
