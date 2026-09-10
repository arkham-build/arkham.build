import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabUrlState } from "@/components/ui/tabs.hooks";
import { AppLayout } from "@/layouts/app-layout";
import { RulesChapterOne } from "./rules-chapter-one";
import { RulesChapterTwo } from "./rules-chapter-two";
import "./rules-reference.css";

function RulesReference() {
  const { t } = useTranslation();
  const [activeTab, onTabChangeUrl] = useTabUrlState("chapter_2");

  const onTabChange = useCallback(
    (value: string) => {
      onTabChangeUrl(value);
    },
    [onTabChangeUrl],
  );

  useEffect(() => {
    if (window.location.hash.startsWith("#grimoire-")) {
      onTabChangeUrl("chapter_2");
    }
  }, [onTabChangeUrl]);

  return (
    <AppLayout title={t("rules.title")}>
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value="chapter_1" onTabChange={onTabChange}>
            {t("settings.collection.chapter", { number: 1 })}
          </TabsTrigger>
          <TabsTrigger value="chapter_2" onTabChange={onTabChange}>
            {t("settings.collection.chapter", { number: 2 })}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="chapter_1">
          <RulesChapterOne />
        </TabsContent>
        <TabsContent value="chapter_2">
          <RulesChapterTwo />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

export default RulesReference;
