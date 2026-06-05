import type { Card } from "@arkham-build/shared";
import { InfoIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import type { Cycle } from "@/store/schemas/cycle.schema";
import type { Pack } from "@/store/schemas/pack.schema";
import {
  type CycleWithPacks,
  selectCampaignCycles,
  selectLimitedPoolPackOptions,
} from "@/store/selectors/lists";
import { environments } from "@/utils/environments";
import { capitalize, displayPackName } from "@/utils/formatting";
import { useAccentColor } from "@/utils/use-accent-color";
import { PackName } from "../pack-name";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Combobox } from "../ui/combobox/combobox";
import { useDialogContextChecked } from "../ui/dialog.hooks";
import { Field } from "../ui/field";
import {
  DefaultModalContent,
  Modal,
  ModalActions,
  ModalBackdrop,
  ModalInner,
} from "../ui/modal";
import { Plane } from "../ui/plane";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import css from "./limited-card-pool.module.css";

type Props = {
  investigator: Card;
  onValueChange: (items: string[]) => void;
};

type TabProps = Omit<Props, "investigator"> & {
  locale: string;
  dialogCtx: ReturnType<typeof useDialogContextChecked>;
};

const packRenderer = (cycle: Cycle) => (
  <PackName pack={cycle} shortenNewFormat />
);

const packToString = (pack: Cycle) => displayPackName(pack).toLowerCase();

const CAMPAIGN_PLAYALONG_PROJECT_ID = "5b6a1f95-73d1-4059-8af2-b9a645efd625";

export function ConfigureEnvironmentModal(props: Props) {
  const { investigator, onValueChange } = props;

  const { t } = useTranslation();

  const accentColor = useAccentColor(investigator);

  const dialogCtx = useDialogContextChecked();
  const [tab, setTab] = useState("legacy");

  const locale = useStore((state) => state.settings.locale);

  const tabProps = {
    dialogCtx,
    locale,
    onValueChange,
  };

  return (
    <Modal style={accentColor}>
      <ModalBackdrop />
      <ModalInner size="60rem">
        <ModalActions />
        <DefaultModalContent
          title={t("deck_edit.config.card_pool.configure_environment")}
        >
          <Tabs value={tab} onValueChange={setTab}>
            <div className={css["container"]}>
              <TabsList className={css["nav"]} vertical>
                <div className={css["nav-section"]}>
                  <h4>Grimoire</h4>
                </div>
                <EnvironmentsTabTrigger value="legacy" />
                <EnvironmentsTabTrigger value="current" />
                <EnvironmentsTabTrigger value="limited" />
                <div className={css["nav-section"]}>
                  <h4>Custom</h4>
                </div>
                <EnvironmentsTabTrigger value="campaign_playalong" />
                <EnvironmentsTabTrigger value="collection" />
                <div className={css["nav-section"]}>
                  <h4>FAQ 2.5</h4>
                </div>
                <EnvironmentsTabTrigger value="current_faq25" />
                <EnvironmentsTabTrigger value="limited_faq25" />
              </TabsList>
              <div className={css["content"]}>
                <EnvironmentsTabContent value="legacy">
                  <LegacyTab {...tabProps} />
                </EnvironmentsTabContent>
                <EnvironmentsTabContent value="current">
                  <CurrentTab {...tabProps} />
                </EnvironmentsTabContent>
                <EnvironmentsTabContent value="limited">
                  <LimitedTab {...tabProps} />
                </EnvironmentsTabContent>
                <EnvironmentsTabContent value="campaign_playalong">
                  <CampaignPlayalongTab {...tabProps} />
                </EnvironmentsTabContent>
                <EnvironmentsTabContent
                  value="current_faq25"
                  disclaimer={
                    <Plane className={css["disclaimer"]} size="sm">
                      <InfoIcon />
                      {t("deck_edit.config.card_pool.help_chapter_1")}
                    </Plane>
                  }
                >
                  <CurrentFaq25Tab {...tabProps} />
                </EnvironmentsTabContent>
                <EnvironmentsTabContent
                  value="limited_faq25"
                  disclaimer={
                    <Plane className={css["disclaimer"]} size="sm">
                      <InfoIcon />
                      {t("deck_edit.config.card_pool.help_chapter_1")}
                    </Plane>
                  }
                >
                  <Limited25Tab {...tabProps} />
                </EnvironmentsTabContent>
                <EnvironmentsTabContent
                  translationProps={{
                    components: {
                      settings_link: (
                        // biome-ignore lint/a11y/useAnchorContent: interpolation
                        <a
                          href="/settings?tab=collection"
                          target="_blank"
                          rel="noreferrer"
                        />
                      ),
                    },
                  }}
                  value="collection"
                >
                  <CollectionTab {...tabProps} />
                </EnvironmentsTabContent>
              </div>
            </div>
          </Tabs>
        </DefaultModalContent>
      </ModalInner>
    </Modal>
  );
}

function LegacyTab({ dialogCtx, onValueChange }: TabProps) {
  return (
    <EnvironmentsTabConfirm
      environment="legacy"
      onClick={() => {
        onValueChange([]);
        dialogCtx.setOpen(false);
      }}
    />
  );
}

function CurrentTab({ dialogCtx, onValueChange }: TabProps) {
  return (
    <EnvironmentsTabConfirm
      onClick={() => {
        onValueChange(environments.current());
        dialogCtx.setOpen(false);
      }}
      environment="current"
    />
  );
}

function CollectionTab({ dialogCtx, onValueChange }: TabProps) {
  const cycles = useStore(selectCampaignCycles);
  const ignored = cycles.reduce((acc, cycle) => {
    if (cycle.reprintPacks) {
      cycle.reprintPacks.forEach((pack) => {
        if (pack.reprint_type === "campaign") {
          acc.add(pack.code);
        }
      });
    }

    return acc;
  }, new Set());

  const settings = useStore((state) => state.settings);
  const collection = settings.collection;

  const selected = Object.keys(collection).filter(
    (code) => collection[code] > 0 && !ignored.has(code),
  );

  return (
    <EnvironmentsTabConfirm
      onClick={() => {
        onValueChange(selected);
        dialogCtx.setOpen(false);
      }}
      environment="collection"
    />
  );
}

function LimitedTab(props: TabProps) {
  const { dialogCtx, locale, onValueChange } = props;

  const { t } = useTranslation();

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const packs = useStore(
    useShallow((state) =>
      selectLimitedPoolPackOptions(
        state,
        (c) =>
          !c.code.includes("core") &&
          !c.code.includes("investigator_decks") &&
          !c.code.includes("return"),
      ),
    ),
  );

  const applyEnvironment = () => {
    if (!selectedItems.length) return;

    const packs = environments.limited(selectedItems);

    onValueChange(packs);
    dialogCtx.setOpen(false);
  };

  const onSelectionChange = useCallback((items: Pack[]) => {
    setSelectedItems(items.map((cycle) => cycle.code));
  }, []);

  return (
    <>
      <Field full padded bordered>
        <Combobox
          autoFocus
          id="cycle-select-combobox"
          limit={3}
          locale={locale}
          placeholder={t("deck_edit.config.card_pool.placeholder")}
          renderItem={packRenderer}
          renderResult={packRenderer}
          itemToString={packToString}
          onValueChange={onSelectionChange}
          items={packs}
          label={capitalize(t("common.pack", { count: 3 }))}
          showLabel
          selectedItems={selectedItems.map((code) =>
            packs.find((pack) => pack.code === code),
          )}
        />
      </Field>
      <EnvironmentsTabConfirm
        disabled={!selectedItems.length}
        environment="limited"
        onClick={applyEnvironment}
      />
    </>
  );
}

function CampaignPlayalongTab(props: TabProps) {
  const { dialogCtx, locale, onValueChange } = props;

  const { t } = useTranslation();

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>("2");
  const cycles = useStore(selectCampaignCycles);

  const campaignPlayalongProject = useStore(
    (state) => state.fanMadeData.projects[CAMPAIGN_PLAYALONG_PROJECT_ID],
  );

  const applyEnvironment = () => {
    if (!selectedItems.length) return;
    const cycle = selectedItems[0];

    const packs = environments.cpa(cycle, +selectedChapter as 1 | 2);

    if (campaignPlayalongProject) {
      const packCodes = campaignPlayalongProject.data.packs.map(
        (pack) => pack.code,
      );

      packs.push(...packCodes);
    }

    onValueChange(packs);
    dialogCtx.setOpen(false);
  };

  const onSelectionChange = useCallback((items: CycleWithPacks[]) => {
    setSelectedItems(items.map((cycle) => cycle.code));
  }, []);

  return (
    <>
      <Field className={css["cpa"]} full padded bordered>
        <Combobox
          autoFocus
          id="cycle-select-combobox"
          limit={1}
          locale={locale}
          placeholder={t("deck_edit.config.card_pool.choose_cycle_placeholder")}
          renderItem={packRenderer}
          renderResult={packRenderer}
          itemToString={packToString}
          onValueChange={onSelectionChange}
          items={cycles}
          label={capitalize(t("common.cycle", { count: 1 }))}
          showLabel
          selectedItems={
            selectedItems
              .map((code) => cycles.find((cycle) => cycle.code === code))
              .filter(Boolean) as CycleWithPacks[]
          }
        />
        <Checkbox
          checked={selectedChapter === "1"}
          data-testid="cpa-use-chapter-1"
          label={t(
            "deck_edit.config.card_pool.substitute_chapter_2_with_chapter_1",
          )}
          onCheckedChange={(checked) => setSelectedChapter(checked ? "1" : "2")}
        />
      </Field>
      <EnvironmentsTabConfirm
        disabled={!selectedItems.length}
        environment="campaign_playalong"
        onClick={applyEnvironment}
      />
    </>
  );
}

function CurrentFaq25Tab({ dialogCtx, onValueChange }: TabProps) {
  const cycles = useStore(selectCampaignCycles);

  return (
    <EnvironmentsTabConfirm
      onClick={() => {
        onValueChange(environments.currentFaq25(cycles));
        dialogCtx.setOpen(false);
      }}
      environment="current"
    />
  );
}

function Limited25Tab(props: TabProps) {
  const { dialogCtx, locale, onValueChange } = props;

  const { t } = useTranslation();

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const cycles = useStore(selectCampaignCycles);

  const applyEnvironment = () => {
    if (!selectedItems.length) return;

    const selectedCycles = selectedItems
      .map((code) => cycles.find((cycle) => cycle.code === code))
      .filter(Boolean) as Cycle[];

    const packs = environments.limitedFaq25(selectedCycles);

    onValueChange(packs);
    dialogCtx.setOpen(false);
  };

  const onSelectionChange = useCallback((items: CycleWithPacks[]) => {
    setSelectedItems(items.map((cycle) => cycle.code));
  }, []);

  return (
    <>
      <Field full padded bordered>
        <Combobox
          autoFocus
          id="cycle-select-combobox"
          limit={3}
          locale={locale}
          placeholder={t("deck_edit.config.card_pool.choose_cycle_placeholder")}
          renderItem={packRenderer}
          renderResult={packRenderer}
          itemToString={packToString}
          onValueChange={onSelectionChange}
          items={cycles}
          label={capitalize(t("common.cycle", { count: 3 }))}
          showLabel
          selectedItems={
            selectedItems.map((code) =>
              cycles.find((cycle) => cycle.code === code),
            ) as CycleWithPacks[]
          }
        />
      </Field>
      <EnvironmentsTabConfirm
        disabled={!selectedItems.length}
        environment="limited"
        onClick={applyEnvironment}
      />
    </>
  );
}

function EnvironmentsTabTrigger({ value }: { value: string }) {
  const { t } = useTranslation();
  return (
    <TabsTrigger
      value={value}
      data-testid={`limited-card-pool-environment-${value}`}
    >
      {t(`deck_edit.config.card_pool.${value}`)}
    </TabsTrigger>
  );
}

function EnvironmentsTabContent({
  children,
  disclaimer,
  translationProps,
  value,
}: {
  children: React.ReactNode;
  disclaimer?: React.ReactNode;
  value: string;
  translationProps?: Record<string, unknown>;
}) {
  const { t } = useTranslation();

  return (
    <TabsContent value={value}>
      <div className={css["environment-tab"]}>
        {disclaimer}
        <div className="longform">
          <p>
            {translationProps ? (
              <Trans
                t={t}
                i18nKey={`deck_edit.config.card_pool.${value}_help`}
                {...translationProps}
              />
            ) : (
              t(`deck_edit.config.card_pool.${value}_help`)
            )}
          </p>
        </div>
        {children}
      </div>
    </TabsContent>
  );
}

function EnvironmentsTabConfirm({
  environment,
  disabled = false,
  onClick,
}: {
  disabled?: boolean;
  environment: string;
  onClick: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Button
      data-testid={`limited-card-pool-environment-${environment}-apply`}
      disabled={disabled}
      onClick={onClick}
      variant="primary"
    >
      {t("deck_edit.config.card_pool.apply_environment", {
        environment: t(`deck_edit.config.card_pool.${environment}`),
      })}
    </Button>
  );
}
