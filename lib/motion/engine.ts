let enginePromise:
  | Promise<{
      gsap: typeof import("gsap").gsap;
      ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger;
    }>
  | undefined;

/** Load GSAP only on routes that use scroll motion and register ScrollTrigger once. */
export function loadMotionEngine() {
  enginePromise ??= Promise.all([
    import("gsap"),
    import("gsap/ScrollTrigger"),
  ]).then(([gsapModule, triggerModule]) => {
    const gsap = gsapModule.gsap;
    const ScrollTrigger = triggerModule.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);
    return { gsap, ScrollTrigger };
  });
  return enginePromise;
}
