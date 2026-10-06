// Bilingual UI support (Chinese / English) with no third-party dependency.
//
// Two things live here:
//   1. The message dictionary, keyed by a stable id so both languages must
//      cover exactly the same set (TypeScript enforces this).
//   2. The locale contract: a cookie name, a resolver, and the server-side
//      reader used by the root layout.
//
// Only interface copy and sub-theme names are translated. Data from
// `universe.json` (company names, notes) and model output (signal rationale)
// stay in their source language.
//
// This module is imported by client components, so it must stay free of
// server-only imports. The `cookies()`-based reader lives in `lib/locale.ts`.

export type Locale = "zh" | "en";

export const LOCALE_COOKIE = "scs-locale";
export const DEFAULT_LOCALE: Locale = "zh";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "zh" || value === "en";
}

export function resolveLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

const EN = {
  metaTitle: "Silicon Civilization Stocks",
  metaDescription:
    "DeepSeek + Yahoo Finance powered US watchlist, price targets, signals, and backtests for AI infrastructure stocks.",

  navSignals: "Live Signals",
  navBacktest: "Backtest",
  backToWatchlist: "Back to watchlist",

  homeEyebrow: "DeepSeek · Yahoo Finance · US Equities",
  homeTitle: "Silicon Civilization Stocks",
  homeIntro:
    "Tracking the supply side of AI: compute chips, optical/interconnect, AI servers, liquid cooling, power, data centers, memory, and semiconductor equipment & materials.",
  metricWatchlist: "Watchlist",
  metricWatchlistSub: "US equities",
  metricGlobal: "Global supply chain",
  metricGlobalSub: "{pct}% coverage",
  metricThemes: "Sub-themes",
  metricThemesSub: "grouped by supply-chain layer",
  metricUpdated: "Updated",
  watchlistHeading: "Watchlist",
  watchlistSubheading: "Filter, and view ratings, price targets, and upside.",

  signalsEyebrow: "Live scoring",
  signalsTitle: "Live Signals",
  signalsIntro:
    "Weighted toward PEG and earnings growth / valuation fit, with short-term price signals down-weighted, producing 5-20 trading-day action calls.",
  loadFailed: "Load failed:",
  signalsHintPrefix: "Confirm pyserver is running at ",
  signalsHintSuffix: " and that DEEPSEEK_API_KEY is set.",
  signalsHeading: "Signals",
  signalsCount: "{buy} buy · {sell} sell",
  notAvailable: "n/a",

  search: "Search",
  searchPlaceholder: "Ticker, name, theme",
  themeLabel: "Theme",
  allThemes: "All themes",
  filterGlobal: "Global supply chain",
  filterUpside: "Target above price",
  statusShowing:
    "Showing {shown}/{total} · Price {price}/{total} · Rated {rated} · Upside {upside}",
  fetchingData: "Fetching data from pyserver",
  dataLoaded: "pyserver data loaded",
  progressAriaLabel: "pyserver data load progress",
  progressDetail: "Price {price}/{total} · Target/rating {analyst}/{total}",

  refreshRunning: "Refreshing…",
  refreshButton: "✨ DeepSeek refresh watchlist",
  validatingTickers: "Validating new tickers {done} / {total}",
  changesApplied: "Changes applied",
  namesNow: "{count} names now",
  changesSummary:
    "Added {added} · Removed {removed} · Reclassified {reclassified} · Rejected {rejected}",

  backtestEyebrow: "Backtest",
  backtestTitle: "Strategy Backtest",
  backtestIntro:
    "Rolls DeepSeek signals forward and fills them on each rebalance period; prices and signals are cached.",
  fieldStart: "Start",
  fieldEnd: "End",
  fieldRebalance: "Rebalance (days)",
  fieldMaxPositions: "Max positions",
  backtestRunning: "Running…",
  backtestRun: "Run backtest",
  backtestPreparing: "Preparing…",
  backtestFailed: "Failed:",
  phaseLoading: "Loading prices & fundamentals",
  phaseSignals: "Generating DeepSeek signals",
  phaseSimulating: "Simulating fills",
  kpiTotalReturn: "Total return",
  kpiCagr: "CAGR",
  kpiMaxDrawdown: "Max drawdown",
  kpiSharpe: "Sharpe",
  kpiTrades: "Trades",
  equityCurve: "Equity curve",
  recentTrades: "Recent trades",

  thTicker: "Ticker",
  thName: "Name",
  thTheme: "Theme",
  thAction: "Action",
  thPrice: "Price",
  thConfidence: "Confidence",
  thSize: "Size",
  thPe: "PE(TTM)",
  thProfitYoy: "Profit YoY",
  thPeg: "PEG",
  thRationale: "Rationale",
  thGlobal: "Global",
  thTarget: "Target",
  thUpside: "Upside",
  thBuyRating: "Buy rating",
  thDate: "Date",
  thSide: "Side",
  thShares: "Shares",

  actionBuy: "buy",
  actionHold: "hold",
  actionSell: "sell",
  yes: "Yes",
  no: "No",

  languageSwitch: "Language",
} as const;

export type MessageKey = keyof typeof EN;

// Record<MessageKey, string> makes a missing or extra key a compile error.
const ZH: Record<MessageKey, string> = {
  metaTitle: "硅基文明消费股",
  metaDescription:
    "基于 DeepSeek 与 Yahoo Finance 的美股观察池，提供目标价、信号与策略回测，聚焦 AI 基础设施。",

  navSignals: "实时信号",
  navBacktest: "回测",
  backToWatchlist: "返回观察池",

  homeEyebrow: "DeepSeek · Yahoo Finance · 美股",
  homeTitle: "硅基文明消费股",
  homeIntro:
    "跟踪 AI 的供给侧：算力芯片、光模块与高速互联、AI 服务器、液冷、电力、数据中心、存储，以及半导体设备与材料。",
  metricWatchlist: "观察池",
  metricWatchlistSub: "美股",
  metricGlobal: "全球供应链",
  metricGlobalSub: "覆盖率 {pct}%",
  metricThemes: "子主题",
  metricThemesSub: "按供应链层级分组",
  metricUpdated: "更新于",
  watchlistHeading: "观察池",
  watchlistSubheading: "可筛选，并查看评级、目标价与上涨空间。",

  signalsEyebrow: "实时打分",
  signalsTitle: "实时信号",
  signalsIntro:
    "以 PEG 与盈利增长、估值的匹配度为主，短期价格信号权重较低，给出 5 至 20 个交易日的操作建议。",
  loadFailed: "加载失败：",
  signalsHintPrefix: "请确认数据服务运行在 ",
  signalsHintSuffix: "，并已设置 DEEPSEEK_API_KEY。",
  signalsHeading: "信号",
  signalsCount: "{buy} 买入 · {sell} 卖出",
  notAvailable: "无",

  search: "搜索",
  searchPlaceholder: "代码、名称、主题",
  themeLabel: "主题",
  allThemes: "全部主题",
  filterGlobal: "全球供应链",
  filterUpside: "目标价高于现价",
  statusShowing:
    "显示 {shown}/{total} · 价格 {price}/{total} · 已评级 {rated} · 有上涨空间 {upside}",
  fetchingData: "正在获取数据",
  dataLoaded: "数据已加载",
  progressAriaLabel: "数据加载进度",
  progressDetail: "价格 {price}/{total} · 目标价/评级 {analyst}/{total}",

  refreshRunning: "刷新中…",
  refreshButton: "✨ 用 DeepSeek 刷新观察池",
  validatingTickers: "正在校验新代码 {done} / {total}",
  changesApplied: "已应用变更",
  namesNow: "现有 {count} 只",
  changesSummary:
    "新增 {added} · 移除 {removed} · 重分类 {reclassified} · 未通过 {rejected}",

  backtestEyebrow: "回测",
  backtestTitle: "策略回测",
  backtestIntro:
    "把 DeepSeek 信号按调仓周期滚动并模拟成交；价格与信号都会缓存。",
  fieldStart: "开始",
  fieldEnd: "结束",
  fieldRebalance: "调仓间隔（天）",
  fieldMaxPositions: "最大持仓",
  backtestRunning: "运行中…",
  backtestRun: "运行回测",
  backtestPreparing: "准备中…",
  backtestFailed: "失败：",
  phaseLoading: "加载价格与基本面",
  phaseSignals: "生成 DeepSeek 信号",
  phaseSimulating: "模拟成交",
  kpiTotalReturn: "总收益",
  kpiCagr: "年化收益",
  kpiMaxDrawdown: "最大回撤",
  kpiSharpe: "夏普比率",
  kpiTrades: "交易数",
  equityCurve: "净值曲线",
  recentTrades: "最近交易",

  thTicker: "代码",
  thName: "名称",
  thTheme: "主题",
  thAction: "操作",
  thPrice: "价格",
  thConfidence: "信心",
  thSize: "仓位",
  thPe: "市盈率(TTM)",
  thProfitYoy: "利润同比",
  thPeg: "PEG",
  thRationale: "理由",
  thGlobal: "全球",
  thTarget: "目标价",
  thUpside: "上涨空间",
  thBuyRating: "买入评级",
  thDate: "日期",
  thSide: "方向",
  thShares: "股数",

  actionBuy: "买入",
  actionHold: "持有",
  actionSell: "卖出",
  yes: "是",
  no: "否",

  languageSwitch: "语言",
};

export type TranslateParams = Record<string, string | number>;

export function translate(
  locale: Locale,
  key: MessageKey,
  params?: TranslateParams,
): string {
  let text: string = locale === "zh" ? ZH[key] : EN[key];
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export type Translator = (key: MessageKey, params?: TranslateParams) => string;

export function translator(locale: Locale): Translator {
  return (key, params) => translate(locale, key, params);
}

// Sub-theme labels. Keys are the raw `theme` values in universe.json; the map
// only covers display, since grouping and filtering still key off the raw
// English strings. An unknown theme falls back to the raw value.
const THEME_ZH: Record<string, string> = {
  "Compute / AI Chips": "算力 / AI 芯片",
  Foundry: "晶圆代工",
  "Optical / Interconnect": "光模块 / 互联",
  Networking: "网络设备",
  "AI Servers": "AI 服务器",
  "Thermal / Power Infra": "散热 / 电力设施",
  Power: "电力",
  "IDC / Data Center": "数据中心",
  "Memory / HBM": "存储 / HBM",
  "Semi Equipment": "半导体设备",
  "Semi Materials": "半导体材料",
  "Cloud / AI Infra": "云 / AI 基础设施",
};

export function themeLabel(theme: string, locale: Locale): string {
  return locale === "zh" ? (THEME_ZH[theme] ?? theme) : theme;
}
