import test from "node:test";
import assert from "node:assert/strict";
import { areas, audioThemes, enemyTypes, items, mainQuestStages, memories, npcs, recipes, sideQuests, soundEffects, upgrades } from "../src/gameData.js";
import { getAcceptanceSummary, getNpcArea, runWorldSimulation } from "../src/gameRules.js";

test("content budget matches the acceptance checklist minimums", () => {
  const summary = getAcceptanceSummary();
  assert.equal(summary.mainAreas, 5);
  assert.equal(summary.interiors, 3);
  assert.ok(summary.namedNpcs >= 8);
  assert.ok(summary.scheduledNpcs >= 6);
  assert.ok(summary.items >= 15);
  assert.ok(summary.enemyTypes >= 6);
  assert.equal(summary.mainStages, 6);
  assert.ok(summary.sideQuests >= 5);
  assert.ok(summary.upgrades >= 4);
  assert.ok(summary.recipes >= 1);
  assert.ok(summary.recipes <= 6);
  assert.equal(summary.memoryTypes, 5);
  assert.ok(summary.audioThemes >= 4);
  assert.ok(summary.soundEffects >= 25);
});

test("main areas have landmarks and navigable exits", () => {
  for (const area of Object.values(areas).filter((item) => item.kind === "main")) {
    assert.ok(area.landmarks.length >= 2, area.id);
    assert.ok(area.exits.length >= 1, area.id);
    for (const exit of area.exits) assert.ok(areas[exit.to], `${area.id} exit ${exit.id}`);
  }
});

test("npc schedules resolve to valid areas for every time segment", () => {
  const state = runWorldSimulation(3, 1).state;
  for (const npc of npcs) {
    const area = getNpcArea(npc.id, state);
    assert.ok(areas[area], `${npc.id} -> ${area}`);
  }
});

test("all items, enemies, quests, and memories have player-facing Chinese text", () => {
  for (const item of items) assert.match(`${item.name}${item.use}`, /[\u4e00-\u9fa5]/);
  for (const enemy of Object.values(enemyTypes)) assert.match(`${enemy.name}${enemy.tell}`, /[\u4e00-\u9fa5]/);
  for (const stage of mainQuestStages) assert.match(`${stage.title}${stage.goal}${stage.obstacle}${stage.next}`, /[\u4e00-\u9fa5]/);
  for (const quest of sideQuests) assert.match(`${quest.title}${quest.consequence}${quest.theme}`, /[\u4e00-\u9fa5]/);
  for (const recipe of recipes) assert.match(`${recipe.title}${recipe.note}${recipe.station}`, /[\u4e00-\u9fa5]/);
  for (const memory of memories) assert.match(`${memory.label}${memory.text}`, /[\u4e00-\u9fa5]/);
  for (const upgrade of upgrades) assert.match(`${upgrade.title}${upgrade.effect}`, /[\u4e00-\u9fa5]/);
});

test("procedural audio covers music themes, ambient layers, and required effect categories", () => {
  assert.ok(audioThemes.length >= 4);
  for (const theme of audioThemes) {
    assert.match(`${theme.name}${theme.purpose}`, /[\u4e00-\u9fa5]/);
    assert.ok(theme.pattern.length >= 8, theme.id);
    assert.ok(theme.ambientLayers.length >= 1, theme.id);
  }

  assert.ok(soundEffects.length >= 25);
  const categories = new Set(soundEffects.map((effect) => effect.category));
  for (const category of ["UI", "移动", "交互", "战斗", "环境"]) assert.ok(categories.has(category), category);
  for (const effect of soundEffects) {
    assert.match(`${effect.name}${effect.use}`, /[\u4e00-\u9fa5]/);
    assert.ok(effect.tones.length >= 1, effect.id);
  }
});
