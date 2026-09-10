import { useLocation } from "wouter";
import { Masthead } from "@/components/masthead";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";
import { useStore } from "@/store";
import { cx } from "@/utils/cx";
import css from "./account-migration.module.css";

function AccountMigration() {
  const setFlag = useStore((state) => state.setFlag);
  const [, setLocation] = useLocation();

  async function continueLocally() {
    await clearMigrationNeeded();
    setLocation("/");
  }

  async function login() {
    await clearMigrationNeeded();
    setLocation("/auth/signup");
  }

  async function clearMigrationNeeded() {
    await setFlag("migrationNeeded", false);
  }

  const title = "Accounts are here";

  return (
    <main className={css["layout"]}>
      <PageTitle>{title}</PageTitle>
      <header className={css["header"]}>
        <div className={css["header-nav"]}>
          <Masthead hideLocaleSwitch invert />
        </div>
        <div className={css["header-backdrop"]}>
          <img
            src="/assets/blog/login_bg.avif"
            alt="Account migration banner"
            style={{
              objectFit: "cover",
              objectPosition: "50% 66%",
            }}
          />
        </div>
        <div className={css["header-title"]}>
          <p>arkham.build</p>
          <h1>{title}</h1>
        </div>
      </header>

      <article className={cx("longform", css["content"])}>
        <p>
          arkham.build now has its own account system. With an account, you can
          sync your decks, settings, collection, folders, and ArkhamDB
          connection across devices.
        </p>
        <p>
          Accounts are <b>optional</b>. You can still use the app without an
          account, just like before. We think most users will benefit from
          creating one, and some future features, such as card reviews, will
          require an account. But the core functionality will continue to work
          without one.
        </p>
        <hr />
        <h4>What changes?</h4>
        <p>
          <b>
            <i className="icon-guide_bullet" /> Settings, collection, and
            folders now sync between devices
          </b>
        </p>
        <p>
          These are now synced through your account. Fan-made content is not
          included and still needs to be installed separately on each device.
        </p>
        <p>
          <b>
            <i className="icon-guide_bullet" /> ArkhamDB sync is now part of
            your account
          </b>
        </p>
        <p>
          When creating an account, you can either sign in with ArkhamDB
          directly or create an email-based account and connect ArkhamDB later
          in settings. An account is now required to use the ArkhamDB sync.
        </p>
        <p>
          <b>
            <i className="icon-guide_bullet" /> Shares have been replaced by
            account decks
          </b>
          <br />
        </p>
        <p>
          The old “shares” system no longer exists. Your existing shares have
          been converted to local decks that are only saved on this device.
        </p>
        <p>
          After you create an account, the app will offer to upload all locally
          saved decks to your account. Once uploaded, they become account decks:
          they sync to your other devices and can be shared again with a link or
          deck ID.
        </p>
        <p>
          Old share URLs will keep working, so public links and ongoing game
          sessions do not break. However, old shares can no longer be created,
          updated, or deleted.
        </p>
        <hr />
        <p>
          And that's all. You can create an account now, or continue using the
          app locally. If you already created an account on another device,
          choose <b>Continue locally</b> first, then sign in from the app.
        </p>
        <div className={css["actions"]}>
          <Button onClick={continueLocally}>Continue locally</Button>
          <Button onClick={login} variant="primary">
            Create your account
          </Button>
        </div>
        <p>
          <em>
            Artwork: Card art “Eager for Death”,{" "}
            <i className="icon-paintbrush" /> Frej Agelii
          </em>
        </p>
      </article>
    </main>
  );
}

export default AccountMigration;
