import { useTranslation } from "react-i18next";
import type { ResolvedDeck } from "@/store/lib/types";
import { Decklist } from "../decklist/decklist";
import { Button } from "../ui/button";
import { Plane } from "../ui/plane";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Scroller } from "../ui/scroller";
import css from "./decklist-popover.module.css";

type Props = {
  deck: ResolvedDeck;
};

export function DecklistPopover(props: Props) {
  const { deck } = props;
  const { t } = useTranslation();

  return (
    <div className={css["container"]}>
      <Popover placement="top-start" strategy="fixed">
        <PopoverTrigger asChild>
          <Button variant="primary">
            <i className="icon-deck" /> {t("deck_view.show_deck_list")}
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <Plane className={css["popover"]}>
            <Scroller>
              <Decklist deck={deck} />
            </Scroller>
          </Plane>
        </PopoverContent>
      </Popover>
    </div>
  );
}
