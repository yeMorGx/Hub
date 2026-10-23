"use client";

import {
  AnimatePresence,
  MotionConfig,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { loadMotionEngine } from "@/lib/motion/engine";
import {
  MOTION_TOKENS,
  readMotionBezier,
  readMotionDistance,
  readMotionDuration,
  readMotionToken,
} from "@/lib/motion/tokens";

type MotionScope = RefObject<HTMLElement | null>;

export function useScrollReveal(scope: MotionScope) {
  useEffect(() => {
    const root = scope.current;
    if (
      !root ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !root.querySelector(
        "[data-motion-reveal], [data-motion-split], [data-motion-pin], [data-motion-parallax]",
      )
    ) {
      return;
    }

    let cancelled = false;
    let revert = () => {};
    void loadMotionEngine().then(({ gsap, ScrollTrigger }) => {
      if (cancelled) return;
      const context = gsap.context(() => {
        const duration = readMotionDuration(MOTION_TOKENS.revealDuration, 0.72);
        const distance = readMotionDistance(MOTION_TOKENS.revealDistance, 32);
        const ease = readMotionToken(MOTION_TOKENS.gsapEase, "power3.out");
        const stagger = readMotionDuration(MOTION_TOKENS.stagger, 0.075);

        root.querySelectorAll<HTMLElement>("[data-motion-split]").forEach((heading) => {
          const words = heading.querySelectorAll<HTMLElement>(".motion-split-word");
          if (!words.length) return;
          gsap.fromTo(
            words,
            { opacity: 0, y: distance * 0.7 },
            {
              opacity: 1,
              y: 0,
              duration: duration * 0.8,
              stagger: Math.min(stagger, 0.06),
              ease,
              delay: 0.04,
              immediateRender: false,
            },
          );
        });

        root.querySelectorAll<HTMLElement>("[data-motion-reveal]").forEach((reveal) => {
          const items = reveal.querySelectorAll<HTMLElement>("[data-motion-item]");
          const targets: HTMLElement[] = items.length ? Array.from(items) : [reveal];
          gsap.fromTo(
            targets,
            { opacity: 0, y: distance },
            {
              opacity: 1,
              y: 0,
              duration,
              stagger: targets.length > 1 ? stagger : 0,
              ease,
              immediateRender: false,
              scrollTrigger: {
                trigger: reveal,
                scroller: root.querySelector<HTMLElement>(".live-app .main-content") ?? window,
                start: "top 85%",
                once: true,
              },
            },
          );
        });

        root.querySelectorAll<HTMLElement>("[data-motion-parallax]").forEach((target) => {
          const image = target.matches("img")
            ? target
            : target.querySelector<HTMLElement>("img");
          if (!image || target.closest("[data-motion-pin]")) return;
          gsap.fromTo(
            image,
            { yPercent: 2, scale: 1.025 },
            {
              yPercent: -2,
              scale: 1.025,
              ease: "none",
              scrollTrigger: {
                trigger: target,
                scroller: root.querySelector<HTMLElement>(".live-app .main-content") ?? window,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.5,
              },
            },
          );
        });
      }, root);

      const media = gsap.matchMedia();
      media.add("(min-width: 960px) and (prefers-reduced-motion: no-preference)", () => {
        root.querySelectorAll<HTMLElement>("[data-motion-pin]").forEach((section) => {
          const target = section.querySelector<HTMLElement>("[data-motion-pin-target]");
          const image = target?.querySelector<HTMLElement>("img");
          if (!target || !image) return;
          gsap.fromTo(
            image,
            { yPercent: 1, scale: 1.03 },
            {
              yPercent: -1,
              scale: 1.03,
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: "top top+=72",
                end: "bottom bottom",
                scrub: 0.55,
                pin: target,
                invalidateOnRefresh: true,
              },
            },
          );
        });
      });
      requestAnimationFrame(() => {
        if (!cancelled) ScrollTrigger.refresh();
      });
      const refreshOnLoad = (event: Event) => {
        if ((event.target as HTMLElement | null)?.tagName === "IMG") {
          ScrollTrigger.refresh();
        }
      };
      root.addEventListener("load", refreshOnLoad, true);
      revert = () => {
        root.removeEventListener("load", refreshOnLoad, true);
        media.revert();
        context.revert();
      };
    });
    return () => {
      cancelled = true;
      revert();
    };
  }, [scope]);
}

export function usePointerMotion(scope: MotionScope) {
  useEffect(() => {
    const root = scope.current;
    if (
      !root ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      return;
    }

    const cleanups: (() => void)[] = [];
    root.querySelectorAll<HTMLElement>("[data-motion-tilt], [data-motion-spotlight]").forEach((target) => {
      const maxTilt = Number.parseFloat(target.dataset.motionTilt ?? "4");
      const spotlight = target.hasAttribute("data-motion-spotlight");
      const layer = spotlight ? document.createElement("span") : null;
      if (layer) {
        layer.className = "motion-spotlight-layer";
        layer.setAttribute("aria-hidden", "true");
        target.insertBefore(layer, target.firstChild);
      }
      let frame = 0;
      let x = 0;
      let y = 0;
      const move = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        const bounds = target.getBoundingClientRect();
        const px = event.clientX - bounds.left;
        const py = event.clientY - bounds.top;
        const rx = ((py / bounds.height) * 2 - 1) * -maxTilt;
        const ry = ((px / bounds.width) * 2 - 1) * maxTilt;
        target.classList.add("is-motion-hover");
        if (target.hasAttribute("data-motion-tilt")) {
          target.classList.add("is-motion-pointer-active");
        }
        x = px;
        y = py;
        if (!frame) {
          frame = requestAnimationFrame(() => {
            target.style.setProperty("--motion-tilt-x", `${rx}deg`);
            target.style.setProperty("--motion-tilt-y", `${ry}deg`);
            if (layer) {
              layer.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
            }
            frame = 0;
          });
        }
      };
      const leave = () => {
        target.classList.remove("is-motion-hover", "is-motion-pointer-active");
        target.style.setProperty("--motion-tilt-x", "0deg");
        target.style.setProperty("--motion-tilt-y", "0deg");
      };
      target.addEventListener("pointermove", move);
      target.addEventListener("pointerleave", leave);
      cleanups.push(() => {
        target.removeEventListener("pointermove", move);
        target.removeEventListener("pointerleave", leave);
        if (frame) cancelAnimationFrame(frame);
        target.classList.remove("is-motion-hover", "is-motion-pointer-active");
        target.style.removeProperty("--motion-tilt-x");
        target.style.removeProperty("--motion-tilt-y");
        layer?.remove();
      });
    });
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [scope]);
}

export function SmoothScrollProvider({
  scope,
  children,
}: {
  scope: MotionScope;
  children: ReactNode;
}) {
  useEffect(() => {
    const root = scope.current;
    const appScroller = root?.querySelector<HTMLElement>(".live-app .main-content");
    const isPublicPage = Boolean(root?.querySelector(".m-page"));
    if (
      !root ||
      (!appScroller && !isPublicPage) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let cancelled = false;
    let cleanup = () => {};
    void loadMotionEngine().then(async ({ gsap, ScrollTrigger }) => {
      const LenisModule = await import("lenis");
      if (cancelled) return;
      const Lenis = LenisModule.default;
      const lenis = new Lenis({
        wrapper: appScroller ?? window,
        content: appScroller ?? document.documentElement,
        autoRaf: false,
        smoothWheel: true,
        syncTouch: false,
        allowNestedScroll: true,
        anchors: true,
        prevent: (node) => Boolean(node.closest("[data-lenis-prevent]")),
      });
      const tick = (time: number) => lenis.raf(time * 1000);
      const visibility = () => {
        if (document.hidden) lenis.stop();
        else lenis.start();
      };
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      document.addEventListener("visibilitychange", visibility);
      requestAnimationFrame(() => ScrollTrigger.refresh());
      cleanup = () => {
        document.removeEventListener("visibilitychange", visibility);
        lenis.off("scroll", ScrollTrigger.update);
        gsap.ticker.remove(tick);
        lenis.destroy();
      };
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [scope]);

  return children;
}

function RouteFrame({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  useScrollReveal(scope);
  usePointerMotion(scope);
  return (
    <motion.div
      ref={scope}
      className="motion-route-frame"
      initial={{ opacity: 0.96 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0.98 }}
      transition={{
        duration: readMotionDuration(MOTION_TOKENS.routeDuration, 0.18),
        ease: readMotionBezier(MOTION_TOKENS.cubicBezier),
      }}
    >
      <SmoothScrollProvider scope={scope}>{children}</SmoothScrollProvider>
    </motion.div>
  );
}

function CursorFollower() {
  const reduceMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const springX = useSpring(x, { stiffness: 740, damping: 48, mass: 0.22 });
  const springY = useSpring(y, { stiffness: 740, damping: 48, mass: 0.22 });

  useEffect(() => {
    const canUseCursor =
      !reduceMotion &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      navigator.maxTouchPoints === 0;
    if (!canUseCursor) return;
    document.body.classList.add("has-motion-cursor");
    setEnabled(true);
    let lastInteractive = false;
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      x.set(event.clientX);
      y.set(event.clientY);
      const target = event.target instanceof Element
        ? event.target.closest("a[href], button:not(:disabled), [role='button'], [data-motion-tilt]")
        : null;
      const nextInteractive = Boolean(target);
      if (lastInteractive !== nextInteractive) {
        lastInteractive = nextInteractive;
        setInteractive(nextInteractive);
      }
    };
    const leave = () => setInteractive(false);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("blur", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("blur", leave);
      document.body.classList.remove("has-motion-cursor");
    };
  }, [reduceMotion, x, y]);

  if (!enabled || reduceMotion) return null;
  return (
    <motion.span
      aria-hidden="true"
      className={`motion-cursor${interactive ? " is-interactive" : ""}`}
      style={{ x: springX, y: springY }}
    />
  );
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence initial={false} mode="wait">
        <RouteFrame key={pathname}>{children}</RouteFrame>
      </AnimatePresence>
      <CursorFollower />
    </MotionConfig>
  );
}
