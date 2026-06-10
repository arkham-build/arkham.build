import { ChevronLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/layouts/app-layout";
import { cx } from "@/utils/cx";
import { useGoBack } from "@/utils/use-go-back";
import css from "./legal-page.module.css";

function Privacy() {
  const goBack = useGoBack();

  return (
    <AppLayout title="Privacy Policy">
      <article className={cx("longform", css["legal-page"])}>
        <Button onClick={goBack} variant="bare">
          <ChevronLeftIcon /> Back
        </Button>
        <h1>Privacy Policy</h1>
        <p className={css["meta"]}>Last updated: June 10, 2026</p>

        <h2>Controller</h2>
        <p>
          arkham.build is operated by Felix Spöttel, Germany. For privacy
          questions or GDPR requests, contact{" "}
          <a href="mailto:privacy@arkham.build">privacy@arkham.build</a>.
        </p>

        <h2>Personal data we process</h2>
        <p>
          We process account data such as email address, password/authentication
          data, ArkhamDB provider ID, profile data, and user-generated text or
          structured data. We also process technical data such as UUIDs in
          application logs, anonymized/redacted debug logs, and IP addresses at
          Cloudflare proxy level.
        </p>

        <h2>Purposes and legal bases</h2>
        <p>
          We process account, login, profile, saved content, export, and
          deletion data to provide arkham.build under the{" "}
          <a href="/terms">Terms of Service</a>. The legal basis is Art. 6(1)(b)
          GDPR. We process security, abuse-prevention, debugging, and
          transactional/security email data based on legitimate interests under
          Art. 6(1)(f) GDPR. Where legal obligations apply, the legal basis is
          Art. 6(1)(c) GDPR.
        </p>

        <h2>Cookies and local storage</h2>
        <p>
          We use a session cookie for authentication. We use IndexedDB for local
          user data and preferences. We do not use analytics cookies,
          advertising cookies, tracking pixels, or marketing cookies.
        </p>

        <h2>Third-party embeds</h2>
        <p>
          User-generated content may contain links or embeds to third-party
          services. Third-party embeds are not loaded automatically. If you
          choose to load an embed, the third party may process your data under
          its own privacy policy.
        </p>

        <h2>Processors</h2>
        <p>
          We use OVH Cloud for hosting/database infrastructure in Canada,
          Cloudflare for CDN/proxy services and backup object storage with
          global proxy processing and R2 storage in Western Europe, and Scaleway
          for transactional email in France.
        </p>

        <h2>International transfers</h2>
        <p>
          Some processing may occur outside the EU/EEA, including OVH Cloud
          hosting in Canada and Cloudflare global infrastructure. We rely on
          adequacy decisions where applicable and Standard Contractual Clauses
          or equivalent safeguards where required.
        </p>

        <h2>Retention</h2>
        <p>
          Account data is kept while your account exists. If you delete your
          account, private user content is deleted and public contributions are
          anonymized. Debug logs are retained for 30 days. Backups are retained
          for up to 365 days. Inactive accounts are not deleted automatically.
        </p>

        <h2>Your rights</h2>
        <p>
          Subject to GDPR conditions, you may request access, export,
          correction, deletion, restriction, or objection to processing. Data
          export, profile/email correction, password reset/change, OAuth
          disconnect, and account deletion are available as self-service
          features where provided. For manual requests, contact{" "}
          <a href="mailto:privacy@arkham.build">privacy@arkham.build</a>. You
          may also complain to your competent data protection authority.
        </p>

        <h2>Children</h2>
        <p>
          You must be old enough to consent to the processing of your personal
          data under the laws that apply to you.
        </p>

        <h2>Security</h2>
        <p>
          We use measures such as HTTPS, access controls, password protection,
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
