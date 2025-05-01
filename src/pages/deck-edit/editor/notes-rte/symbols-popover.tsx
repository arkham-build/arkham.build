import { Combobox } from "@/components/ui/combobox/combobox";
import { Field, FieldLabel } from "@/components/ui/field";
import type { ResolvedDeck } from "@/store/lib/types";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNotesRichTextEditorContext } from "./notes-rte-context";
import css from "./notes-rte.module.css";

type Props = {
  deck: ResolvedDeck;
  onEscapePress: () => void;
};

type SymbolsPopoverItem = {
  code: string;
  iconClassName: string;
  label: string;
};

const availableSymbols = [
  {
    code: "elder_sign",
    iconClassName: "icon-elder_sign",
  },
  {
    code: "auto_fail",
    iconClassName: "icon-auto_fail",
  },
  { code: "skull", iconClassName: "icon-skull" },
  { code: "cultist", iconClassName: "icon-cultist" },
  { code: "tablet", iconClassName: "icon-tablet" },
  {
    code: "elder_thing",
    iconClassName: "icon-elder_thing",
  },
  { code: "bless", iconClassName: "icon-bless" },
  { code: "curse", iconClassName: "icon-curse" },
  {
    code: "action",
    iconClassName: "icon-action",
  },
  {
    code: "reaction",
    iconClassName: "icon-reaction",
  },
  {
    code: "free",
    iconClassName: "icon-free",
  },
  {
    code: "willpower",
    iconClassName: "icon-willpower",
  },
  {
    code: "intellect",
    iconClassName: "icon-intellect",
  },
  { code: "combat", iconClassName: "icon-combat" },
  { code: "agility", iconClassName: "icon-agility" },
  { code: "wild", iconClassName: "icon-wild" },
  { code: "guardian", iconClassName: "icon-guardian" },
  { code: "seeker", iconClassName: "icon-seeker" },
  { code: "rogue", iconClassName: "icon-rogue" },
  { code: "mystic", iconClassName: "icon-mystic" },
  { code: "survivor", iconClassName: "icon-survivor" },
  {
    code: "per_investigator",
    iconClassName: "icon-per_investigator",
  },
];

function useAvailableSymbols(): SymbolsPopoverItem[] {
  const { t } = useTranslation();

  const symbols = useMemo(
    () =>
      availableSymbols.map((symbol) => ({
        ...symbol,
        label: t(`common.symbols.${symbol.code}`),
      })),
    [t],
  );

  return symbols;
}

const emptySelection: string[] = [];

const renderItem = (item: SymbolsPopoverItem) => {
  return (
    <div className={css["symbol-combobox-item"]}>
      <i className={item.iconClassName} />
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

  const { insertTextAtCaret } = useNotesRichTextEditorContext();

  const onSelectItem = useCallback(
    (values: string[]) => {
      const value = values[0];
      if (!value) return;

      const symbol = symbols.find((item) => item.code === value);
      if (!symbol) return;

      insertTextAtCaret(`<span class=\"${symbol.iconClassName}\"></span>`);
    },
    [insertTextAtCaret, symbols],
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
