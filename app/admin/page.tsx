import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/ui/AdminDashboard";
import { banUser, deleteUser, deleteReview } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth-guards";
import { getAdminUsers, normalizeUserQuery } from "@/lib/admin-users";
import { parsePage } from "@/lib/pagination";
import { parseAdminTab } from "@/lib/admin-tabs";
import { deleteReviewComment } from "@/lib/square-actions";
import {
  getAdminComments,
  getAdminReviews,
  getAdminStats,
} from "@/lib/queries/admin";

export const metadata: Metadata = {
  title: "Admin Paneli",
  robots: { index: false, follow: false },
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; tab?: string }>;
}) {
  // Read from the database rather than the session: the role and ban flags on
  // the token are up to TOKEN_REFRESH_INTERVAL_SECONDS stale, which would let a
  // just-demoted or just-banned admin keep using this page.
  const admin = await requireAdmin();
  if (!admin.ok) redirect("/");

  const params = await searchParams;
  const query = normalizeUserQuery(params.q);
  const page = parsePage(params.page);
  const initialTab = parseAdminTab(params.tab);

  const [usersPage, reviews, comments, stats] = await Promise.all([
    getAdminUsers(query, page),
    getAdminReviews(),
    getAdminComments(),
    getAdminStats(),
  ]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 pt-28 pb-24">
        <AdminDashboard
          currentUserEmail={admin.user.email}
          users={usersPage.users}
          usersPage={{
            page: usersPage.page,
            pages: usersPage.pages,
            total: usersPage.total,
            query: usersPage.query,
          }}
          initialTab={initialTab}
          reviews={reviews}
          comments={comments}
          stats={stats}
          banUser={banUser}
          deleteUser={deleteUser}
          deleteReview={deleteReview}
          deleteReviewComment={deleteReviewComment}
        />
      </div>
    </div>
  );
}
