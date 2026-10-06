import Link from "next/link";
import { readUniverse } from "@/lib/universe";
import { getLocale } from "@/lib/locale";
import { translate } from "@/lib/i18n";
import RefreshUniverseButton from "./RefreshUniverseButton";
import UniverseTable from "./UniverseTable";

export const dynamic = "force-dynamic";

export default async function Home() {
  const locale = await getLocale();
  const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
    translate(locale, key, params);

  const universe = readUniverse();
  const entries = universe.entries;
  const globalCount = entries.filter((e) => e.global_supply).length;
  const themeCount = new Set(entries.map((e) => e.theme)).size;

  return (
    <div className="container">
      <header className="page-header">
        <div>
          <div className="eyebrow">{t("homeEyebrow")}</div>
          <h1>{t("homeTitle")}</h1>
          <p>{t("homeIntro")}</p>
        </div>
        <div className="header-actions">
          <Link href="/signals" className="button secondary">{t("navSignals")}</Link>
          <Link href="/backtest" className="button secondary">{t("navBacktest")}</Link>
        </div>
      </header>

      <div className="summary-grid">
        <div className="metric">
          <span className="label">{t("metricWatchlist")}</span>
          <strong>{entries.length}</strong>
          <span>{t("metricWatchlistSub")}</span>
        </div>
        <div className="metric">
          <span className="label">{t("metricGlobal")}</span>
          <strong>{globalCount}</strong>
          <span>{t("metricGlobalSub", { pct: Math.round((globalCount / Math.max(entries.length, 1)) * 100) })}</span>
        </div>
        <div className="metric">
          <span className="label">{t("metricThemes")}</span>
          <strong>{themeCount}</strong>
          <span>{t("metricThemesSub")}</span>
        </div>
        <div className="metric">
          <span className="label">{t("metricUpdated")}</span>
          <strong>{universe.updated_at}</strong>
          <span>{universe.updated_by}</span>
        </div>
      </div>

      <div className="section-heading">
        <div>
          <h2>{t("watchlistHeading")}</h2>
          <p>{t("watchlistSubheading")}</p>
        </div>
        <RefreshUniverseButton />
      </div>

      <UniverseTable entries={entries} />
    </div>
  );
}
