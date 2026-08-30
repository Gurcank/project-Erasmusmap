import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const AVATAR_BUCKET = "avatars";
const AVATAR_EXTENSION = "webp";

let cachedClient: SupabaseClient | null = null;

/**
 * Returns a service-role Storage client, or null when the environment is not
 * configured. Callers must handle null rather than falling back to inlining
 * images in the database — that is the exact failure mode this replaces.
 */
function getStorageClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  cachedClient ??= createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

export function isStorageConfigured(): boolean {
  return getStorageClient() !== null;
}

/**
 * A fresh, unguessable object key.
 *
 * Deliberately unrelated to the user id. The bucket is public, so the key ends
 * up in a URL on every page that shows the avatar: keying by user id published
 * the account's internal identifier to every visitor, and made the whole bucket
 * enumerable to anyone holding a list of ids.
 *
 * A new key per upload also makes the URL change on its own, which is what
 * retires the cache-busting query string the old fixed key needed.
 */
export function newAvatarPath(): string {
  return `${randomBytes(16).toString("hex")}.${AVATAR_EXTENSION}`;
}

export type StoredAvatar = {
  /** Public URL, stored on the user row and rendered by the client. */
  url: string;
  /** Object key, stored beside it so the object can be removed later. */
  path: string;
};

export async function uploadAvatar(body: Buffer): Promise<StoredAvatar> {
  const client = getStorageClient();
  if (!client) throw new Error("Storage yapılandırılmamış");

  const path = newAvatarPath();
  const { error } = await client.storage
    .from(AVATAR_BUCKET)
    .upload(path, body, {
      contentType: "image/webp",
      // The key is new every time, so there is never an object to replace.
      // Upserting here would only hide a key collision.
      upsert: false,
    });
  if (error) throw error;

  const { data } = client.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function deleteAvatarObject(path: string): Promise<void> {
  const client = getStorageClient();
  if (!client) throw new Error("Storage yapılandırılmamış");

  const { error } = await client.storage.from(AVATAR_BUCKET).remove([path]);
  if (error) throw error;
}

/**
 * Recovers the object key from a stored public URL. Only needed for rows
 * written before the key had a column of its own; returns null for an avatar
 * this application does not host, such as a Google profile picture.
 */
export function avatarPathFromUrl(url: string): string | null {
  const marker = `/${AVATAR_BUCKET}/`;
  try {
    const { pathname } = new URL(url);
    const index = pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(pathname.slice(index + marker.length)) || null;
  } catch {
    return null;
  }
}
