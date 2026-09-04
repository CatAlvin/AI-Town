import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("memory curve evidence is wired as a capture command and report", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const script = readFileSync("scripts/captureMemoryCurve.js", "utf8");
  const report = readFileSync("docs/acceptance/tests/performance/MEMORY_CURVE_REPORT.md", "utf8");

  assert.equal(pkg.scripts["capture:memory"], "node scripts/captureMemoryCurve.js");
  assert.match(script, /Microsoft Edge headless/);
  assert.match(script, /workingSetMiB/);
  assert.match(report, /浏览器内存曲线报告/);
  assert.match(report, /曲线截图/);
});

test("browser flow evidence is wired as a capture command and audited report", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const script = readFileSync("scripts/captureBrowserFlowEvidence.js", "utf8");
  const audit = readFileSync("scripts/evidenceAudit.js", "utf8");

  assert.equal(pkg.scripts["capture:browser-flow"], "node scripts/captureBrowserFlowEvidence.js");
  assert.match(script, /Page\.captureScreenshot/);
  assert.match(script, /MediaRecorder/);
  assert.match(script, /BROWSER_FLOW_MANIFEST/);
  assert.match(script, /map-edge-pressure/);
  assert.match(script, /interaction-stack/);
  assert.match(script, /combat-input/);
  assert.match(script, /npc-recovery/);
  assert.match(script, /inputEventCount/);
  assert.match(audit, /浏览器流程取证报告/);
  assert.match(audit, /browser-flow-videos/);
  assert.match(audit, /交互堆叠 20 次/);
  assert.match(audit, /战斗真实输入/);
});

test("frame rate evidence is wired as a capture command and audited report", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const script = readFileSync("scripts/captureFrameRate.js", "utf8");
  const audit = readFileSync("scripts/evidenceAudit.js", "utf8");

  assert.equal(pkg.scripts["capture:fps"], "node scripts/captureFrameRate.js");
  assert.match(script, /requestAnimationFrame/);
  assert.match(script, /p95FrameMs/);
  assert.match(script, /FRAME_RATE_MANIFEST/);
  assert.match(audit, /浏览器帧率报告/);
  assert.match(audit, /FRAME_RATE_REPORT/);
});
