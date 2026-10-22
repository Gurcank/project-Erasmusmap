import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import AdminDashboard from "@/components/ui/AdminDashboard";

const noopAction = async () => ({ ok: true }) as const;

const user = (n: number) => ({
  id: `u${n}`,
  username: `user${n}`,
  name: null,
  email: `user${n}@example.com`,
  image: null,
  role: "USER",
  banned: false,
  createdAt: new Date("2026-10-01T00:00:00Z"),
  _count: { reviews: 0 },
});

function render(usersPage: {
  page: number;
  pages: number;
  total: number;
  query: string;
}) {
  return renderToStaticMarkup(
    <AdminDashboard
      currentUserEmail="admin@example.com"
      users={[user(1), user(2)]}
      usersPage={usersPage}
      initialTab="users"
      reviews={[]}
      comments={[]}
      stats={{ userCount: 60, cityCount: 1566, reviewCount: 0 }}
      banUser={noopAction}
      deleteUser={noopAction}
      deleteReview={noopAction}
      deleteReviewComment={noopAction}
    />,
  );
}

const hrefs = (html: string) =>
  [...html.matchAll(/href="([^"]+)"/g)].map((match) =>
    match[1].replaceAll("&amp;", "&"),
  );

describe("the admin user list", () => {
  it("opens on the users tab when the URL asks for it", () => {
    const html = render({ page: 1, pages: 1, total: 2, query: "" });
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain("user1@example.com");
  });

  it("has a search form that is a plain GET back to the panel, on the same tab", () => {
    const html = render({ page: 1, pages: 1, total: 2, query: "ada" });
    expect(html).toContain('action="/admin"');
    expect(html).toContain('method="get"');
    expect(html).toContain('name="tab" value="users"');
    expect(html).toContain('name="q"');
    expect(html).toContain('value="ada"');
    expect(html).toContain('role="search"');
  });

  it("labels the search box for screen readers", () => {
    const html = render({ page: 1, pages: 1, total: 2, query: "" });
    expect(html).toMatch(/<label[^>]*for="admin-user-search"/);
  });

  it("shows no pager when everything fits on one page", () => {
    const html = render({ page: 1, pages: 1, total: 2, query: "" });
    expect(html).not.toContain('rel="next"');
    expect(html).not.toContain('rel="prev"');
  });

  it("links to the next page only from the first", () => {
    const html = render({ page: 1, pages: 3, total: 60, query: "" });
    expect(html).toContain('rel="next"');
    expect(html).not.toContain('rel="prev"');
    expect(hrefs(html)).toContain("/admin?tab=users&page=2");
  });

  it("links both ways from the middle, and keeps the search in the address", () => {
    const html = render({ page: 2, pages: 3, total: 60, query: "ada l" });
    expect(html).toContain('rel="prev"');
    expect(html).toContain('rel="next"');
    const links = hrefs(html);
    expect(links).toContain("/admin?tab=users&q=ada+l");
    expect(links).toContain("/admin?tab=users&q=ada+l&page=3");
  });

  it("links back only from the last page", () => {
    const html = render({ page: 3, pages: 3, total: 60, query: "" });
    expect(html).toContain('rel="prev"');
    expect(html).not.toContain('rel="next"');
  });

  it("says where in the list you are and how many there are", () => {
    const html = render({ page: 2, pages: 3, total: 60, query: "" });
    expect(html).toContain("60");
    expect(html).toMatch(/2[^0-9]+3/);
  });
});
