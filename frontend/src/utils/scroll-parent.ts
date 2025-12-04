function isScrolling(
  node: Node | null | undefined,
): node is Element | Document {
  if (node instanceof Element) {
    const overflow = getComputedStyle(node, null).getPropertyValue("overflow");
    return overflow.indexOf("scroll") > -1 || overflow.indexOf("auto") > -1;
  }

  return false;
}

export function getScrollParent(
  node: Element | null,
): Document | Element | undefined {
  if (!(node instanceof HTMLElement || node instanceof SVGElement)) {
    return undefined;
  }

  let current = node.parentNode;

  while (current?.parentNode) {
    if (isScrolling(current)) {
      return current;
    }

    current = current.parentNode;
  }

  return document.scrollingElement || document.documentElement;
}
