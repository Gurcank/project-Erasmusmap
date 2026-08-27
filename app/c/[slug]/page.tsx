import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Map from "@/components/map/Map";
import { revalidatePath } from "next/cache";
import CityContent from "@/components/ui/CityContent";
import { parseRatings, parseReviewContent, averageRating } from "@/lib/review";
import type { CategoryRatings } from "@/types";
import { rateLimit } from "@/lib/rate-limit";
import { deleteReview } from "@/lib/actions";
import { requireActiveUser } from "@/lib/auth-guards";
import { fetchCityPhoto } from "@/lib/unsplash";
import { toActionResult } from "@/lib/action-result";
import type { ActionResult } from "@/lib/action-result";

const DUPLICATE_REVIEW_MESSAGE = "Bu şehre zaten yorum yaptınız.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const city = await prisma.city.findUnique({
    where: { slug },
    select: { name: true, country: true },
  });
  // Runs before the loading.tsx shell is streamed, so this is the last
  // point where a real 404 status can still be set.
  if (!city) notFound();

  const name = city.name;
  const description = `${name}, ${city.country} için Erasmus öğrenci değerlendirmeleri, puanları ve fotoğrafları.`;
  return {
    title: name,
    description,
    openGraph: { title: name, description },
    twitter: { title: name, description },
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [city, viewer] = await Promise.all([
    prisma.city.findUnique({
      where: { slug },
      include: {
        reviews: {
          include: {
            user: {
              select: { id: true, name: true, image: true, username: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    requireActiveUser(),
  ]);

  if (!city) notFound();

  const visit = viewer.ok
    ? await prisma.visit.findUnique({
        where: { userId_cityId: { userId: viewer.user.id, cityId: city.id } },
        select: { id: true },
      })
    : null;

  const isVisited = visit !== null;
  const isAdmin = viewer.ok && viewer.user.role === "ADMIN";
  const cityId = city.id;

  async function submitReview(
    _previousState: ActionResult | null,
    formData: FormData,
  ): Promise<ActionResult> {
    "use server";
    return toActionResult(async () => {
      const auth = await requireActiveUser();
      if (!auth.ok) throw new Error(auth.error);

      if (!(await rateLimit(`review:${auth.user.email}`)))
        throw new Error("Çok fazla istek. Lütfen biraz sonra tekrar dene.");

      const ratings = parseRatings(formData);
      const content = parseReviewContent(formData);

      try {
        await prisma.review.create({
          data: {
            cityId,
            userId: auth.user.id,
            ...ratings,
            content,
            isApproved: true,
          },
        });
      } catch (error) {
        // The unique index is the real guard against a double submission; a
        // pre-check would still lose the race between two concurrent requests.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new Error(DUPLICATE_REVIEW_MESSAGE);
        }
        throw error;
      }

      // Reviewing a city implies having been there. upsert keeps any dates
      // the user already recorded for that visit.
      await prisma.visit.upsert({
        where: { userId_cityId: { userId: auth.user.id, cityId } },
        create: { userId: auth.user.id, cityId },
        update: {},
      });
      revalidatePath(`/c/${slug}`);
    });
  }

  const cityImage = await fetchCityPhoto(city.name);

  const ratingData = await prisma.review.aggregate({
    where: { cityId: city.id },
    _avg: {
      culture: true,
      gastronomy: true,
      safety: true,
      socialLife: true,
      transport: true,
      costOfLiving: true,
    },
    _count: { id: true },
  });

  const reviewCount = ratingData._count.id ?? 0;
  const avg = ratingData._avg;
  const ratings: CategoryRatings = {
    culture: avg.culture ?? 0,
    gastronomy: avg.gastronomy ?? 0,
    safety: avg.safety ?? 0,
    socialLife: avg.socialLife ?? 0,
    transport: avg.transport ?? 0,
    costOfLiving: avg.costOfLiving ?? 0,
  };
  const avgScore = reviewCount > 0 ? averageRating(ratings) : 0;

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 -z-10">
        <Map isStatic />
      </div>
      <div className="relative z-10 min-h-screen bg-canvas/90 pt-16 backdrop-blur-sm">
        <CityContent
          cityId={city.id}
          cityName={city.name}
          cityImage={cityImage}
          isVisited={isVisited}
          reviewCount={reviewCount}
          avgScore={avgScore}
          categoryRatings={ratings}
          reviews={city.reviews}
          submitReview={submitReview}
          isAdmin={isAdmin}
          deleteReview={deleteReview}
        />
      </div>
    </div>
  );
}
