import type { Placement, UseTransitionStylesProps } from "@floating-ui/react";

export const MOTION_EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

export function floatingTransitionStyles(
  reducedMotion: boolean,
): UseTransitionStylesProps {
  if (reducedMotion) {
    return {
      duration: { open: 100, close: 50 },
      common: { transitionTimingFunction: "linear" },
      initial: { opacity: 0 },
      open: { opacity: 1 },
    };
  }

  return {
    duration: { open: 150, close: 80 },
    common: ({ placement }: { placement: Placement }) => ({
      transformOrigin: transformOriginForPlacement(placement),
      transitionTimingFunction: MOTION_EASE_OUT,
    }),
    initial: { opacity: 0, transform: "scale(0.96)" },
    open: { opacity: 1, transform: "scale(1)" },
  };
}

export function tooltipTransitionStyles(): UseTransitionStylesProps {
  return {
    duration: { open: 120, close: 60 },
    common: { transitionTimingFunction: MOTION_EASE_OUT },
    initial: { opacity: 0 },
    open: { opacity: 1 },
  };
}

export function dialogTransitionStyles(
  reducedMotion: boolean,
): UseTransitionStylesProps {
  return {
    duration: reducedMotion
      ? { open: 100, close: 50 }
      : { open: 200, close: 100 },
    common: {
      transitionTimingFunction: reducedMotion ? "linear" : MOTION_EASE_OUT,
    },
    initial: { opacity: 0 },
    open: { opacity: 1 },
  };
}

function transformOriginForPlacement(placement: Placement) {
  const [side, alignment] = placement.split("-");
  const crossAxisOrigin =
    alignment === "start" ? "0%" : alignment === "end" ? "100%" : "50%";

  if (side === "top" || side === "bottom") {
    const blockOrigin = side === "top" ? "100%" : "0%";
    return `${crossAxisOrigin} ${blockOrigin}`;
  }

  const inlineOrigin = side === "left" ? "100%" : "0%";
  return `${inlineOrigin} ${crossAxisOrigin}`;
}
