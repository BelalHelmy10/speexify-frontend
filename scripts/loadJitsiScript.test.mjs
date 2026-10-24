import assert from "node:assert/strict";
import test from "node:test";
import {
  JITSI_SCRIPT_ID,
  getJitsiScriptUrl,
  loadJitsiScript,
} from "../lib/loadJitsiScript.mjs";

const LOADER_KEY = Symbol.for("speexify.jitsi.external-api-loader");

class FakeScript extends EventTarget {
  constructor(ownerDocument) {
    super();
    this.ownerDocument = ownerDocument;
    this.dataset = {};
    this.id = "";
    this.async = false;
    this.src = "";
  }

  remove() {
    const index = this.ownerDocument.scripts.indexOf(this);
    if (index >= 0) this.ownerDocument.scripts.splice(index, 1);
  }
}

class FakeDocument {
  constructor() {
    this.baseURI = "https://app.speexify.com/classroom/test";
    this.scripts = [];
    this.head = {
      appendChild: (script) => {
        if (!this.scripts.includes(script)) this.scripts.push(script);
        return script;
      },
    };
  }

  createElement(tagName) {
    assert.equal(tagName, "script");
    return new FakeScript(this);
  }

  querySelectorAll(selector) {
    assert.equal(selector, "script[src]");
    return this.scripts;
  }
}

function installBrowser() {
  const document = new FakeDocument();
  const window = {
    clearTimeout,
    setTimeout,
  };
  globalThis.document = document;
  globalThis.window = window;
  return { document, window };
}

function uninstallBrowser() {
  delete globalThis.document;
  delete globalThis.window;
}

function completeLoad(window, script) {
  window.JitsiMeetExternalAPI = function JitsiMeetExternalAPI() {};
  script.dispatchEvent(new Event("load"));
}

test.afterEach(uninstallBrowser);

test("canonicalizes the one allowed external API URL", () => {
  assert.equal(
    getJitsiScriptUrl("meet.speexify.com"),
    "https://meet.speexify.com/external_api.js"
  );
  assert.equal(
    getJitsiScriptUrl("meet.speexify.com:8443"),
    "https://meet.speexify.com:8443/external_api.js"
  );
  assert.throws(() => getJitsiScriptUrl("meet.speexify.com/other.js"), /Invalid Jitsi domain/);
  assert.throws(() => getJitsiScriptUrl(""), /required/);
});

test("shares one script and one promise across concurrent callers", async () => {
  const { document, window } = installBrowser();
  const first = loadJitsiScript("meet.speexify.com", 1000);
  const second = loadJitsiScript("meet.speexify.com", 1000);

  assert.equal(first, second);
  assert.equal(document.scripts.length, 1);
  assert.equal(document.scripts[0].id, JITSI_SCRIPT_ID);
  assert.equal(document.scripts[0].dataset.speexifyJitsiLoader, "true");
  assert.equal(document.scripts[0].src, "https://meet.speexify.com/external_api.js");

  completeLoad(window, document.scripts[0]);
  await Promise.all([first, second]);
  assert.equal(document.scripts[0].dataset.speexifyJitsiState, "loaded");
  assert.equal(window[LOADER_KEY].promise, null);
});

test("adopts an existing matching script instead of injecting another", async () => {
  const { document, window } = installBrowser();
  const existing = document.createElement("script");
  existing.src = "https://meet.speexify.com/external_api.js";
  document.head.appendChild(existing);

  const loading = loadJitsiScript("meet.speexify.com", 1000);
  assert.equal(document.scripts.length, 1);
  assert.equal(document.scripts[0], existing);
  assert.equal(existing.id, JITSI_SCRIPT_ID);

  completeLoad(window, existing);
  await loading;
});

test("rejects a competing domain without creating a second global loader", async () => {
  const { document } = installBrowser();
  const first = loadJitsiScript("meet.speexify.com", 1000);
  await assert.rejects(
    loadJitsiScript("other.example.com", 1000),
    /refusing a second loader/
  );
  assert.equal(document.scripts.length, 1);

  document.scripts[0].dispatchEvent(new Event("error"));
  await assert.rejects(first, /could not load/);
});

test("removes a failed generation and permits a clean retry", async () => {
  const { document, window } = installBrowser();
  const first = loadJitsiScript("meet.speexify.com", 1000);
  const failedScript = document.scripts[0];
  failedScript.dispatchEvent(new Event("error"));
  await assert.rejects(first, /could not load/);
  assert.equal(document.scripts.length, 0);

  const retry = loadJitsiScript("meet.speexify.com", 1000);
  assert.equal(document.scripts.length, 1);
  assert.notEqual(document.scripts[0], failedScript);
  completeLoad(window, document.scripts[0]);
  await retry;
});

test("replaces a completed tag if its global was later lost", async () => {
  const { document, window } = installBrowser();
  const first = loadJitsiScript("meet.speexify.com", 1000);
  const completedScript = document.scripts[0];
  completeLoad(window, completedScript);
  await first;

  delete window.JitsiMeetExternalAPI;
  const recovery = loadJitsiScript("meet.speexify.com", 1000);
  assert.equal(document.scripts.length, 1);
  assert.notEqual(document.scripts[0], completedScript);
  completeLoad(window, document.scripts[0]);
  await recovery;
});

test("times out, cleans up, and ignores a script that never initialized Jitsi", async () => {
  const { document } = installBrowser();
  const timedOut = loadJitsiScript("meet.speexify.com", 5);
  await assert.rejects(timedOut, /timed out after 5ms/);
  assert.equal(document.scripts.length, 0);

  const missingGlobal = loadJitsiScript("meet.speexify.com", 1000);
  document.scripts[0].dispatchEvent(new Event("load"));
  await assert.rejects(missingGlobal, /without initializing/);
  assert.equal(document.scripts.length, 0);
});

test("returns immediately when the API already exists", async () => {
  const { document, window } = installBrowser();
  window.JitsiMeetExternalAPI = function JitsiMeetExternalAPI() {};
  await loadJitsiScript("meet.speexify.com");
  assert.equal(document.scripts.length, 0);
});
