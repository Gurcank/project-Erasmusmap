import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const AVATAR_BUCKET = "avatars";

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

function avatarPath(userId: string): string {
  return `${userId}.webp`;
}

/**
 * Uploads an avatar and returns its public URL. Uploads overwrite the user's
 * single avatar object, so the URL carries a version query to defeat the CDN
 * cache that would otherwise keep serving the previous image.
 */
export async function uploadAvatar(
  userId: string,
  body: Buffer,
): Promise<string> {
  const client = getStorageClient();
  if (!client) throw new Error("Storage yapılandırılmamış");

  const path = avatarPath(userId);
  const { error } = await client.storage
    .from(AVATAR_BUCKET)
    .upload(path, body, {
      contentType: "image/webp",
      upsert: true,
    });
  if (error) throw error;

  const { data } = client.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function deleteAvatar(userId: string): Promise<void> {
  const client = getStorageClient();
  if (!client) throw new Error("Storage yapılandırılmamış");

  const { error } = await client.storage
    .from(AVATAR_BUCKET)
    .remove([avatarPath(userId)]);
  if (error) throw error;
}
