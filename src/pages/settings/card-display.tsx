import { ListCardInner } from "@/components/list-card/list-card-inner";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useStore } from "@/store";
import type { SettingsState } from "@/store/slices/settings.types";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import css from "./card-display.module.css";
import type { SettingProps } from "./types";

const PREVIEW_CARDS = ["01033", "11076", "10035"];

export function CardDisplaySettings(props: SettingProps) {
  const { settings, setSettings } = props;

  const { t } = useTranslation();

  const metadata = useStore((state) => state.metadata);

  const [liveValue, setLiveValue] = useState<Partial<SettingsState>>(settings);

  return (
    <Field className={css["field"]} bordered>
      <FieldLabel>{t("settings.display.card_display")}</FieldLabel>

      <Field>
        <Checkbox
          id="show-pack-icon"
          label={t("settings.display.card_show_collection_number")}
          checked={
            liveValue.cardShowCollectionNumber ??
            settings.cardShowCollectionNumber
          }
          onCheckedChange={(value) => {
            setLiveValue({ cardShowCollectionNumber: !!value });
            setSettings({ ...settings, cardShowCollectionNumber: !!value });
          }}
        />
      </Field>

      <CardLevelDisplaySetting
        settings={settings}
        onChange={(value) => {
          setLiveValue({ cardLevelDisplay: value });
          setSettings({ ...settings, cardLevelDisplay: value });
        }}
      />

      <CardSkillIconsSetting
        settings={settings}
        onChange={(value) => {
          setLiveValue({ cardSkillIconsDisplay: value });
          setSettings({ ...settings, cardSkillIconsDisplay: value });
        }}
      />

      <div className={css["preview"]}>
        <h4>{t("settings.preview")}</h4>
        <ol>
          {PREVIEW_CARDS.map((id) => (
            <ListCardInner
              cardLevelDisplay={
                liveValue.cardLevelDisplay ?? settings.cardLevelDisplay
              }
              cardShowCollectionNumber={
                liveValue.cardShowCollectionNumber ??
                settings.cardShowCollectionNumber
              }
              cardSkillIconsDisplay={
                liveValue.cardSkillIconsDisplay ??
                settings.cardSkillIconsDisplay
              }
              as="li"
              key={id}
              card={metadata.cards[id]}
              omitBorders
            />
          ))}
        </ol>
      </div>
    </Field>
  );
}

type CardLevelDisplay = SettingsState["cardLevelDisplay"];

function CardLevelDisplaySetting(props: {
  settings: SettingProps["settings"];
  onChange: (value: CardLevelDisplay) => void;
}) {
  const { onChange, settings } = props;
  const { t } = useTranslation();

  const options = useMemo(
    () => [
      { value: "icon-only", label: t("settings.display.card_level_icon_only") },
      { value: "dots", label: t("settings.display.card_level_as_dots") },
      { value: "text", label: t("settings.display.card_level_as_text") },
    ],
    [t],
  );

  const onChangeValue = useCallback(
    (evt: React.ChangeEvent<HTMLSelectElement>) => {
      const value = evt.target.value as CardLevelDisplay;
      onChange(value);
    },
    [onChange],
  );

  return (
    <Field>
      <FieldLabel htmlFor="display-card-level">
        {t("settings.display.card_level")}
      </FieldLabel>
      <div>
        <Select
          className={css["input"]}
          onChange={onChangeValue}
          options={options}
          required
          name="display-card-level"
          defaultValue={settings.cardLevelDisplay ?? "icon-only"}
        />
      </div>
    </Field>
  );
}

type CardSkillIconsDisplay = SettingsState["cardSkillIconsDisplay"];

function CardSkillIconsSetting(props: {
  settings: SettingProps["settings"];
  onChange: (value: CardSkillIconsDisplay) => void;
}) {
  const { onChange, settings } = props;
  const { t } = useTranslation();

  const options = useMemo(
    () => [
      { value: "simple", label: t("settings.display.card_skill_icons_simple") },
      {
        value: "as_printed",
        label: t("settings.display.card_skill_icons_as_printed"),
      },
    ],
    [t],
  );

  const onChangeValue = useCallback(
    (evt: React.ChangeEvent<HTMLSelectElement>) => {
      const value = evt.target.value as CardSkillIconsDisplay;
      onChange(value);
    },
    [onChange],
  );

  return (
    <Field>
      <FieldLabel htmlFor="display-card-skill-icons">
        {t("settings.display.card_skill_icons")}
      </FieldLabel>
      <div>
        <Select
          className={css["input"]}
          onChange={onChangeValue}
          options={options}
          required
          name="display-card-skill-icons"
          defaultValue={settings.cardSkillIconsDisplay ?? "simple"}
        />
      </div>
    </Field>
  );
}
