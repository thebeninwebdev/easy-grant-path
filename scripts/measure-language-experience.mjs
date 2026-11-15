import {spawn} from "node:child_process";
import {mkdtemp, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";

const baseUrl = process.env.LANGUAGE_EXPERIENCE_URL || "http://127.0.0.1:3100";
const browserPath = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const debuggingPort = Number(process.env.EDGE_DEBUGGING_PORT || 9223);
const profileDirectory = await mkdtemp(join(tmpdir(), "easy-grant-path-language-"));
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
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      return await json(`http://127.0.0.1:${debuggingPort}/json/version`);
    } catch (error) {
      lastError = error;
      await delay(50);
    }
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

  close() {
    this.socket.close();
  }
}

async function evaluate(session, expression, awaitPromise = false) {
  const result = await session.send("Runtime.evaluate", {expression, awaitPromise, returnByValue: true});
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(session, expression, timeout = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = await evaluate(session, expression);
    if (value) return value;
    await delay(20);
  }
  return null;
}

function summarizeRequests(requests, startedAt) {
  return [...requests.values()]
    .filter((request) => request.startedAt >= startedAt && request.url.startsWith(baseUrl))
    .map((request) => ({
      resource: request.type,
      path: new URL(request.url).pathname + new URL(request.url).search,
      status: request.status,
      ttfbMs: request.timing ? Math.round((request.timing.receiveHeadersEnd - request.timing.sendEnd) * 10) / 10 : null,
      transferMs: request.finishedAt && request.timing ? Math.max(0, Math.round((request.finishedAt - request.responseStartedAt) * 1000 * 10) / 10) : null,
      encodedBytes: request.encodedBytes || 0,
    }));
}

async function run() {
  await waitForBrowser();
  const target = await json(`http://127.0.0.1:${debuggingPort}/json/new?${encodeURIComponent(baseUrl)}`, {method: "PUT"});
  const session = new CdpSession(target.webSocketDebuggerUrl);
  const requests = new Map();
  session.on("Network.requestWillBeSent", ({requestId, request, timestamp, type}) => {
    requests.set(requestId, {url: request.url, startedAt: timestamp, type});
  });
  session.on("Network.responseReceived", ({requestId, response, timestamp, type}) => {
    const request = requests.get(requestId);
    if (request) Object.assign(request, {status: response.status, timing: response.timing, responseStartedAt: timestamp, type});
  });
  session.on("Network.loadingFinished", ({requestId, timestamp, encodedDataLength}) => {
    const request = requests.get(requestId);
    if (request) Object.assign(request, {finishedAt: timestamp, encodedBytes: encodedDataLength});
  });
  await Promise.all([session.send("Page.enable"), session.send("Runtime.enable"), session.send("Network.enable")]);

  async function navigate(path) {
    await session.send("Page.navigate", {url: baseUrl + path});
    const ready = await waitFor(session, "document.readyState === 'complete' && document.querySelector('button[lang]') && ({path: location.pathname, locale: document.documentElement.lang})");
    await delay(250);
    return ready;
  }

  async function switchLocale(targetLocale, expectedPath, expectedText) {
    const clock = await evaluate(session, "performance.timeOrigin / 1000 + performance.now() / 1000");
    await evaluate(session, `(() => {
      const targetLocale = ${JSON.stringify(targetLocale)};
      const expectedPath = ${JSON.stringify(expectedPath)};
      const expectedText = ${JSON.stringify(expectedText)};
      const started = performance.now();
      window.__languageMeasurement = {started, selectedMs: null, urlMs: null, langMs: null, translationMs: null};
      const sample = () => {
        const result = window.__languageMeasurement;
        if (result.selectedMs === null && document.querySelector(\`button[lang="\${targetLocale}"][aria-pressed="true"]\`)) result.selectedMs = performance.now() - started;
        if (result.urlMs === null && location.pathname === expectedPath) result.urlMs = performance.now() - started;
        if (result.langMs === null && document.documentElement.lang === targetLocale) result.langMs = performance.now() - started;
        if (result.translationMs === null && document.body.innerText.includes(expectedText)) result.translationMs = performance.now() - started;
        if ([result.urlMs, result.langMs, result.translationMs].some((value) => value === null)) requestAnimationFrame(sample);
        else result.completeMs = performance.now() - started;
      };
      requestAnimationFrame(sample);
      document.querySelector(\`button[lang="\${targetLocale}"]\`).click();
    })()`);
    const result = await waitFor(session, "window.__languageMeasurement?.completeMs && window.__languageMeasurement", 10_000)
      || await evaluate(session, "window.__languageMeasurement");
    result.final = await evaluate(session, "({path: location.pathname, search: location.search, hash: location.hash, lang: document.documentElement.lang, selected: document.querySelector('button[aria-pressed=true]')?.lang, busy: document.querySelector('[aria-busy=true]') !== null})");
    result.requests = summarizeRequests(requests, clock);
    return result;
  }

  const scenarios = [];
  await navigate("/en?probe=home#mission");
  scenarios.push({scenario: "homepage en-to-fr", result: await switchLocale("fr", "/", "Un chemin plus simple")});
  scenarios.push({scenario: "homepage fr-to-en", result: await switchLocale("en", "/en", "A clearer path")});
  await navigate("/en/sign-in?callbackURL=%2Fdashboard#form");
  scenarios.push({scenario: "sign-in en-to-fr", result: await switchLocale("fr", "/sign-in", "Bon retour")});
  scenarios.push({scenario: "sign-in fr-to-en", result: await switchLocale("en", "/en/sign-in", "Welcome back")});
  await navigate("/en/dashboard?probe=dashboard#main");
  scenarios.push({scenario: "dashboard guard en-to-fr", result: await switchLocale("fr", "/sign-in", "Bon retour")});
  console.log(JSON.stringify({baseUrl, scenarios}, null, 2));
  session.close();
}

try {
  await run();
} finally {
  browser.kill();
  await rm(profileDirectory, {recursive: true, force: true});
}
