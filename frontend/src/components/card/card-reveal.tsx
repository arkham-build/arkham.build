import css from "./card-reveal.module.css";

type Props = {
  children: React.ReactNode;
  open: boolean;
};

export function CardReveal({ children, open }: Props) {
  return (
    <div
      aria-hidden={!open}
      className={css["reveal"]}
      data-state={open ? "open" : "closed"}
      inert={!open}
    >
      {children}
    </div>
  );
}
