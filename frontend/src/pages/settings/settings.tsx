import type { Settings as SettingsState } from "@arkham-build/shared";
import { featherText } from "@lucide/lab";
import {
  DatabaseBackupIcon,
  Icon,
  LibraryIcon,
  SlidersVerticalIcon,
  UserIcon,
} from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useSearch } from "wouter";
import { CollectionSettings } from "@/components/collection/collection";
import { FanMadeContent } from "@/components/fan-made-content/fan-made-content";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabUrlState } from "@/components/ui/tabs.hooks";
import { AppLayout } from "@/layouts/app-layout";
import { useStore } from "@/store";
import { selectSession } from "@/store/selectors/auth";
import { useColorThemeManager } from "@/utils/use-color-theme";
import { useGoBack } from "@/utils/use-go-back";
import { AccountSettings } from "./account-settings";
import { CardDataSync } from "./card-data-sync";
import { CardDisplaySettings } from "./card-display";
import { CardModalPopularDecksSetting } from "./card-modal-popular-decks";
import { DataExport } from "./data-export";
import { DefaultEnvironmentSetting } from "./default-environment";
import { DevModeSetting } from "./dev-mode";
import { FontSizeSetting } from "./font-size";
import { ListSettings } from "./list-settings";
import { LocaleSetting } from "./locale-setting";
import { MetadataRefresh } from "./metadata-refresh";
import { Section } from "./section";
import css from "./settings.module.css";
import { ShowAllCardsSetting } from "./show-all-cards";
import { ShowMoveToSideDeckSetting } from "./show-move-to-side-deck";
import { ShowPreviewsSetting } from "./show-previews";
import { SortPunctuationSetting } from "./sort-punctuation-setting";
import { TabooSetSetting } from "./taboo-set";
import { ThemeSetting } from "./theme";
import { useSaveSettings } from "./use-save-settings";
import { WeaknessPoolSetting } from "./weakness-pool";

function Settings() {
  const settings = useStore((state) => state.settings);
  const session = useStore(selectSession);
  const [colorTheme, updateColorTheme] = useColorThemeManager();
  const { t } = useTranslation();
  const [tab, onTabChange] = useTabUrlState("general");
  const search = useSearch();
  const goBack = useGoBack(search.includes("login_state") ? "/" : undefined);

  return (
    <AppLayout title={t("settings.title")} mainClassName={css["main"]}>
      <header className={css["header"]}>
        <h1 className={css["title"]}>{t("settings.title")}</h1>

        <div id="settings-header-portal" />

        <div className={css["header-actions"]}>
          <Button
            data-testid="settings-back"
            onClick={goBack}
            type="button"
            variant="bare"
          >
            {t("common.back")}
          </Button>
          <div id="settings-header-action-portal" />
        </div>
      </header>

      <div className={css["container"]}>
        <Tabs value={tab} onValueChange={onTabChange}>
          <TabsList>
            {session && (
              <TabsTrigger data-testid="tab-account" value="account">
                <UserIcon />
                <span>{t("settings.account.title")}</span>
              </TabsTrigger>
            )}
            <TabsTrigger data-testid="tab-general" value="general">
              <SlidersVerticalIcon />
              <span>{t("settings.general.title")}</span>
            </TabsTrigger>
            <TabsTrigger data-testid="tab-collection" value="collection">
              <LibraryIcon />
              <span>{t("settings.collection.title")}</span>
            </TabsTrigger>
            <TabsTrigger data-testid="tab-fan-made" value="fan-made-content">
              <Icon iconNode={featherText} />
              <span>{t("fan_made_content.title")}</span>
            </TabsTrigger>
            <TabsTrigger data-testid="tab-support" value="support">
              <DatabaseBackupIcon />
              <span>{t("settings.support.title")}</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="account">
            <AccountSettings
              key={session?.account.name ?? ""}
              session={session}
            />
          </TabsContent>
          <ApplicationSettings
            colorTheme={colorTheme}
            key={`${settingsKey(settings)}-${colorTheme}`}
            settings={settings}
            updateColorTheme={updateColorTheme}
          />
        </Tabs>
      </div>
    </AppLayout>
  );
}

function ApplicationSettings({
  colorTheme: persistedColorTheme,
  settings: persistedSettings,
  updateColorTheme,
}: {
  colorTheme: string;
  settings: SettingsState;
  updateColorTheme: (theme: string) => void;
}) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(structuredClone(persistedSettings));
  const [theme, setTheme] = useState<string>(persistedColorTheme);

  const { saveSettings } = useSaveSettings({
    settings,
    theme,
    updateColorTheme,
  });

  const onSubmit = async (evt: React.SubmitEvent<HTMLFormElement>) => {
    evt.preventDefault();
    await saveSettings();
  };

  return (
    <form id="settings-form" onSubmit={onSubmit}>
      <TabsContent value="general">
        <PortaledSaveButton />
        <Section title={t("settings.general.title")}>
          <DefaultEnvironmentSetting
            settings={settings}
            setSettings={setSettings}
          />
          <TabooSetSetting settings={settings} setSettings={setSettings} />
          <WeaknessPoolSetting settings={settings} setSettings={setSettings} />
        </Section>
        <Section title={t("settings.display.title")}>
          <LocaleSetting settings={settings} setSettings={setSettings} />
          <ThemeSetting setTheme={setTheme} theme={theme} />
          <FontSizeSetting settings={settings} setSettings={setSettings} />
          <CardDisplaySettings settings={settings} setSettings={setSettings} />
          <SortPunctuationSetting
            settings={settings}
            setSettings={setSettings}
          />
          <ShowMoveToSideDeckSetting
            settings={settings}
            setSettings={setSettings}
          />
          <CardModalPopularDecksSetting
            settings={settings}
            setSettings={setSettings}
          />
        </Section>
        <Section title={t("settings.lists.title")}>
          <div className={css["lists"]}>
            <ListSettings
              listKey="player"
              title={t("common.player_cards")}
              settings={settings}
              setSettings={setSettings}
            />
            <ListSettings
              listKey="encounter"
              title={t("common.encounter_cards")}
              settings={settings}
              setSettings={setSettings}
            />
            <ListSettings
              listKey="mixed"
              title={t("lists.all_cards")}
              settings={settings}
              setSettings={setSettings}
            />
            <ListSettings
              listKey="investigator"
              title={t("common.type.investigator", { count: 2 })}
              settings={settings}
              setSettings={setSettings}
            />
            <ListSettings
              listKey="deck"
              title={t("settings.lists.deck_view")}
              settings={settings}
              setSettings={setSettings}
            />
            <ListSettings
              listKey="deckScans"
              title={t("settings.lists.deck_view_scans")}
              settings={settings}
              setSettings={setSettings}
            />
          </div>
        </Section>
      </TabsContent>
      <TabsContent value="collection">
        <PortaledSaveButton />
        <Section title={t("settings.collection.title")}>
          <ShowPreviewsSetting settings={settings} setSettings={setSettings} />
          <ShowAllCardsSetting settings={settings} setSettings={setSettings} />
          <CollectionSettings settings={settings} setSettings={setSettings} />
        </Section>
      </TabsContent>
      <TabsContent value="fan-made-content">
        <PortaledSaveButton />
        <Section title={t("fan_made_content.title")}>
          <FanMadeContent settings={settings} setSettings={setSettings} />
        </Section>
      </TabsContent>
      <TabsContent value="support">
        <PortaledSaveButton />
        <Section title={t("settings.support.metadata_title")}>
          <CardDataSync />
          <MetadataRefresh />
        </Section>
        <Section title={t("settings.developer.title")}>
          <DevModeSetting settings={settings} setSettings={setSettings} />
        </Section>
        <Section title={t("settings.support.data_export_title")}>
          <DataExport />
        </Section>
      </TabsContent>
    </form>
  );
}

function PortaledSaveButton() {
  const { t } = useTranslation();
  const target = document.getElementById("settings-header-action-portal");

  if (!target) {
    return null;
  }

  return createPortal(
    <Button
      data-testid="settings-save"
      form="settings-form"
      type="submit"
      variant="primary"
    >
      {t("settings.save")}
    </Button>,
    target,
  );
}

function settingsKey(settings: SettingsState): string {
  return JSON.stringify(settings);
}

export default Settings;
