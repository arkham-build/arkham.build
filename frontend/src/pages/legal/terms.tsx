import { ChevronLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/layouts/app-layout";
import { cx } from "@/utils/cx";
import { useGoBack } from "@/utils/use-go-back";
import css from "./legal-page.module.css";

function Terms() {
  const goBack = useGoBack();
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;

  return (
    <AppLayout title="Terms of Service">
      <article className={cx("longform", css["legal-page"])}>
        <Button onClick={goBack} variant="bare">
          <ChevronLeftIcon /> Back
        </Button>
        <h1>Terms of Service</h1>
        <p className={css["meta"]}>Last updated: June 10, 2026</p>

        <p>
          arkham.build is operated by Felix Spöttel ({adminEmail}). See the{" "}
          <a href="/legal-notice">Legal Notice</a> for legal notice information.
        </p>

        <h2>Service</h2>
        <p>
          arkham.build provides tools for Arkham Horror: The Card Game deck
          building, collection management, and related community features. The
          service is a fan project and is not produced, endorsed, or affiliated
          with Fantasy Flight Games.
        </p>

        <h2>Eligibility</h2>
        <p>
          You may use arkham.build only if you are old enough to consent under
          the laws that apply to you.
        </p>

        <h2>Accounts</h2>
        <p>
          You are responsible for keeping your account credentials secure and
          for activity under your account. You must provide accurate account
          information and may not use another person’s account without
          permission.
        </p>

        <h2>User-generated content</h2>
        <p>
          You are responsible for the content you create or publish. Private
          content is only intended for your account. Public contributions may be
          visible to other users and may remain available after account deletion
          in anonymized form.
        </p>

        <h2>ArkhamDB integration</h2>
        <p>
          You may connect or sign in with ArkhamDB. Syncing selected content
          with ArkhamDB is optional and only happens when you request it. Synced
          content is handled by ArkhamDB.
        </p>

        <h2>Acceptable use</h2>
        <p>
          You must not misuse the service, attempt unauthorized access, disrupt
          the service, upload unlawful content, harass others, impersonate
          others, or infringe the rights of others.
        </p>

        <h2>Reporting abuse</h2>
        <p>
          If you believe content or account activity on arkham.build is abusive,
          unlawful, infringing, or otherwise violates these Terms, contact{" "}
          <a href={`mailto:${adminEmail}`}>{adminEmail}</a>. Include the URL or
          ID of the content or account and a short description of the issue.
        </p>

        <h2>Moderation and admin actions</h2>
        <p>
          We may review content or accounts when needed to operate the service,
          handle abuse reports, prevent abuse, or enforce these Terms. We may
          hide, remove, or restrict content, and may suspend or delete accounts.
          Moderation and admin actions are logged.
        </p>

        <h2>Account deletion</h2>
        <p>
          You may delete your account where self-service deletion is available.
          Private user content is deleted, public contributions are anonymized,
          sessions are invalidated, and connected OAuth accounts are
          disconnected where applicable. Backup copies expire through the normal
          backup retention process.
        </p>

        <h2>Availability</h2>
        <p>
          The service is provided without a guarantee of uninterrupted
          availability. Features may change, be limited, or be discontinued.
        </p>

        <h2>Liability</h2>
        <p>
          To the extent permitted by German and EU law, arkham.build is provided
          without warranties and liability is limited to legally required cases.
        </p>

        <h2>Governing law</h2>
        <p>
          These Terms are governed by German law, subject to mandatory consumer
          protection rules that may apply in your country.
        </p>

        <h2>Changes</h2>
        <p>
          We may update these Terms when the service or legal requirements
          change. The current version is published on this page. The{" "}
          <a href="/privacy">Privacy Policy</a> explains how personal data is
          processed.
        </p>
      </article>
    </AppLayout>
  );
}

export default Terms;
