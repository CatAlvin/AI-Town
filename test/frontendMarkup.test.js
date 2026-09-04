import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("frontend has a clear compatibility fallback instead of a blank page", () => {
  const html = readFileSync("public/legacy.html", "utf8");
  const css = readFileSync("public/styles.css", "utf8");
  const app = readFileSync("public/app.js", "utf8");

  assert.match(html, /<noscript>/);
  assert.match(html, /id="compatFallback"/);
  assert.match(html, /nomodule/);
  assert.match(html, /桌面 Chromium 或 Firefox/);
  assert.match(css, /\.compat-screen/);
  assert.match(app, /isSupportedEnvironment/);
  assert.match(app, /canUseLocalStorage/);
});

test("settings surface covers accessibility and play preference controls", () => {
  const app = readFileSync("public/app.js", "utf8");

  for (const marker of [
    "setVolume",
    "setMusicVolume",
    "setSfxVolume",
    "setMuted",
    "setTextSpeed",
    "setBrightness",
    "setShake",
    "setMotion",
    "setDifficulty",
    "setFont",
    "fullscreenBtn",
  ]) {
    assert.match(app, new RegExp(marker));
  }
  assert.match(app, /moonbell\.settings/);
  assert.match(app, /localStorage\.setItem\(storageKeys\.settings/);
  assert.match(app, /requestFullscreen/);
  assert.match(app, /difficulty === "轻松"/);
  assert.match(app, /fontScale/);
});

test("frontend exposes procedural music, sound effects, and event-driven playback hooks", () => {
  const app = readFileSync("public/app.js", "utf8");

  for (const marker of ["audioThemes", "soundEffects", "startMusic", "scheduleAmbience", "playSound", "playFootstep", "applyAudioSettings"]) {
    assert.match(app, new RegExp(marker));
  }
  for (const soundId of ["attackBell", "dodge", "playerHit", "pickup", "questChime", "uiSave", "rumor"]) {
    assert.match(app, new RegExp(soundId));
  }
});

test("frontend exposes camp cooking recipes from the inn hearth", () => {
  const app = readFileSync("public/app.js", "utf8");

  for (const marker of ["openCampMenu", "craftRecipe", "getUnlockedRecipes", "data-craft", "campRestBtn"]) {
    assert.match(app, new RegExp(marker));
  }
});

test("portfolio scenes can open fixed UI panels for responsive screenshots", () => {
  const app = readFileSync("public/app.js", "utf8");

  assert.match(app, /openPortfolioPanel/);
  assert.match(app, /get\("panel"\)/);
  assert.match(app, /sceneId === "bellvale"/);
  for (const marker of ["quest: openQuestLog", "inventory: openInventory", "save: openSaveMenu", "settings: openSettings", "pause:"]) {
    assert.match(app, new RegExp(marker));
  }
});

test("portfolio scenes expose weather, segment, and brightness overrides for readability screenshots", () => {
  const app = readFileSync("public/app.js", "utf8");

  assert.match(app, /applyPortfolioOverrides/);
  assert.match(app, /get\("weather"\)/);
  assert.match(app, /get\("segment"\)/);
  assert.match(app, /get\("brightness"\)/);
  assert.match(app, /settings\.brightness/);
});

test("frontend save flow handles local storage write failures", () => {
  const app = readFileSync("public/app.js", "utf8");

  assert.match(app, /writeSaveToStorage/);
  assert.match(app, /showToast\(result\.message\)/);
  assert.match(app, /return false/);
});

test("frontend exposes non-audio and non-color feedback channels", () => {
  const app = readFileSync("public/app.js", "utf8");
  const audit = readFileSync("scripts/evidenceAudit.js", "utf8");

  for (const marker of ["setMuted", "showToast", "messageLog", "autosaveLabel", "questTitle", "questText", "hpBar", "drawMarker"]) {
    assert.match(app, new RegExp(marker));
  }
  assert.match(app, /settings\.muted/);
  assert.match(app, /fillText\(label/);
  assert.match(audit, /ACCESSIBILITY_FEEDBACK_REPORT/);
  assert.match(audit, /静音与色觉差异反馈检查报告/);
});

test("frontend rumor requests are gated, timed, and fall back locally", () => {
  const app = readFileSync("public/app.js", "utf8");

  assert.match(app, /createRequestGate/);
  assert.match(app, /fetchJsonWithTimeout/);
  assert.match(app, /networkGate\.run\("rumor"/);
  assert.match(app, /timeoutMs: 1900/);
  assert.match(app, /result\.code === "duplicate"/);
  assert.match(app, /createLocalRumor\(runtime\.state\)/);
});

test("frontend uses shared relationship dialogue rules", () => {
  const app = readFileSync("public/app.js", "utf8");

  assert.match(app, /getNpcDialogueLine/);
  assert.doesNotMatch(app, /function buildNpcLine/);
});

test("frontend exposes an autonomous AI town observer mode", () => {
  const html = readFileSync("public/legacy.html", "utf8");
  const app = readFileSync("public/app.js", "utf8");

  assert.match(html, /id="aiTownBtn"/);
  assert.match(html, /AI小镇自主运行/);
  for (const marker of ["startAutonomousTown", "createTownSim", "updateAutonomousTown", "generateTownEvent", "townMemorySeeds", "townStoryBeats"]) {
    assert.match(app, new RegExp(marker));
  }
  assert.match(app, /townAgentIds = \["vella", "milu", "loran"\]/);
  assert.match(app, /townMemorySeeds = \[/);
  assert.equal((app.match(/\["(?:vella|milu|loran)", "(?:secret|promise|gift|help|combat)"/g) || []).length, 10);
  assert.match(app, /startedWithMemories/);
  assert.match(app, /params\.get\("mode"\) === "town"/);
});

test("civilization simulator is the primary map-first experience", () => {
  const html = readFileSync("public/index.html", "utf8");
  const css = readFileSync("public/civilization.css", "utf8");
  const app = readFileSync("public/civilization.js", "utf8");

  for (const marker of [
    "townCanvas",
    "metricStrip",
    "godEventForm",
    "storyTimeline",
    "citizenDrawer",
    "relationshipGraph",
  ]) {
    assert.match(html, new RegExp(`id="${marker}"`));
  }
  assert.match(html, /月铃文明/);
  assert.match(html, /30 名居民自主生活中/);
  assert.match(html, /href="\/legacy\.html"/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(app, /devicePixelRatio/);
  assert.match(app, /requestAnimationFrame/);
  for (const metric of ["population", "wealth", "crime", "relationships", "politics"]) {
    assert.match(app, new RegExp(metric));
  }
});

test("civilization UI exposes participatory, inspectable simulation controls", () => {
  const app = readFileSync("public/civilization.js", "utf8");

  for (const marker of [
    "handleGodEventSubmit",
    "showGodEventPreview",
    "applyPendingGodEvent",
    "togglePause",
    "setSpeed",
    "advanceOneDay",
    "openCitizenDrawer",
    "renderRelationshipGraph",
    "downloadWorld",
    "importWorldFile",
  ]) {
    assert.match(app, new RegExp(marker));
  }
  assert.match(app, /\/api\/civilization\/interpret-event/);
  assert.match(app, /现在为什么这么做/);
  assert.match(app, /常用事件仍可离线使用/);
});
