import { useCallback, useRef } from "react";
import { assert } from "@/utils/assert";
import { cx } from "@/utils/cx";
import { range } from "@/utils/range";
import css from "./slider.module.css";

type SliderStyle = React.CSSProperties & {
  "--slider-range-end"?: string;
  "--slider-range-start"?: string;
  "--slider-thumb-offset"?: string;
};

export interface Props extends Omit<
  React.ComponentPropsWithoutRef<"span">,
  "defaultValue" | "dir" | "onChange" | "onLostPointerCapture" | "value"
> {
  className?: string;
  disabled?: boolean;
  id?: string;
  max?: number;
  min?: number;
  onLostPointerCapture?(event: React.PointerEvent<HTMLElement>): void;
  onValueChange?(value: number[]): void;
  onValueCommit?(value: number[]): void;
  step?: number;
  thumbCount?: number;
  value: number[];
}

export function Slider(props: Props) {
  const {
    className,
    disabled = false,
    id,
    max = 100,
    min = 0,
    onKeyDown,
    onLostPointerCapture,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onValueChange,
    onValueCommit,
    step = 1,
    thumbCount = 1,
    value,
    ...rest
  } = props;

  assert(
    thumbCount === 1 || thumbCount === 2,
    "Slider supports one or two thumbs.",
  );
  assert(
    value.length === thumbCount,
    "Slider value count must match thumb count.",
  );
  assert(max > min, "Slider max must be greater than min.");
  assert(step > 0, "Slider step must be greater than zero.");

  const rootRef = useRef<HTMLSpanElement | null>(null);
  const thumbRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const activeIndexRef = useRef(0);
  const activePointerIdRef = useRef<number | null>(null);
  const startValueRef = useRef(value);
  const valueRef = useRef(value);

  valueRef.current = value;

  const updateValue = useCallback(
    (nextValue: number, index: number, commit = false) => {
      const result = getNextValues(
        valueRef.current,
        nextValue,
        index,
        min,
        max,
        step,
      );
      if (valuesEqual(valueRef.current, result.values)) return;

      activeIndexRef.current = result.activeIndex;
      valueRef.current = result.values;
      onValueChange?.(result.values);
      thumbRefs.current[result.activeIndex]?.focus();

      if (commit) onValueCommit?.(result.values);
    },
    [max, min, onValueChange, onValueCommit, step],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>, thumbIndex: number | null) => {
      onPointerDown?.(event as React.PointerEvent<HTMLSpanElement>);
      if (event.defaultPrevented || disabled || event.button !== 0) return;

      const pointerValue = getPointerValue(
        rootRef.current,
        event.clientX,
        min,
        max,
      );
      const index =
        thumbIndex ?? getClosestValueIndex(valueRef.current, pointerValue);

      activeIndexRef.current = index;
      activePointerIdRef.current = event.pointerId;
      startValueRef.current = valueRef.current;

      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      thumbRefs.current[index]?.focus();

      if (thumbIndex == null) updateValue(pointerValue, index);
    },
    [disabled, max, min, onPointerDown, updateValue],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      onPointerMove?.(event as React.PointerEvent<HTMLSpanElement>);
      if (event.defaultPrevented || disabled) return;
      if (activePointerIdRef.current !== event.pointerId) return;
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

      updateValue(
        getPointerValue(rootRef.current, event.clientX, min, max),
        activeIndexRef.current,
      );
    },
    [disabled, max, min, onPointerMove, updateValue],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      onPointerUp?.(event as React.PointerEvent<HTMLSpanElement>);
      if (activePointerIdRef.current !== event.pointerId) return;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      activePointerIdRef.current = null;

      if (!valuesEqual(startValueRef.current, valueRef.current)) {
        onValueCommit?.(valueRef.current);
      }
    },
    [onPointerUp, onValueCommit],
  );

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      onPointerCancel?.(event as React.PointerEvent<HTMLSpanElement>);
      if (activePointerIdRef.current === event.pointerId) {
        activePointerIdRef.current = null;
      }
    },
    [onPointerCancel],
  );

  const handleLostPointerCapture = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      onLostPointerCapture?.(event);
      if (activePointerIdRef.current === event.pointerId) {
        activePointerIdRef.current = null;
      }
    },
    [onLostPointerCapture],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLSpanElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || disabled) return;

      const thumbIndex = getThumbIndex(event.currentTarget);
      if (thumbIndex != null) activeIndexRef.current = thumbIndex;

      if (event.key === "Home") {
        event.preventDefault();
        updateValue(min, 0, true);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        updateValue(max, valueRef.current.length - 1, true);
        return;
      }

      const direction = getStepDirection(event);
      if (direction == null) return;

      event.preventDefault();
      const multiplier = getStepMultiplier(event);
      const index = activeIndexRef.current;
      updateValue(
        valueRef.current[index] + step * multiplier * direction,
        index,
        true,
      );
    },
    [disabled, max, min, onKeyDown, step, updateValue],
  );

  const percentages = value.map((item) => valueToPercentage(item, min, max));
  const rangeStyle: SliderStyle = {
    "--slider-range-end": `${100 - Math.max(...percentages)}%`,
    "--slider-range-start": `${thumbCount > 1 ? Math.min(...percentages) : 0}%`,
  };

  return (
    <span
      {...rest}
      aria-disabled={disabled}
      className={cx(css["slider"], className)}
      data-disabled={disabled ? "" : undefined}
      id={id}
      ref={rootRef}
    >
      <button
        aria-hidden
        className={cx(css["track"])}
        data-disabled={disabled ? "" : undefined}
        disabled={disabled}
        onLostPointerCapture={handleLostPointerCapture}
        onPointerCancel={handlePointerCancel}
        onPointerDown={(event) => handlePointerDown(event, null)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        tabIndex={-1}
        type="button"
      >
        <span className={cx(css["range"])} style={rangeStyle} />
      </button>
      {range(0, thumbCount).map((index) => {
        const thumbStyle: SliderStyle = {
          "--slider-thumb-offset": `${percentages[index]}%`,
        };

        return (
          <span
            aria-disabled={disabled}
            aria-label={getThumbLabel(props["aria-label"], thumbCount, index)}
            aria-labelledby={
              thumbCount === 2 ? undefined : props["aria-labelledby"]
            }
            aria-orientation="horizontal"
            aria-valuemax={max}
            aria-valuemin={min}
            aria-valuenow={value[index]}
            className={css["thumb"]}
            data-disabled={disabled ? "" : undefined}
            data-slider-thumb-index={index}
            key={index}
            onFocus={() => {
              activeIndexRef.current = index;
            }}
            onKeyDown={handleKeyDown}
            onLostPointerCapture={handleLostPointerCapture}
            onPointerCancel={handlePointerCancel}
            onPointerDown={(event) => handlePointerDown(event, index)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            ref={(node) => {
              thumbRefs.current[index] = node;
            }}
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- can't use input here
            role="slider"
            style={thumbStyle}
            tabIndex={disabled ? undefined : 0}
          />
        );
      })}
    </span>
  );
}

function getThumbLabel(
  label: string | undefined,
  thumbCount: number,
  index: number,
): string | undefined {
  if (thumbCount !== 2) return label;

  return index === 0 ? "Minimum" : "Maximum";
}

function getPointerValue(
  root: HTMLElement | null,
  clientX: number,
  min: number,
  max: number,
): number {
  assert(root, "Slider root must be mounted.");

  const rect = root.getBoundingClientRect();
  assert(rect.width > 0, "Slider width must be greater than zero.");

  const ratio = (clientX - rect.left) / rect.width;
  return min + (max - min) * ratio;
}

function getNextValues(
  values: number[],
  value: number,
  index: number,
  min: number,
  max: number,
  step: number,
): { activeIndex: number; values: number[] } {
  const nextValue = clampValue(snapValue(value, min, step), min, max);
  const nextValues = [...values];
  nextValues[index] = nextValue;
  nextValues.sort((a, b) => a - b);

  return {
    activeIndex: nextValues.indexOf(nextValue),
    values: nextValues,
  };
}

function snapValue(value: number, min: number, step: number): number {
  const decimalCount = getDecimalCount(step);
  const rounded = Math.round((value - min) / step) * step + min;
  return roundValue(rounded, decimalCount);
}

function valueToPercentage(value: number, min: number, max: number): number {
  return clampValue(((value - min) / (max - min)) * 100, 0, 100);
}

function getStepDirection(event: React.KeyboardEvent): number | null {
  switch (event.key) {
    case "ArrowDown":
    case "ArrowLeft":
    case "PageDown":
      return -1;
    case "ArrowRight":
    case "ArrowUp":
    case "PageUp":
      return 1;
    default:
      return null;
  }
}

function getStepMultiplier(event: React.KeyboardEvent): number {
  if (event.key === "PageDown" || event.key === "PageUp") return 10;
  if (event.shiftKey && event.key.startsWith("Arrow")) return 10;
  return 1;
}

function getClosestValueIndex(values: number[], value: number): number {
  const distances = values.map((item) => Math.abs(item - value));
  const closestDistance = Math.min(...distances);
  return distances.indexOf(closestDistance);
}

function getThumbIndex(target: EventTarget): number | null {
  if (!(target instanceof HTMLElement)) return null;

  const value = target.dataset.sliderThumbIndex;
  if (value == null) return null;

  return Number(value);
}

function valuesEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getDecimalCount(value: number): number {
  return (String(value).split(".")[1] || "").length;
}

function roundValue(value: number, decimalCount: number): number {
  const rounder = 10 ** decimalCount;
  return Math.round(value * rounder) / rounder;
}
