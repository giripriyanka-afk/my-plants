/**
 * Regenerates docs/screenshot.png, the image the README uses.
 *
 *   1. npm run dev          (in another terminal)
 *   2. node scripts/screenshot.mjs
 *
 * No dependencies. Chrome is driven directly over the DevTools Protocol —
 * Node ships fetch and a WebSocket client, which is all CDP needs, so this
 * avoids pulling in Playwright or Puppeteer just to take one picture.
 *
 * It seeds localStorage with a demo library before capturing. Without that a
 * fresh browser profile would photograph the empty state, which is the one
 * view of the app worth the least.
 *
 * Env overrides: CHROME_PATH, APP_URL, CDP_PORT.
 */
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs", "screenshot.png");
const PROFILE = join(tmpdir(), "my-plants-screenshot-profile");
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const PORT = Number(process.env.CDP_PORT ?? 9222);

const VIEWPORT = { width: 1280, height: 940, deviceScaleFactor: 2 };

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    join(
      process.env.LOCALAPPDATA ?? "",
      "Google\\Chrome\\Application\\chrome.exe",
    ),
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ];
  const found = candidates.find((p) => p && existsSync(p));
  if (!found) {
    throw new Error(
      "No Chrome or Edge found. Set CHROME_PATH to the browser executable.",
    );
  }
  return found;
}

// ---------------------------------------------------------------- demo data
const pad = (n) => String(n).padStart(2, "0");
const isoDay = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDay(d);
};
const carePlan = (water, fertilize, prune, repot) => ({
  water: { lastDone: water[0], intervalDays: water[1] },
  fertilize: { lastDone: fertilize[0], intervalDays: fertilize[1] },
  prune: { lastDone: prune[0], intervalDays: prune[1] },
  repot: { lastDone: repot[0], intervalDays: repot[1] },
});
const now = Date.now();
const makePlant = (id, name, description, roomId, care, extra = {}) => ({
  id,
  name,
  description,
  care,
  purchasedOn: null,
  passport: "",
  careNotes: "",
  light: "unspecified",
  roomId,
  createdAt: now,
  updatedAt: now,
  ...extra,
});

/** Deliberately spans every status, so the dots and badges all appear. */
const DEMO = {
  version: 3,
  rooms: [
    { id: "rm-living", name: "Living room" },
    { id: "rm-kitchen", name: "Kitchen" },
    { id: "rm-bath", name: "Bathroom" },
  ],
  plants: [
    makePlant(
      "p-monstera",
      "Monstera deliciosa",
      "Bright indirect light, away from the radiator.",
      "rm-living",
      carePlan([daysAgo(19), 7], [daysAgo(50), 30], [daysAgo(200), 365], [daysAgo(400), 730]),
      { light: "bright-indirect" },
    ),
    makePlant(
      "p-ficus",
      "Fiddle leaf fig",
      "Hates being moved. Rotate a quarter turn each month.",
      "rm-living",
      carePlan([daysAgo(10), 10], [daysAgo(20), 60], [daysAgo(90), 180], [daysAgo(300), 730]),
    ),
    makePlant(
      "p-aloe",
      "Aloe vera",
      "Let the soil dry out completely between waterings.",
      "rm-kitchen",
      carePlan([daysAgo(28), 30], [daysAgo(40), 90], [daysAgo(120), 365], [daysAgo(500), 1095]),
    ),
    makePlant(
      "p-basil",
      "Basil",
      "Windowsill pot, pinch the tops to keep it bushy.",
      "rm-kitchen",
      carePlan([daysAgo(1), 3], [daysAgo(5), 14], [daysAgo(4), 21], [daysAgo(30), 180]),
    ),
    makePlant(
      "p-fern",
      "Boston fern",
      "Loves the humidity in here. Mist if the tips brown.",
      "rm-bath",
      carePlan([null, 5], [null, 30], [null, 60], [null, 365]),
    ),
  ],
};

// ------------------------------------------------------------------ cdp glue
let nextId = 1;
const pending = new Map();
const listeners = new Map();

function send(ws, method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    setTimeout(() => reject(new Error(`${method} timed out`)), 30_000);
  });
}

function once(method) {
  return new Promise((resolve) => {
    const handler = (params) => {
      listeners.set(
        method,
        (listeners.get(method) ?? []).filter((fn) => fn !== handler),
      );
      resolve(params);
    };
    listeners.set(method, [...(listeners.get(method) ?? []), handler]);
  });
}

async function waitForDebugger() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const page = (await res.json()).find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Browser not listening yet.
    }
    await sleep(500);
  }
  throw new Error("Chrome never exposed a debugging target");
}

async function assertDevServer() {
  try {
    const res = await fetch(APP_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (error) {
    throw new Error(
      `No app at ${APP_URL} (${error.message}). Start it with: npm run dev`,
    );
  }
}

// --------------------------------------------------------------------- main
await assertDevServer();
rmSync(PROFILE, { recursive: true, force: true });
mkdirSync(join(ROOT, "docs"), { recursive: true });

const chrome = spawn(
  findChrome(),
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

try {
  const ws = new WebSocket(await waitForDebugger());
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    } else if (msg.method) {
      listeners.get(msg.method)?.forEach((fn) => fn(msg.params));
    }
  });
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  await send(ws, "Page.enable");
  await send(ws, "Emulation.setDeviceMetricsOverride", {
    ...VIEWPORT,
    mobile: false,
  });

  // First load only exists to give us an origin to write localStorage against.
  const firstLoad = once("Page.loadEventFired");
  await send(ws, "Page.navigate", { url: APP_URL });
  await firstLoad;

  await send(ws, "Runtime.evaluate", {
    expression: `localStorage.setItem('myplants:data', ${JSON.stringify(
      JSON.stringify(DEMO),
    )}); true`,
  });

  const secondLoad = once("Page.loadEventFired");
  await send(ws, "Page.reload");
  await secondLoad;
  await sleep(1500); // hydration and webfonts

  // Expand the first card, so the image shows care rows and not just the
  // collapsed shell every card starts in.
  await send(ws, "Runtime.evaluate", {
    expression: `
      (() => {
        const btn = [...document.querySelectorAll('button')]
          .find((b) => b.textContent.trim() === 'Care');
        if (!btn) return 'no Care button found';
        btn.click();
        return 'expanded';
      })()`,
  });
  await sleep(600);

  // The Next dev-tools bubble is dev-only chrome and must not appear in a
  // picture of the app.
  await send(ws, "Runtime.evaluate", {
    expression: `
      (() => {
        const style = document.createElement('style');
        style.textContent =
          'nextjs-portal,[data-nextjs-dev-tools-button]{display:none!important}';
        document.head.appendChild(style);
        return true;
      })()`,
  });
  await sleep(200);

  const { data } = await send(ws, "Page.captureScreenshot", { format: "png" });
  writeFileSync(OUT, Buffer.from(data, "base64"));

  // Fail loudly rather than silently shipping a picture of the empty state.
  const probe = await send(ws, "Runtime.evaluate", {
    expression: `JSON.stringify({
      cards: document.querySelectorAll('article').length,
      empty: document.body.textContent.includes('No plants yet'),
    })`,
    returnByValue: true,
  });
  const { cards, empty } = JSON.parse(probe.result.value);
  if (empty || cards === 0) {
    throw new Error(`Captured the empty state (cards=${cards}) — not usable`);
  }

  console.log(`Wrote docs/screenshot.png (${cards} plant cards)`);
} finally {
  chrome.kill();
  // Best effort: Chrome releases the profile directory asynchronously, so a
  // delete straight after kill() can still hit EPERM on Windows. It lives in
  // the temp dir and the next run clears it anyway, so a failure here must not
  // fail a screenshot that already succeeded.
  await sleep(500);
  try {
    rmSync(PROFILE, { recursive: true, force: true });
  } catch {
    // Left for the next run to clean up.
  }
}
