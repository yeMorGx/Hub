"use client";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Signature } from "./signature";
const openings = new Set<string>();
export function OpeningGreeting({ name, userId }: { name: string; userId: string }) {
  const reduced = useReducedMotion();
  const [play, setPlay] = useState<boolean | null>(null);
  useEffect(() => {
    const key = `zulu:signature:${userId}`;
    let seen = openings.has(key);
    try { seen ||= sessionStorage.getItem(key) === "seen"; sessionStorage.setItem(key, "seen"); } catch {}
    openings.add(key);
    setPlay(previous => previous ?? !seen);
  }, [userId]);
  return <span className="opening-greeting" data-signature-play={Boolean(play && !reduced)} aria-label={`Olá, ${name}`}>
    <span aria-hidden="true">Olá, </span>
    <span className="greeting-name" aria-hidden="true">
      <span className="greeting-fallback">{name}</span>
      {play !== null && <Signature text={name} fontSize={64} duration={0.7} play={play && !reduced} className="greeting-signature" />}
    </span>
  </span>;
}
