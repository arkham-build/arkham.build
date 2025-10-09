import { useStore } from "@/store";
import type { Id } from "@/store/schemas/deck.schema";
import { Tag } from "../ui/tag";
import { FolderIcon } from "./folder-icon";

type Props = {
  deckId: Id;
};

export function FolderTag({ deckId }: Props) {
  const folder = useStore((state) => {
    const deckFolder = state.data.deckFolders[deckId];
    if (!deckFolder) return null;
    return state.data.folders[deckFolder] || null;
  });

  if (!folder) return null;

  return (
    <Tag as="li" size="xs">
      <FolderIcon folder={folder} />
      {folder.name}
    </Tag>
  );
}
