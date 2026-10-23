"use client";

import { useEffect, useRef, type RefObject } from "react";
import { loadMotionEngine } from "@/lib/motion/engine";
import { MOTION_TOKENS, readMotionDuration, readMotionToken } from "@/lib/motion/tokens";

export function usePageTransition(
  target: RefObject<HTMLElement | null>,
  pageKey: string,
) {
  const mounted = useRef(false);
  useEffect(() => {
    const element = target.current;
    if (!element) return;
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let tween: { kill: () => void } | undefined;
    void loadMotionEngine().then(({ gsap }) => {
      if (cancelled) return;
      tween = gsap.fromTo(
        element,
        { opacity: 0.94 },
        {
          opacity: 1,
          duration: readMotionDuration(MOTION_TOKENS.routeDuration, 0.18),
          ease: readMotionToken(MOTION_TOKENS.gsapEase, "power3.out"),
          overwrite: true,
          clearProps: "opacity",
        },
      );
    });
    return () => {
      cancelled = true;
      tween?.kill();
    };
  }, [pageKey, target]);
}
