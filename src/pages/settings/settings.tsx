import { CollectionSettings } from "@/components/collection/collection";
import { FanMadeContentCollection } from "@/components/fan-made-content/fan-made-content-collection";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useTabUrlState,
} from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast.hooks";
import { AppLayout } from "@/layouts/app-layout";
import { useStore } from "@/store";
import { useColorThemeManager } from "@/utils/use-color-theme";
import { useGoBack } from "@/utils/use-go-back";
import { featherText } from "@lucide/lab";
import {
  DatabaseBackupIcon,
  Icon,
  LibraryIcon,
  SlidersVerticalIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearch } from "wouter";
import { BackupRestore } from "./backup-restore";
import { CardDataSync } from "./card-data-sync";
import { CardDisplaySettings } from "./card-display";
import { Connections } from "./connections";
import { FontSizeSetting } from "./font-size";
import { HideWeaknessSetting } from "./hide-weakness";
import { ListSettings } from "./list-settings";
import { LocaleSetting } from "./locale-setting";
import { Section } from "./section";
import css from "./settings.module.css";
import { ShowAllCardsSetting } from "./show-all-cards";
import { ShowMoveToSideDeckSetting } from "./show-move-to-side-deck";
import { ShowPreviewsSetting } from "./show-previews";
import { SortPunctuationSetting } from "./sort-punctuation-setting";
import { TabooSetSetting } from "./taboo-set";
import { ThemeSetting } from "./theme";
import { WeaknessPoolSetting } from "./weakness-pool";

function Settings() {
  const { t } = useTranslation();

  const [tab, onTabChange] = useTabUrlState("general");

  const search = useSearch();
  const toast = useToast();
  const goBack = useGoBack(search.includes("login_state") ? "/" : undefined);

  const updateStoredSettings = useStore((state) => state.applySettings);

  const storedSettings = useStore((state) => state.settings);
  const [settings, setSettings] = useState(structuredClone(storedSettings));

  const [storedTheme, persistColorTheme] = useColorThemeManager();
  const [theme, setTheme] = useState<string>(storedTheme);

  useEffect(() => {
    setSettings(storedSettings);
  }, [storedSettings]);

  const onSubmit = useCallback(
    async (evt: React.FormEvent) => {
      evt.preventDefault();

      const toastId = toast.show({
        children: t("settings.saving"),
        variant: "loading",
      });

      try {
        await updateStoredSettings(settings);
        persistColorTheme(theme);
        toast.dismiss(toastId);
        toast.show({
          children: t("settings.success"),
          duration: 3000,
          variant: "success",
        });
      } catch (err) {
        toast.dismiss(toastId);
        toast.show({
          children: t("settings.error", { error: (err as Error).message }),
          variant: "error",
        });
      }
    },
    [updateStoredSettings, settings, toast, t, theme, persistColorTheme],
  );

  return (
    <AppLayout title={t("settings.title")}>
      <form className={css["settings"]} onSubmit={onSubmit}>
        <header className={css["header"]}>
          <h1 className={css["title"]}>{t("settings.title")}</h1>
          <div className={css["header-actions"]}>
            <Button
              data-testid="settings-back"
              onClick={goBack}
              type="button"
              variant="bare"
            >
              {t("common.back")}
            </Button>
            <Button data-testid="settings-save" type="submit" variant="primary">
              {t("settings.save")}
            </Button>
          </div>
        </header>
        <div className={css["container"]}>
          <div className={css["row"]}>
            <Section title={t("settings.connections.title")}>
              <Connections />
            </Section>
            <Section title={t("settings.card_data.title")}>
              <CardDataSync showDetails />
            </Section>
          </div>
          <Tabs value={tab} onValueChange={onTabChange}>
            <TabsList>
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
              <TabsTrigger data-testid="tab-backup" value="backup">
                <DatabaseBackupIcon />
                <span>{t("settings.backup.title")}</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="general" forceMount>
              <Section title={t("settings.general.title")}>
                <TabooSetSetting
                  settings={settings}
                  setSettings={setSettings}
                />
                <WeaknessPoolSetting
                  settings={settings}
                  setSettings={setSettings}
                />
              </Section>
              <Section title={t("settings.display.title")}>
                <LocaleSetting settings={settings} setSettings={setSettings} />
                <ThemeSetting setTheme={setTheme} theme={theme} />
                <FontSizeSetting
                  settings={settings}
                  setSettings={setSettings}
                />
                <CardDisplaySettings
                  settings={settings}
                  setSettings={setSettings}
                />
                <HideWeaknessSetting
                  settings={settings}
                  setSettings={setSettings}
                />
                <SortPunctuationSetting
                  settings={settings}
                  setSettings={setSettings}
                />
                <ShowMoveToSideDeckSetting
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
            <TabsContent value="collection" forceMount>
              <Section title={t("settings.collection.title")}>
                <ShowPreviewsSetting
                  settings={settings}
                  setSettings={setSettings}
                />
                <ShowAllCardsSetting
                  settings={settings}
                  setSettings={setSettings}
                />
                <CollectionSettings
                  settings={settings}
                  setSettings={setSettings}
                />
              </Section>
            </TabsContent>
            <TabsContent value="fan-made-content" forceMount>
              <Section title={t("fan_made_content.title")}>
                <FanMadeContentCollection />
              </Section>
            </TabsContent>
            <TabsContent value="backup" forceMount>
              <Section title={t("settings.backup.title")}>
                <BackupRestore />
              </Section>
            </TabsContent>
          </Tabs>
        </div>
      </form>
    </AppLayout>
  );
}

export default Settings;
