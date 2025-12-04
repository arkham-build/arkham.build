import css from "./settings.module.css";

type Props = {
  title: React.ReactNode;
  children: React.ReactNode;
};

export function Section(props: Props) {
  return (
    <section className={css["section"]}>
      <header className={css["section-header"]}>
        <h2 className={css["section-title"]}>{props.title}</h2>
      </header>
      <div className={css["section-content"]}>{props.children}</div>
    </section>
  );
}
