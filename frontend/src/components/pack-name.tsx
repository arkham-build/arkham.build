import type { Cycle } from "@/store/schemas/cycle.schema";
import type { Pack } from "@/store/schemas/pack.schema";
import { displayPackName, shortenPackName } from "@/utils/formatting";
import PackIcon from "./icons/pack-icon";

type Props = {
  pack: Pack | Cycle;
  shortenNewFormat?: boolean;
};

export function PackName(props: Props) {
  const { pack, shortenNewFormat } = props;

  return (
    <>
      <PackIcon code={pack.code} />
      {shortenNewFormat ? shortenPackName(pack as Pack) : displayPackName(pack)}
    </>
  );
}
