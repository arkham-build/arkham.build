import DOMPurify from "dompurify";
import { ChevronDown } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import type { ResolvedCard } from "@/store/lib/types";
import { queryFaq } from "@/store/services/queries";
import { useQuery } from "@/utils/use-query";

import css from "./faq.module.css";

import { Button } from "../../components/ui/button";

type Props = {
  card: ResolvedCard["card"];
};

export function Faq({ card }: Props) {
  const [open, setOpen] = useState(false);

  const query = useMemo(
    () => (open ? () => queryFaq(card.code) : undefined),
    [card.code, open],
  );

  const response = useQuery(query);

  const redirectRelativeLinks = useCallback((evt: React.MouseEvent) => {
    evt.preventDefault();
    if (evt.target instanceof HTMLAnchorElement) {
      // Redirect relative links to another domain
      const href = evt.target.getAttribute("href");
      if (href?.startsWith("/")) {
        window.open(`https://arkhamdb.com${href}`, "_blank");
      }
    }
  }, []);

  return (
    <details className={css["faq"]}>
      <Button as="summary" onClick={() => setOpen((p) => !p)} size="full">
        {open ? <ChevronDown /> : <span>?</span>} View FAQs
      </Button>

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: TODO. */}
      <div className={css["faq-content"]} onClick={redirectRelativeLinks}>
        {response.loading && "Loading..."}

        {!!response.error && "Error loading FAQ entries."}

        {response.data?.length === 0 && "No FAQ entries."}

        {!!response.data?.length &&
          response.data.map((faq, i) => (
            <p
              // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is sanitized.
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(faq.html) }}
              // biome-ignore lint/suspicious/noArrayIndexKey: order is stable.
              key={i}
            />
          ))}
      </div>
    </details>
  );
}
