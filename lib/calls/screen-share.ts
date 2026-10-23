import type { TrackPublishOptions } from "livekit-client";

export type ShareProfile = "balanced" | "smooth" | "sharp";

export const shareProfiles = {
  balanced: {
    label: "Equilibrada",
    details: "1080p · 30 FPS",
    width: 1920,
    height: 1080,
    frameRate: 30,
    maxBitrate: 6_000_000,
    contentHint: "detail" as const,
    degradationPreference: "balanced" as const,
  },
  smooth: {
    label: "Fluida",
    details: "1080p · 60 FPS",
    width: 1920,
    height: 1080,
    frameRate: 60,
    maxBitrate: 12_000_000,
    contentHint: "motion" as const,
    degradationPreference: "maintain-framerate" as const,
  },
  sharp: {
    label: "Mais nítida",
    details: "1440p · 60 FPS",
    width: 2560,
    height: 1440,
    frameRate: 60,
    maxBitrate: 20_000_000,
    contentHint: "detail" as const,
    degradationPreference: "maintain-resolution" as const,
  },
} satisfies Record<ShareProfile, {
  label: string;
  details: string;
  width: number;
  height: number;
  frameRate: number;
  maxBitrate: number;
  contentHint: "detail" | "motion";
  degradationPreference: "balanced" | "maintain-resolution" | "maintain-framerate";
}>;


export function screenSharePublishOptions(profile: ShareProfile): TrackPublishOptions {
  const selected = shareProfiles[profile];
  return {
    // The default extra screenshare layer is half-resolution at 3 FPS.
    // Publish one stream so adaptive subscriptions cannot select that layer.
    simulcast: false,
    screenShareEncoding: {
      maxBitrate: selected.maxBitrate,
      maxFramerate: selected.frameRate,
    },
    degradationPreference: selected.degradationPreference,
  };
}
