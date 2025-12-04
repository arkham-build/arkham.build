import { ALargeSmallIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Field, FieldLabel } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import css from "./font-size.module.css";
import type { SettingProps } from "./types";

export function FontSizeSetting(props: SettingProps) {
  const { settings, setSettings } = props;

  const { t } = useTranslation();

  const min = 85;
  const max = 125;

  const value = useMemo(() => [settings.fontSize], [settings]);

  const [liveValue, setLiveValue] = useState(value);

  const onValueChange = useCallback(
    (values: number[]) => {
      setSettings({
        ...settings,
        fontSize: values[0],
      });
    },
    [setSettings, settings],
  );

  const onLiveValueChange = useCallback((values: number[]) => {
    setLiveValue(values);
  }, []);

  const onLostPointerCapture = useCallback(() => {
    if (liveValue[0] !== value[0] || liveValue[1] !== value[1]) {
      onValueChange?.(liveValue);
    }
  }, [liveValue, onValueChange, value]);

  return (
    <Field className={css["field"]} bordered>
      <FieldLabel htmlFor="font-size">
        <ALargeSmallIcon />
        {t("settings.display.font_size")}
      </FieldLabel>
      <div className={css["input"]}>
        <Slider
          id="font-size"
          onLostPointerCapture={onLostPointerCapture}
          onValueChange={onLiveValueChange}
          onValueCommit={onValueChange}
          min={min}
          max={max}
          step={5}
          value={liveValue}
        />
        <span>{liveValue}%</span>
      </div>
      <div className={css["preview"]} style={{ fontSize: `${liveValue[0]}%` }}>
        <h4>{t("settings.preview")}</h4>
        <p>{t("settings.display.font_size_preview")}</p>
      </div>
    </Field>
  );
}
