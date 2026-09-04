import test from "node:test";
import assert from "node:assert/strict";
import { createRequestGate, fetchJsonWithTimeout } from "../src/networkSafety.js";

test("request gate rejects duplicate in-flight work and releases after completion", async () => {
  const gate = createRequestGate();
  let resolveFirst;
  const first = gate.run(
    "rumor",
    () =>
      new Promise((resolve) => {
        resolveFirst = () => resolve("ok");
      }),
  );
  const duplicate = await gate.run("rumor", async () => "duplicate");
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.code, "duplicate");
  assert.equal(gate.isActive("rumor"), true);
  resolveFirst();
  const firstResult = await first;
  assert.equal(firstResult.ok, true);
  assert.equal(firstResult.value, "ok");
  assert.equal(gate.isActive("rumor"), false);
});

test("fetchJsonWithTimeout aborts slow JSON requests", async () => {
  const fetchImpl = (_url, options) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      });
    });
  await assert.rejects(() => fetchJsonWithTimeout("/slow", {}, { timeoutMs: 10, fetchImpl }), /请求超过 10ms/);
});

test("request gate classifies timeout and HTTP failures for local fallback", async () => {
  const gate = createRequestGate();
  const timeout = await gate.run("rumor", async () => {
    const error = new Error("late");
    error.name = "TimeoutError";
    throw error;
  });
  assert.equal(timeout.ok, false);
  assert.equal(timeout.code, "timeout");
  assert.match(timeout.message, /本地内容/);

  const http = await gate.run("rumor", async () => {
    const error = new Error("HTTP 503");
    error.name = "HttpError";
    throw error;
  });
  assert.equal(http.ok, false);
  assert.equal(http.code, "http");
  assert.match(http.message, /服务端/);
});
