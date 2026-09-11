import type { Scenario } from "@arkham-build/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import EncounterIcon from "@/components/icons/encounter-icon";
import PackIcon from "@/components/icons/pack-icon";
import { MediaCard } from "@/components/ui/media-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabUrlState } from "@/components/ui/tabs.hooks";
import { AppLayout } from "@/layouts/app-layout";
import { useStore } from "@/store";
import {
  type CampaignListEntry,
  type CampaignVersion,
  type StandaloneScenarioGroup,
  selectCampaigns,
  selectStandaloneScenarioGroups,
} from "@/store/selectors/content";
import { displayPackName } from "@/utils/formatting";
import { shortenCampaignVariantName } from "./content.helpers";
import css from "./content.module.css";
import { Button } from "@/components/ui/button";

function Content() {
  const { t } = useTranslation();
  const campaigns = useStore(selectCampaigns);
  const standaloneGroups = useStore(selectStandaloneScenarioGroups);
  const [activeTab, setActiveTab] = useTabUrlState("campaigns");
  const title = t("content.title");

  return (
    <AppLayout title={title}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="campaigns">
            {t("content.tabs.campaigns")}
          </TabsTrigger>
          <TabsTrigger value="standalone-scenarios">
            {t("content.tabs.standalone_scenarios")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          {campaigns.length ? (
            <div className={css["campaign-list"]}>
              {campaigns.map((entry) => (
                <CampaignCard entry={entry} key={entry.campaign.code} />
              ))}
            </div>
          ) : (
            <p className={css["empty"]}>{t("content.empty.campaigns")}</p>
          )}
        </TabsContent>

        <TabsContent value="standalone-scenarios">
          {standaloneGroups.length ? (
            <div className={css["standalone-list"]}>
              {standaloneGroups.map((group) => (
                <StandaloneCard group={group} key={group.cycle.code} />
              ))}
            </div>
          ) : (
            <p className={css["empty"]}>
              {t("content.empty.standalone_scenarios")}
            </p>
          )}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function CampaignCard({ entry }: { entry: CampaignListEntry }) {
  const { campaign, cycle, releaseYear, scenarios, variants } = entry;
  const versions = [{ campaign, scenarios }, ...variants];
  const [activeVersion, setActiveVersion] = useState(campaign.code);

  return (
    <MediaCard
      bannerAlt={`${displayPackName(campaign)} backdrop`}
      bannerUrl={`/assets/cycles/${cycle.code}.avif`}
      classNames={{ content: css["campaign-content"] }}
      title={
        <div className={css["media-card-title"]}>
          <span className={css["media-card-name"]}>
            <PackIcon code={campaign.code} />
            {displayPackName(campaign)}
          </span>
          {releaseYear != null && (
            <time className={css["release-year"]} dateTime={`${releaseYear}`}>
              {releaseYear}
            </time>
          )}
        </div>
      }
    >
      {variants.length ? (
        <CampaignVersions
          activeVersion={activeVersion}
          campaignName={displayPackName(campaign)}
          setActiveVersion={setActiveVersion}
          versions={versions}
        />
      ) : (
        <ScenarioList scenarios={scenarios} />
      )}
    </MediaCard>
  );
}

function StandaloneCard({ group }: { group: StandaloneScenarioGroup }) {
  const { t } = useTranslation();
  const { cycle, yearGroups } = group;

  return (
    <MediaCard
      bannerAlt={`${displayPackName(cycle)} backdrop`}
      bannerUrl={`/assets/cycles/${cycle.code}.avif`}
      title={
        <div className={css["media-card-title"]}>
          <span className={css["media-card-name"]}>
            <PackIcon code={cycle.code} />
            {displayPackName(cycle)}
          </span>
        </div>
      }
    >
      {yearGroups.map(({ releaseYear, scenarios }) => (
        <section
          className={css["scenario-year-group"]}
          key={releaseYear ?? "unknown"}
        >
          <h3 className={css["scenario-year"]}>
            {releaseYear ?? t("content.unknown_release_year")}
          </h3>
          <ScenarioList scenarios={scenarios} />
        </section>
      ))}
    </MediaCard>
  );
}

function CampaignVersions({
  activeVersion,
  campaignName,
  setActiveVersion,
  versions,
}: {
  activeVersion: string;
  campaignName: string;
  setActiveVersion: (value: string) => void;
  versions: CampaignVersion[];
}) {
  return (
    <Tabs value={activeVersion} onValueChange={setActiveVersion}>
      <TabsList className={css["variant-tabs"]}>
        {versions.map(({ campaign }) => (
          <TabsTrigger key={campaign.code} value={campaign.code}>
            <PackIcon className={css["campaign-icon"]} code={campaign.code} />
            <span>
              {campaign.variant_of_code != null
                ? shortenCampaignVariantName(
                    displayPackName(campaign),
                    campaignName,
                  )
                : displayPackName(campaign)}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
      {versions.map(({ campaign, scenarios }) => (
        <TabsContent key={campaign.code} value={campaign.code}>
          <ScenarioList scenarios={scenarios} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function ScenarioList({ scenarios }: { scenarios: Scenario[] }) {
  return (
    <ol className={css["scenario-list"]}>
      {scenarios.map((scenario) => (
        <li key={scenario.code}>
          <Button
            as="a"
            className={css["scenario"]}
            href={`/scenario/${scenario.code}`}
            variant="bare"
            full
          >
            <span className={css["scenario-icon"]}>
              <EncounterIcon code={scenario.code} />
            </span>
            <span>{displayPackName(scenario)}</span>
          </Button>
        </li>
      ))}
    </ol>
  );
}

export default Content;
