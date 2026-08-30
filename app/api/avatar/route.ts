import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { requireActiveUser } from "@/lib/auth-guards";
import {
  AVATAR_ALLOWED_TYPES,
  AVATAR_MAX_REQUEST_BYTES,
  AVATAR_MAX_UPLOAD_BYTES,
} from "@/lib/avatar";
import { normalizeAvatar } from "@/lib/avatar-processing";
import {
  avatarPathFromUrl,
  deleteAvatarObject,
  isStorageConfigured,
  uploadAvatar,
} from "@/lib/storage";

const STORAGE_UNAVAILABLE = "Fotoğraf yükleme şu anda kullanılamıyor";

/**
 * The object to remove when an avatar is replaced or cleared. `imagePath` is
 * authoritative; the URL is only consulted for rows written before that column
 * existed, and yields null for an avatar hosted elsewhere.
 */
function storedAvatarPath(
  user: { image: string | null; imagePath: string | null } | null,
): string | null {
  if (!user) return null;
  return user.imagePath ?? (user.image ? avatarPathFromUrl(user.image) : null);
}

export async function POST(req: Request) {
  const auth = await requireActiveUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: STORAGE_UNAVAILABLE }, { status: 503 });
  }
  if (!(await rateLimit(`avatar:${auth.user.email}`, 10))) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen biraz sonra tekrar dene." },
      { status: 429 },
    );
  }

  // Read before the body is: formData() buffers the entire upload in memory,
  // so checking the file size afterwards means the memory has already been
  // spent. Content-Length is client-supplied and may be absent on a chunked
  // request, which is why the file-size check below stays as well.
  const declaredLength = Number(req.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > AVATAR_MAX_REQUEST_BYTES
  ) {
    return NextResponse.json(
      { error: "Fotoğraf en fazla 2MB olabilir" },
      { status: 413 },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
  }
  if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Sadece JPEG, PNG veya WEBP yükleyebilirsin" },
      { status: 400 },
    );
  }
  if (file.size > AVATAR_MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Fotoğraf en fazla 2MB olabilir" },
      { status: 400 },
    );
  }

  let normalized: Buffer;
  try {
    normalized = await normalizeAvatar(Buffer.from(await file.arrayBuffer()));
  } catch {
    // The declared MIME type said image; the bytes disagreed.
    return NextResponse.json(
      { error: "Dosya geçerli bir görsel değil" },
      { status: 400 },
    );
  }

  try {
    const previous = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { image: true, imagePath: true },
    });

    const stored = await uploadAvatar(normalized);

    await prisma.user.update({
      where: { id: auth.user.id },
      data: { image: stored.url, imagePath: stored.path },
    });

    // Only after the row points at the new object, and best effort: a leftover
    // file is untidy, whereas a row pointing at a deleted one is a broken
    // avatar on every page the account appears.
    const stale = storedAvatarPath(previous);
    if (stale && stale !== stored.path) {
      await deleteAvatarObject(stale).catch(() => undefined);
    }

    return NextResponse.json({ image: stored.url });
  } catch (error) {
    // Storage misconfiguration (a SUPABASE_URL with a path on it, a private
    // bucket) fails here and is indistinguishable from any other 500 at the
    // client. Log it, or the next diagnosis has to be run against the live
    // Storage API.
    console.error("Avatar upload failed", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function DELETE() {
  const auth = await requireActiveUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!(await rateLimit(`avatar:${auth.user.email}`, 10))) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen biraz sonra tekrar dene." },
      { status: 429 },
    );
  }

  try {
    const current = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { image: true, imagePath: true },
    });
    const path = storedAvatarPath(current);

    // Storage may hold nothing for an OAuth avatar or an already-cleared one;
    // clearing the columns is what matters, so a missing object is not an error.
    if (path && isStorageConfigured()) {
      await deleteAvatarObject(path).catch(() => undefined);
    }

    await prisma.user.update({
      where: { id: auth.user.id },
      data: { image: null, imagePath: null },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
