import { BookOpenTextIcon, CircleHelpIcon, KeyboardIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useStore } from "@/store";
import css from "./help-menu.module.css";
import { Socials } from "./socials";
import { Button } from "./ui/button";
import { DropdownButton, DropdownMenu } from "./ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export function HelpMenu() {
  const { t } = useTranslation();
  const toggleKeyboardShortcuts = useStore(
    (state) => state.toggleKeyboardShortcuts,
  );

  return (
    <>
      <Link asChild href="~/rules">
        <Button
          as="a"
          data-testid="masthead-rules"
          iconOnly
          tooltip={t("rules.title")}
          variant="bare"
        >
          <BookOpenTextIcon />
        </Button>
      </Link>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            aria-label={t("help.title")}
            iconOnly
            variant="bare"
            size="lg"
          >
            <CircleHelpIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <DropdownMenu>
            <DropdownButton
              className={css["action-shortcuts"]}
              hotkey="?"
              onClick={toggleKeyboardShortcuts}
            >
              <KeyboardIcon /> {t("help.shortcuts.title")}
            </DropdownButton>
            <hr />
            <Link asChild href="~/about">
              <DropdownButton
                as="a"
                className={css["about"]}
                data-testid="masthead-about"
              >
                {t("help.about")}
              </DropdownButton>
            </Link>
            <DropdownButton
              as="a"
              href="https://github.com/fspoettel/arkham.build/releases"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("help.changelog")}
            </DropdownButton>
            <hr />
            <Socials className={css["socials"]} />
          </DropdownMenu>
        </PopoverContent>
      </Popover>
    </>
  );
}
