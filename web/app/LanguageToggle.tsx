"use client";
import { useRouter } from "next/navigation";
import { useLocale } from "./LocaleProvider";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "zh", label: "中文" },
  { value: "en", label: "EN" },
];

export default function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();

  function pick(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          className={o.value === locale ? "active" : undefined}
          aria-pressed={o.value === locale}
          onClick={() => pick(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
