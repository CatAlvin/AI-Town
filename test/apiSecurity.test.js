import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { CIVILIZATION_RELEASE } from "../src/civilizationData.js";

const VERSION = CIVILIZATION_RELEASE;

const port = 58173;
let serverProcess;

test.before(async () => {
  serverProcess = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      RATE_LIMIT: "100",
      LLM_SESSION_LIMIT: "1",
      LLM_TIMEOUT_MS: "200",
      DEEPSEEK_API_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await waitForHealth();
});

test.after(() => {
  serverProcess?.kill();
});

test("health endpoint separates core and optional LLM state", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/api/health`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.version, VERSION);
  assert.equal(payload.buildDate, "local-dev");
  assert.equal(payload.buildCommit, "untracked-local");
  assert.equal(payload.core.status, "ok");
  assert.equal(payload.optionalLLM.status, "not-configured");
});

test("status endpoint exposes reproducible version metadata without secrets", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/api/status`);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.version, VERSION);
  assert.equal(payload.buildDate, "local-dev");
  assert.equal(payload.buildCommit, "untracked-local");
  assert.equal(payload.hasLLM, false);
  assert.ok(!JSON.stringify(payload).includes("sk-"));
});

test("rumor endpoint degrades locally without a key and enforces session quota", async () => {
  const first = await postJson("/api/rumor", { useLLM: true, sessionId: "api-test", state: {} });
  assert.equal(first.status, 200);
  const firstPayload = await first.json();
  assert.equal(firstPayload.source, "local-no-llm");
  assert.ok(firstPayload.rumor.line.includes("月铃塔"));

  const second = await postJson("/api/rumor", { useLLM: false, sessionId: "api-test", state: {} });
  assert.equal(second.status, 200);
  const secondPayload = await second.json();
  assert.equal(secondPayload.source, "local-no-llm");
});

test("civilization event endpoint understands common events locally and rejects unknown input safely", async () => {
  const known = await postJson("/api/civilization/interpret-event", { text: "城里突然发现了巨大金矿。", day: 12 });
  assert.equal(known.status, 200);
  const knownPayload = await known.json();
  assert.equal(knownPayload.source, "local");
  assert.equal(knownPayload.plan.type, "gold_discovery");
  assert.equal(knownPayload.plan.intensity, 3);

  const unknown = await postJson("/api/civilization/interpret-event", { text: "让每个人思考月亮的颜色。" });
  assert.equal(unknown.status, 422);
  const unknownText = await unknown.text();
  assert.match(unknownText, /经济危机/);
  assert.doesNotMatch(unknownText, /DEEPSEEK|Authorization|stack|sk-/i);
});

test("API rejects invalid JSON and oversized payload without leaking internals", async () => {
  const invalid = await fetch(`http://127.0.0.1:${port}/api/rumor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not-json",
  });
  assert.equal(invalid.status, 400);
  const invalidText = await invalid.text();
  assert.match(invalidText, /请求 JSON 无效/);
  assert.doesNotMatch(invalidText, /DEEPSEEK|Authorization|stack/i);

  const huge = await fetch(`http://127.0.0.1:${port}/api/rumor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blob: "x".repeat(70_000) }),
  });
  assert.equal(huge.status, 413);
  const hugeText = await huge.text();
  assert.match(hugeText, /请求体过大/);
});

test("API rate limit returns 429 under a constrained window", async () => {
  const limitedPort = 58174;
  const limitedServer = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(limitedPort),
      RATE_LIMIT: "3",
      RATE_WINDOW_MS: "60000",
      DEEPSEEK_API_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await waitForSpecificHealth(limitedPort);
    const one = await fetch(`http://127.0.0.1:${limitedPort}/api/health`);
    const two = await fetch(`http://127.0.0.1:${limitedPort}/api/status`);
    const three = await fetch(`http://127.0.0.1:${limitedPort}/api/status`);
    assert.equal(one.status, 200);
    assert.equal(two.status, 200);
    assert.equal(three.status, 429);
  } finally {
    limitedServer.kill();
  }
});

test("LLM fallback log is structured, versioned, and redacted", async () => {
  const logPort = 58175;
  let stdout = "";
  const logServer = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(logPort),
      RATE_LIMIT: "30",
      DEEPSEEK_API_KEY: "sk-short",
      DEEPSEEK_API_URL: "http://127.0.0.1:9/unavailable",
      LLM_TIMEOUT_MS: "150",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  logServer.stdout.on("data", (chunk) => {
    stdout += chunk.toString("utf8");
  });
  try {
    await waitForSpecificHealth(logPort);
    const response = await fetch(`http://127.0.0.1:${logPort}/api/rumor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ useLLM: true, sessionId: "log-test", state: {} }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.source, "local-fallback");
    const line = await waitForStdoutLine(() => stdout, "llm_rumor_fallback");
    assert.ok(!line.includes("sk-short"));
    const entry = JSON.parse(line);
    assert.equal(entry.level, "warn");
    assert.equal(entry.event, "llm_rumor_fallback");
    assert.equal(entry.version, VERSION);
    assert.ok(entry.time);
    assert.ok(entry.data.requestId);
    assert.ok(Number.isFinite(entry.data.ms));
  } finally {
    logServer.kill();
  }
});

async function postJson(path, body) {
  return fetch(`http://127.0.0.1:${port}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function waitForHealth() {
  const started = Date.now();
  while (Date.now() - started < 5000) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("test server did not become healthy");
}

async function waitForSpecificHealth(targetPort) {
  const started = Date.now();
  while (Date.now() - started < 5000) {
    try {
      const response = await fetch(`http://127.0.0.1:${targetPort}/api/health`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`test server ${targetPort} did not become healthy`);
}

async function waitForStdoutLine(read, needle) {
  const started = Date.now();
  while (Date.now() - started < 5000) {
    const line = read()
      .split(/\r?\n/)
      .find((entry) => entry.includes(needle));
    if (line) return line;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`stdout line not found: ${needle}`);
}
