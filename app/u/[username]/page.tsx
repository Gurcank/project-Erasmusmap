import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Map from "@/components/map/Map";
import { revalidatePath } from "next/cache";
import ProfileContent from "@/components/ui/ProfileContent";
import { bioSchema, firstIssueMessage } from "@/lib/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { deleteReview } from "@/lib/actions";
import { requireActiveUser } from "@/lib/auth-guards";
import { toActionResult } from "@/lib/action-result";
import type { ActionResult } from "@/lib/action-result";

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
  // Runs before the loading.tsx shell is streamed, so this is the last
  // point where a real 404 status can still be set.
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
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  if (!username) notFound();

  const [user, viewer] = await Promise.all([
    prisma.user.findUnique({
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
      const bio = parsed.data;

      const updatedUser = await prisma.user.update({
        where: { id: auth.user.id },
        data: { bio },
      });
      revalidatePath(`/u/${updatedUser.username}`);
    });
  }

  return (
    <div className="relative min-h-screen w-full pt-24">
      <div className="fixed inset-0 -z-20">
        <Map isStatic />
      </div>
      <div className="fixed inset-0 -z-10 bg-canvas/85 backdrop-blur-[3px]" />

      <ProfileContent
        username={user.username ?? ""}
        image={user.image}
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
