import { Copy, Download, Ellipsis, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { useStore } from "@/store";
import type { DisplayDeck } from "@/store/lib/deck-grouping";

import { DropdownMenu } from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/components/ui/toast";
import { useHotKey } from "@/utils/use-hotkey";
import css from "./sidebar.module.css";

type Props = {
  deck: DisplayDeck;
};

export function SidebarActions(props: Props) {
  const { deck } = props;
  const showToast = useToast();
  const [, setLocation] = useLocation();

  const deleteDeck = useStore((state) => state.deleteDeck);
  const duplicateDeck = useStore((state) => state.duplicateDeck);
  const exportJson = useStore((state) => state.exportJSON);
  const exportText = useStore((state) => state.exportText);

  const [actionsOpen, setActionsOpen] = useState(false);

  const onDelete = () => {
    const confirmed = confirm("Are you sure you want to delete this deck?");
    if (confirmed) {
      deleteDeck(deck.id);
      setLocation("~/");
      showToast({
        duration: 2000,
        children: "Successfully deleted deck.",
        variant: "success",
      });
    }
  };

  const onDuplicate = () => {
    try {
      const id = duplicateDeck(deck.id);
      setLocation(`/deck/view/${id}`);
      showToast({
        duration: 2000,
        children: "Successfully duplicated deck.",
        variant: "success",
      });
    } catch (err) {
      showToast({
        duration: 2000,
        children: `Failed to duplicate deck: ${(err as Error)?.message}`,
        variant: "error",
      });
    }

    setActionsOpen(false);
  };

  const onEdit = () => {
    setLocation(`/deck/edit/${deck.id}`);
  };

  const onExportJson = () => {
    try {
      exportJson(deck.id);
    } catch (err) {
      console.error(err);
      showToast({
        duration: 2000,
        children: "Failed to export json.",
        variant: "error",
      });
    }
  };

  const onExportText = () => {
    try {
      exportText(deck.id);
    } catch (err) {
      console.error(err);
      showToast({
        duration: 2000,
        children: "Failed to export markdown.",
        variant: "error",
      });
    }
  };

  useHotKey("e", onEdit, [onEdit]);
  useHotKey("cmd+d", onDuplicate, [onDuplicate]);
  useHotKey("cmd+backspace", onDelete, [onDelete]);

  const isReadOnly = !!deck.next_deck;

  return (
    <>
      {isReadOnly && (
        <Notice variant="info">
          There is a{" "}
          <Link href={`/deck/view/${deck.next_deck}`}>newer version</Link> of
          this deck. This deck is read-only.
        </Notice>
      )}
      <div className={css["actions"]}>
        <Button
          data-testid="view-edit"
          disabled={isReadOnly}
          onClick={onEdit}
          size="full"
        >
          <Pencil /> Edit
        </Button>
        <Button data-testid="view-upgrade" disabled size="full">
          <i className="icon-xp-bold" /> Upgrade
        </Button>
        <Popover
          placement="bottom-start"
          open={actionsOpen}
          onOpenChange={setActionsOpen}
        >
          <PopoverTrigger asChild>
            <Button
              variant="bare"
              data-testid="view-more-actions"
              tooltip="More actions"
            >
              <Ellipsis />
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <DropdownMenu>
              <Button
                data-testid="view-duplicate"
                onClick={onDuplicate}
                size="full"
                variant="bare"
              >
                <Copy />
                Duplicate
              </Button>
              <hr />
              <Button
                data-testid="view-export"
                size="full"
                variant="bare"
                onClick={onExportJson}
              >
                <Download /> Export JSON
              </Button>
              <Button
                data-testid="view-export"
                size="full"
                variant="bare"
                onClick={onExportText}
              >
                <Download /> Export Markdown
              </Button>
              <hr />
              <Button
                data-testid="view-delete"
                disabled={isReadOnly}
                onClick={onDelete}
                size="full"
                variant="bare"
              >
                <Trash2 /> Delete
              </Button>
            </DropdownMenu>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}
