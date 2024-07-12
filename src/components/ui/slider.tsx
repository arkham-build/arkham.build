import type { SliderProps } from "@radix-ui/react-slider";
import { Range, Root, Thumb, Track } from "@radix-ui/react-slider";
import clsx from "clsx";

import { range } from "@/utils/range";

import css from "./slider.module.css";

export type Props = SliderProps & {
  className?: string;
  thumbCount?: number;
};

export function Slider(props: Props) {
  const { className, thumbCount = 1, ...rest } = props;
  return (
    <Root {...rest} className={clsx(css["slider"], className)}>
      <Track className={clsx(css["track"])}>
        <Range className={clsx(css["range"])} />
      </Track>
      {range(0, thumbCount).map((i) => (
        <Thumb className={css["thumb"]} key={i} />
      ))}
    </Root>
  );
}
