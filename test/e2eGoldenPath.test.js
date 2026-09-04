import test from "node:test";
import assert from "node:assert/strict";
import {
  addItem,
  canCompleteStage,
  changeArea,
  completeMainStage,
  completeSideQuest,
  createNewGame,
  defeatEnemy,
  failAndRetry,
  finishGame,
  serializeSave,
  useItem,
  validateSave,
} from "../src/gameRules.js";

test("E2E smoke: new game, tutorial, cross-area, combat, quest update, save and load", () => {
  let state = createNewGame({ createdAt: "2026-06-26T00:00:00.000Z", saveId: "e2e-slot-0" });
  assert.equal(state.location, "bellvale");
  assert.equal(state.mainStage, 0);
  assert.equal(state.questLog.at(-1).status, "active");

  state = changeArea(state, "inn");
  state = addItem(state, "moonBadge", 1).state;
  let stageResult = completeMainStage(state, 0);
  assert.equal(stageResult.ok, true);
  state = stageResult.state;
  assert.equal(state.mainStage, 1);
  assert.equal(state.questLog.at(-1).title, "修复断桥根须");

  state = changeArea(state, "emberwood");
  const beforeCombatHp = state.player.hp;
  state = defeatEnemy(state, "bramble-chaser");
  assert.ok(state.defeated["bramble-chaser"] >= 1);
  assert.ok((state.inventory.emberResin || 0) >= 1);
  state = addItem(state, "emberResin", 1).state;
  stageResult = completeMainStage(state, 1);
  assert.equal(stageResult.ok, true);
  state = stageResult.state;
  assert.equal(state.flags.bridgeFixed, true);
  assert.equal(state.mainStage, 2);
  assert.equal(state.player.hp, beforeCombatHp);

  state.player.hp = 0;
  state = failAndRetry(state);
  assert.equal(state.player.hp, state.player.maxHp);
  assert.equal(state.location, state.checkpoint.area);

  const saved = serializeSave(state);
  const loaded = validateSave(saved);
  assert.equal(loaded.mainStage, 2);
  assert.equal(loaded.flags.bridgeFixed, true);

  state = loaded;
  state = changeArea(state, "riverfarm");
  state = addItem(state, "waterCog", 1).state;
  stageResult = completeMainStage(state, 2);
  assert.equal(stageResult.ok, true);
  state = stageResult.state;
  const midSave = validateSave(serializeSave(state));
  assert.equal(midSave.flags.bridgeFixed, true);
  assert.equal(midSave.flags.waterwheelFixed, true);
  assert.equal(midSave.location, "riverfarm");

  state = changeArea(state, "starruins");
  state = defeatEnemy(state, "echo-guardian");
  stageResult = completeMainStage(state, 3);
  assert.equal(stageResult.ok, true);
  state = stageResult.state;

  state = changeArea(state, "bellvale");
  state = addItem(state, "duskFeather", 1).state;
  state = completeSideQuest(state, "sq-scarf").state;
  state = addItem(state, "riverPumpkin", 1).state;
  state = completeSideQuest(state, "sq-price").state;
  assert.equal(canCompleteStage(state, 4).ok, true);
  state = completeMainStage(state, 4).state;

  state = changeArea(state, "moonspire");
  state = defeatEnemy(state, "night-bell");
  stageResult = completeMainStage(state, 5);
  assert.equal(stageResult.ok, true);
  state = finishGame(stageResult.state, "share");
  assert.equal(state.flags.endingSeen, true);
  assert.ok(state.ending.title.length > 0);
});

test("E2E smoke: consumable restore and invalid direct use are safe", () => {
  let state = createNewGame({ createdAt: "2026-06-26T00:00:00.000Z" });
  state.player.hp = 2;
  const herb = useItem(state, "moonHerb");
  assert.equal(herb.ok, true);
  assert.equal(herb.state.player.hp, 4);
  const keyItem = useItem(herb.state, "moonBadge");
  assert.equal(keyItem.ok, false);
});
