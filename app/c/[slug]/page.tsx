import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Map from "@/components/map/Map";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { latinize } from "@/lib/latinize";
import CityContent from "@/components/ui/CityContent";

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [city, cities, session] = await Promise.all([
    prisma.city.findUnique({
      where: { slug },
      include: {
        reviews: {
          include: { user: { select: { id: true, name: true, image: true, username: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.city.findMany({ select: { id: true, name: true, slug: true, country: true } }),
    getServerSession(authOptions),
  ]);

  if (!city) notFound();

  const latinizedCityName = latinize(city.name);

  const user = session?.user?.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { visitedCities: { where: { id: city.id }, select: { id: true } } },
      })
    : null;

  const isVisited = (user?.visitedCities.length ?? 0) > 0;
  const cityId = city.id;

  async function submitReview(formData: FormData) {
    "use server";
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("Giriş yapmalısınız");
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) throw new Error("Kullanıcı bulunamadı");
    const existingReview = await prisma.review.findFirst({ where: { cityId, userId: user.id } });
    if (existingReview) throw new Error("Bu şehre zaten yorum yaptınız.");
    await prisma.review.create({
      data: {
        cityId, userId: user.id,
        culture:      Number(formData.get("culture")),
        gastronomy:   Number(formData.get("gastronomy")),
        safety:       Number(formData.get("safety")),
        socialLife:   Number(formData.get("socialLife")),
        transport:    Number(formData.get("transport")),
        costOfLiving: Number(formData.get("costOfLiving")),
        content: String(formData.get("content")),
        isApproved: true,
      },
    });
    await prisma.user.update({ where: { id: user.id }, data: { visitedCities: { connect: { id: cityId } } } });
    revalidatePath(`/c/${slug}`);
  }

  const unsplashRes = await fetch(
    `https://api.unsplash.com/search/photos?query=${latinizedCityName}&orientation=landscape&per_page=1`,
    { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` }, next: { revalidate: 86400 } }
  );
  const unsplashData = await unsplashRes.json();
  const cityImage = unsplashData.results?.[0]?.urls?.regular || null;

  const ratingData = await prisma.review.aggregate({
    where: { cityId: city.id },
    _avg: { culture: true, gastronomy: true, safety: true, socialLife: true, transport: true, costOfLiving: true },
    _count: { id: true },
  });

  const reviewCount = ratingData._count.id ?? 0;
  const avg = ratingData._avg;
  const avgScore = reviewCount > 0
    ? ((avg.culture ?? 0) + (avg.gastronomy ?? 0) + (avg.safety ?? 0) +
       (avg.socialLife ?? 0) + (avg.transport ?? 0) + (avg.costOfLiving ?? 0)) / 6
    : 0;

  const categoryRatings = {
    culture:      Math.round(avg.culture ?? 0),
    gastronomy:   Math.round(avg.gastronomy ?? 0),
    safety:       Math.round(avg.safety ?? 0),
    socialLife:   Math.round(avg.socialLife ?? 0),
    transport:    Math.round(avg.transport ?? 0),
    costOfLiving: Math.round(avg.costOfLiving ?? 0),
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
