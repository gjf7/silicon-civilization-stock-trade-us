"use client";
import { createContext, useContext } from "react";
import { translator, type Locale, type Translator } from "@/lib/i18n";

const LocaleContext = createContext<Locale>("zh");

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Translator bound to the locale provided by the root layout. */
export function useT(): Translator {
  return translator(useLocale());
}
