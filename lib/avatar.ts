// Client-safe avatar constants. The encoding pipeline lives in
// lib/avatar-processing.ts, which pulls in sharp and is server-only.
export const AVATAR_MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const AVATAR_ACCEPT_ATTRIBUTE = AVATAR_ALLOWED_TYPES.join(",");
