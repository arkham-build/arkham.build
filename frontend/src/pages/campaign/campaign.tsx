import type { Campaign as CampaignData, Card } from "@arkham-build/shared";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "wouter";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import PackIcon from "@/components/icons/pack-icon";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ListLayoutContextProvider } from "@/layouts/list-layout-context-provider";
import { ListLayoutNoSidebar } from "@/layouts/list-layout-no-sidebar";
import { useStore } from "@/store";
import { resolveCampaignScenarios } from "@/store/selectors/content";
import { selectMetadata } from "@/store/selectors/shared";
import type { Metadata } from "@/store/slices/metadata.types";
import { assert } from "@/utils/assert";
import { displayPackName } from "@/utils/formatting";
import { ErrorStatus } from "../errors/404";
import { resolveCampaignCards } from "./campaign.helpers";
import css from "./campaign.module.css";

function Campaign() {
  const { id } = useParams<{ id: string }>();
  const metadata = useStore(selectMetadata);
  const campaign = metadata.campaigns[id];

  if (!campaign) {
    return <ErrorStatus statusCode={404} />;
  }

  const scenarios = resolveCampaignScenarios(campaign, metadata);
  const { cardCodes, encounterSetOrder } = resolveCampaignCards(
    scenarios,
    Object.values(metadata.cards),
    campaign.cycle_code,
    (encounterSetCode) =>
      resolveEncounterSetCycleCode(encounterSetCode, metadata),
  );

  return (
    <CampaignCards
      campaign={campaign}
      cardCodes={cardCodes}
      encounterSetOrder={encounterSetOrder}
    />
  );
}

function CampaignCards({
  campaign,
  cardCodes,
  encounterSetOrder,
}: {
  campaign: CampaignData;
  cardCodes: ReadonlySet<string>;
  encounterSetOrder: readonly string[];
}) {
  const activeListId = useStore((state) => state.activeList);
  const addList = useStore((state) => state.addList);
  const removeList = useStore((state) => state.removeList);
  const setActiveList = useStore((state) => state.setActiveList);

  const listKey = `campaign-${campaign.code}`;
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
            "pack",
            "encounter_set",
            "illustrator",
          ],
          groupOrder: {
            keys: encounterSetOrder,
            type: "encounter_set",
          },
          systemFilter: (card) => cardCodes.has(card.code),
        },
      );
    }

    setActiveList(listKey);
  }, [
    addList,
    cardCodes,
    encounterSetOrder,
    listExists,
    listKey,
    setActiveList,
  ]);

  useEffect(() => {
    return () => {
      removeList(listKey);
      setActiveList(undefined);
    };
  }, [listKey, removeList, setActiveList]);

  if (!listExists || activeListId !== listKey) return null;

  const title = displayPackName(campaign);

  return (
    <CardModalProvider>
      <ListLayoutContextProvider>
        <ListLayoutNoSidebar
          getListCardProps={getCampaignListCardProps}
          headerTop={<CampaignBreadcrumb />}
          omitBackButton
          title={<CampaignTitle campaign={campaign} />}
          titleString={title}
        />
      </ListLayoutContextProvider>
    </CardModalProvider>
  );
}

function CampaignBreadcrumb() {
  const { t } = useTranslation();
  return (
    <Breadcrumb items={[{ href: "/content", label: t("content.title") }]} />
  );
}

function CampaignTitle({ campaign }: { campaign: CampaignData }) {
  return (
    <span className={css["title"]}>
      <PackIcon className={css["title-icon"]} code={campaign.code} />
      <span>{displayPackName(campaign)}</span>
    </span>
  );
}

function getCampaignListCardProps() {
  return {
    renderCardNameExtra: (card: Card) => (
      <span className={css["quantity"]}>
        <i className="icon-card-outline-bold" />×{card.quantity}
      </span>
    ),
  };
}

function resolveEncounterSetCycleCode(
  encounterSetCode: string,
  metadata: Metadata,
) {
  const encounterSet = metadata.encounterSets[encounterSetCode];
  assert(encounterSet, `Missing encounter set ${encounterSetCode}`);

  const pack = metadata.packs[encounterSet.pack_code];
  assert(pack, `Encounter set ${encounterSetCode} references a missing pack`);

  return pack.cycle_code;
}

export default Campaign;
