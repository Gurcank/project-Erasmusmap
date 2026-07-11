import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Map from "@/components/map/Map";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { latinize } from "@/lib/latinize";
import CityContent from "@/components/ui/CityContent";
import { parseRatings, parseReviewContent, averageRating } from "@/lib/review";
import type { CategoryRatings } from "@/types";
import { rateLimit } from "@/lib/rate-limit";

export default async function CityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [city, cities, session] = await Promise.all([
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
    prisma.city.findMany({
      select: { id: true, name: true, slug: true, country: true },
    }),
    getServerSession(authOptions),
  ]);

  if (!city) notFound();

  const latinizedCityName = latinize(city.name);

  const user = session?.user?.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          visitedCities: { where: { id: city.id }, select: { id: true } },
        },
      })
    : null;

  const isVisited = (user?.visitedCities.length ?? 0) > 0;
  const cityId = city.id;

  async function submitReview(formData: FormData) {
    "use server";
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("Giriş yapmalısınız");
    if (!rateLimit(`review:${session.user.email}`))
      throw new Error("Çok fazla istek. Lütfen biraz sonra tekrar dene.");
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) throw new Error("Kullanıcı bulunamadı");
    const existingReview = await prisma.review.findFirst({
      where: { cityId, userId: user.id },
    });
    if (existingReview) throw new Error("Bu şehre zaten yorum yaptınız.");
    const ratings = parseRatings(formData);
    const content = parseReviewContent(formData);
    await prisma.review.create({
      data: {
        cityId,
        userId: user.id,
        ...ratings,
        content,
        isApproved: true,
      },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { visitedCities: { connect: { id: cityId } } },
    });
    revalidatePath(`/c/${slug}`);
  }

  const unsplashRes = await fetch(
    `https://api.unsplash.com/search/photos?query=${latinizedCityName}&orientation=landscape&per_page=1`,
    {
      headers: {
        Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
      },
      next: { revalidate: 86400 },
    },
  );
  const unsplashData = await unsplashRes.json();
  const cityImage = unsplashData.results?.[0]?.urls?.regular || null;

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

  const categoryRatings: CategoryRatings = {
    culture: Math.round(ratings.culture),
    gastronomy: Math.round(ratings.gastronomy),
    safety: Math.round(ratings.safety),
    socialLife: Math.round(ratings.socialLife),
    transport: Math.round(ratings.transport),
    costOfLiving: Math.round(ratings.costOfLiving),
  };

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 -z-10">
        <Map cities={cities} isStatic />
      </div>
      <div className="relative z-10 bg-white/85 dark:bg-black/75 backdrop-blur-sm pt-16 min-h-screen">
        <CityContent
          cityId={city.id}
          cityName={latinizedCityName}
          cityImage={cityImage}
          isVisited={isVisited}
          reviewCount={reviewCount}
          avgScore={avgScore}
          categoryRatings={categoryRatings}
          reviews={city.reviews}
          submitReview={submitReview}
        />
      </div>
    </div>
  );
}
