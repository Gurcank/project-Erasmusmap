import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import ProfileContent from "@/components/ui/ProfileContent";
import type { ProfileTab } from "@/components/ui/ProfileContent";
import { rateLimit } from "@/lib/rate-limit";
import { deleteReview } from "@/lib/actions";
import { addFavoriteCity, removeFavoriteCity } from "@/lib/profile-actions";
import { MAX_FAVORITE_CITIES } from "@/lib/profile";
import { requireActiveUser } from "@/lib/auth-guards";
import { toActionResult } from "@/lib/action-result";
import type { ActionResult } from "@/lib/action-result";
import { bioSchema, firstIssueMessage } from "@/lib/schemas";

const TABS: ProfileTab[] = ["visited", "wishlist", "reviews"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { usernameLower: username.toLowerCase() },
    select: { username: true, bio: true },
  });
  // Runs before the shell is streamed, so this is the last point where a real
  // 404 status can still be set.
  if (!user) notFound();

  const title = user.username ?? "";
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
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ username }, { tab }] = await Promise.all([params, searchParams]);
  if (!username) notFound();

  const activeTab: ProfileTab = TABS.includes(tab as ProfileTab)
    ? (tab as ProfileTab)
    : "visited";

  const [user, viewer] = await Promise.all([
    prisma.user.findUnique({
      where: { usernameLower: username.toLowerCase() },
      include: {
        reviews: {
          orderBy: { createdAt: "desc" },
          include: { city: { select: { name: true, slug: true } } },
        },
        visits: {
          orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
          select: {
            startDate: true,
            endDate: true,
            city: {
              select: { id: true, name: true, slug: true, country: true },
            },
          },
        },
        wishlist: {
          orderBy: { createdAt: "desc" },
          select: {
            city: {
              select: { id: true, name: true, slug: true, country: true },
            },
          },
        },
        favoriteCities: {
          orderBy: { position: "asc" },
          select: {
            position: true,
            city: {
              select: {
                id: true,
                name: true,
                slug: true,
                country: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    }),
    requireActiveUser(),
  ]);

  if (!user) notFound();

  const isOwnProfile = viewer.ok && viewer.user.id === user.id;
  const isAdmin = viewer.ok && viewer.user.role === "ADMIN";

  async function updateBio(
    _previousState: ActionResult | null,
    formData: FormData,
  ): Promise<ActionResult> {
    "use server";
    return toActionResult(async () => {
      const auth = await requireActiveUser();
      if (!auth.ok) throw new Error(auth.error);

      if (!(await rateLimit(`bio:${auth.user.email}`)))
        throw new Error("Çok fazla istek. Lütfen biraz sonra tekrar dene.");

      const parsed = bioSchema.safeParse(formData.get("bio") ?? "");
      if (!parsed.success) throw new Error(firstIssueMessage(parsed.error));

      const updatedUser = await prisma.user.update({
        where: { id: auth.user.id },
        data: { bio: parsed.data },
      });
      revalidatePath(`/u/${updatedUser.username}`);
    });
  }

  return (
    <div className="min-h-screen bg-canvas pt-24">
      <ProfileContent
        username={user.username ?? ""}
        image={user.image}
        bio={user.bio}
        isOwnProfile={isOwnProfile}
        isAdmin={isAdmin}
        activeTab={activeTab}
        maxFavorites={MAX_FAVORITE_CITIES}
        favorites={user.favoriteCities.map((favorite) => ({
          cityId: favorite.city.id,
          position: favorite.position,
          name: favorite.city.name,
          slug: favorite.city.slug,
          country: favorite.city.country,
          imageUrl: favorite.city.imageUrl,
        }))}
        visitedCities={user.visits.map((visit) => ({
          ...visit.city,
          startDate: visit.startDate,
          endDate: visit.endDate,
        }))}
        wishlist={user.wishlist.map((item) => item.city)}
        reviews={user.reviews}
        updateBio={updateBio}
        deleteReview={deleteReview}
        addFavoriteCity={addFavoriteCity}
        removeFavoriteCity={removeFavoriteCity}
      />
    </div>
  );
}
