import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { requireActiveUser } from "@/lib/auth-guards";
import { AVATAR_ALLOWED_TYPES, AVATAR_MAX_UPLOAD_BYTES } from "@/lib/avatar";
import { normalizeAvatar } from "@/lib/avatar-processing";
import { deleteAvatar, isStorageConfigured, uploadAvatar } from "@/lib/storage";

const STORAGE_UNAVAILABLE = "Fotoğraf yükleme şu anda kullanılamıyor";

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
    const image = await uploadAvatar(auth.user.id, normalized);

    await prisma.user.update({
      where: { id: auth.user.id },
      data: { image },
    });

    return NextResponse.json({ image });
  } catch {
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
    // Storage may hold nothing for an OAuth avatar or an already-cleared one;
    // clearing the column is what matters, so a missing object is not an error.
    if (isStorageConfigured()) {
      await deleteAvatar(auth.user.id).catch(() => undefined);
    }

    await prisma.user.update({
      where: { id: auth.user.id },
      data: { image: null },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
