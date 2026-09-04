import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("backup restore evidence covers sample saves and new slots", () => {
  const report = readFileSync("docs/acceptance/tests/ops/BACKUP_RESTORE_REPORT.md", "utf8");

  assert.match(report, /状态：通过/);
  assert.match(report, /restored-slot-1/);
  assert.match(report, /restored-slot-4/);
  assert.match(report, /checksum/);
  assert.match(report, /全新实例/);
});
