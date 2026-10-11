import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin.functions";
import {
  readLocalGallery,
  saveLocalGalleryFile,
  upsertLocalGalleryPhoto,
  deleteLocalGalleryPhoto,
  mergeGalleryPhotos,
  type StoredGalleryPhoto,
} from "@/lib/gallery-store";

export type GalleryPhoto = {
  id: string;
  url: string;
  caption: string | null;
  category: string;
  created_at: string;
};

async function loadPhotos(): Promise<GalleryPhoto[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let remotePhotos: StoredGalleryPhoto[] = [];
  try {
    const { data, error } = await supabaseAdmin
      .from("gallery_photos")
      .select("id, storage_path, caption, category, created_at")
      .order("created_at", { ascending: false });

    if (!error && data?.length) {
      const { data: signed } = await supabaseAdmin.storage
        .from("gallery")
        .createSignedUrls(data.map((p) => p.storage_path), 60 * 60 * 24 * 7);

      remotePhotos = data
        .map((p, i) => ({
          id: p.id,
          storage_path: p.storage_path,
          url: signed?.[i]?.signedUrl ?? "",
          caption: p.caption,
          category: p.category,
          created_at: p.created_at,
        }))
        .filter((p) => Boolean(p.url));
    }
  } catch (err) {
    console.warn("[Gallery] Remote photos fetch warning:", err);
  }

  const localPhotos = await readLocalGallery();
  const merged = mergeGalleryPhotos(remotePhotos, localPhotos);

  return merged.map((p) => ({
    id: p.id,
    url: p.url,
    caption: p.caption,
    category: p.category,
    created_at: p.created_at,
  }));
}

// Public: returns gallery photos from both Supabase and resilient local storage
export const listGalleryPhotos = createServerFn({ method: "GET" }).handler(async () => loadPhotos());

export const uploadGalleryPhotoSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().default("image/jpeg"),
  base64Data: z.string().min(1),
  caption: z.string().max(300).optional().or(z.literal("")).nullable(),
  category: z.string().default("piano"),
});

export const uploadGalleryPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => uploadGalleryPhotoSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Clean base64 string
    const base64PrefixMatch = data.base64Data.match(/^data:([^;]+);base64,(.*)$/);
    const rawBase64 = base64PrefixMatch ? base64PrefixMatch[2] : data.base64Data;
    const buffer = Buffer.from(rawBase64, "base64");

    const ext = data.fileName.split(".").pop() || "jpg";
    const uniqueStoragePath = `${crypto.randomUUID()}.${ext}`;
    const photoId = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const cleanCaption = data.caption?.trim() || null;

    let remoteSucceeded = false;
    let remoteUrl: string | null = null;

    // 1. Try remote Supabase Storage & Database
    try {
      const { error: upErr } = await supabaseAdmin.storage
        .from("gallery")
        .upload(uniqueStoragePath, buffer, { contentType: data.contentType, upsert: true });

      if (!upErr) {
        const { error: dbErr } = await supabaseAdmin.from("gallery_photos").insert({
          id: photoId,
          storage_path: uniqueStoragePath,
          caption: cleanCaption,
          category: data.category,
        });

        if (!dbErr) {
          remoteSucceeded = true;
          const { data: signedData } = await supabaseAdmin.storage
            .from("gallery")
            .createSignedUrl(uniqueStoragePath, 60 * 60 * 24 * 7);
          remoteUrl = signedData?.signedUrl ?? null;
        } else {
          console.warn(`[Gallery] Remote Supabase DB insert blocked (${dbErr.code ?? "RLS"}): ${dbErr.message}`);
        }
      } else {
        console.warn(`[Gallery] Remote Supabase storage upload blocked: ${upErr.message}`);
      }
    } catch (err) {
      console.warn("[Gallery] Remote Supabase upload exception:", err);
    }

    // 2. If remote failed or as a resilient local record
    if (!remoteSucceeded || !remoteUrl) {
      const { storagePath, url } = await saveLocalGalleryFile(data.fileName, buffer);
      const localItem: StoredGalleryPhoto = {
        id: photoId,
        storage_path: storagePath,
        caption: cleanCaption,
        category: data.category,
        url,
        created_at: nowIso,
      };
      await upsertLocalGalleryPhoto(localItem);

      return {
        ok: true,
        photo: {
          id: localItem.id,
          url: localItem.url,
          caption: localItem.caption,
          category: localItem.category,
          created_at: localItem.created_at,
        },
        source: "local_storage",
      };
    }

    // Also mirror to local list for fast querying
    const mirroredItem: StoredGalleryPhoto = {
      id: photoId,
      storage_path: uniqueStoragePath,
      caption: cleanCaption,
      category: data.category,
      url: remoteUrl,
      created_at: nowIso,
    };
    await upsertLocalGalleryPhoto(mirroredItem);

    return {
      ok: true,
      photo: {
        id: photoId,
        url: remoteUrl,
        caption: cleanCaption,
        category: data.category,
        created_at: nowIso,
      },
      source: "supabase",
    };
  });

export const deleteGalleryPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    try {
      const { data: row } = await supabaseAdmin
        .from("gallery_photos")
        .select("storage_path")
        .eq("id", data.id)
        .maybeSingle();

      if (row?.storage_path) {
        await supabaseAdmin.storage.from("gallery").remove([row.storage_path]);
      }
      await supabaseAdmin.from("gallery_photos").delete().eq("id", data.id);
    } catch (err) {
      console.warn("[Gallery] Supabase delete warning:", err);
    }

    await deleteLocalGalleryPhoto(data.id);
    return { ok: true };
  });
