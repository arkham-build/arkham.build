import {
  Combobox,
  type Props as ComboboxProps,
} from "@/components/ui/combobox/combobox";
import { useTranslation } from "react-i18next";

type Props = Omit<
  ComboboxProps<SymbolComboboxItem>,
  | "items"
  | "itemToString"
  | "renderItem"
  | "renderResult"
  | "placeholder"
  | "omitItemPadding"
  | "label"
  | "selectedItems"
> & {
  onSymbolSelected: (symbol: SymbolComboboxItem) => void;
};

export interface SymbolComboboxItem {
  code: string;
  localizedName: string;
  spanClass: string;
}

const availableSymbols: Omit<SymbolComboboxItem, "localizedName">[] = [
  {
    code: "elder_sign",
    spanClass: "icon-elder_sign",
  },
  {
    code: "auto_fail",
    spanClass: "icon-auto_fail",
  },
  { code: "skull", spanClass: "icon-skull" },
  { code: "cultist", spanClass: "icon-cultist" },
  { code: "tablet", spanClass: "icon-tablet" },
  {
    code: "elder_thing",
    spanClass: "icon-elder_thing",
  },
  { code: "bless", spanClass: "icon-bless" },
  { code: "curse", spanClass: "icon-curse" },
  {
    code: "action",
    spanClass: "icon-action",
  },
  {
    code: "reaction",
    spanClass: "icon-reaction",
  },
  {
    code: "free",
    spanClass: "icon-free",
  },
  {
    code: "willpower",
    spanClass: "icon-willpower",
  },
  {
    code: "intellect",
    spanClass: "icon-intellect",
  },
  { code: "combat", spanClass: "icon-combat" },
  { code: "agility", spanClass: "icon-agility" },
  { code: "wild", spanClass: "icon-wild" },
  { code: "guardian", spanClass: "icon-guardian" },
  { code: "seeker", spanClass: "icon-seeker" },
  { code: "rogue", spanClass: "icon-rogue" },
  { code: "mystic", spanClass: "icon-mystic" },
  { code: "survivor", spanClass: "icon-survivor" },
  {
    code: "per_investigator",
    spanClass: "icon-per_investigator",
  },
];

function useAvailableSymbols(): SymbolComboboxItem[] {
  const { t } = useTranslation();
  return availableSymbols.map((item) => ({
    ...item,
    localizedName: t(
      `deck_edit.notes.toolbar.insert.symbol_names.${item.code}`,
    ),
  }));
}

export function SymbolCombobox(props: Props) {
  const { onSymbolSelected } = props;
  const { t } = useTranslation();
  const availableSymbols = useAvailableSymbols();
  return (
    <Combobox
      {...props}
      omitItemPadding
      label={""}
      selectedItems={[]}
      items={availableSymbols}
      itemToString={(item) => {
        return `${item.code.toLowerCase()} ${item.localizedName}`;
      }}
      renderItem={(item) => {
        return (
          <>
            <span
              className={`icon ${item.spanClass}`}
              style={{ padding: "0.5rem", fontSize: "1.5rem" }}
            />
            <span>{item.localizedName}</span>
          </>
        );
      }}
      renderResult={(item) => {
        return <>{item.localizedName}</>;
      }}
      placeholder={t(
        "deck_edit.notes.toolbar.insert.insert_symbol_placeholder",
      )}
      onValueChange={(value) => {
        const selectedSymbolCode = value[0];
        const selectedSymbol = availableSymbols.find(
          (symbol) => symbol.code === selectedSymbolCode,
        );
        if (selectedSymbol) {
          onSymbolSelected(selectedSymbol);
        }
      }}
    />
  );
}
