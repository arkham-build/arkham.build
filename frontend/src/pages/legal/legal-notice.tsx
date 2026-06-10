import { ChevronLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/layouts/app-layout";
import { cx } from "@/utils/cx";
import { parseMarkdown } from "@/utils/markdown";
import { useGoBack } from "@/utils/use-go-back";
import css from "./legal-page.module.css";

function LegalNotice() {
  const goBack = useGoBack();
  const legalNotice = parseMarkdown(import.meta.env.VITE_LEGAL_NOTICE);

  return (
    <AppLayout title="Legal Notice">
      <article className={cx("longform", css["legal-page"])}>
        <Button onClick={goBack} variant="bare">
          <ChevronLeftIcon /> Back
        </Button>
        <h1>Legal Notice</h1>
        <div
          className={css["longform"]}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: safe.
          dangerouslySetInnerHTML={{
            __html: legalNotice,
          }}
        />

        <h4>Liability Disclaimer</h4>
        <p>
          <b>Limitation of liability for internal content</b>
        </p>
        <p>
          The content of our website has been compiled with meticulous care and
          to the best of our knowledge. However, we cannot assume any liability
          for the up-to-dateness, completeness or accuracy of any of the pages.
        </p>
        <p>
          Pursuant to section 7, para. 1 of the TMG (Telemediengesetz – Tele
          Media Act by German law), we as service providers are liable for our
          own content on these pages in accordance with general laws. However,
          pursuant to sections 8 to 10 of the TMG, we as service providers are
          not under obligation to monitor external information provided or
          stored on our website. Once we have become aware of a specific
          infringement of the law, we will immediately remove the content in
          question. Any liability concerning this matter can only be assumed
          from the point in time at which the infringement becomes known to us.
        </p>
        <p>
          <b>Limitation of liability for external links</b>
        </p>
        <p>
          Our website contains links to the websites of third parties („external
          links“). As the content of these websites is not under our control, we
          cannot assume any liability for such external content. In all cases,
          the provider of information of the linked websites is liable for the
          content and accuracy of the information provided. At the point in time
          when the links were placed, no infringements of the law were
          recognisable to us. As soon as an infringement of the law becomes
          known to us, we will immediately remove the link in question.
        </p>
      </article>
    </AppLayout>
  );
}

export default LegalNotice;
