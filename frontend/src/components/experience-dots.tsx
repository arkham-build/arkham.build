import { range } from "@/utils/range";

type Props = {
  className?: string;
  xp: number;
};

export function ExperienceDots(props: Props) {
  const negative = props.xp < 0;
  return (
    <span className={props.className}>
      {range(0, Math.abs(props.xp)).map(() => (negative ? "-" : "•"))}
    </span>
  );
}
