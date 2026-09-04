import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const requiredTaskFields = ["目标", "非目标", "涉及文件", "对应验收", "测试命令", "可视证据"];

test("AI task log keeps reproducible task records for recent work", () => {
  const log = readFileSync("docs/acceptance/AI_TASK_LOG.md", "utf8");
  const tasks = log
    .split(/\n(?=## TASK-)/)
    .map((block) => ({ id: block.match(/^## (TASK-[\d-]+)/m)?.[1], block }))
    .filter((task) => task.id);

  assert.ok(tasks.length >= 10);
  for (const task of tasks.slice(-10)) {
    for (const field of requiredTaskFields) {
      assert.match(task.block, new RegExp(`^- ${field}：`, "m"), `${task.id} 缺少 ${field}`);
    }
  }
});

test("QA smoke report preserves defect repair samples with root causes", () => {
  const report = readFileSync("docs/acceptance/QA_SMOKE_REPORT.md", "utf8");
  const requiredIssues = [
    "标题按钮无法点击",
    "不支持环境可能停留在加载态",
    "部分入口、敌人和拾取物压到碰撞区",
    "保存写入失败会抛出浏览器异常",
    "模型/服务端慢请求缺少前端请求锁",
  ];

  for (const issue of requiredIssues) {
    assert.match(report, new RegExp(`\\| ${issue} \\|[^\\n]+\\|[^\\n]+\\|`), `${issue} 缺少问题、根因和修复记录`);
  }
});

test("architecture decision record captures context, assumptions, impact, and risk", () => {
  const adr = readFileSync("docs/acceptance/adr/ADR-2026-06-26-ACCEPTANCE-EVIDENCE.md", "utf8");

  for (const marker of ["读取现状", "假设", "影响范围", "风险", "验证"]) {
    assert.match(adr, new RegExp(marker));
  }
  assert.match(adr, /本地自动证据/);
  assert.match(adr, /最终签署仍缺失/);
});

test("visual iteration report links goals, diffs, fixes, and screenshots", () => {
  const audit = readFileSync("scripts/evidenceAudit.js", "utf8");
  const report = readFileSync("docs/acceptance/tests/visual/VISUAL_ITERATION_REPORT.md", "utf8");

  assert.match(audit, /VISUAL_ITERATION_REPORT/);
  assert.match(report, /目标参考矩阵/);
  assert.match(report, /逐次迭代记录/);
  for (const marker of ["ART_BIBLE", "VISUAL_REGRESSION_REPORT", "RESPONSIVE_SCREENSHOT_REPORT", "READABILITY_REPORT", "BROWSER_FLOW_REPORT"]) {
    assert.match(report, new RegExp(marker));
  }
});
