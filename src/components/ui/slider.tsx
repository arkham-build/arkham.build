import type { SliderProps } from "@radix-ui/react-slider";
import { Range, Root, Thumb, Track } from "@radix-ui/react-slider";
import { cx } from "@/utils/cx";
import { range } from "@/utils/range";
import css from "./slider.module.css";

export interface Props extends SliderProps {
  className?: string;
  thumbCount?: number;
}

export function Slider(props: Props) {
  const { className, thumbCount = 1, ...rest } = props;
  return (
    <Root {...rest} className={cx(css["slider"], className)}>
      <Track className={cx(css["track"])}>
        <Range className={cx(css["range"])} />
      </Track>
      {range(0, thumbCount).map((i) => (
        <Thumb className={css["thumb"]} key={i} />
      ))}
    </Root>
  );
}
