// Static renderer for snapshots in ./data/*.json.
// No build step, no framework — just fetch + DOM.

const { t, themeLabel, actionLabel, getLocale, setLocale } = window.SCS;

const $ = (sel) => document.querySelector(sel);
const fmt = {
  num: (v, digits = 2) => (v == null || Number.isNaN(v) ? "—" : v.toFixed(digits)),
  pct: (v, digits = 1) => (v == null || Number.isNaN(v) ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(digits)}%`),
  int: (v) => (v == null ? "—" : v.toLocaleString()),
  money: (v) => (v == null ? "—" : `$${Math.round(v).toLocaleString()}`),
};

async function loadJson(name) {
  const r = await fetch(`./data/${name}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`${name} ${r.status}`);
  return r.json();
}

// Fill every [data-i18n] / [data-i18n-html] node and reflect the active locale.
function applyStaticTranslations() {
  const locale = getLocale();
  document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  for (const node of document.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of document.querySelectorAll("[data-i18n-html]")) {
    node.innerHTML = t(node.dataset.i18nHtml);
  }
  $("#search").placeholder = t("searchPlaceholder");
  for (const btn of document.querySelectorAll(".lang-toggle button")) {
    const active = btn.dataset.locale === locale;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  }
}

function setupLanguageToggle(onSwitch) {
  for (const btn of document.querySelectorAll(".lang-toggle button")) {
    btn.addEventListener("click", () => {
      if (btn.dataset.locale === getLocale()) return;
      setLocale(btn.dataset.locale);
      applyStaticTranslations();
      onSwitch();
    });
  }
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

// ---------- Data + UI state ----------
let DATA = null;
const state = { query: "", theme: "all", onlyGlobal: false, onlyUpside: false };

// ---------- KPI summary ----------
function renderKpis() {
  const { universe, analyst, signals, meta } = DATA;
  const grid = $("#kpi-grid");
  grid.innerHTML = "";
  const themes = new Set(universe.entries.map((e) => e.theme));
  const total = universe.entries.length;
  const globalCount = universe.entries.filter((e) => e.global_supply).length;
  const globalPct = total ? Math.round((globalCount / total) * 100) : 0;
  const upsideCount = analyst.items.filter((a) => (a.upside_pct ?? 0) > 0).length;
  const buys = (signals?.signals ?? []).filter((s) => s.action === "buy").length;
  const sells = (signals?.signals ?? []).filter((s) => s.action === "sell").length;
  const stamp = new Date(meta.generated_at);
  const stampStr = stamp.toISOString().slice(0, 16).replace("T", " ") + " UTC";

  const cards = [
    [t("kpiWatchlist"), `${universe.entries.length}`, t("kpiSubThemes", { n: themes.size })],
    [t("kpiGlobal"), `${globalCount}`, t("kpiGlobalSub", { pct: globalPct })],
    [t("kpiUpside"), `${upsideCount}`, t("kpiUpsideSub")],
    [t("kpiSignals"), `${buys} ${t("actionBuy")} / ${sells} ${t("actionSell")}`, t("kpiSignalsSub", { n: signals?.signals?.length ?? 0 })],
  ];
  for (const [label, value, sub] of cards) {
    grid.appendChild(el("div", { class: "metric" }, [
      el("span", { class: "label" }, label),
      el("strong", {}, value),
      el("span", {}, sub),
    ]));
  }
  $("#meta-line").textContent = t("generatedLine", {
    stamp: stampStr,
    date: universe.updated_at,
    by: universe.updated_by,
  });
}

// ---------- Universe table ----------
// Options carry translated labels, so they are rebuilt whenever the locale
// changes. The inputs themselves are never replaced, so their listeners are
// attached once by attachFilterListeners() and cannot stack.
function refreshThemeOptions() {
  const { universe } = DATA;
  const themes = [...new Set(universe.entries.map((e) => e.theme))].sort();
  const themeSelect = $("#theme");
  themeSelect.innerHTML = "";
  themeSelect.appendChild(el("option", { value: "all" }, t("allThemes")));
  for (const th of themes) themeSelect.appendChild(el("option", { value: th }, themeLabel(th)));
  themeSelect.value = state.theme;
}

function attachFilterListeners() {
  $("#search").addEventListener("input", (e) => { state.query = e.target.value.trim().toLowerCase(); renderUniverse(); });
  $("#theme").addEventListener("change", (e) => { state.theme = e.target.value; renderUniverse(); });
  $("#onlyGlobal").addEventListener("change", (e) => { state.onlyGlobal = e.target.checked; renderUniverse(); });
  $("#onlyUpside").addEventListener("change", (e) => { state.onlyUpside = e.target.checked; renderUniverse(); });
}

function renderUniverse() {
  const { universe, analyst } = DATA;
  const analystBySym = new Map(analyst.items.map((a) => [a.symbol, a]));
  const grid = $("#universe-grid");
  grid.innerHTML = "";
  let shown = 0;
  const grouped = new Map();
  for (const e of universe.entries) {
    const a = analystBySym.get(e.symbol);
    if (state.theme !== "all" && e.theme !== state.theme) continue;
    if (state.onlyGlobal && !e.global_supply) continue;
    if (state.onlyUpside && !(a?.upside_pct > 0)) continue;
    if (state.query) {
      const hay = `${e.symbol} ${e.name} ${e.theme} ${e.note ?? ""}`.toLowerCase();
      if (!hay.includes(state.query)) continue;
    }
    shown++;
    if (!grouped.has(e.theme)) grouped.set(e.theme, []);
    grouped.get(e.theme).push({ e, a });
  }
  for (const [theme, items] of grouped) {
    const tbody = el("tbody");
    for (const { e, a } of items) {
      const u = a?.upside_pct;
      const uClass = u == null ? "muted" : u > 0 ? "pos" : "neg";
      tbody.appendChild(el("tr", {}, [
        el("td", { class: "mono" }, e.symbol),
        el("td", {}, [
          el("div", { class: "stock-name" }, e.name),
          e.note ? el("div", { class: "stock-note" }, e.note) : null,
        ]),
        el("td", {}, el("span", { class: e.global_supply ? "pill good" : "pill" }, e.global_supply ? t("yes") : t("no"))),
        el("td", { class: "num" }, fmt.num(a?.current_price)),
        el("td", { class: "num" }, fmt.num(a?.implied_target)),
        el("td", { class: `num ${uClass}` }, u == null ? "—" : fmt.pct(u, 0)),
        el("td", { class: "num muted" }, a?.buy_count != null && a?.total_count ? `${a.buy_count}/${a.total_count}` : "—"),
      ]));
    }
    const panel = el("div", { class: "theme-panel" }, [
      el("div", { class: "theme-title" }, [
        el("strong", {}, themeLabel(theme)),
        el("span", {}, `${items.length}`),
      ]),
      el("div", { class: "table-wrap" }, el("table", {}, [
        el("thead", {}, el("tr", {}, [
          el("th", {}, t("thTicker")), el("th", {}, t("thName")), el("th", {}, t("thGlobal")),
          el("th", { class: "num" }, t("thPrice")), el("th", { class: "num" }, t("thTarget")),
          el("th", { class: "num" }, t("thUpside")), el("th", { class: "num" }, t("thBuyRating")),
        ])),
        tbody,
      ])),
    ]);
    grid.appendChild(panel);
  }
  $("#status").textContent = t("showing", { shown, total: universe.entries.length });
}

// ---------- Signals ----------
function renderSignals() {
  const { universe, signals } = DATA;
  const tbody = $("#signals-table tbody");
  tbody.innerHTML = "";
  if (!signals) {
    tbody.appendChild(el("tr", {}, el("td", { colspan: 8, class: "muted" }, t("noSignalSnapshot"))));
    return;
  }
  const sigBySym = new Map((signals.signals ?? []).map((s) => [s.symbol, s]));
  const fundBySym = new Map((signals.fundamentals ?? []).map((f) => [f.symbol, f]));
  let buys = 0, sells = 0;
  // Sort: buys by confidence desc, then sells, then holds.
  const order = { buy: 0, hold: 2, sell: 1 };
  const rows = universe.entries
    .map((e) => ({ e, s: sigBySym.get(e.symbol), f: fundBySym.get(e.symbol) }))
    .sort((a, b) => {
      const oa = order[a.s?.action ?? "hold"], ob = order[b.s?.action ?? "hold"];
      if (oa !== ob) return oa - ob;
      return (b.s?.confidence ?? 0) - (a.s?.confidence ?? 0);
    });
  for (const { e, s, f } of rows) {
    if (s?.action === "buy") buys++;
    else if (s?.action === "sell") sells++;
    tbody.appendChild(el("tr", {}, [
      el("td", { class: "mono" }, e.symbol),
      el("td", {}, e.name),
      el("td", { class: "muted" }, themeLabel(e.theme)),
      el("td", {}, el("span", { class: `badge ${s?.action ?? ""}` }, s ? actionLabel(s.action) : t("na"))),
      el("td", { class: "num" }, s ? `${(s.confidence * 100).toFixed(0)}%` : "—"),
      el("td", { class: "num" }, s ? `${(s.size * 100).toFixed(0)}%` : "—"),
      el("td", { class: "num" }, fmt.num(f?.pe_ttm, 1)),
      el("td", { class: "muted signal-reason" }, s?.rationale ?? "—"),
    ]));
  }
  $("#signals-summary").textContent = t("signalsCount", { buy: buys, sell: sells });
}

// ---------- Backtest ----------
function renderBacktest() {
  const bt = DATA.backtest;
  if (!bt) return;
  const { config, stats, equityCurve, trades } = bt;
  $("#backtest-window").textContent = t("backtestWindow", {
    start: config.startDate,
    end: config.endDate,
    cash: config.startCash.toLocaleString(),
    days: config.rebalanceEveryNDays,
    max: config.maxPositions,
    fee: config.feeBps,
  });

  const kpi = $("#backtest-kpi");
  kpi.innerHTML = "";
  const cards = [
    [t("kpiTotalReturn"), fmt.pct(stats.totalReturnPct, 1), stats.totalReturnPct >= 0 ? "pos" : "neg", t("kpiTotalReturnSub")],
    [t("kpiCagr"), fmt.pct(stats.cagrPct, 1), stats.cagrPct >= 0 ? "pos" : "neg", t("kpiCagrSub")],
    [t("kpiMaxDrawdown"), fmt.pct(stats.maxDrawdownPct, 1), "neg", t("kpiMaxDrawdownSub")],
    [t("kpiSharpe"), stats.sharpe == null ? "—" : stats.sharpe.toFixed(2), "", t("kpiSharpeSub", { n: stats.trades })],
  ];
  for (const [label, value, cls, sub] of cards) {
    kpi.appendChild(el("div", { class: "metric" }, [
      el("span", { class: "label" }, label),
      el("strong", { class: cls }, value),
      el("span", {}, sub),
    ]));
  }

  drawEquityChart(equityCurve, config.startCash);

  const tbody = $("#trades-table tbody");
  tbody.innerHTML = "";
  // Most recent first.
  const recent = trades.slice().reverse();
  for (const tr of recent) {
    tbody.appendChild(el("tr", {}, [
      el("td", { class: "mono" }, tr.date),
      el("td", {}, el("span", { class: `badge ${tr.side}` }, actionLabel(tr.side))),
      el("td", { class: "mono" }, tr.symbol),
      el("td", { class: "num" }, fmt.int(tr.shares)),
      el("td", { class: "num" }, fmt.num(tr.price)),
    ]));
  }
  $("#trades-count").textContent = t("tradesCount", { n: trades.length });
}

function drawEquityChart(curve, baseline) {
  const canvas = $("#equity-chart");
  if (!curve || curve.length === 0) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;

  function draw() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = rect.width, H = rect.height;
    ctx.clearRect(0, 0, W, H);

    const pad = { l: 56, r: 12, t: 12, b: 26 };
    const innerW = W - pad.l - pad.r;
    const innerH = H - pad.t - pad.b;
    const values = curve.map((b) => b.equity);
    const min = Math.min(baseline, ...values);
    const max = Math.max(baseline, ...values);
    const range = max - min || 1;
    const denom = curve.length > 1 ? curve.length - 1 : 1;
    const xAt = (i) => pad.l + (i / denom) * innerW;
    const yAt = (v) => pad.t + innerH - ((v - min) / range) * innerH;

    // grid + y axis labels
    ctx.font = "11px ui-sans-serif, -apple-system, sans-serif";
    ctx.fillStyle = "#9ca39a";
    ctx.strokeStyle = "#30343b";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const v = min + (range * i) / 4;
      const y = yAt(v);
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(W - pad.r, y);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(`$${Math.round(v / 1000)}k`, pad.l - 6, y);
    }

    // baseline line
    ctx.strokeStyle = "rgba(242,184,75,0.6)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.l, yAt(baseline));
    ctx.lineTo(W - pad.r, yAt(baseline));
    ctx.stroke();
    ctx.setLineDash([]);

    // equity line + fill
    const last = curve[curve.length - 1].equity;
    const color = last >= baseline ? "#63d471" : "#ff6b6b";
    ctx.fillStyle = last >= baseline ? "rgba(99,212,113,0.15)" : "rgba(255,107,107,0.15)";
    ctx.beginPath();
    ctx.moveTo(xAt(0), yAt(curve[0].equity));
    for (let i = 1; i < curve.length; i++) ctx.lineTo(xAt(i), yAt(curve[i].equity));
    ctx.lineTo(xAt(curve.length - 1), pad.t + innerH);
    ctx.lineTo(xAt(0), pad.t + innerH);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xAt(0), yAt(curve[0].equity));
    for (let i = 1; i < curve.length; i++) ctx.lineTo(xAt(i), yAt(curve[i].equity));
    ctx.stroke();

    // x labels: first, middle, last
    ctx.fillStyle = "#9ca39a";
    ctx.textBaseline = "top";
    const ticks = [0, Math.floor(curve.length / 2), curve.length - 1];
    for (const i of ticks) {
      ctx.textAlign = i === 0 ? "left" : i === curve.length - 1 ? "right" : "center";
      ctx.fillText(curve[i].date, xAt(i), H - pad.b + 6);
    }
  }
  draw();
  // Redraw on resize (debounced).
  let raf = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(draw);
  });
}

// ---------- Boot ----------
function renderAll() {
  renderKpis();
  renderUniverse();
  renderSignals();
  renderBacktest();
}

(async () => {
  try {
    const [universe, analyst, meta] = await Promise.all([
      loadJson("universe.json"),
      loadJson("analyst.json"),
      loadJson("meta.json"),
    ]);
    const [signals, backtest] = await Promise.all([
      loadJson("signals.json").catch(() => null),
      loadJson("backtest.json").catch(() => null),
    ]);
    DATA = { universe, analyst, meta, signals, backtest };

    applyStaticTranslations();
    refreshThemeOptions();
    attachFilterListeners();
    // A language switch re-applies static copy, rebuilds the theme dropdown
    // labels, and repaints the tables. The filter inputs are never replaced, so
    // their listeners stay single.
    setupLanguageToggle(() => {
      refreshThemeOptions();
      renderAll();
    });
    renderAll();
  } catch (e) {
    const locale = getLocale();
    document.body.innerHTML =
      `<div class="container"><h1>${t("loadFailed")}</h1><p>${e.message}</p>` +
      `<p>${t("loadFailedHint")}</p></div>`;
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }
})();
