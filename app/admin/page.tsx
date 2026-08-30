import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/ui/AdminDashboard";
import { banUser, deleteUser, deleteReview } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth-guards";
import { deleteReviewComment } from "@/lib/square-actions";
import primarySlugList from "@/prisma/data/primary-city-slugs.json";

export const metadata: Metadata = {
  title: "Admin Paneli",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  // Read from the database rather than the session: the role and ban flags on
  // the token are up to TOKEN_REFRESH_INTERVAL_SECONDS stale, which would let a
  // just-demoted or just-banned admin keep using this page.
  const admin = await requireAdmin();
  if (!admin.ok) redirect("/");

  const [users, reviews, comments, userCount, cityCount, reviewCount] =
    await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          image: true,
          role: true,
          banned: true,
          createdAt: true,
          _count: { select: { reviews: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.review.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          city: { select: { name: true, slug: true } },
          user: {
            select: { id: true, name: true, username: true, image: true },
          },
        },
      }),
      // Flagged first: those are the ones a moderator is here for.
      prisma.reviewComment.findMany({
        take: 100,
        orderBy: [{ flagged: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          content: true,
          createdAt: true,
          flagged: true,
          user: {
            select: { id: true, name: true, username: true, image: true },
          },
          parent: {
            select: { user: { select: { username: true, name: true } } },
          },
          review: {
            select: { city: { select: { name: true, slug: true } } },
          },
        },
      }),
      prisma.user.count(),
      // Only the cities the app can actually reach. The table also holds the
      // rest of the GeoNames dump, which scripts/build-map-regions.ts needs but
      // nothing in the product ever shows.
      prisma.city.count({
        where: { slug: { in: primarySlugList as string[] } },
      }),
      prisma.review.count(),
    ]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 pt-28 pb-24">
        <AdminDashboard
          currentUserEmail={admin.user.email}
          users={users}
          reviews={reviews}
          comments={comments.map((comment) => ({
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            flagged: comment.flagged,
            parentAuthor:
              comment.parent?.user?.username ??
              comment.parent?.user?.name ??
              null,
            city: comment.review.city,
            user: comment.user,
          }))}
          stats={{ userCount, cityCount, reviewCount }}
          banUser={banUser}
          deleteUser={deleteUser}
          deleteReview={deleteReview}
          deleteReviewComment={deleteReviewComment}
        />
      </div>
    </div>
  );
}
