import type {
  Campaign,
  Card,
  Scenario as ScenarioData,
} from "@arkham-build/shared";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "wouter";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import EncounterIcon from "@/components/icons/encounter-icon";
import PackIcon from "@/components/icons/pack-icon";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ListLayoutContextProvider } from "@/layouts/list-layout-context-provider";
import { ListLayoutNoSidebar } from "@/layouts/list-layout-no-sidebar";
import { useStore } from "@/store";
import { selectScenarioByCode } from "@/store/selectors/content";
import { selectMetadata } from "@/store/selectors/shared";
import { assert } from "@/utils/assert";
import { displayPackName } from "@/utils/formatting";
import { ErrorStatus } from "../errors/404";
import css from "./scenario.module.css";

function Scenario() {
  const { code } = useParams();
  const scenario = useStore((state) => selectScenarioByCode(state, code));
  const campaign = useStore((state) =>
    scenario?.campaign_code
      ? selectMetadata(state).campaigns[scenario.campaign_code]
      : undefined,
  );

  if (!scenario) {
    return <ErrorStatus statusCode={404} />;
  }

  assert(
    scenario.campaign_code == null || campaign,
    `Scenario ${scenario.code} references missing campaign ${scenario.campaign_code}`,
  );

  return <ScenarioContent campaign={campaign} scenario={scenario} />;
}

function ScenarioContent({
  campaign,
  scenario,
}: {
  campaign: Campaign | undefined;
  scenario: ScenarioData;
}) {
  const { t } = useTranslation();
  const activeListId = useStore((state) => state.activeList);
  const addList = useStore((state) => state.addList);
  const removeList = useStore((state) => state.removeList);
  const setActiveList = useStore((state) => state.setActiveList);

  const listKey = `scenario-${scenario.code}`;
  const listExists = useStore((state) => state.lists[listKey] != null);

  useEffect(() => {
    if (!listExists) {
      addList(
        listKey,
        {
          card_type: "encounter",
          fan_made_content: "all",
          ownership: "all",
        },
        {
          displaySettingsKey: "scenario",
          filters: [
            "type",
            "trait",
            "card_tags",
            "subtype",
            "action",
            "encounter_set",
            "illustrator",
          ],
          systemFilter: (card) => isCardUsedInScenario(card, scenario),
        },
      );
    }

    setActiveList(listKey);
  }, [addList, listExists, listKey, scenario, setActiveList]);

  useEffect(() => {
    return () => {
      removeList(listKey);
      setActiveList(undefined);
    };
  }, [listKey, removeList, setActiveList]);

  if (!listExists || activeListId !== listKey) return null;

  const title = displayPackName(scenario);

  return (
    <CardModalProvider>
      <ListLayoutContextProvider>
        <ListLayoutNoSidebar
          getListCardProps={getScenarioListCardProps}
          headerTop={
            <Breadcrumb
              items={[
                { href: "/content", label: t("content.title") },
                ...(campaign
                  ? [
                      {
                        icon: <PackIcon code={campaign.code} />,
                        label: displayPackName(campaign),
                      },
                    ]
                  : []),
              ]}
            />
          }
          omitBackButton
          title={
            <span className={css["title"]}>
              <EncounterIcon
                className={css["title-icon"]}
                code={scenario.code}
              />
              <span>{title}</span>
            </span>
          }
          titleString={title}
        />
      </ListLayoutContextProvider>
    </CardModalProvider>
  );
}

function getScenarioListCardProps() {
  return { renderCardNameExtra: renderCardQuantity };
}

function renderCardQuantity(card: Card) {
  return (
    <span className={css["quantity"]}>
      <i className="icon-card-outline-bold" />×{card.quantity}
    </span>
  );
}

function isCardUsedInScenario(card: Card, scenario: ScenarioData) {
  if (card.encounter_code == null) return false;

  const encounterSet = scenario.encounter_sets.find(
    ({ code }) => code === card.encounter_code,
  );

  if (!encounterSet) return false;
  return encounterSet.cards == null || encounterSet.cards.includes(card.code);
}

export default Scenario;
