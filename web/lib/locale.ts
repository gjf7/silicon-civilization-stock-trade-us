// Server-side locale reader. Kept apart from `lib/i18n.ts` because that module
// is imported by client components and must not pull in `next/headers`.
import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "./i18n";

/** `cookies()` is async in Next 15. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return resolveLocale(store.get(LOCALE_COOKIE)?.value);
}
