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
        <p className={css["meta"]}>Last updated: June 11, 2026</p>

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
          You may use arkham.build only if you are legally allowed to agree to
          these Terms.
        </p>

        <h2>Accounts</h2>
        <p>
          You are responsible for keeping your account credentials secure and
          for activity under your account. You must provide accurate account
          identifiers and may not use another person’s account without
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
          You may connect or sign in with ArkhamDB. Syncing selected content is
          optional and only happens when you request it. Synced content is
          handled by ArkhamDB.
        </p>

        <h2>Acceptable use</h2>
        <p>
          You must not misuse the service, attempt unauthorized access, disrupt
          the service, upload unlawful content, harass others, impersonate
          others, or infringe the rights of others. To report abuse, contact{" "}
          <a href={`mailto:${adminEmail}`}>{adminEmail}</a> with the relevant
          URL or ID and a short description.
        </p>

        <h2>Moderation and admin actions</h2>
        <p>
          We may review content or accounts, remove or restrict content, and
          suspend or delete accounts when needed to operate the service, prevent
          abuse, or enforce these Terms.
        </p>

        <h2>Account deletion</h2>
        <p>
          You may delete your account where self-service deletion is available.
          Accounts with no activity for two years are deleted automatically.
          Private user content is deleted, public contributions are anonymized,
          and backup copies expire through the normal backup retention process.
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
          <a href="/privacy">Privacy Policy</a> explains how data is processed.
        </p>
      </article>
    </AppLayout>
  );
}

export default Terms;
