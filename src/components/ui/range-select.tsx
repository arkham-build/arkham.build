import { useCallback, useEffect, useState } from "react";
import { cx } from "@/utils/cx";
import css from "./range-select.module.css";
import type { Props as SliderProps } from "./slider";
import { Slider } from "./slider";

interface Props extends Omit<SliderProps, "defaultValue"> {
  className?: string;
  children?: React.ReactNode;
  id: string;
  label: React.ReactNode;
  min: number;
  max: number;
  showLabel?: boolean;
  sliderClassName?: string;
  outputClassName?: string;
  renderLabel?: (value: number) => string | number;
  value: [number, number];
}

export function RangeSelect(props: Props) {
  const {
    className,
    sliderClassName,
    outputClassName,
    id,
    label,
    min,
    max,
    onValueCommit,
    showLabel,
    value,
    renderLabel,
    ...rest
  } = props;

  const [liveValue, setLiveValue] = useState(value);

  useEffect(() => {
    setLiveValue(value);
  }, [value]);

  const onValueChange = useCallback((value: number[]) => {
    setLiveValue([value[0], value[1]]);
  }, []);

  return (
    <div className={cx(css["field"], className)}>
      <label className={cx(css["label"], !showLabel && "sr-only")} htmlFor={id}>
        {label}
      </label>
      <Slider
        {...rest}
        className={sliderClassName}
        id={id}
        max={max}
        min={min}
        onLostPointerCapture={() => {
          if (liveValue[0] !== value[0] || liveValue[1] !== value[1]) {
            onValueCommit?.(liveValue);
          }
        }}
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
        step={1}
        thumbCount={2}
        value={liveValue}
      />
      <div className={css["limits"]}>
        <output tabIndex={-1} className={outputClassName}>
          {renderLabel ? renderLabel(liveValue[0]) : liveValue[0]}
        </output>
        <output tabIndex={-1} className={outputClassName}>
          {renderLabel ? renderLabel(liveValue[1]) : liveValue[1]}
        </output>
      </div>
    </div>
  );
}
