import type { Card } from "@arkham-build/shared";
import { Trans, useTranslation } from "react-i18next";
import { createSelector } from "reselect";
import { useStore } from "@/store";
import { selectLookupTables, selectMetadata } from "@/store/selectors/shared";
import type { StoreState } from "@/store/slices";
import { displayAttribute } from "@/utils/card-utils";
import { displayPackName } from "@/utils/formatting";
import EncounterIcon from "../icons/encounter-icon";
import { PlaneContainer } from "../ui/plane-container";
import { DefaultTooltip } from "../ui/tooltip";
import css from "./card-scenarios.module.css";

type Props = {
  card: Card;
};

export function CardScenarios({ card }: Props) {
  const { t } = useTranslation();

  const scenarios = useStore((state) =>
    selectScenariosForEncounterCode(state, card),
  );

  return (
    <PlaneContainer
      as="section"
      className={css["scenarios"]}
      title={
        <Trans
          components={{ em: <em /> }}
          i18nKey="card_scenarios.title"
          values={{ name: displayAttribute(card, "name") }}
          t={t}
        />
      }
      titleAs="h4"
    >
      <ul className={css["scenario-list"]}>
        {scenarios.map(({ campaign, scenario }) => (
          <li key={scenario.code}>
            <DefaultTooltip
              tooltip={
                <Trans
                  components={{ em: <em /> }}
                  i18nKey="card_scenarios.tooltip"
                  values={{
                    name: displayPackName(scenario),
                    campaignName: campaign
                      ? displayPackName(campaign)
                      : t("card_scenarios.standalone"),
                  }}
                  t={t}
                />
              }
            >
              <span className={css["scenario-icon"]}>
                <EncounterIcon code={scenario.code} />
              </span>
            </DefaultTooltip>
          </li>
        ))}
      </ul>
    </PlaneContainer>
  );
}

const selectScenariosForEncounterCode = createSelector(
  selectMetadata,
  selectLookupTables,
  (_: StoreState, card: Card) => card,
  (metadata, lookupTables, card) => {
    if (!card.encounter_code) return [];

    const scenarioTable =
      lookupTables.scenarioCodesByEncounterSet[card.encounter_code];

    if (!scenarioTable) return [];

    const scenarios = Object.keys(scenarioTable)
      .map((code) => {
        const scenario = metadata.scenarios[code];

        const campaign = scenario.campaign_code
          ? metadata.campaigns[scenario.campaign_code]
          : undefined;

        const cycle = scenario.campaign_code
          ? metadata.cycles[scenario.campaign_code]
          : undefined;

        return {
          campaign,
          cycle,
          scenario,
        };
      })
      .filter((data) => {
        const { scenario } = data;

        const entry = scenario.encounter_sets.find(
          (set) => set.code === card.encounter_code,
        );

        return entry && (!entry.cards || entry.cards.includes(card.code));
      })
      .sort((a, b) => {
        // convention: standalones do not belong to a campaign
        if (!a.campaign) return 1;
        if (!b.campaign) return -1;

        // convention: campaign codes equal cycle codes in current release model
        const aCyclePos = a.cycle?.position ?? -1;
        const bCyclePos = b.cycle?.position ?? -1;
        if (aCyclePos !== bCyclePos) return aCyclePos - bCyclePos;

        const aPos = a.campaign.scenarios.indexOf(a.scenario.code) ?? -1;
        const bPos = b.campaign.scenarios.indexOf(b.scenario.code) ?? -1;
        return aPos - bPos;
      });

    return scenarios;
  },
);
