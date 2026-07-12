import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Map from "@/components/map/Map";
import { revalidatePath } from "next/cache";
import ProfileContent from "@/components/ui/ProfileContent";
import { MAX_BIO_LENGTH } from "@/lib/profile";
import { rateLimit } from "@/lib/rate-limit";
import { deleteReview } from "@/lib/actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username },
    select: { username: true, bio: true },
  });
  if (!user) return {};

  const title = `@${user.username}`;
  const description = user.bio || `${title} — ErasmusMap profili`;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { username } = await params;

  if (!username) return <div>User not found</div>;

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      reviews: {
        orderBy: { createdAt: "desc" },
        include: { city: { select: { name: true, slug: true } } },
      },
      visitedCities: {
        select: { id: true, name: true, slug: true, country: true },
      },
    },
  });

  if (!user)
    return (
      <div className="text-gray-900 dark:text-white pt-32 text-center">
        Kullanıcı bulunamadı
      </div>
    );

  const isOwnProfile = session?.user?.email === user.email;
  const isAdmin = session?.user?.role === "ADMIN";

  async function updateBio(formData: FormData) {
    "use server";
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("Giriş yapmalısın");
    if (!rateLimit(`bio:${session.user.email}`))
      throw new Error("Çok fazla istek. Lütfen biraz sonra tekrar dene.");
    const bio = String(formData.get("bio") ?? "").trim();
    if (bio.length > MAX_BIO_LENGTH)
      throw new Error(`Bio en fazla ${MAX_BIO_LENGTH} karakter olabilir`);
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { bio },
    });
    revalidatePath(`/u/${updatedUser.username}`);
  }

  return (
    <div className="relative min-h-screen w-full pt-24">
      <div className="fixed inset-0 -z-20">
        <Map isStatic />
      </div>
      <div className="fixed inset-0 bg-white/80 dark:bg-black/70 backdrop-blur-[3px] -z-10" />

      <ProfileContent
        username={user.username ?? ""}
        bio={user.bio}
        cityCount={user.visitedCities.length}
        reviewCount={user.reviews.length}
        visitedCities={user.visitedCities}
        reviews={user.reviews}
        isOwnProfile={isOwnProfile}
        updateBio={updateBio}
        isAdmin={isAdmin}
        deleteReview={deleteReview}
      />
    </div>
  );
}
