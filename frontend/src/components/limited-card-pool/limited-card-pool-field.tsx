import type { Card } from "@arkham-build/shared";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { Pack } from "@/store/schemas/pack.schema";
import {
  selectLimitedPoolPackOptions,
  selectPackMapper,
} from "@/store/selectors/lists";
import { displayPackName } from "@/utils/formatting";
import { isEmpty } from "@/utils/is-empty";
import { PackName } from "../pack-name";
import { Button } from "../ui/button";
import { Combobox } from "../ui/combobox/combobox";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { Field } from "../ui/field";
import { ConfigureEnvironmentModal } from "./configure-environment-modal";
import css from "./limited-card-pool.module.css";

type Props = {
  investigator: Card;
  onValueChange: (value: string[]) => void;
  selectedItems: string[];
};

export function LimitedCardPoolField(props: Props) {
  const { investigator, onValueChange, selectedItems } = props;
  const { t } = useTranslation();

  const packMapper = useStore(selectPackMapper);

  const packs = useStore(selectLimitedPoolPackOptions);

  const locale = useStore((state) => state.settings.locale);

  const items = useMemo(
    () =>
      packs.filter(
        (pack) =>
          pack.cycle_code !== "parallel" &&
          pack.cycle_code !== "promotional" &&
          pack.cycle_code !== "side_stories",
      ),
    [packs],
  );

  const packRenderer = useCallback(
    (pack: Pack) => <PackName pack={pack} shortenNewFormat />,
    [],
  );

  const packToString = useCallback(
    (pack: Pack) => displayPackName(pack).toLowerCase(),
    [],
  );

  const onChange = useCallback(
    (values: Pack[]) => {
      onValueChange(values.map((pack) => pack.code));
    },
    [onValueChange],
  );

  return (
    <Dialog>
      <Field
        data-testid="limited-card-pool-field"
        full
        padded
        helpText={t("deck_edit.config.card_pool.help")}
      >
        <div className={css["environment-actions"]}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="limited-card-pool-environments">
              {t("deck_edit.config.card_pool.configure_environment")}
            </Button>
          </DialogTrigger>
          {!isEmpty(selectedItems) && (
            <Button onClick={() => onValueChange([])} size="xs" variant="link">
              {t("common.clear")}
            </Button>
          )}
        </div>

        <Combobox
          id="card-pool-combobox"
          items={items}
          itemToString={packToString}
          label={t("deck_edit.config.card_pool.title")}
          locale={locale}
          onValueChange={onChange}
          placeholder={t("deck_edit.config.card_pool.placeholder")}
          renderItem={packRenderer}
          renderResult={packRenderer}
          showLabel
          selectedItems={selectedItems.map(packMapper)}
        />
      </Field>
      <DialogContent>
        <ConfigureEnvironmentModal
          investigator={investigator}
          onValueChange={onValueChange}
        />
      </DialogContent>
    </Dialog>
  );
}
