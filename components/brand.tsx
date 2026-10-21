/** Official ZULU artwork, extracted from the owner's SVG without redrawing paths. */
export function BrandMark({ size = 29, className = "" }: { size?: number; className?: string }) {
  return <img src="/brand/zulu-mark.svg" alt="" aria-hidden="true" width={size} height={size} className={`brand-mark ${className}`} />;
}
export function BrandWordmark({ className = "" }: { className?: string }) {
  return <img src="/brand/zulu-wordmark.svg" alt="ZULU" width={102} height={31} className={`brand-wordmark ${className}`} />;
}
