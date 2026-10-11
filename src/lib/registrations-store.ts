import path from "node:path";
import fs from "node:fs/promises";

export type StoredRegistration = {
  id: string;
  full_name: string;
  age: number;
  gender: string;
  phone_number: string;
  guardian_name?: string | null;
  email: string;
  course: string;
  preferred_schedule: string;
  message?: string | null;
  language: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const REGISTRATIONS_FILE_PATH = path.resolve(process.cwd(), "data", "registrations.json");

export async function readLocalRegistrations(): Promise<StoredRegistration[]> {
  try {
    const raw = await fs.readFile(REGISTRATIONS_FILE_PATH, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function writeLocalRegistrations(records: StoredRegistration[]): Promise<void> {
  try {
    await fs.mkdir(path.dirname(REGISTRATIONS_FILE_PATH), { recursive: true });
    await fs.writeFile(REGISTRATIONS_FILE_PATH, JSON.stringify(records, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write local registrations file:", err);
  }
}

export async function upsertLocalRegistration(record: StoredRegistration): Promise<void> {
  const existing = await readLocalRegistrations();
  const index = existing.findIndex((r) => r.id === record.id);
  if (index >= 0) {
    existing[index] = { ...existing[index], ...record, updated_at: new Date().toISOString() };
  } else {
    existing.unshift(record);
  }
  await writeLocalRegistrations(existing);
}

export async function deleteLocalRegistration(id: string): Promise<boolean> {
  const existing = await readLocalRegistrations();
  const filtered = existing.filter((r) => r.id !== id);
  if (filtered.length !== existing.length) {
    await writeLocalRegistrations(filtered);
    return true;
  }
  return false;
}

export async function updateLocalRegistrationStatus(id: string, status: string): Promise<boolean> {
  const existing = await readLocalRegistrations();
  const found = existing.find((r) => r.id === id);
  if (found) {
    found.status = status;
    found.updated_at = new Date().toISOString();
    await writeLocalRegistrations(existing);
    return true;
  }
  return false;
}

export function mergeRegistrations(
  remote: StoredRegistration[],
  local: StoredRegistration[],
): StoredRegistration[] {
  const map = new Map<string, StoredRegistration>();
  // Local first
  for (const r of local) {
    map.set(r.id, r);
  }
  // Remote overwrites if present
  for (const r of remote) {
    map.set(r.id, r);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
