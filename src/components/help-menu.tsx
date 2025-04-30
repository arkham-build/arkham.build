import { useHotkey } from "@/utils/use-hotkey";
import {
  BarChart3Icon,
  BookOpenIcon,
  CircleHelpIcon,
  KeyboardIcon,
  ScrollTextIcon,
} from "lucide-react";
import { Fragment, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import css from "./help-menu.module.css";
import { Socials } from "./socials";
import { Button } from "./ui/button";
import { Dialog, DialogContent } from "./ui/dialog";
import { DropdownButton, DropdownMenu } from "./ui/dropdown-menu";
import { Keybind } from "./ui/hotkey";
import { Modal, ModalContent } from "./ui/modal";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export function HelpMenu() {
  const [keyboardShortcutsOpen, setKeyboardShortcutsOpen] = useState(false);

  const { t } = useTranslation();

  const shortcuts: [string, { keybind: string; description: string }[]][] =
    useMemo(
      () => [
        [
          t("help.shortcuts.group_general"),
          [
            { keybind: "?", description: t("app.actions.legend") },
            {
              keybind: "escape",
              description: t("app.actions.close_modal"),
            },
          ],
        ],
        [
          t("help.shortcuts.group_deck_collection"),
          [{ keybind: "n", description: t("deck.actions.create") }],
        ],
        [
          t("help.shortcuts.group_deck_editor"),
          [
            { keybind: "l", description: t("deck_edit.tab_card_list") },
            { keybind: "r", description: t("deck_edit.tab_recommendations") },
            { keybind: "n", description: t("deck_edit.tab_notes") },
            { keybind: "t", description: t("deck_edit.tab_tools") },
            {
              keybind: "d",
              description: t("deck_edit.actions.cycle_decks"),
            },
            { keybind: "c", description: t("deck_edit.tab_config") },
            { keybind: "cmd+s", description: t("deck_edit.save") },
            {
              keybind: "cmd+shift+s",
              description: t("deck_edit.actions.quick_save_deck"),
            },
            { keybind: "cmd+backspace", description: t("deck_edit.discard") },
            {
              keybind: "cmd+shift+backspace",
              description: t("deck_edit.actions.quick_discard"),
            },
          ],
        ],
        [
          t("help.shortcuts.group_card_list"),
          [
            { keybind: "/", description: t("lists.actions.focus_search") },
            {
              keybind: "alt+f",
              description: t("lists.actions.toggle_filters"),
            },
            {
              keybind: "alt+shift+f",
              description: t("lists.actions.reset_filters"),
            },
            {
              keybind: "alt+1",
              description: t("lists.actions.toggle_sidebar"),
            },
            {
              keybind: "alt+2",
              description: t("lists.actions.toggle_filter_menu"),
            },
            { keybind: "alt+p", description: t("common.player_cards") },
            { keybind: "alt+c", description: t("common.encounter_cards") },
            {
              keybind: "alt+a",
              description: t("lists.actions.show_limited_access"),
            },
            {
              keybind: "alt+u",
              description: t("lists.actions.show_unusable_cards"),
            },
            {
              keybind: "alt+l",
              description: t("lists.actions.display_as_list"),
            },
            {
              keybind: "alt+shift+l",
              description: t("lists.actions.display_as_list_text"),
            },
            {
              keybind: "alt+d",
              description: t("lists.actions.display_as_detailed"),
            },
            {
              keybind: "alt+s",
              description: t("lists.actions.display_as_scans"),
            },
          ],
        ],
        [
          t("help.shortcuts.group_card_list_search"),
          [
            { keybind: "arrowup", description: t("lists.actions.move_up") },
            {
              keybind: "arrowdown",
              description: t("lists.actions.move_down"),
            },
            {
              keybind: "enter",
              description: t("lists.actions.open_card_modal"),
            },
            {
              keybind: "cmd+backspace",
              description: t("lists.actions.clear_search"),
            },
            {
              keybind: "escape",
              description: t("lists.actions.blur_search"),
            },
          ],
        ],
        [
          t("help.shortcuts.group_card_modal"),
          [
            {
              keybind: "a",
              description: t("deck_edit.actions.edit_annotation"),
            },
            {
              keybind: "arrowright",
              description: t("deck_edit.actions.increment_quantity"),
            },
            {
              keybind: "arrowleft",
              description: t("deck_edit.actions.decrement_quantity"),
            },
            {
              keybind: "shift+arrowright",
              description: t("deck_edit.actions.increment_side_quantity"),
            },
            {
              keybind: "shift+arrowleft",
              description: t("deck_edit.actions.decrement_side_quantity"),
            },
            {
              keybind: "0..9",
              description: t("deck_edit.actions.set_quantity"),
            },
            {
              keybind: "shift+0..9",
              description: t("deck_edit.actions.set_side_quantity"),
            },
          ],
        ],
        [
          t("help.shortcuts.group_deck_view"),
          [
            { keybind: "d", description: t("deck_view.tab_deck_list") },
            { keybind: "n", description: t("deck_view.tab_notes") },
            { keybind: "r", description: t("deck_view.tab_recommendations") },
            { keybind: "t", description: t("deck_view.tab_tools") },
            { keybind: "h", description: t("deck_view.tab_history") },
            { keybind: "e", description: t("deck.actions.edit") },
            { keybind: "u", description: t("deck.actions.upgrade") },
            {
              keybind: "cmd+d",
              description: t("deck.actions.duplicate"),
            },
            {
              keybind: "cmd+shift+j",
              description: t("deck.actions.export_json"),
            },
            {
              keybind: "cmd+shift+t",
              description: t("deck.actions.export_text"),
            },
            {
              keybind: "cmd+backspace",
              description: t("deck.actions.delete"),
            },
            {
              keybind: "cmd+shift+backspace",
              description: t("deck.actions.delete_upgrade"),
            },
            { keybind: "cmd+i", description: t("deck_view.actions.import") },
            {
              keybind: "alt+l",
              description: t("deck_view.actions.display_as_list"),
            },
            {
              keybind: "alt+s",
              description: t("deck_view.actions.display_as_scans"),
            },
          ],
        ],
        [
          t("help.shortcuts.group_upgrade_modal"),
          [
            {
              keybind: "cmd+enter",
              description: t("deck_view.actions.save_upgrade"),
            },
            {
              keybind: "cmd+shift+enter",
              description: t("deck_view.actions.save_upgrade_close"),
            },
          ],
        ],
      ],
      [t],
    );

  const toggleKeyboardShortcuts = useCallback(
    () => setKeyboardShortcutsOpen((prev) => !prev),
    [],
  );

  const closeKeyboardShortcuts = useCallback(
    () => setKeyboardShortcutsOpen(false),
    [],
  );

  useHotkey("?", toggleKeyboardShortcuts);

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button tooltip={t("help.title")} variant="bare">
            <CircleHelpIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <DropdownMenu>
            <Link asChild href="~/about">
              <DropdownButton
                as="a"
                className={css["about"]}
                data-testid="masthead-about"
              >
                <BookOpenIcon /> {t("help.about")}
              </DropdownButton>
            </Link>
            <DropdownButton
              as="a"
              href="https://github.com/fspoettel/arkham.build/releases"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ScrollTextIcon /> {t("help.changelog")}
            </DropdownButton>
            <Link asChild href="~/collection-stats">
              <DropdownButton as="a" variant="bare" size="full">
                <BarChart3Icon /> {t("help.collection_stats")}
              </DropdownButton>
            </Link>
            <DropdownButton
              className={css["action-shortcuts"]}
              hotkey="?"
              onClick={toggleKeyboardShortcuts}
            >
              <KeyboardIcon /> {t("help.shortcuts.title")}
            </DropdownButton>
            <Socials className={css["socials"]} />
          </DropdownMenu>
        </PopoverContent>
      </Popover>
      <Dialog
        open={keyboardShortcutsOpen}
        onOpenChange={toggleKeyboardShortcuts}
      >
        <DialogContent>
          <Modal
            onClose={closeKeyboardShortcuts}
            open={keyboardShortcutsOpen}
            size="60rem"
          >
            <ModalContent title={t("help.shortcuts.title")}>
              <div className={css["groups"]}>
                {shortcuts.map(([category, shortcuts]) => (
                  <article className={css["group"]} key={category}>
                    <header className={css["group-header"]}>
                      <h2 className={css["group-title"]}>{category}</h2>
                    </header>
                    <dl className={css["shortcuts"]}>
                      {shortcuts.map(({ keybind, description }) => (
                        <Fragment key={keybind}>
                          <dt className={css["shortcut-keybind"]}>
                            <Keybind keybind={keybind} />
                          </dt>
                          <dd className={css["shortcut-description"]}>
                            {description}
                          </dd>
                        </Fragment>
                      ))}
                    </dl>
                  </article>
                ))}
              </div>
            </ModalContent>
          </Modal>
        </DialogContent>
      </Dialog>
    </>
  );
}
