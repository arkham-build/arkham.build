import { GlobeIcon, LayersIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Tag } from "@/components/ui/tag";
import { useStore } from "@/store";
import css from "./tag-management.module.css";

export function TagManagement() {
  const { t } = useTranslation();

  const clearAllGlobalTags = useStore((state) => state.clearAllGlobalTags);
  const clearAllDeckCardTags = useStore((state) => state.clearAllDeckCardTags);
  const renameGlobalTag = useStore((state) => state.renameGlobalTag);
  const deleteGlobalTag = useStore((state) => state.deleteGlobalTag);
  const globalCardTags = useStore(
    (state) => state.settings.globalCardTags ?? {},
  );

  const allGlobalTags = Array.from(
    new Set(Object.values(globalCardTags).flat()),
  ).sort();

  const onClearAllGlobal = useCallback(async () => {
    if (!confirm(t("settings.tags.clear_global_confirm"))) return;
    await clearAllGlobalTags();
  }, [clearAllGlobalTags, t]);

  const onClearAllDeck = useCallback(async () => {
    if (!confirm(t("settings.tags.clear_deck_confirm"))) return;
    await clearAllDeckCardTags();
  }, [clearAllDeckCardTags, t]);

  const onClearAll = useCallback(async () => {
    if (!confirm(t("settings.tags.clear_all_confirm"))) return;
    await clearAllGlobalTags();
    await clearAllDeckCardTags();
  }, [clearAllGlobalTags, clearAllDeckCardTags, t]);

  return (
    <div className={css["container"]}>
      <Field bordered helpText={t("settings.tags.clear_global_help")}>
        <Button type="button" onClick={onClearAllGlobal}>
          <GlobeIcon />
          {t("settings.tags.clear_global")}
        </Button>
      </Field>

      <Field bordered helpText={t("settings.tags.clear_deck_help")}>
        <Button type="button" onClick={onClearAllDeck}>
          <LayersIcon />
          {t("settings.tags.clear_deck")}
        </Button>
      </Field>

      <Field bordered helpText={t("settings.tags.clear_all_help")}>
        <Button type="button" onClick={onClearAll}>
          <Trash2Icon />
          {t("settings.tags.clear_all")}
        </Button>
      </Field>

      <Field
        bordered
        helpText={
          allGlobalTags.length === 0 ? t("settings.tags.no_global_tags") : null
        }
      >
        <h3 className={css["section-title"]}>
          {t("settings.tags.global_tags")}
        </h3>
        {allGlobalTags.length > 0 && (
          <ul className={css["tag-list"]}>
            {allGlobalTags.map((tag) => (
              <TagRow
                key={tag}
                tag={tag}
                onRename={renameGlobalTag}
                onDelete={deleteGlobalTag}
              />
            ))}
          </ul>
        )}
      </Field>
    </div>
  );
}

function TagRow({
  tag,
  onRename,
  onDelete,
}: {
  tag: string;
  onRename: (oldName: string, newName: string) => Promise<void>;
  onDelete: (tagName: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(tag);
  const [error, setError] = useState("");

  const startEdit = useCallback(() => {
    setValue(tag);
    setError("");
    setEditing(true);
  }, [tag]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setError("");
  }, []);

  const commitRename = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError(t("settings.tags.rename_empty_error"));
      return;
    }
    if (trimmed === tag) {
      setEditing(false);
      return;
    }
    await onRename(tag, trimmed);
    setEditing(false);
  }, [value, tag, onRename, t]);

  const handleDelete = useCallback(async () => {
    if (!confirm(t("settings.tags.delete_confirm", { tag }))) return;
    await onDelete(tag);
  }, [tag, onDelete, t]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") commitRename();
      if (e.key === "Escape") cancelEdit();
    },
    [commitRename, cancelEdit],
  );

  return (
    <li className={css["tag-row"]}>
      {editing ? (
        <div className={css["tag-row-edit"]}>
          <input
            className={css["tag-input"]}
            ref={(el) => el?.focus()}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            type="text"
          />
          <Button type="button" size="sm" onClick={commitRename}>
            {t("common.save")}
          </Button>
          <Button type="button" size="sm" variant="bare" onClick={cancelEdit}>
            {t("common.cancel")}
          </Button>
          {error && <span className={css["error"]}>{error}</span>}
        </div>
      ) : (
        <div className={css["tag-row-display"]}>
          <Tag size="xs">{tag}</Tag>
          <button
            type="button"
            className={css["icon-btn"]}
            title={t("settings.tags.rename")}
            onClick={startEdit}
          >
            <PencilIcon size={14} />
          </button>
          <button
            type="button"
            className={css["icon-btn"]}
            title={t("settings.tags.delete")}
            onClick={handleDelete}
          >
            <Trash2Icon size={14} />
          </button>
        </div>
      )}
    </li>
  );
}
