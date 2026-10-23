export const MOTION_TOKENS = {
  microDuration: "--motion-duration-micro",
  routeDuration: "--motion-duration-route",
  routeExitDuration: "--motion-duration-route-exit",
  revealDuration: "--motion-duration-reveal",
  revealDistance: "--motion-distance-reveal",
  stagger: "--motion-stagger",
  cubicBezier: "--motion-ease-out",
  gsapEase: "--motion-gsap-ease-out",
} as const;

export function readMotionToken(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}

export function readMotionDuration(name: string, fallbackSeconds: number) {
  const value = readMotionToken(name, `${fallbackSeconds * 1000}ms`);
  const duration = Number.parseFloat(value);
  if (!Number.isFinite(duration)) return fallbackSeconds;
  return value.endsWith("ms") ? duration / 1000 : duration;
}

export function readMotionDistance(name: string, fallbackPixels: number) {
  const value = readMotionToken(name, `${fallbackPixels}px`);
  const distance = Number.parseFloat(value);
  return Number.isFinite(distance) ? distance : fallbackPixels;
}

export function readMotionBezier(
  name: string,
  fallback: [number, number, number, number] = [0.22, 1, 0.36, 1],
): [number, number, number, number] {
  const value = readMotionToken(name, "");
  const matches = value.match(/cubic-bezier\(([^)]+)\)/)?.[1];
  if (!matches) return fallback;
  const points = matches.split(",").map((part) => Number.parseFloat(part.trim()));
  return points.length === 4 && points.every(Number.isFinite)
    ? (points as [number, number, number, number])
    : fallback;
}
