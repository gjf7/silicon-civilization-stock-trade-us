import { loadEntries } from "@/lib/universe";
import { fetchKlines, fetchFundamental, fetchSpot } from "@/lib/pyserver";
import { scoreSymbols, type SymbolSnapshot } from "@/lib/deepseek";
import { getLocale } from "@/lib/locale";
import { themeLabel, translate, type MessageKey } from "@/lib/i18n";
import Link from "next/link";

export const dynamic = "force-dynamic";

type LiveSnapshot = SymbolSnapshot & { spotPrice?: number };

function calcPeg(pe?: number | null, profitYoyPct?: number | null) {
  if (pe == null || profitYoyPct == null || pe <= 0 || profitYoyPct <= 0) {
    return null;
  }
  return pe / profitYoyPct;
}

async function loadSignals() {
  const universe = loadEntries();
  const start = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 10);
  })();

  const snapshots: LiveSnapshot[] = await Promise.all(
    universe.map(async (e) => {
      const [klines, fund, spot] = await Promise.all([
        fetchKlines(e.symbol, start).catch(() => []),
        fetchFundamental(e.symbol).catch(() => undefined),
        fetchSpot(e.symbol).catch(() => undefined),
      ]);
      return {
        symbol: e.symbol,
        name: e.name,
        theme: e.theme,
        spotPrice: spot?.price,
        closes: klines.map((k) => k.close),
        fundamental: fund
          ? {
              pe_ttm: fund.pe_ttm,
              pb: fund.pb,
              market_cap: fund.market_cap,
              profit_yoy: fund.profit_yoy,
            }
          : undefined,
      };
    }),
  );

  const usable = snapshots.filter((s) => s.closes.length >= 10);
  const signals = await scoreSymbols(usable);
  const byId = new Map(signals.map((s) => [s.symbol, s]));

  return universe.map((e) => ({
    entry: e,
    snapshot: snapshots.find((s) => s.symbol === e.symbol),
    signal: byId.get(e.symbol),
  }));
}

const ACTION_KEY: Record<string, MessageKey> = {
  buy: "actionBuy",
  hold: "actionHold",
  sell: "actionSell",
};

export default async function SignalsPage() {
  const locale = await getLocale();
  const t = (key: MessageKey, params?: Parameters<typeof translate>[2]) =>
    translate(locale, key, params);

  let rows: Awaited<ReturnType<typeof loadSignals>> = [];
  let error: string | null = null;
  try {
    rows = await loadSignals();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="container">
      <Link href="/" className="back-link">{t("backToWatchlist")}</Link>
      <header className="page-header compact">
        <div>
          <div className="eyebrow">{t("signalsEyebrow")}</div>
          <h1>{t("signalsTitle")}</h1>
          <p>{t("signalsIntro")}</p>
        </div>
      </header>
      {error && (
        <div className="card" style={{ borderColor: "var(--danger)" }}>
          <strong>{t("loadFailed")}</strong> {error}
          <p style={{ color: "var(--muted)" }}>
            {t("signalsHintPrefix")}
            <code>{process.env.PYSERVER_URL ?? "http://localhost:8001"}</code>
            {t("signalsHintSuffix")}
          </p>
        </div>
      )}
      {!error && (
        <div className="theme-panel">
          <div className="theme-title">
            <strong>{t("signalsHeading")}</strong>
            <span>{t("signalsCount", {
              buy: rows.filter((r) => r.signal?.action === "buy").length,
              sell: rows.filter((r) => r.signal?.action === "sell").length,
            })}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("thTicker")}</th>
                  <th>{t("thName")}</th>
                  <th>{t("thTheme")}</th>
                  <th>{t("thAction")}</th>
                  <th className="num">{t("thPrice")}</th>
                  <th className="num">{t("thConfidence")}</th>
                  <th className="num">{t("thSize")}</th>
                  <th className="num">{t("thPe")}</th>
                  <th className="num">{t("thProfitYoy")}</th>
                  <th className="num">{t("thPeg")}</th>
                  <th>{t("thRationale")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ entry, signal, snapshot }) => (
                  <tr key={entry.symbol}>
                    <td className="mono">{entry.symbol}</td>
                    <td>{entry.name}</td>
                    <td>{themeLabel(entry.theme, locale)}</td>
                    <td>
                      {signal ? (
                        <span className={`badge ${signal.action}`}>{t(ACTION_KEY[signal.action] ?? "actionHold")}</span>
                      ) : (
                        <span className="badge">{t("notAvailable")}</span>
                      )}
                    </td>
                    <td className="num">{snapshot?.spotPrice?.toFixed(2) ?? snapshot?.closes.at(-1)?.toFixed(2) ?? "—"}</td>
                    <td className="num">{signal ? (signal.confidence * 100).toFixed(0) + "%" : "—"}</td>
                    <td className="num">{signal ? (signal.size * 100).toFixed(0) + "%" : "—"}</td>
                    <td className="num">{snapshot?.fundamental?.pe_ttm?.toFixed(1) ?? "—"}</td>
                    <td className="num">{snapshot?.fundamental?.profit_yoy != null ? `${snapshot.fundamental.profit_yoy.toFixed(1)}%` : "—"}</td>
                    <td className="num">{calcPeg(snapshot?.fundamental?.pe_ttm, snapshot?.fundamental?.profit_yoy)?.toFixed(2) ?? "—"}</td>
                    <td className="muted signal-reason">{signal?.rationale ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
