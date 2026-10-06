import type { Metadata } from "next";
import "./globals.css";
import { getLocale } from "@/lib/locale";
import { translate } from "@/lib/i18n";
import { LocaleProvider } from "./LocaleProvider";
import LanguageToggle from "./LanguageToggle";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const description = t("metaDescription");
  return {
    metadataBase: new URL("https://madeye.github.io/silicon-civilization-stock-trade-us/"),
    title: {
      default: t("metaTitle"),
      template: `%s · ${t("metaTitle")}`,
    },
    description,
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
      type: "website",
      locale: locale === "zh" ? "zh_CN" : "en_US",
      siteName: t("metaTitle"),
      title: t("metaTitle"),
      description,
      url: "/",
      images: [
        {
          url: "/social-card.png",
          width: 1200,
          height: 630,
          alt: "Silicon Civilization Stocks social card",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("metaTitle"),
      description,
      images: ["/social-card.png"],
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale === "zh" ? "zh-CN" : "en"}>
      <body>
        <LocaleProvider locale={locale}>
          <div className="lang-bar">
            <LanguageToggle />
          </div>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
