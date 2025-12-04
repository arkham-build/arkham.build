import { createPortal } from "react-dom";

interface HeadProps {
  children: React.ReactNode;
}

export function Head({ children }: HeadProps) {
  return createPortal(children, document.head);
}
