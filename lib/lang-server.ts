import { cache } from "react";
import { cookies, headers } from "next/headers";
import { LANG_COOKIE, resolveLang } from "@/lib/lang";

/** The interface language of the current request. Server components only. */
export const getRequestLang = cache(async () => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return resolveLang(
    cookieStore.get(LANG_COOKIE)?.value,
    headerStore.get("accept-language"),
  );
});
