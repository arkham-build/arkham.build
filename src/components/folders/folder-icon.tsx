import { FolderIcon as LucideFolderIcon } from "lucide-react";
import type { Folder } from "@/store/slices/data.types";
import { ExternalLucideIcon } from "../ui/external-lucide-icon";

type Props = {
  folder: Folder;
};

export function FolderIcon({ folder }: Props) {
  return folder.icon ? (
    <ExternalLucideIcon url={folder.icon} />
  ) : (
    <LucideFolderIcon />
  );
}
