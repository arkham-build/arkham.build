import css from "./card-pack-quantity.module.css";

interface Props {
  quantity: number;
}

export function CardPackQuantity({ quantity }: Props) {
  return (
    <span className={css["quantity"]}>
      <i className="icon-card-outline-bold" />×{quantity}
    </span>
  );
}
