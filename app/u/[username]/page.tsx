import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Map from "@/components/map/Map";
import { revalidatePath } from "next/cache";
import ProfileContent from "@/components/ui/ProfileContent";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
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
      visitedCities: { select: { id: true, name: true, slug: true, country: true, regionSlug: true } },
    },
  });

  if (!user) return <div className="text-gray-900 dark:text-white pt-32 text-center">Kullanıcı bulunamadı</div>;

  const isOwnProfile = session?.user?.email === user.email;

  async function updateBio(formData: FormData) {
    "use server";
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("Giriş yapmalısın");
    const bio = String(formData.get("bio") ?? "").trim();
    const updatedUser = await prisma.user.update({ where: { email: session.user.email }, data: { bio } });
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
        name={user.name}
        bio={user.bio}
        cityCount={user.visitedCities.length}
        reviewCount={user.reviews.length}
        visitedCities={user.visitedCities}
        reviews={user.reviews}
        isOwnProfile={isOwnProfile}
        updateBio={updateBio}
      />
    </div>
  );
}
