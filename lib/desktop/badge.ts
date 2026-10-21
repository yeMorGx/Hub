export async function setDesktopUnread(count: number) {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window))
    return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const currentWindow = getCurrentWindow();
  const unread = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  if (!navigator.userAgent.includes("Windows")) {
    await currentWindow.setBadgeCount(unread || undefined);
    return;
  }
  if (!unread) {
    await currentWindow.setOverlayIcon(undefined);
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#e26540";
  context.beginPath();
  context.arc(16, 16, 16, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = `bold ${unread > 99 ? 13 : unread > 9 ? 18 : 22}px sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(unread > 99 ? "99+" : String(unread), 16, 17);
  const { Image } = await import("@tauri-apps/api/image");
  const pixels = context.getImageData(0, 0, 32, 32).data;
  const image = await Image.new(new Uint8Array(pixels), 32, 32);
  try {
    await currentWindow.setOverlayIcon(image);
  } finally {
    await image.close();
  }
}
