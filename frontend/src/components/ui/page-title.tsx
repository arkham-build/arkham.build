interface Props {
  children: string;
}

export function PageTitle({ children }: Props) {
  return <title>{`${children} · ${import.meta.env.VITE_PAGE_NAME}`}</title>;
}
