import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { Folder } from "@/store/slices/data.types";
import { FolderIcon } from "../folders/folder-icon";
import css from "./deck-collection-folder.module.css";

type Props = {
  count: number;
  expanded: boolean;
  folder: Folder;
};

export function DeckCollectionFolder(props: Props) {
  const { count, expanded, folder } = props;

  const { t } = useTranslation();
  const toggleFolderExpanded = useStore((state) => state.toggleFolderExpanded);

  return (
    <button
      className={css["folder"]}
      data-testid={`collection-folder-${folder.name}`}
      onClick={() => toggleFolderExpanded(folder.id)}
      style={
        {
          "--folder-color": folder.color,
        } as React.CSSProperties
      }
      type="button"
    >
      <span className={css["row"]}>
        <figure className={css["expander"]}>
          {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </figure>
        <FolderIcon folder={folder} />
        {folder.name}
      </span>
      <span className={css["count"]}>
        {t("deck_collection.count", { count })}
      </span>
    </button>
  );
}
