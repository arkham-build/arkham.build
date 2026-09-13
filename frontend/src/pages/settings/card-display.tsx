import type { Settings } from "@arkham-build/shared";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { CardTagList } from "@/components/card-tags/card-tag-list";
import { ListCardInner } from "@/components/list-card/list-card-inner";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useStore } from "@/store";
import type { TagItem } from "@/store/selectors/card-tags";
import { selectMetadata } from "@/store/selectors/shared";
import { getAccentColorsForFaction } from "@/utils/use-accent-color";
import css from "./card-display.module.css";
import type { SettingProps } from "./types";

const PREVIEW_CARDS = ["01033", "11076", "10035"];

function getPreviewCardTags(code: string): TagItem[] {
  switch (code) {
    case "01033":
      return [
        {
          code: "economy",
          global: false,
          tag: "Economy",
        },
        {
          code: "intellect-boost",
          global: false,
          tag: "[intellect] boost",
        },
      ];
    case "11076":
      return [
        {
          code: "meme",
          global: true,
          tag: "Meme",
        },
      ];
    default:
      return [];
  }
}

export function CardDisplaySettings(props: SettingProps) {
  const { settings, setSettings } = props;

  const { t } = useTranslation();

  const metadata = useStore(selectMetadata);

  const [liveValue, setLiveValue] = useState<Partial<Settings>>(settings);

  const setValue = useCallback(
    (value: Partial<Settings>) => {
      setLiveValue((prev) => ({ ...prev, ...value }));
      setSettings((prev) => ({ ...prev, ...value }));
    },
    [setSettings],
  );

  const resolve = resolver(liveValue, settings);

  return (
    <Field className={css["field"]} bordered>
      <FieldLabel as="h3">{t("settings.display.card_display")}</FieldLabel>

      <div className={css["content"]}>
        <div className={css["controls"]}>
          <div className={css["select-controls"]}>
            <Field>
              <FieldLabel htmlFor="display-card-size">
                {t("settings.display.card_size")}
              </FieldLabel>
              <Select
                className={css["input"]}
                onChange={(evt) => {
                  setValue({
                    cardSize: evt.target.value as Settings["cardSize"],
                  });
                }}
                options={[
                  { value: "sm", label: t("settings.display.card_size_sm") },
                  {
                    value: "standard",
                    label: t("settings.display.card_size_standard"),
                  },
                ]}
                required
                name="display-card-size"
                value={resolve("cardSize") ?? "standard"}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="display-card-level">
                {t("settings.display.card_level")}
              </FieldLabel>
              <Select
                className={css["input"]}
                onChange={(evt) => {
                  setValue({
                    cardLevelDisplay: evt.target
                      .value as Settings["cardLevelDisplay"],
                  });
                }}
                options={[
                  {
                    value: "icon-only",
                    label: t("settings.display.card_level_icon_only"),
                  },
                  {
                    value: "dots",
                    label: t("settings.display.card_level_as_dots"),
                  },
                  {
                    value: "text",
                    label: t("settings.display.card_level_as_text"),
                  },
                ]}
                required
                name="display-card-level"
                value={resolve("cardLevelDisplay")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="display-card-skill-icons">
                {t("settings.display.card_skill_icons")}
              </FieldLabel>
              <Select
                className={css["input"]}
                onChange={(evt) => {
                  setValue({
                    cardSkillIconsDisplay: evt.target
                      .value as Settings["cardSkillIconsDisplay"],
                  });
                }}
                options={[
                  {
                    value: "simple",
                    label: t("settings.display.card_skill_icons_simple"),
                  },
                  {
                    value: "as_printed",
                    label: t("settings.display.card_skill_icons_as_printed"),
                  },
                ]}
                required
                name="display-card-skill-icons"
                value={resolve("cardSkillIconsDisplay")}
              />
            </Field>
          </div>

          <div className={css["toggle-controls"]}>
            <div className={css["toggle-column"]}>
              <Field>
                <Checkbox
                  id="show-thumbnail"
                  label={t("settings.display.card_show_thumbnail")}
                  checked={resolve("cardShowThumbnail")}
                  onCheckedChange={(value) => {
                    setValue({ cardShowThumbnail: !!value });
                  }}
                />
              </Field>

              <Field>
                <Checkbox
                  id="show-icon"
                  label={t("settings.display.card_show_icon")}
                  checked={resolve("cardShowIcon")}
                  onCheckedChange={(value) => {
                    setValue({ cardShowIcon: !!value });
                  }}
                />
              </Field>

              <Field>
                <Checkbox
                  id="show-details"
                  label={t("settings.display.card_show_details")}
                  checked={resolve("cardShowDetails")}
                  onCheckedChange={(value) => {
                    setValue({ cardShowDetails: !!value });
                  }}
                />
              </Field>

              <Field>
                <Checkbox
                  id="show-unique-icon"
                  label={t("settings.display.card_show_unique_icon")}
                  checked={resolve("cardShowUniqueIcon")}
                  onCheckedChange={(value) => {
                    setValue({ cardShowUniqueIcon: !!value });
                  }}
                />
              </Field>
            </div>

            <div className={css["toggle-column"]}>
              <Field>
                <Checkbox
                  id="show-pack-icon"
                  label={t("settings.display.card_show_collection_number")}
                  checked={resolve("cardShowCollectionNumber")}
                  onCheckedChange={(value) => {
                    setValue({ cardShowCollectionNumber: !!value });
                  }}
                />
              </Field>

              <Field>
                <Checkbox
                  id="show-tags"
                  label={t("settings.display.card_show_tags")}
                  checked={resolve("cardShowTags") ?? true}
                  onCheckedChange={(value) => {
                    setValue({ cardShowTags: !!value });
                  }}
                />
              </Field>

              <Field>
                <Checkbox
                  id="show-favorite-highlights"
                  label={t("settings.display.card_show_favorite_highlights")}
                  checked={resolve("cardShowFavoriteHighlights") ?? true}
                  onCheckedChange={(value) => {
                    setValue({ cardShowFavoriteHighlights: !!value });
                  }}
                />
              </Field>
            </div>
          </div>
        </div>

        <div className={css["preview"]}>
          <h4>{t("settings.preview")}</h4>
          <ol>
            {PREVIEW_CARDS.map((id) => {
              const card = metadata.cards[id];
              const tags = getPreviewCardTags(id);
              const favorite = id === "01033";
              const showFavoriteHighlight =
                favorite && (resolve("cardShowFavoriteHighlights") ?? true);

              if (!card) return null;
              return (
                <ListCardInner
                  as="li"
                  card={card}
                  cardLevelDisplay={resolve("cardLevelDisplay")}
                  cardShowCollectionNumber={resolve("cardShowCollectionNumber")}
                  cardSkillIconsDisplay={resolve("cardSkillIconsDisplay")}
                  cardShowUniqueIcon={resolve("cardShowUniqueIcon")}
                  className={
                    showFavoriteHighlight ? css["favorite"] : undefined
                  }
                  key={id}
                  omitBorders
                  omitDetails={!resolve("cardShowDetails")}
                  omitIcon={!resolve("cardShowIcon")}
                  omitThumbnail={!resolve("cardShowThumbnail")}
                  renderCardTags={
                    (resolve("cardShowTags") ?? true) && tags.length
                      ? () => <CardTagList card={card} items={tags} />
                      : undefined
                  }
                  size={resolve("cardSize")}
                  style={
                    showFavoriteHighlight
                      ? getAccentColorsForFaction(card)
                      : undefined
                  }
                />
              );
            })}
          </ol>
        </div>
      </div>
    </Field>
  );
}

function resolver(liveValue: Partial<Settings>, settings: Settings) {
  return function resolve<K extends keyof Settings>(key: K): Settings[K] {
    return liveValue[key] ?? settings[key];
  };
}
