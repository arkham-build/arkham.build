import { useCallback, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { Card } from "@/store/schemas/card.schema";
import type { Cycle } from "@/store/schemas/cycle.schema";
import {
  type CycleWithPacks,
  selectCampaignCycles,
} from "@/store/selectors/lists";
import {
  CAMPAIGN_PLAYALONG_PROJECT_ID,
  campaignPlayalongPacks,
  currentEnvironmentPacks,
  limitedEnvironmentPacks,
} from "@/utils/environments";
import { capitalize, displayPackName } from "@/utils/formatting";
import { useAccentColor } from "@/utils/use-accent-color";
import { PackName } from "../pack-name";
import { Button } from "../ui/button";
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
                <EnvironmentsTabTrigger value="legacy" />
                <EnvironmentsTabTrigger value="current" />
                <EnvironmentsTabTrigger value="limited" />
                <EnvironmentsTabTrigger value="campaign_playalong" />
                <EnvironmentsTabTrigger value="collection" />
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
  const cycles = useStore(selectCampaignCycles);

  return (
    <EnvironmentsTabConfirm
      onClick={() => {
        onValueChange(currentEnvironmentPacks(cycles));
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
        if (pack.reprint?.type === "encounter") {
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
  const cycles = useStore(selectCampaignCycles);

  const applyEnvironment = () => {
    if (!selectedItems.length) return;

    const selectedCycles = selectedItems
      .map((code) => cycles.find((cycle) => cycle.code === code))
      .filter(Boolean) as Cycle[];

    const packs = limitedEnvironmentPacks(selectedCycles);

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

function CampaignPlayalongTab(props: TabProps) {
  const { dialogCtx, locale, onValueChange } = props;

  const { t } = useTranslation();

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const cycles = useStore(selectCampaignCycles);

  const campaignPlayalongProject = useStore(
    (state) => state.fanMadeData.projects[CAMPAIGN_PLAYALONG_PROJECT_ID],
  );

  const applyEnvironment = () => {
    if (!selectedItems.length) return;
    const cycle = selectedItems[0];

    const packs = campaignPlayalongPacks(cycle);

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
      <Field full padded bordered>
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
      </Field>
      <EnvironmentsTabConfirm
        disabled={!selectedItems.length}
        environment="campaign_playalong"
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
  translationProps,
  value,
}: {
  children: React.ReactNode;
  value: string;
  translationProps?: Record<string, unknown>;
}) {
  const { t } = useTranslation();

  return (
    <TabsContent value={value}>
      <div className={css["environment-tab"]}>
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
