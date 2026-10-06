import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// The static Pages site (docs/) is hand-written and has no build step, so a
// translation key that is referenced but never defined renders as the raw key
// (e.g. the header shows "thGlobal"). This test scans every key the site uses
// and asserts both dictionaries define it.
//
// docs/ lives at the repo root, one level above web/.
const DOCS = path.resolve(__dirname, "..", "..", "docs");

/** Load docs/i18n.js with minimal browser stubs and return its SCS API. */
function loadScs(locale: string) {
  const src = fs.readFileSync(path.join(DOCS, "i18n.js"), "utf-8");
  const win: { SCS?: Record<string, (...args: never[]) => unknown> } = {};
  const doc = { cookie: `scs-locale=${locale}` };
  // The IIFE assigns to `window.SCS` and reads `document.cookie`.
  new Function("window", "document", src)(win, doc);
  assert.ok(win.SCS, "i18n.js did not expose window.SCS");
  return win.SCS;
}

/** Every translation key the site references. */
function usedKeys(): Set<string> {
  const keys = new Set<string>();

  const html = fs.readFileSync(path.join(DOCS, "index.html"), "utf-8");
  for (const m of html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)) {
    keys.add(m[1]);
  }

  const js = fs.readFileSync(path.join(DOCS, "app.js"), "utf-8");
  // t("key") and t("key", {...})
  for (const m of js.matchAll(/\bt\(\s*"([A-Za-z0-9_]+)"/g)) {
    keys.add(m[1]);
  }

  assert.ok(keys.size > 20, `expected to find many keys, found ${keys.size}`);
  return keys;
}

test("every translation key the static site uses is defined in both locales", () => {
  const keys = usedKeys();
  const missing: string[] = [];

  for (const locale of ["zh", "en"] as const) {
    const scs = loadScs(locale);
    const t = scs.t as unknown as (k: string) => string;
    for (const key of keys) {
      const value = t(key);
      // A missing key falls through to the key name itself.
      if (!value || value === key) missing.push(`${locale}:${key}`);
    }
  }

  assert.deepEqual(missing, [], `undefined translation keys: ${missing.join(", ")}`);
});

test("language switch changes the rendered copy", () => {
  const keys = usedKeys();
  const zh = loadScs("zh").t as unknown as (k: string) => string;
  const en = loadScs("en").t as unknown as (k: string) => string;

  let differing = 0;
  for (const key of keys) {
    if (zh(key) !== en(key)) differing++;
  }
  // Most keys should differ; a handful (like "thPeg") are identical by design.
  assert.ok(differing > keys.size / 2, `only ${differing}/${keys.size} keys differ between locales`);
});

test("theme labels translate known themes and fall back for unknown ones", () => {
  const zh = loadScs("zh");
  const en = loadScs("en");
  const themeLabel = (scs: Record<string, unknown>, theme: string) =>
    (scs.themeLabel as (t: string) => string)(theme);

  assert.equal(themeLabel(zh, "Compute / AI Chips"), "算力 / AI 芯片");
  assert.equal(themeLabel(en, "Compute / AI Chips"), "Compute / AI Chips");
  // An unknown theme must pass through untouched rather than render blank.
  assert.equal(themeLabel(zh, "Brand New Theme"), "Brand New Theme");
});
