export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new Error(
      "Configure a URL e a chave pública do Supabase para entrar no ZULU.",
    );
  if (!key.startsWith("sb_publishable_"))
    throw new Error("O ZULU requer uma chave pública publishable do Supabase.");
  return { url, key };
}
