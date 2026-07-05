const SYMBOL_PATTERN = /\[((?:\w|_)+?)\]/g;

type Props = {
  children: string;
};

export function CardTagLabel({ children }: Props) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of children.matchAll(SYMBOL_PATTERN)) {
    const index = match.index;
    const symbol = match[1];
    if (index == null || !symbol) continue;

    if (index > lastIndex) {
      nodes.push(children.slice(lastIndex, index));
    }

    nodes.push(<i aria-hidden className={`icon-${symbol}`} key={index} />);
    lastIndex = index + match[0].length;
  }

  if (lastIndex < children.length) {
    nodes.push(children.slice(lastIndex));
  }

  return <>{nodes}</>;
}
