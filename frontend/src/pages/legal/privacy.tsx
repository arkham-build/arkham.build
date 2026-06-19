import { ChevronLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/layouts/app-layout";
import { cx } from "@/utils/cx";
import { useGoBack } from "@/utils/use-go-back";
import css from "./legal-page.module.css";

function Privacy() {
  const goBack = useGoBack();
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;

  return (
    <AppLayout title="Privacy Policy">
      <article className={cx("longform", css["legal-page"])}>
        <Button onClick={goBack} variant="bare">
          <ChevronLeftIcon /> Back
        </Button>
        <h1>Privacy Policy</h1>
        <p className={css["meta"]}>Last updated: June 19, 2026</p>

        <h2>Controller</h2>
        <p>
          Controller: Felix Spöttel ({adminEmail}), Germany. See the{" "}
          <a href="/legal-notice">Legal Notice</a> for legal notice information.
        </p>

        <h2>Data we process</h2>
        <p>
          We process only the data needed to operate arkham.build: email
          address, username, password hash, ArkhamDB provider ID, session
          identifiers, UUIDs in application logs, and IP addresses at Cloudflare
          proxy level. If you contact us or report abuse, we process your
          message, related content or account identifiers, timestamps, and
          moderation notes or actions.
        </p>

        <h2>Purposes and legal bases</h2>
        <p>
          We process account, login, profile, and account deletion data to
          provide arkham.build under the <a href="/terms">Terms of Service</a>.
          We process security, abuse-prevention, debugging, service email, abuse
          reports, and moderation records based on our legitimate interests
          under Art. 6(1)(f) GDPR.
        </p>

        <h2>Cookies, local storage, and anti-abuse checks</h2>
        <p>
          We use a session cookie for authentication. We use IndexedDB for local
          user data and preferences.
        </p>
        <p>
          We use Cloudflare Turnstile on signup to protect the service from spam
          and abuse. Cloudflare may process technical data such as your IP
          address, browser and device signals, and interaction data for this
          security purpose.
        </p>

        <h2>Third-party embeds</h2>
        <p>
          User-generated content may contain external links, images, or embeds.
          External images may load automatically; embeds are only loaded if you
          choose to load them. We set a no-referrer policy where supported. The
          third-party provider may process technical data under its own privacy
          policy.
        </p>

        <h2>Processors</h2>
        <p>
          We use Netcup GmbH for hosting/database infrastructure in the US,
          Cloudflare for CDN, proxy, object storage and anti-abuse services, and
          Scaleway for transactional email in France.
        </p>

        <h2>International transfers</h2>
        <p>
          Some processing may occur outside the EU/EEA, including Netcup GmbH
          hosting in the US and Cloudflare global infrastructure. We rely on
          adequacy decisions where applicable and Standard Contractual Clauses
          or equivalent safeguards where required.
        </p>

        <h2>Retention</h2>
        <p>
          Account data is kept while your account exists. If you delete your
          account, private user content is deleted and public contributions are
          anonymized. Debug logs are retained for 30 days. Abuse reports and
          moderation records are kept only as long as needed to handle abuse,
          protect the service, or meet legal obligations. Backups are retained
          for up to 365 days. Accounts with no activity for two years are
          deleted automatically.
        </p>

        <h2>Your rights</h2>
        <p>
          Subject to GDPR conditions, you may request access, export,
          correction, deletion, restriction, or objection to processing. Data
          export, profile/email correction, password reset/change, OAuth
          disconnect, and account deletion are available as self-service
          features where provided. For manual requests, contact{" "}
          <a href={`mailto:${adminEmail}`}>{adminEmail}</a>. You may also
          complain to your competent data protection authority.
        </p>

        <h2>Security</h2>
        <p>
          We use measures such as HTTPS, access controls, password hashing,
          admin action logging, and redacted/anonymized logs to protect user
          data.
        </p>

        <h2>Changes</h2>
        <p>
          We may update this Privacy Policy when the service or legal
          requirements change. The current version is published on this page.
        </p>
      </article>
    </AppLayout>
  );
}

export default Privacy;
