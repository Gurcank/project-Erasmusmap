import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/ui/AdminDashboard";
import { banUser, deleteUser, deleteReview } from "@/lib/actions";

export const metadata: Metadata = {
  title: "Admin Paneli",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/");

  const [users, reviews, userCount, cityCount, reviewCount] = await Promise.all(
    [
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
      prisma.user.count(),
      prisma.city.count(),
      prisma.review.count(),
    ],
  );

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-6xl px-6 pt-28 pb-24">
        <AdminDashboard
          currentUserEmail={session.user.email ?? ""}
          users={users}
          reviews={reviews}
          stats={{ userCount, cityCount, reviewCount }}
          banUser={banUser}
          deleteUser={deleteUser}
          deleteReview={deleteReview}
        />
      </div>
    </div>
  );
}
