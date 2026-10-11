import path from "node:path";
import fs from "node:fs/promises";

export type StoredGalleryPhoto = {
  id: string;
  storage_path: string;
  caption: string | null;
  category: string;
  url: string;
  created_at: string;
};

const GALLERY_FILE_PATH = path.resolve(process.cwd(), "data", "gallery.json");
const GALLERY_UPLOADS_DIR = path.resolve(process.cwd(), "public", "uploads", "gallery");

export async function readLocalGallery(): Promise<StoredGalleryPhoto[]> {
  try {
    const raw = await fs.readFile(GALLERY_FILE_PATH, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function writeLocalGallery(items: StoredGalleryPhoto[]): Promise<void> {
  try {
    await fs.mkdir(path.dirname(GALLERY_FILE_PATH), { recursive: true });
    await fs.writeFile(GALLERY_FILE_PATH, JSON.stringify(items, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write local gallery file:", err);
  }
}

export async function saveLocalGalleryFile(
  fileName: string,
  buffer: Buffer,
): Promise<{ storagePath: string; url: string }> {
  await fs.mkdir(GALLERY_UPLOADS_DIR, { recursive: true });
  const ext = path.extname(fileName) || ".jpg";
  const uniqueName = `${crypto.randomUUID()}${ext}`;
  const diskPath = path.join(GALLERY_UPLOADS_DIR, uniqueName);
  await fs.writeFile(diskPath, buffer);
  return {
    storagePath: `local:${uniqueName}`,
    url: `/uploads/gallery/${uniqueName}`,
  };
}

export async function upsertLocalGalleryPhoto(photo: StoredGalleryPhoto): Promise<void> {
  const existing = await readLocalGallery();
  const index = existing.findIndex((p) => p.id === photo.id);
  if (index >= 0) {
    existing[index] = photo;
  } else {
    existing.unshift(photo);
  }
  await writeLocalGallery(existing);
}

export async function deleteLocalGalleryPhoto(id: string): Promise<boolean> {
  const existing = await readLocalGallery();
  const target = existing.find((p) => p.id === id);
  if (target) {
    // If local file on disk, remove it
    if (target.storage_path.startsWith("local:")) {
      const fileName = target.storage_path.replace("local:", "");
      const diskPath = path.join(GALLERY_UPLOADS_DIR, fileName);
      try {
        await fs.unlink(diskPath);
      } catch {}
    }
    const filtered = existing.filter((p) => p.id !== id);
    await writeLocalGallery(filtered);
    return true;
  }
  return false;
}

export function mergeGalleryPhotos(
  remote: StoredGalleryPhoto[],
  local: StoredGalleryPhoto[],
): StoredGalleryPhoto[] {
  const map = new Map<string, StoredGalleryPhoto>();
  for (const item of local) {
    map.set(item.id, item);
  }
  for (const item of remote) {
    map.set(item.id, item);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
