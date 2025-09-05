import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useStore } from "@/store";
import type { Folder } from "@/store/slices/data.types";
import { FolderIcon } from "../folders/folder-icon";
import css from "./deck-collection-folder.module.css";

type Props = {
  expanded: boolean;
  folder: Folder;
};

export function DeckCollectionFolder(props: Props) {
  const { expanded, folder } = props;

  const toggleFolderExpanded = useStore((state) => state.toggleFolderExpanded);

  return (
    <button
      className={css["folder"]}
      onClick={() => toggleFolderExpanded(folder.id)}
      style={
        {
          "--folder-color": folder.color,
        } as React.CSSProperties
      }
      type="button"
    >
      <figure className={css["expander"]}>
        {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
      </figure>
      <FolderIcon folder={folder} />
      {folder.name}
    </button>
  );
}
