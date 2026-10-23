"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Button, Input, Label } from "@heroui/react";
import type { HubController } from "@/lib/hub/use-hub";
const AvatarUrls = createContext<Record<string, string>>({});
export const useProfileAvatar = (id: string) => useContext(AvatarUrls)[id];
export function AvatarProvider({ hub, children }: { hub: HubController; children: ReactNode }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const profiles = [...hub.snapshot.people, ...(hub.bootstrap?.profile ? [hub.bootstrap.profile] : [])];
  const paths = JSON.stringify(Object.fromEntries(profiles.filter(person => person.avatar_url?.startsWith(`${person.id}/`)).map(person => [person.id, person.avatar_url])));
  useEffect(() => {
    let alive = true;
    setUrls({});
    const entries = Object.entries(JSON.parse(paths) as Record<string, string>);
    if (!entries.length) return;
    const load = async () => {
      const result = await hub.client.storage.from("zulu-avatars").createSignedUrls(entries.map(([, path]) => path), 300);
      if (alive) setUrls(Object.fromEntries((result.data ?? []).flatMap((item, index) => item.signedUrl ? [[entries[index][0], item.signedUrl]] : [])));
    };
    const refresh = () => { if (!document.hidden) void load(); };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    void load();
    const interval = setInterval(() => { if (!document.hidden) void load(); }, 240_000);
    return () => { alive = false; clearInterval(interval); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("focus", refresh); };
  }, [paths, hub.client, hub.teamId]);
  return <AvatarUrls.Provider value={urls}>{children}</AvatarUrls.Provider>;
}
export function AvatarUpload({ hub }: { hub: HubController }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  return <div className="avatar-upload"><Label htmlFor="profile-photo">Foto de perfil</Label>
    <Input id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = "";
      if (!file) return;
      if (file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setMessage("Escolha uma imagem JPG, PNG ou WebP de até 5 MB."); return; }
      setBusy(true); setMessage("");
      let bitmap: ImageBitmap | null = null;
      try {
        bitmap = await createImageBitmap(file);
        const canvas = document.createElement("canvas"); canvas.width = canvas.height = 384;
        const context = canvas.getContext("2d"); if (!context) throw Error();
        const side = Math.min(bitmap.width, bitmap.height);
        context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 384, 384);
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(Error()), "image/webp", 0.85));
        const path = `${hub.userId}/${crypto.randomUUID()}.webp`;
        const result = await hub.mutate(async () => {
          const upload = await hub.client.storage.from("zulu-avatars").upload(path, blob, { contentType: "image/webp", upsert: false });
          if (upload.error) throw upload.error;
          const profile = await hub.client.from("profiles").update({ avatar_url: path }).eq("id", hub.userId);
          if (profile.error) { await hub.client.storage.from("zulu-avatars").remove([path]); throw profile.error; }
        }, "Foto atualizada.");
        setMessage(result.ok ? "Foto atualizada." : "Não foi possível enviar a foto. Tente novamente.");
      } catch { setMessage("Não foi possível abrir ou enviar a imagem. Tente outra foto."); }
      finally { bitmap?.close(); setBusy(false); }
    }} />
    <small>JPG, PNG ou WebP · até 5 MB · recorte central</small>
    {message && <p role="status">{message}</p>}{busy && <p role="status">Enviando foto…</p>}
  </div>;
}
