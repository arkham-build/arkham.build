import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { createSelector } from "reselect";
import { useStore } from "@/store";
import type { Cycle } from "@/store/schemas/cycle.schema";
import { selectCyclesAndPacks } from "@/store/selectors/lists";
import {
  CAMPAIGN_PLAYALONG_PROJECT_ID,
  campaignPlayalongPacks,
} from "@/utils/campaign-playalong";
import { CYCLES_WITH_STANDALONE_PACKS } from "@/utils/constants";
import { displayPackName } from "@/utils/formatting";
import { PackName } from "../pack-name";
import { Combobox } from "../ui/combobox/combobox";
import { useDialogContextChecked } from "../ui/dialog.hooks";
import { Field } from "../ui/field";
import { Modal, ModalContent } from "../ui/modal";

const selectCampaignCycles = createSelector(selectCyclesAndPacks, (cycles) =>
  cycles.filter(
    (cycle) =>
      cycle.official !== false &&
      !CYCLES_WITH_STANDALONE_PACKS.includes(cycle.code),
  ),
);

export function ChooseCampaignModal(props: {
  onValueChange: (items: string[]) => void;
}) {
  const { onValueChange } = props;
  const { t } = useTranslation();

  const dialogCtx = useDialogContextChecked();
  const cycles = useStore(selectCampaignCycles);

  const locale = useStore((state) => state.settings.locale);

  const campaignPlayalongProject = useStore(
    (state) => state.fanMadeData.projects[CAMPAIGN_PLAYALONG_PROJECT_ID],
  );

  const packRenderer = useCallback(
    (cycle: Cycle) => <PackName pack={cycle} shortenNewFormat />,
    [],
  );

  const packToString = useCallback(
    (pack: Cycle) => displayPackName(pack).toLowerCase(),
    [],
  );

  const selectCampaign = useCallback(
    (selection: string[]) => {
      if (!selection.length) return;
      const cycle = selection[0];

      const packs = campaignPlayalongPacks(cycle);

      if (campaignPlayalongProject) {
        const packCodes = campaignPlayalongProject.data.packs.map(
          (pack) => pack.code,
        );
        packs.push(...packCodes);
      }

      onValueChange(packs);
      dialogCtx.setOpen(false);
    },
    [onValueChange, dialogCtx.setOpen, campaignPlayalongProject],
  );

  const selectedItems = useMemo(() => [], []);

  return (
    <Modal size="60rem">
      <ModalContent title={t("deck_edit.config.card_pool.choose_campaign")}>
        <Field
          full
          padded
          bordered
          helpText={t("deck_edit.config.card_pool.cpa_help")}
        >
          <Combobox
            autoFocus
            id="campaign-playalong-combobox"
            limit={1}
            locale={locale}
            placeholder={t(
              "deck_edit.config.card_pool.choose_campaign_placeholder",
            )}
            renderItem={packRenderer}
            renderResult={packRenderer}
            itemToString={packToString}
            onValueChange={selectCampaign}
            items={cycles}
            label={t("deck_edit.config.card_pool.campaign")}
            showLabel
            selectedItems={selectedItems}
          />
        </Field>
      </ModalContent>
    </Modal>
  );
}
