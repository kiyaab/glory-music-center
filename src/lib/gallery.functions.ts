import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type GalleryPhoto = { id: string; url: string; caption: string | null; category: string; created_at: string };

async function loadPhotos(): Promise<GalleryPhoto[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("gallery_photos")
    .select("id, storage_path, caption, category, created_at")
    .order("created_at", { ascending: false });
  if (error || !data?.length) return [];
  const { data: signed } = await supabaseAdmin.storage
    .from("gallery")
    .createSignedUrls(data.map((p) => p.storage_path), 60 * 60 * 24 * 7);
  return data.map((p, i) => ({
    id: p.id,
    url: signed?.[i]?.signedUrl ?? "",
    caption: p.caption,
    category: p.category,
    created_at: p.created_at,
  })).filter((p) => p.url);
}

// Public: only returns gallery photos (non-sensitive) with temporary links.
export const listGalleryPhotos = createServerFn({ method: "GET" }).handler(async () => loadPhotos());

export const deleteGalleryPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("gallery_photos").select("storage_path").eq("id", data.id).maybeSingle();
    if (row) await supabaseAdmin.storage.from("gallery").remove([row.storage_path]);
    const { error } = await supabaseAdmin.from("gallery_photos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
