/** The admin panel's tabs. Shared by the page, which reads the URL, and the panel. */
export const ADMIN_TABS = ["overview", "users", "reviews", "comments"] as const;

export type AdminTab = (typeof ADMIN_TABS)[number];

/** The tab a query string asks for; anything unknown opens the overview. */
export function parseAdminTab(value: string | undefined): AdminTab {
  return ADMIN_TABS.find((tab) => tab === value) ?? "overview";
}
