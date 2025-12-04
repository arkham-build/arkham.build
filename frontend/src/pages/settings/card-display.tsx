import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ListCardInner } from "@/components/list-card/list-card-inner";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useStore } from "@/store";
import { selectMetadata } from "@/store/selectors/shared";
import type { SettingsState } from "@/store/slices/settings.types";
import css from "./card-display.module.css";
import type { SettingProps } from "./types";

const PREVIEW_CARDS = ["01033", "11076", "10035"];

export function CardDisplaySettings(props: SettingProps) {
  const { settings, setSettings } = props;

  const { t } = useTranslation();

  const metadata = useStore(selectMetadata);

  const [liveValue, setLiveValue] = useState<Partial<SettingsState>>(settings);

  const setValue = useCallback(
    (value: Partial<SettingsState>) => {
      setLiveValue((prev) => ({ ...prev, ...value }));
      setSettings((prev) => ({ ...prev, ...value }));
    },
    [setSettings],
  );

  const resolve = resolver(liveValue, settings);

  return (
    <Field className={css["field"]} bordered>
      <FieldLabel>{t("settings.display.card_display")}</FieldLabel>

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
          id="show-unique-icon"
          label={t("settings.display.card_show_unique_icon")}
          checked={resolve("cardShowUniqueIcon")}
          onCheckedChange={(value) => {
            setValue({ cardShowUniqueIcon: !!value });
          }}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="display-card-size">
          {t("settings.display.card_size")}
        </FieldLabel>
        <Select
          className={css["input"]}
          onChange={(evt) => {
            setValue({
              cardSize: evt.target.value as SettingsState["cardSize"],
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
        <div>
          <Select
            className={css["input"]}
            onChange={(evt) => {
              setValue({
                cardLevelDisplay: evt.target
                  .value as SettingsState["cardLevelDisplay"],
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
        </div>
      </Field>

      <Field>
        <FieldLabel htmlFor="display-card-skill-icons">
          {t("settings.display.card_skill_icons")}
        </FieldLabel>
        <div>
          <Select
            className={css["input"]}
            onChange={(evt) => {
              setValue({
                cardSkillIconsDisplay: evt.target
                  .value as SettingsState["cardSkillIconsDisplay"],
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
        </div>
      </Field>

      <div className={css["preview"]}>
        <h4>{t("settings.preview")}</h4>
        <ol>
          {PREVIEW_CARDS.map((id) => {
            const card = metadata.cards[id];
            if (!card) return null;
            return (
              <ListCardInner
                as="li"
                card={card}
                cardLevelDisplay={resolve("cardLevelDisplay")}
                cardShowCollectionNumber={resolve("cardShowCollectionNumber")}
                cardSkillIconsDisplay={resolve("cardSkillIconsDisplay")}
                cardShowUniqueIcon={resolve("cardShowUniqueIcon")}
                key={id}
                omitBorders
                omitDetails={!resolve("cardShowDetails")}
                omitIcon={!resolve("cardShowIcon")}
                omitThumbnail={!resolve("cardShowThumbnail")}
                size={resolve("cardSize")}
              />
            );
          })}
        </ol>
      </div>
    </Field>
  );
}

function resolver(liveValue: Partial<SettingsState>, settings: SettingsState) {
  return function resolve<K extends keyof SettingsState>(
    key: K,
  ): SettingsState[K] {
    return liveValue[key] ?? settings[key];
  };
}
