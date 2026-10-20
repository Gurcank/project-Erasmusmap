import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { requireActiveUser } from "@/lib/auth-guards";
import { AVATAR_ALLOWED_TYPES } from "@/lib/avatar";
import { normalizeTripPhoto } from "@/lib/avatar-processing";
import {
  deleteTripPhotoObject,
  isStorageConfigured,
  uploadTripPhoto,
} from "@/lib/storage";
import {
  MAX_PHOTOS_PER_TRIP,
  TRIP_PHOTO_CAPTION_MAX,
  TRIP_PHOTO_MAX_REQUEST_BYTES,
  TRIP_PHOTO_MAX_UPLOAD_BYTES,
} from "@/lib/trip-schemas";

const TOO_LARGE = "Fotoğraf en fazla 4MB olabilir";

/**
 * Adds a photo to a trip. A route rather than a server action because a
 * photo is well past a server action's default body limit.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireActiveUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: "Fotoğraf yükleme şu anda kullanılamıyor" },
      { status: 503 },
    );
  }
  if (!(await rateLimit(`trip-photo:${auth.user.email}`, 20))) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen biraz sonra tekrar dene." },
      { status: 429 },
    );
  }

  const { id } = await params;
  const trip = await prisma.trip.findFirst({
    where: { id, userId: auth.user.id },
    select: { id: true, _count: { select: { photos: true } } },
  });
  if (!trip) {
    return NextResponse.json({ error: "Plan bulunamadı" }, { status: 404 });
  }
  if (trip._count.photos >= MAX_PHOTOS_PER_TRIP) {
    return NextResponse.json(
      {
        error: `Bir plana en fazla ${MAX_PHOTOS_PER_TRIP} fotoğraf eklenebilir`,
      },
      { status: 400 },
    );
  }

  // Checked before the body is buffered — see app/api/avatar/route.ts.
  const declaredLength = Number(req.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > TRIP_PHOTO_MAX_REQUEST_BYTES
  ) {
    return NextResponse.json({ error: TOO_LARGE }, { status: 413 });
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
  if (file.size > TRIP_PHOTO_MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: TOO_LARGE }, { status: 400 });
  }

  const caption =
    String(formData.get("caption") ?? "")
      .trim()
      .slice(0, TRIP_PHOTO_CAPTION_MAX) || null;
  const cityId = String(formData.get("cityId") ?? "").trim() || null;
  // Only a city already on the trip can be tagged.
  if (cityId) {
    const onTrip = await prisma.tripCity.findUnique({
      where: { tripId_cityId: { tripId: trip.id, cityId } },
      select: { id: true },
    });
    if (!onTrip) {
      return NextResponse.json({ error: "Şehir bulunamadı" }, { status: 400 });
    }
  }

  let normalized: Buffer;
  try {
    normalized = await normalizeTripPhoto(
      Buffer.from(await file.arrayBuffer()),
    );
  } catch {
    return NextResponse.json(
      { error: "Dosya geçerli bir görsel değil" },
      { status: 400 },
    );
  }

  try {
    const stored = await uploadTripPhoto(normalized);
    try {
      await prisma.tripPhoto.create({
        data: { tripId: trip.id, cityId, caption, ...stored },
      });
    } catch (error) {
      // No row points at the object, so nothing would ever remove it.
      await deleteTripPhotoObject(stored.path).catch(() => undefined);
      throw error;
    }
    revalidatePath(`/trips/${trip.id}`);
    return NextResponse.json({ url: stored.url });
  } catch (error) {
    console.error("Trip photo upload failed", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
