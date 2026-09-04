import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("press kit includes key art source and linked favicon", () => {
  const html = readFileSync("public/index.html", "utf8");
  const icon = readFileSync("public/favicon.svg", "utf8");
  const keyArt = readFileSync("docs/acceptance/presskit/key-art-source.svg", "utf8");

  assert.match(html, /rel="icon"/);
  assert.match(html, /href="\/favicon\.svg\?v=0\.4\.0"/);
  assert.match(icon, /viewBox="0 0 512 512"/);
  assert.match(icon, /绒火与月铃图标/);
  assert.match(keyArt, /viewBox="0 0 1600 900"/);
  assert.match(keyArt, /绒火与月铃主视觉/);
});

test("asset pipeline records a complete flow sample for shipped visuals", () => {
  const pipeline = readFileSync("docs/acceptance/ASSET_PIPELINE.md", "utf8");

  assert.match(pipeline, /完整流转样例/);
  assert.match(pipeline, /key-art-source\.svg/);
  assert.match(pipeline, /favicon\.svg/);
  assert.match(pipeline, /最终批准/);
  assert.match(pipeline, /PRESSKIT_REPORT\.md/);
});
