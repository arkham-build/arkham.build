import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Combobox } from "@/components/ui/combobox/combobox";
import { Field, FieldLabel } from "@/components/ui/field";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import css from "./notes-rte.module.css";
import { useNotesRichTextEditorContext } from "./notes-rte-context";

type Props = {
  deck: ResolvedDeck;
  onEscapePress: () => void;
};

type SymbolsPopoverItem = {
  code: string;
  label: string;
};

const availableSymbols = [
  "action",
  "agility",
  "auto_fail",
  "bless",
  "combat",
  "cultist",
  "curse",
  "elder_sign",
  "elder_thing",
  "free",
  "frost",
  "guardian",
  "intellect",
  "mystic",
  "per_investigator",
  "reaction",
  "rogue",
  "seeker",
  "skull",
  "survivor",
  "tablet",
  "wild",
  "willpower",
];

function useAvailableSymbols(): SymbolsPopoverItem[] {
  const { t } = useTranslation();

  const symbols = useMemo(
    () =>
      availableSymbols.map((symbol) => ({
        code: symbol,
        label: t(`common.symbols.${symbol}`),
      })),
    [t],
  );

  return symbols;
}

const emptySelection: SymbolsPopoverItem[] = [];

const renderItem = (item: SymbolsPopoverItem) => {
  return (
    <div className={css["symbol-combobox-item"]}>
      <i className={`icon-${item.code}`} />
      <span>{item.label}</span>
    </div>
  );
};

const itemToString = (item: SymbolsPopoverItem) => {
  return `${item.code} ${item.label}`;
};

export function SymbolsPopover(props: Props) {
  const { onEscapePress } = props;
  const { t } = useTranslation();
  const symbols = useAvailableSymbols();

  const locale = useStore((state) => state.settings.locale);

  const { insertTextAtCaret } = useNotesRichTextEditorContext();

  const onSelectItem = useCallback(
    (values: SymbolsPopoverItem[]) => {
      const symbol = values[0];
      insertTextAtCaret(`<span class="icon-${symbol.code}"></span>`);
      onEscapePress();
    },
    [insertTextAtCaret, onEscapePress],
  );

  return (
    <Field>
      <FieldLabel>{t("deck_edit.notes.toolbar.symbol")}</FieldLabel>
      <Combobox
        autoFocus
        defaultOpen
        id="insert-symbol-combobox"
        items={symbols}
        label={t("deck_edit.notes.toolbar.symbol")}
        locale={locale}
        limit={1}
        omitFloatingPortal
        placeholder={t("deck_edit.notes.toolbar.symbol_placeholder")}
        renderItem={renderItem}
        itemToString={itemToString}
        selectedItems={emptySelection}
        onValueChange={onSelectItem}
        onEscapeBlur={onEscapePress}
      />
    </Field>
  );
}
