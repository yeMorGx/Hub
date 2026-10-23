"use client";

import {
  cloneElement,
  Fragment,
  isValidElement,
  useEffect,
  useRef,
  type ReactElement,
  type ReactNode,
} from "react";

type MotionElement = ReactElement<Record<string, unknown>>;

export function TiltCard({
  children,
  maxTilt = 4,
  spotlight = true,
}: {
  children: ReactElement;
  maxTilt?: number;
  spotlight?: boolean;
}) {
  if (!isValidElement(children)) return children;
  return cloneElement(children as MotionElement, {
    "data-motion-tilt": String(maxTilt),
    ...(spotlight ? { "data-motion-spotlight": "true" } : {}),
  });
}

export function ScrollReveal({
  children,
  stagger = false,
}: {
  children: ReactElement;
  stagger?: boolean;
}) {
  if (!isValidElement(children)) return children;
  return cloneElement(children as MotionElement, {
    "data-motion-reveal": stagger ? "stagger" : "single",
  });
}

export function MagneticButton({
  children,
  strength = 0.12,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (
      !element ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      return;
    }
    let frame = 0;
    let x = 0;
    let y = 0;
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const bounds = element.getBoundingClientRect();
      x = (event.clientX - bounds.left - bounds.width / 2) * strength;
      y = (event.clientY - bounds.top - bounds.height / 2) * strength;
      element.classList.add("is-motion-active");
      if (!frame) {
        frame = requestAnimationFrame(() => {
          element.style.setProperty("--motion-magnetic-x", `${x}px`);
          element.style.setProperty("--motion-magnetic-y", `${y}px`);
          frame = 0;
        });
      }
    };
    const leave = () => {
      element.classList.remove("is-motion-active");
      element.style.setProperty("--motion-magnetic-x", "0px");
      element.style.setProperty("--motion-magnetic-y", "0px");
    };
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerleave", leave);
    return () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", leave);
      if (frame) cancelAnimationFrame(frame);
      element.style.removeProperty("--motion-magnetic-x");
      element.style.removeProperty("--motion-magnetic-y");
      element.classList.remove("is-motion-active");
    };
  }, [strength]);

  return (
    <span ref={ref} className={["motion-magnetic-wrap", className].filter(Boolean).join(" ")}>
      {children}
    </span>
  );
}

export function SplitText({
  lines,
  as: Tag = "h1",
  className,
}: {
  lines: { text: string; accent?: boolean }[];
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  const label = lines.map((line) => line.text).join(" ");
  return (
    <Tag
      className={className}
      data-motion-split
      aria-label={label}
    >
      <span className="motion-split-visual" aria-hidden="true">
        {lines.map((line, lineIndex) => (
          <span
            className="motion-split-line"
            data-accent={line.accent ? "true" : undefined}
            key={`${lineIndex}-${line.text}`}
          >
            {line.text.split(" ").map((word, wordIndex) => (
              <Fragment key={`${wordIndex}-${word}`}>
                {wordIndex > 0 ? " " : null}
                <span className="motion-split-word">{word}</span>
              </Fragment>
            ))}
          </span>
        ))}
      </span>
    </Tag>
  );
}
