import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdtemp, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";

const baseUrl = process.env.LANGUAGE_EXPERIENCE_URL || "http://localhost:3000";
const browserPath = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const debuggingPort = Number(process.env.EDGE_DEBUGGING_PORT || 9224);
const profileDirectory = await mkdtemp(join(tmpdir(), "easy-grant-path-language-test-"));
const browser = spawn(browserPath, [
  "--headless=new",
  `--remote-debugging-port=${debuggingPort}`,
  `--user-data-dir=${profileDirectory}`,
  "--disable-background-networking",
  "--disable-component-update",
  "--disable-default-apps",
  "--disable-extensions",
  "--disable-sync",
  "--metrics-recording-only",
  "--no-first-run",
  "about:blank",
], {stdio: "ignore", windowsHide: true});

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function json(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function waitForBrowser() {
  let lastError;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try { return await json(`http://127.0.0.1:${debuggingPort}/json/version`); }
    catch (error) { lastError = error; await delay(50); }
  }
  throw lastError;
}

class CdpSession {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.socket = new WebSocket(url);
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, {once: true});
      this.socket.addEventListener("error", reject, {once: true});
    });
    this.socket.addEventListener("message", ({data}) => {
      const message = JSON.parse(data);
      if (message.id) {
        const request = this.pending.get(message.id);
        if (!request) return;
        this.pending.delete(message.id);
        if (message.error) request.reject(new Error(message.error.message));
        else request.resolve(message.result);
        return;
      }
      for (const listener of this.listeners.get(message.method) || []) listener(message.params);
    });
  }
  async send(method, params = {}) {
    await this.ready;
    const id = this.nextId++;
    const result = new Promise((resolve, reject) => this.pending.set(id, {resolve, reject}));
    this.socket.send(JSON.stringify({id, method, params}));
    return result;
  }
  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }
  close() { this.socket.close(); }
}

async function evaluate(session, expression, awaitPromise = false) {
  const result = await session.send("Runtime.evaluate", {expression, awaitPromise, returnByValue: true});
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(session, expression, timeout = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = await evaluate(session, expression);
    if (value) return value;
    await delay(25);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function run() {
  await waitForBrowser();
  const target = await json(`http://127.0.0.1:${debuggingPort}/json/new?${encodeURIComponent(baseUrl)}`, {method: "PUT"});
  const session = new CdpSession(target.webSocketDebuggerUrl);
  const requests = [];
  const consoleErrors = [];
  session.on("Network.responseReceived", ({response, type}) => {
    if (response.url.startsWith(baseUrl)) requests.push({url: response.url, status: response.status, type});
  });
  session.on("Runtime.exceptionThrown", ({exceptionDetails}) => consoleErrors.push(exceptionDetails.exception?.description || exceptionDetails.text));
  await Promise.all([session.send("Page.enable"), session.send("Runtime.enable"), session.send("Network.enable")]);

  async function navigate(path) {
    await session.send("Page.navigate", {url: baseUrl + path});
    return waitFor(session, `document.readyState === "complete" && document.querySelector('[data-language-switcher][data-ready="true"]') && ({path: location.pathname, locale: document.documentElement.lang})`);
  }

  async function switchLocale({targetLocale, expectedPath, expectedText, repeated = false}) {
    const requestStart = requests.length;
    const initialLocale = await evaluate(session, "document.documentElement.lang");
    assert.notEqual(initialLocale, targetLocale);
    const initialPressed = await evaluate(session, "document.querySelector('[data-language-switcher] button[aria-pressed=true]').lang");
    assert.equal(initialPressed, initialLocale, "selected segment must reflect the committed locale");
    const immediate = await evaluate(session, `(async () => {
      const switcher = [...document.querySelectorAll('[data-language-switcher]')].find((item) => item.getClientRects().length);
      const button = switcher.querySelector('button[lang="${targetLocale}"]');
      button.click();
      ${repeated ? "button.click(); button.click();" : ""}
      await new Promise(requestAnimationFrame);
      return {busy: switcher.getAttribute('aria-busy'), selected: switcher.querySelector('button[aria-pressed=true]').lang, targetDisabled: button.disabled};
    })()`, true);
    assert.equal(immediate.busy, "true", "switcher should announce pending navigation immediately");
    assert.equal(immediate.selected, initialLocale, "pending state must not masquerade as the active locale");
    assert.equal(immediate.targetDisabled, true, "pending controls should reject duplicate clicks");
    let completed;
    try {
      await waitFor(session, `location.pathname === ${JSON.stringify(expectedPath)} && document.documentElement.lang === "${targetLocale}" && document.querySelector('h1')?.innerText.includes(${JSON.stringify(expectedText)}) && document.querySelector('[data-language-switcher] button[aria-pressed=true]')?.lang === "${targetLocale}"`);
      completed = await evaluate(session, "({path: location.pathname, search: location.search, hash: location.hash, locale: document.documentElement.lang, selected: document.querySelector('[data-language-switcher] button[aria-pressed=true]').lang, cookie: document.cookie, visibleBusy: document.querySelector('[data-language-switcher]').getAttribute('aria-busy') === 'true'})");
    } catch (error) {
      const diagnostic = await evaluate(session, "({href: location.href, lang: document.documentElement.lang, busy: document.querySelector('[data-language-switcher]')?.getAttribute('aria-busy'), selected: document.querySelector('[data-language-switcher] button[aria-pressed=true]')?.lang, heading: document.querySelector('h1')?.innerText, live: document.querySelector('[aria-live]')?.textContent, cookie: document.cookie})");
      throw new Error(`${error.message}\nState: ${JSON.stringify(diagnostic)}\nRequests: ${JSON.stringify(requests.slice(requestStart))}`);
    }
    assert.equal(completed.selected, targetLocale);
    assert.equal(completed.visibleBusy, false, "pending feedback should clear when the locale commits");
    assert.match(completed.cookie, new RegExp(`(?:^|; )NEXT_LOCALE=${targetLocale}(?:;|$)`));
    const transitionRequests = requests.slice(requestStart).filter(({url}) => new URL(url).pathname !== "/favicon.ico");
    const routeRequests = transitionRequests.filter(({type}) => type === "Fetch" || type === "Document");
    assert.ok(routeRequests.length <= 2, `locale navigation issued duplicate route requests: ${JSON.stringify(routeRequests)}`);
    return {completed, transitionRequests};
  }

  const results = [];
  await navigate("/en?probe=home#mission");
  let result = await switchLocale({targetLocale: "fr", expectedPath: "/", expectedText: "Votre ambition", repeated: true});
  assert.equal(result.completed.search, "?probe=home");
  assert.equal(result.completed.hash, "#mission");
  results.push({scenario: "homepage en-to-fr with repeated clicks", requests: result.transitionRequests.length});

  result = await switchLocale({targetLocale: "en", expectedPath: "/en", expectedText: "Your ambition"});
  assert.equal(result.completed.search, "?probe=home");
  assert.equal(result.completed.hash, "#mission");
  results.push({scenario: "homepage fr-to-en", requests: result.transitionRequests.length});

  await session.send("Page.reload", {ignoreCache: true});
  const refreshed = await waitFor(session, `document.querySelector('[data-language-switcher][data-ready="true"]') && document.documentElement.lang === "en" && ({path: location.pathname, selected: document.querySelector('[data-language-switcher] button[aria-pressed=true]').lang})`);
  assert.equal(refreshed.path, "/en");
  assert.equal(refreshed.selected, "en");
  results.push({scenario: "refresh persistence"});

  await navigate("/en/sign-in?callbackURL=%2Fen%2Fdashboard#form");
  result = await switchLocale({targetLocale: "fr", expectedPath: "/sign-in", expectedText: "Bon retour"});
  assert.equal(result.completed.search, "?callbackURL=%2Fen%2Fdashboard");
  assert.equal(result.completed.hash, "#form");
  results.push({scenario: "nested authentication route"});

  await evaluate(session, "history.back()");
  const backState = await waitFor(session, `location.pathname === "/en" && document.documentElement?.lang === "en" && document.querySelector('[data-language-switcher] button[aria-pressed=true]')?.lang === "en" && ({path: location.pathname, locale: document.documentElement.lang})`);
  assert.deepEqual(backState, {path: "/en", locale: "en"});
  await evaluate(session, "history.forward()");
  const forwardState = await waitFor(session, `location.pathname.endsWith("/sign-in") && document.documentElement?.lang && document.querySelector('[data-language-switcher] button[aria-pressed=true]')?.lang === document.documentElement.lang && ({path: location.pathname, locale: document.documentElement.lang})`);
  assert.ok(forwardState.path === "/sign-in" || forwardState.path === "/en/sign-in");
  assert.ok(forwardState.locale === "fr" || forwardState.locale === "en");
  results.push({scenario: "browser back and forward"});

  await navigate("/dashboard?probe=guard#main");
  const dashboardGuard = await waitFor(session, `location.pathname.endsWith('/sign-in') && document.querySelector('[data-language-switcher][data-ready="true"]') && ({path: location.pathname, locale: document.documentElement.lang})`);
  const dashboardTarget = dashboardGuard.locale === "fr" ? "en" : "fr";
  await switchLocale({targetLocale: dashboardTarget, expectedPath: dashboardTarget === "en" ? "/en/sign-in" : "/sign-in", expectedText: dashboardTarget === "en" ? "Welcome back" : "Bon retour"});
  results.push({scenario: "dashboard guard locale switching"});

  await navigate("/en/sign-in?slow=1#form");
  await session.send("Network.emulateNetworkConditions", {offline: false, latency: 650, downloadThroughput: 80_000, uploadThroughput: 40_000, connectionType: "cellular3g"});
  result = await switchLocale({targetLocale: "fr", expectedPath: "/sign-in", expectedText: "Bon retour", repeated: true});
  await session.send("Network.emulateNetworkConditions", {offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1, connectionType: "none"});
  results.push({scenario: "slow network pending feedback", requests: result.transitionRequests.length});

  await session.send("Emulation.setDeviceMetricsOverride", {width: 390, height: 844, deviceScaleFactor: 1, mobile: true});
  await navigate("/");
  const mobileLayout = await evaluate(session, `(() => {
    const summary = document.querySelector('details summary'); summary.click();
    const visible = [...document.querySelectorAll('[data-language-switcher]')].find((item) => item.getClientRects().length);
    const rect = visible.getBoundingClientRect();
    return {width: rect.width, height: rect.height, viewport: innerWidth, right: rect.right};
  })()`);
  assert.ok(mobileLayout.width >= 100 && mobileLayout.height >= 32, "mobile switcher must retain usable dimensions");
  assert.ok(mobileLayout.right <= mobileLayout.viewport, "mobile switcher must stay inside the viewport");
  await switchLocale({targetLocale: "en", expectedPath: "/en", expectedText: "Your ambition"});
  results.push({scenario: "mobile navigation"});

  await session.send("Emulation.setDeviceMetricsOverride", {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await navigate("/en");
  const visual = await evaluate(session, `(() => {
    const switcher = [...document.querySelectorAll('[data-language-switcher]')].find((item) => item.getClientRects().length);
    const selected = switcher.querySelector('button[aria-pressed=true]');
    const rect = switcher.getBoundingClientRect();
    const style = getComputedStyle(selected);
    const actions = [...document.querySelectorAll('header a, header [data-language-switcher]')].filter((item) => item.getClientRects().length).map((item) => item.getBoundingClientRect());
    let overlaps = 0;
    for (let index = 0; index < actions.length; index += 1) for (let other = index + 1; other < actions.length; other += 1) {
      const a = actions[index], b = actions[other];
      if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) overlaps += 1;
    }
    return {width: rect.width, height: rect.height, color: style.color, background: style.backgroundColor, overlaps};
  })()`);
  assert.ok(visual.width >= 100 && visual.height >= 32, "desktop switcher must not be squashed");
  assert.notEqual(visual.color, visual.background, "selected segment must have visible contrast");
  assert.equal(visual.overlaps, 0, "header controls must not overlap");
  results.push({scenario: "desktop visual consistency", dimensions: `${visual.width}x${visual.height}`});

  assert.deepEqual(consoleErrors, [], `browser exceptions: ${consoleErrors.join("\n")}`);
  console.log(JSON.stringify({baseUrl, results}, null, 2));
  session.close();
}

try {
  await run();
} finally {
  browser.kill();
  await delay(250);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try { await rm(profileDirectory, {recursive: true, force: true}); break; }
    catch { await delay(250); }
  }
}
