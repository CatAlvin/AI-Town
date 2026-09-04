import {
  SAVE_SCHEMA_VERSION,
  VERSION,
  areas,
  audioThemes,
  enemyTypes,
  items,
  mainQuestStages,
  memories,
  npcs,
  playerHero,
  projectIdentity,
  recipes,
  sideQuests,
  soundEffects,
  timeSegments,
  upgrades,
  weatherStates,
  worldRules,
} from "./gameData.js";

const itemById = Object.fromEntries(items.map((item) => [item.id, item]));
const areaById = areas;
const npcById = Object.fromEntries(npcs.map((npc) => [npc.id, npc]));
const upgradeById = Object.fromEntries(upgrades.map((upgrade) => [upgrade.id, upgrade]));
export const IMPORT_SAVE_LIMIT_BYTES = 256 * 1024;
const RUMOR_LOG_LIMIT = 12;
const localRumorMotifs = [
  "有一串银铃回声",
  "炉火边多了一枚旧印",
  "风里藏着月塔旧约",
  "石阶下压着潮湿铃墨",
  "集市灯影指向失落纹章",
  "河雾把脚印送回塔影",
  "屋檐铃线忽然换了方向",
  "旧木牌背面亮起细小月纹",
];
const localRumorTones = ["神秘", "温暖", "紧张", "滑稽"];

export function createNewGame(options = {}) {
  const slot = Number.isInteger(options.slot) ? options.slot : 0;
  const paletteId = options.paletteId || "ember-red";
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    version: VERSION,
    slot,
    saveId: options.saveId || `save-${Date.now()}-${slot}`,
    createdAt: options.createdAt || new Date().toISOString(),
    updatedAt: options.createdAt || new Date().toISOString(),
    playSeconds: 0,
    location: "bellvale",
    checkpoint: { area: "bellvale", x: areas.bellvale.spawn.x, y: areas.bellvale.spawn.y },
    player: {
      name: options.playerName || "绒火",
      paletteId,
      x: areas.bellvale.spawn.x,
      y: areas.bellvale.spawn.y,
      hp: 6,
      maxHp: 6,
      stamina: 100,
      coins: 12,
      attackLevel: 1,
      inventoryCapacity: 24,
    },
    time: { day: 1, segmentIndex: 0 },
    weather: "晴朗",
    mainStage: 0,
    flags: {},
    completedSideQuests: [],
    defeated: {},
    openedPickups: {},
    inventory: { moonHerb: 2, honeyBread: 1 },
    equipment: {},
    upgrades: [],
    npcState: Object.fromEntries(
      npcs.map((npc, index) => [
        npc.id,
        {
          trust: 1 + (index % 2),
          mood: index % 2 === 0 ? "平静" : "忙碌",
          need: npc.relationTags[0],
          memories: [],
        },
      ]),
    ),
    rumors: [],
    questLog: [
      {
        id: "stage-1",
        title: mainQuestStages[0].title,
        status: "active",
        text: mainQuestStages[0].goal,
      },
    ],
    completedLog: [],
    autosaveLog: [],
    settings: defaultSettings(),
    ending: null,
  };
}

export function defaultSettings() {
  return {
    volume: 0.7,
    musicVolume: 0.55,
    sfxVolume: 0.85,
    muted: false,
    textSpeed: 1,
    brightness: 1,
    screenShake: true,
    reduceMotion: false,
    fullscreenHintSeen: false,
    difficulty: "标准",
    fontScale: 1,
  };
}

export function getCurrentStage(state) {
  return mainQuestStages[Math.min(state.mainStage, mainQuestStages.length - 1)];
}

export function getTimeSegment(state) {
  return timeSegments[state.time.segmentIndex % timeSegments.length];
}

export function advanceTime(state, steps = 1) {
  const next = cloneState(state);
  for (let i = 0; i < steps; i += 1) {
    next.time.segmentIndex += 1;
    if (next.time.segmentIndex >= timeSegments.length) {
      next.time.segmentIndex = 0;
      next.time.day += 1;
      propagateRumors(next);
    }
  }
  next.weather = deriveWeather(next);
  return touch(next);
}

export function deriveWeather(state) {
  const index = (state.time.day + state.time.segmentIndex + Object.keys(state.flags).length) % weatherStates.length;
  return weatherStates[index];
}

export function getNpcArea(npcId, state) {
  const npc = npcById[npcId];
  if (!npc) return "bellvale";
  if (state.weather === "细雨" && npc.id === "antla") return "riverfarm";
  if (state.flags.villageUnited && ["vella", "loran", "sable"].includes(npc.id)) return "bellvale";
  return npc.schedule?.[getTimeSegment(state)] || npc.home || "bellvale";
}

export function addItem(state, itemId, qty = 1) {
  if (!itemById[itemId]) throw new Error(`未知道具：${itemId}`);
  const next = cloneState(state);
  const item = itemById[itemId];
  const current = next.inventory[itemId] || 0;
  const totalStacks = inventorySlotsUsed(next);
  if (!next.inventory[itemId] && item.kind !== "key" && totalStacks >= next.player.inventoryCapacity) {
    pushLog(next, "背包已满，无法拾取。");
    return { state: next, ok: false, reason: "full" };
  }
  next.inventory[itemId] = Math.min(item.stack || 99, current + qty);
  remember(next, "help", `获得了 ${item.name} x${qty}`);
  pushLog(next, `获得 ${item.name} x${qty}`);
  return { state: touch(next), ok: true };
}

export function useItem(state, itemId) {
  const item = itemById[itemId];
  const next = cloneState(state);
  if (!item || !next.inventory[itemId]) return { state: next, ok: false, reason: "missing" };
  if (item.heal) {
    next.player.hp = Math.min(next.player.maxHp, next.player.hp + item.heal);
  }
  if (item.stamina) {
    next.player.stamina = Math.min(100, next.player.stamina + item.stamina);
  }
  if (!item.heal && !item.stamina && item.kind !== "equipment") {
    return { state: next, ok: false, reason: "not-usable" };
  }
  decrementItem(next, itemId, 1);
  pushLog(next, `使用了 ${item.name}`);
  return { state: touch(next), ok: true };
}

export function getShopPrices(state) {
  const discount = Boolean(state?.npcState?.milu?.trust >= 8 || state?.flags?.["sq-price"]);
  const base = discount ? 3 : 5;
  return {
    discount,
    items: {
      moonHerb: base,
      honeyBread: base + 1,
    },
  };
}

export function buyShopItem(state, itemId) {
  const prices = getShopPrices(state);
  const cost = prices.items[itemId];
  const item = itemById[itemId];
  if (!cost || !item) return { state: cloneState(state), ok: false, reason: "小摊没有这件物品", cost: 0 };
  if (state.player.coins < cost) return { state: cloneState(state), ok: false, reason: "铜星不足", cost };
  const added = addItem(state, itemId, 1);
  if (!added.ok) return { state: added.state, ok: false, reason: added.reason === "full" ? "背包已满" : added.reason, cost };
  const next = added.state;
  next.player.coins -= cost;
  pushLog(next, `购买 ${item.name}，花费 ${cost} 枚铜星`);
  return { state: autosave(touch(next), `shop:${itemId}`), ok: true, cost, discount: prices.discount };
}

export function getNpcDialogueLine(state, npcId) {
  const safeState = state?.npcState ? state : createNewGame({ createdAt: "2026-06-26T00:00:00.000Z" });
  const npc = npcById[npcId];
  if (!npc) throw new Error(`未知 NPC：${npcId}`);
  const relation = safeState.npcState[npc.id] || { trust: 0, memories: [] };
  const memory = relation.memories?.at(-1)?.text;
  const sideQuest = sideQuests.find((quest) => quest.npc === npc.id && !safeState.completedSideQuests.includes(quest.id));
  if (memory) return `我还记得：${memory}`;
  if (sideQuest) return `如果你能带来${sideQuest.required.map((id) => itemById[id].name).join("、")}，我就能完成《${sideQuest.title}》。`;
  if (relation.trust >= 8) return "你一靠近，我的尾巴就知道今天会有好消息。";
  if (safeState.weather === "细雨") return "雨声变轻了，适合把没说完的话说完。";
  return npc.trait;
}

export function upgradeAbility(state, upgradeId) {
  const upgrade = upgradeById[upgradeId];
  const next = cloneState(state);
  if (!upgrade) return { state: next, ok: false, reason: "未知成长节点" };
  if (next.upgrades.includes(upgradeId)) return { state: next, ok: false, reason: "这项能力已经学会" };
  const freeBridgeReward = upgradeId === "softPawBoots" && next.flags.bridgeFixed;
  if (!freeBridgeReward && (next.inventory.forgeToken || 0) < 1) return { state: next, ok: false, reason: "需要月铁令" };
  next.upgrades.push(upgradeId);
  if (!freeBridgeReward) decrementItem(next, "forgeToken", 1);
  remember(next, "help", `学会成长《${upgrade.title}》`);
  pushLog(next, `升级完成：${upgrade.title}`);
  return { state: autosave(touch(next), `upgrade:${upgradeId}`), ok: true, costItem: freeBridgeReward ? null : "forgeToken" };
}

export function getUnlockedRecipes(state) {
  return recipes.filter((recipe) => state.mainStage >= recipe.unlockStage);
}

export function craftRecipe(state, recipeId) {
  const recipe = recipes.find((item) => item.id === recipeId);
  const next = cloneState(state);
  if (!recipe) throw new Error(`未知配方：${recipeId}`);
  if (next.mainStage < recipe.unlockStage) return { state: next, ok: false, reason: "配方尚未解锁" };
  for (const ingredient of recipe.ingredients) {
    if ((next.inventory[ingredient.id] || 0) < ingredient.qty) {
      return { state: next, ok: false, reason: `缺少 ${itemById[ingredient.id]?.name || ingredient.id}` };
    }
  }
  for (const ingredient of recipe.ingredients) decrementItem(next, ingredient.id, ingredient.qty);
  const crafted = addItem(next, recipe.result.id, recipe.result.qty);
  if (!crafted.ok) return { state: next, ok: false, reason: crafted.reason };
  const craftedState = crafted.state;
  craftedState.flags[`crafted:${recipe.id}`] = true;
  remember(craftedState, "help", `在营地制作《${recipe.title}》`);
  pushLog(craftedState, `制作完成：${recipe.title}`);
  return { state: autosave(touch(craftedState), `craft:${recipe.id}`), ok: true };
}

export function completeSideQuest(state, sideQuestId) {
  const quest = sideQuests.find((item) => item.id === sideQuestId);
  if (!quest) throw new Error(`未知支线：${sideQuestId}`);
  const next = cloneState(state);
  if (next.completedSideQuests.includes(sideQuestId)) return { state: next, ok: true };
  for (const required of quest.required) {
    if (!next.inventory[required]) return { state: next, ok: false, reason: `missing:${required}` };
  }
  for (const required of quest.required) decrementItem(next, required, 1);
  next.completedSideQuests.push(sideQuestId);
  next.flags[sideQuestId] = true;
  if (quest.id === "sq-bridgekit") next.flags.bridgeLanterns = true;
  if (quest.id === "sq-forge" && !next.upgrades.includes("bellStrike")) next.upgrades.push("bellStrike");
  next.npcState[quest.npc].trust = clamp(next.npcState[quest.npc].trust + 4, 0, 20);
  remember(next, "help", `完成支线《${quest.title}》：${quest.consequence}`);
  pushLog(next, `完成支线《${quest.title}》`);
  return { state: autosave(touch(next), `sidequest:${sideQuestId}`), ok: true };
}

export function completeMainStage(state, stageIndex = state.mainStage) {
  const next = cloneState(state);
  const stage = mainQuestStages[stageIndex];
  if (!stage || stageIndex !== next.mainStage) return { state: next, ok: false, reason: "stage-mismatch" };
  const gate = canCompleteStage(next, stageIndex);
  if (!gate.ok) return { state: next, ok: false, reason: gate.reason };

  applyStageReward(next, stageIndex);
  next.completedLog.push({ id: stage.id, title: stage.title, at: next.updatedAt });
  next.questLog = next.questLog.map((entry) => (entry.id === stage.id ? { ...entry, status: "done" } : entry));
  next.mainStage += 1;

  if (next.mainStage < mainQuestStages.length) {
    const nextStage = mainQuestStages[next.mainStage];
    next.questLog.push({ id: nextStage.id, title: nextStage.title, status: "active", text: nextStage.goal });
  }
  remember(next, "help", `推进主线《${stage.title}》`);
  pushLog(next, `主线完成：${stage.title}`);
  return { state: autosave(touch(next), `main:${stage.id}`), ok: true };
}

export function canCompleteStage(state, stageIndex) {
  switch (stageIndex) {
    case 0:
      return state.inventory.moonBadge ? { ok: true } : { ok: false, reason: "需要见习铃牌" };
    case 1:
      return (state.inventory.emberResin || 0) >= 2 ? { ok: true } : { ok: false, reason: "需要 2 份绒火树脂" };
    case 2:
      return state.inventory.waterCog ? { ok: true } : { ok: false, reason: "需要水轮齿片" };
    case 3:
      return state.inventory.starGlyph || state.defeated["echo-guardian"] ? { ok: true } : { ok: false, reason: "需要击败回声守卫" };
    case 4:
      return completedTrustTotal(state) >= 18 || state.completedSideQuests.length >= 2
        ? { ok: true }
        : { ok: false, reason: "需要更多居民信任或 2 条支线" };
    case 5:
      return state.defeated["night-bell"] || state.inventory.moonCrystal ? { ok: true } : { ok: false, reason: "需要击败夜铃残响" };
    default:
      return { ok: false, reason: "未知阶段" };
  }
}

export function defeatEnemy(state, enemyTypeId) {
  if (!enemyTypes[enemyTypeId]) throw new Error(`未知敌人：${enemyTypeId}`);
  let next = cloneState(state);
  next.defeated[enemyTypeId] = (next.defeated[enemyTypeId] || 0) + 1;
  next.player.coins += enemyTypes[enemyTypeId].coinReward || 0;
  for (const drop of enemyTypes[enemyTypeId].drops || []) {
    if (drop.chance >= 1) next = addItem(next, drop.id, drop.qty || 1).state;
  }
  remember(next, "combat", `击败 ${enemyTypes[enemyTypeId].name}`);
  pushLog(next, `击败 ${enemyTypes[enemyTypeId].name}`);
  return touch(next);
}

export function failAndRetry(state) {
  const next = cloneState(state);
  next.player.hp = next.player.maxHp;
  next.player.stamina = 100;
  next.location = next.checkpoint.area;
  next.player.x = next.checkpoint.x;
  next.player.y = next.checkpoint.y;
  pushLog(next, "从最近的月铃检查点醒来。");
  return touch(next);
}

export function changeArea(state, areaId, spawn = null) {
  if (!areaById[areaId]) throw new Error(`未知区域：${areaId}`);
  const next = cloneState(state);
  next.location = areaId;
  const position = spawn || areaById[areaId].spawn;
  next.player.x = position.x;
  next.player.y = position.y;
  next.checkpoint = { area: areaId, x: position.x, y: position.y };
  pushLog(next, `抵达 ${areaById[areaId].name}`);
  return autosave(touch(next), `area:${areaId}`);
}

export function determineEnding(state, choice = "repair") {
  const trust = completedTrustTotal(state);
  const sideCount = state.completedSideQuests.length;
  const clearRumors = state.flags["sq-rumor"] || state.rumors.filter((rumor) => rumor.distortion <= 1).length >= 2;
  if (choice === "share" && state.flags.villageUnited && trust >= 22 && sideCount >= 3 && clearRumors) {
    return {
      id: "warm-bell",
      title: "暖月齐鸣",
      text: "月铃重新响起，但声音不再只属于塔顶。每位居民的记忆都化作一枚小铃，山谷在清晨一起醒来。",
    };
  }
  return {
    id: "quiet-bell",
    title: "静月守望",
    text: "绒火独自修好了月铃。山谷得救了，只是有些没说出口的记忆仍在夜里轻轻回响。",
  };
}

export function finishGame(state, choice = "repair") {
  const next = cloneState(state);
  next.ending = determineEnding(next, choice);
  next.flags.endingSeen = true;
  pushLog(next, `结局：${next.ending.title}`);
  return autosave(touch(next), "ending");
}

export function runGoldenPathSimulation() {
  let state = createNewGame({ createdAt: "2026-06-26T00:00:00.000Z" });
  const steps = [];
  const record = (label) => steps.push({ label, stage: state.mainStage, area: state.location, hp: state.player.hp });

  state = changeArea(state, "inn");
  state = addItem(state, "moonBadge", 1).state;
  state = completeMainStage(state, 0).state;
  record("找回见习铃牌");

  state = changeArea(state, "emberwood");
  state = defeatEnemy(state, "bramble-chaser");
  state = addItem(state, "emberResin", 1).state;
  state = completeMainStage(state, 1).state;
  record("修复断桥");

  state = changeArea(state, "riverfarm");
  state = defeatEnemy(state, "mud-warden");
  state = addItem(state, "waterCog", 1).state;
  state = completeMainStage(state, 2).state;
  record("修复水车");

  state = changeArea(state, "starruins");
  state = defeatEnemy(state, "echo-guardian");
  state = completeMainStage(state, 3).state;
  record("点亮祭台");

  state = changeArea(state, "bellvale");
  state = addItem(state, "duskFeather", 1).state;
  state = completeSideQuest(state, "sq-scarf").state;
  state = addItem(state, "riverPumpkin", 1).state;
  state = completeSideQuest(state, "sq-price").state;
  state = addItem(state, "forgeToken", 1).state;
  state = addItem(state, "emberResin", 1).state;
  state = completeSideQuest(state, "sq-forge").state;
  state = addItem(state, "bellInk", 1).state;
  state = completeSideQuest(state, "sq-rumor").state;
  state = completeMainStage(state, 4).state;
  record("集结居民");

  state = changeArea(state, "moonspire");
  state = defeatEnemy(state, "night-bell");
  state = completeMainStage(state, 5).state;
  state = finishGame(state, "share");
  record("完成结局");

  return { state, steps };
}

export function runWorldSimulation(seed = 1, days = 3) {
  let state = createNewGame({ createdAt: "2026-06-26T00:00:00.000Z", saveId: `sim-${seed}` });
  const snapshots = [];
  for (let i = 0; i < days * timeSegments.length; i += 1) {
    state = advanceTime(state, 1);
    const npcLocations = Object.fromEntries(npcs.map((npc) => [npc.id, getNpcArea(npc.id, state)]));
    snapshots.push({
      day: state.time.day,
      segment: getTimeSegment(state),
      weather: state.weather,
      npcLocations,
      inventorySlots: inventorySlotsUsed(state),
      stage: state.mainStage,
    });
    assertInvariants(state);
  }
  return { state, snapshots };
}

export function assertInvariants(state) {
  if (state.player.hp < 0 || state.player.hp > state.player.maxHp) throw new Error("生命值越界");
  if (state.player.stamina < 0 || state.player.stamina > 100) throw new Error("体力越界");
  if (!areaById[state.location]) throw new Error("区域不存在");
  if (state.mainStage < 0 || state.mainStage > mainQuestStages.length) throw new Error("主线阶段越界");
  for (const [itemId, qty] of Object.entries(state.inventory)) {
    if (!itemById[itemId]) throw new Error(`未知背包物品：${itemId}`);
    if (qty < 0) throw new Error(`物品数量为负：${itemId}`);
  }
  for (const npc of npcs) {
    const area = getNpcArea(npc.id, state);
    if (!areaById[area]) throw new Error(`NPC 日程区域不存在：${npc.id}`);
  }
  return true;
}

export function validateRumorResponse(raw) {
  const value = typeof raw === "string" ? parseJsonObject(raw) : raw;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("响应不是对象");
  const allowedNpcIds = new Set(npcs.map((npc) => npc.id));
  const allowedTone = new Set(["温暖", "紧张", "滑稽", "神秘"]);
  const rumor = {
    sourceNpcId: asEnum(value.sourceNpcId, allowedNpcIds, "sourceNpcId"),
    targetNpcId: asEnum(value.targetNpcId, allowedNpcIds, "targetNpcId"),
    topic: asText(value.topic, "topic", 20),
    line: asText(value.line, "line", 80),
    tone: asEnum(value.tone, allowedTone, "tone"),
    distortion: clampNumber(value.distortion, 0, 3, "distortion"),
  };
  if (rumor.sourceNpcId === rumor.targetNpcId) throw new Error("传闻来源和目标不能相同");
  return rumor;
}

export function createLocalRumor(state) {
  const safeState = state?.time ? state : createNewGame({ createdAt: "2026-06-26T00:00:00.000Z" });
  const segment = getTimeSegment(safeState);
  const areaIds = Object.keys(areas);
  const area = areas[safeState.location] || areas.bellvale;
  const areaIndex = Math.max(0, areaIds.indexOf(safeState.location));
  const weatherIndex = Math.max(0, weatherStates.indexOf(safeState.weather));
  const sourceIndex = (safeState.time.day + safeState.time.segmentIndex + areaIndex) % npcs.length;
  const source = npcs[sourceIndex];
  let target = npcs[(safeState.time.day * 2 + safeState.time.segmentIndex + areaIndex + weatherIndex + 3) % npcs.length];
  if (target.id === source.id) target = npcs[(sourceIndex + 1) % npcs.length];
  const motif = localRumorMotifs[(safeState.time.day + safeState.time.segmentIndex + areaIndex + weatherIndex) % localRumorMotifs.length];
  const tone = localRumorTones[(safeState.time.segmentIndex + areaIndex) % localRumorTones.length];
  return {
    sourceNpcId: source.id,
    targetNpcId: target.id,
    topic: `${area.name}的${segment}`,
    line: `${source.name}说${segment}的${area.name}${motif}，月铃塔把线索指向${target.name}。`,
    tone,
    distortion: safeState.flags["sq-rumor"] ? 0 : 1,
  };
}

export function applyRumor(state, rumor) {
  const next = cloneState(state);
  const safeRumor = validateRumorResponse(rumor);
  next.rumors.push({ ...safeRumor, day: next.time.day, segment: getTimeSegment(next) });
  next.rumors = next.rumors.slice(-RUMOR_LOG_LIMIT);
  if (safeRumor.distortion <= 1) next.npcState[safeRumor.targetNpcId].trust = clamp(next.npcState[safeRumor.targetNpcId].trust + 1, 0, 20);
  remember(next, "secret", `传闻：${safeRumor.line}`);
  return touch(next);
}

export function runRumorRepetitionRegression(options = {}) {
  const turns = Number.isInteger(options.turns) ? options.turns : 20;
  let state = createNewGame({ createdAt: "2026-06-26T00:00:00.000Z", saveId: "rumor-repetition-regression" });
  const areaIds = Object.keys(areas);
  const samples = [];
  const issues = [];

  for (let i = 0; i < turns; i += 1) {
    const areaId = areaIds[i % areaIds.length];
    state = changeArea(state, areaId);
    state.time.day = 1 + Math.floor(i / timeSegments.length);
    state.time.segmentIndex = i % timeSegments.length;
    state.weather = deriveWeather(state);

    const rumor = createLocalRumor(state);
    const beforeTrust = state.npcState[rumor.targetNpcId].trust;
    state = applyRumor(state, rumor);
    const kept = state.rumors.at(-1);
    const source = npcById[rumor.sourceNpcId];
    const target = npcById[rumor.targetNpcId];

    samples.push({
      turn: i + 1,
      day: kept.day,
      segment: kept.segment,
      location: state.location,
      weather: state.weather,
      sourceNpcId: rumor.sourceNpcId,
      sourceName: source.name,
      targetNpcId: rumor.targetNpcId,
      targetName: target.name,
      topic: rumor.topic,
      line: rumor.line,
      tone: rumor.tone,
      targetTrustDelta: state.npcState[rumor.targetNpcId].trust - beforeTrust,
    });
    assertInvariants(state);
  }

  const uniqueLines = new Set(samples.map((sample) => sample.line)).size;
  const uniqueTopics = new Set(samples.map((sample) => sample.topic)).size;
  const uniquePairs = new Set(samples.map((sample) => `${sample.sourceNpcId}->${sample.targetNpcId}`)).size;
  const duplicateRate = turns > 0 ? (turns - uniqueLines) / turns : 0;
  const hasSourceAndTime = samples.every((sample) => sample.sourceNpcId && sample.targetNpcId && sample.day >= 1 && sample.segment);
  const trustChanged = samples.every((sample) => sample.targetTrustDelta >= 1);

  if (samples.length !== turns) issues.push(`连续交谈次数为 ${samples.length}/${turns}`);
  if (!hasSourceAndTime) issues.push("存在缺少来源、目标、日期或时段的传闻");
  if (!trustChanged) issues.push("低失真传闻未稳定改变目标 NPC 信任");
  if (state.rumors.length > RUMOR_LOG_LIMIT) issues.push("最近传闻记录未按上限裁剪");
  if (uniqueTopics < Math.min(8, turns)) issues.push(`传闻主题变化不足：${uniqueTopics}`);
  if (uniquePairs < Math.min(8, turns)) issues.push(`传闻 NPC 组合变化不足：${uniquePairs}`);
  if (duplicateRate > 0.25) issues.push(`连续交谈重复率过高：${Math.round(duplicateRate * 100)}%`);

  return {
    ok: issues.length === 0,
    turns,
    maxRecentRumors: RUMOR_LOG_LIMIT,
    uniqueLines,
    uniqueTopics,
    uniqueSourceTargetPairs: uniquePairs,
    duplicateRate,
    recentRumorsKept: state.rumors.length,
    samples,
    issues,
  };
}

export function runEconomyCurveRegression() {
  let state = createNewGame({ createdAt: "2026-06-26T00:00:00.000Z", saveId: "economy-curve-regression" });
  const events = [];
  const issues = [];
  let totalIncome = 0;
  let totalSpending = 0;
  let minCoins = state.player.coins;

  record("开局资金", "起点", 0, "初始铜星可购买基础补给");
  spend("开局购买月叶草", "moonHerb");
  spend("开局购买蜜面包", "honeyBread");

  state = addItem(state, "moonBadge", 1).state;
  state = completeMainStage(state, 0).state;
  state = changeArea(state, "emberwood");
  earn("击败刺藤追逐者", "bramble-chaser");
  state = addItem(state, "emberResin", 1).state;
  state = completeMainStage(state, 1).state;

  state = changeArea(state, "riverfarm");
  earn("击败泥岸守卫", "mud-warden");
  state = addItem(state, "waterCog", 1).state;
  state = completeMainStage(state, 2).state;

  state = changeArea(state, "starruins");
  earn("击败符文哨塔", "rune-turret");
  earn("击败回声守卫", "echo-guardian");
  state = completeMainStage(state, 3).state;

  state = changeArea(state, "bellvale");
  state = addItem(state, "duskFeather", 1).state;
  state = completeSideQuest(state, "sq-scarf").state;
  state = addItem(state, "riverPumpkin", 1).state;
  state = completeSideQuest(state, "sq-price").state;
  state = addItem(state, "forgeToken", 1).state;
  state = addItem(state, "emberResin", 1).state;
  state = completeSideQuest(state, "sq-forge").state;
  state = addItem(state, "bellInk", 1).state;
  state = completeSideQuest(state, "sq-rumor").state;
  record("完成米露小摊账", "折扣", 0, `折扣价：月叶草 ${getShopPrices(state).items.moonHerb}，蜜面包 ${getShopPrices(state).items.honeyBread}`);
  spend("折扣后购买月叶草", "moonHerb");
  spend("折扣后购买蜜面包", "honeyBread");
  state = completeMainStage(state, 4).state;

  state = changeArea(state, "moonspire");
  earn("击败夜铃残响", "night-bell");
  state = completeMainStage(state, 5).state;
  state = finishGame(state, "share");
  record("通关余额", "结算", 0, state.ending.title);

  const basePrices = getShopPrices(createNewGame({ createdAt: "2026-06-26T00:00:00.000Z" }));
  const discountedPrices = getShopPrices({ ...state, flags: { ...state.flags, "sq-price": true } });
  if (events.some((event) => event.coinsAfter < 0)) issues.push("经济曲线出现负铜星");
  if (totalIncome < totalSpending) issues.push("通关路线收入不足以覆盖基础补给支出");
  if (basePrices.items.moonHerb <= discountedPrices.items.moonHerb) issues.push("支线折扣未降低月叶草价格");
  if (!state.ending) issues.push("经济曲线未抵达结局");
  if (minCoins < 0) issues.push("最低余额低于 0");

  return {
    ok: issues.length === 0,
    totalIncome,
    totalSpending,
    finalCoins: state.player.coins,
    minCoins,
    finalStage: state.mainStage,
    ending: state.ending?.title || "未完成",
    basePrices,
    discountedPrices,
    events,
    issues,
  };

  function earn(label, enemyTypeId) {
    const before = state.player.coins;
    state = defeatEnemy(state, enemyTypeId);
    const delta = state.player.coins - before;
    totalIncome += Math.max(0, delta);
    record(label, "收入", delta, `${enemyTypes[enemyTypeId].name} 奖励 ${delta} 枚铜星`);
  }

  function spend(label, itemId) {
    const result = buyShopItem(state, itemId);
    state = result.state;
    if (!result.ok) issues.push(`${label} 失败：${result.reason}`);
    totalSpending += result.ok ? result.cost : 0;
    record(label, "支出", result.ok ? -result.cost : 0, result.ok ? `${itemById[itemId].name} 花费 ${result.cost}` : result.reason);
  }

  function record(label, type, delta, note) {
    minCoins = Math.min(minCoins, state.player.coins);
    events.push({
      step: events.length + 1,
      label,
      type,
      stage: state.mainStage,
      location: state.location,
      delta,
      coinsAfter: state.player.coins,
      note,
    });
  }
}

export function runUpgradeFlowRegression() {
  let state = createNewGame({ createdAt: "2026-06-26T00:00:00.000Z", saveId: "upgrade-flow-regression" });
  const rows = [];
  const issues = [];

  const beforeCancel = JSON.stringify({ upgrades: state.upgrades, inventory: state.inventory });
  const afterCancel = JSON.stringify({ upgrades: state.upgrades, inventory: state.inventory });
  rows.push({ flow: "取消升级", action: "关闭工坊面板", expected: "状态不变", status: beforeCancel === afterCancel ? "通过" : "需复核" });
  if (beforeCancel !== afterCancel) issues.push("取消升级改变了状态");

  const denied = upgradeAbility(state, "bellStrike");
  rows.push({ flow: "条件不足", action: "无月铁令尝试月铃击", expected: "返回需要月铁令", status: !denied.ok && /月铁令/.test(denied.reason) ? "通过" : "需复核" });
  if (denied.ok || !/月铁令/.test(denied.reason)) issues.push("缺少月铁令时未阻止升级");

  state = addItem(state, "forgeToken", 1).state;
  const bought = upgradeAbility(state, "bellStrike");
  state = bought.state;
  rows.push({
    flow: "购买升级",
    action: "消耗月铁令学习月铃击",
    expected: "升级入账并自动保存",
    status: bought.ok && state.upgrades.includes("bellStrike") && !state.inventory.forgeToken && state.autosaveLog.at(-1)?.reason === "upgrade:bellStrike" ? "通过" : "需复核",
  });
  if (!bought.ok || !state.upgrades.includes("bellStrike")) issues.push("购买升级未入账");
  if (state.inventory.forgeToken) issues.push("购买升级未消耗月铁令");

  const duplicate = upgradeAbility(state, "bellStrike");
  rows.push({ flow: "重复点击", action: "再次学习月铃击", expected: "阻止重复购买", status: !duplicate.ok && /已经学会/.test(duplicate.reason) ? "通过" : "需复核" });
  if (duplicate.ok || !/已经学会/.test(duplicate.reason)) issues.push("重复升级未被阻止");

  const loaded = validateSave(serializeSave(state));
  rows.push({ flow: "重载保持", action: "保存并读取", expected: "升级仍存在", status: loaded.upgrades.includes("bellStrike") ? "通过" : "需复核" });
  if (!loaded.upgrades.includes("bellStrike")) issues.push("升级在重载后丢失");

  const unknown = upgradeAbility(loaded, "missing-upgrade");
  rows.push({ flow: "非法节点", action: "请求不存在的成长", expected: "安全拒绝", status: !unknown.ok && /未知/.test(unknown.reason) ? "通过" : "需复核" });
  if (unknown.ok || !/未知/.test(unknown.reason)) issues.push("未知成长节点未被拒绝");

  return {
    ok: issues.length === 0,
    rows,
    upgradesChecked: upgrades.length,
    purchasedUpgrade: "bellStrike",
    finalUpgrades: loaded.upgrades,
    issues,
  };
}

export function runRelationshipBranchRegression() {
  const rows = [];
  const issues = [];
  const low = createNewGame({ createdAt: "2026-06-26T00:00:00.000Z", saveId: "relationship-low" });
  const high = createNewGame({ createdAt: "2026-06-26T00:00:00.000Z", saveId: "relationship-high" });
  for (const npcId of Object.keys(high.npcState)) high.npcState[npcId].trust = 8;
  for (const npcId of Object.keys(low.npcState)) low.npcState[npcId].trust = 1;

  const lowLine = getNpcDialogueLine(low, "loran");
  const highLine = getNpcDialogueLine(high, "loran");
  record("对白", lowLine !== highLine && /好消息/.test(highLine), `低信任：${lowLine}`, `高信任：${highLine}`);

  const lowPrice = getShopPrices(low).items.moonHerb;
  const highPrice = getShopPrices(high).items.moonHerb;
  record("价格", highPrice < lowPrice, `低信任月叶草 ${lowPrice} 铜星`, `高信任月叶草 ${highPrice} 铜星`);

  const beforeTrust = low.npcState.milu.trust;
  let questState = addItem(low, "riverPumpkin", 1).state;
  questState = completeSideQuest(questState, "sq-price").state;
  record(
    "支线帮助",
    questState.npcState.milu.trust === beforeTrust + 4 && questState.flags["sq-price"],
    `支线前米露信任 ${beforeTrust}`,
    `支线后米露信任 ${questState.npcState.milu.trust}，折扣标记 ${questState.flags["sq-price"] ? "已开启" : "缺失"}`,
  );

  const lowGate = canCompleteStage({ ...low, mainStage: 4 }, 4);
  const highGate = canCompleteStage({ ...high, mainStage: 4 }, 4);
  record("主线集结", !lowGate.ok && highGate.ok, lowGate.reason || "低信任可通过", highGate.ok ? "高信任可集结居民" : highGate.reason);

  const endingBase = {
    ...low,
    flags: { ...low.flags, villageUnited: true, "sq-rumor": true },
    completedSideQuests: ["sq-scarf", "sq-price", "sq-forge"],
  };
  const lowEnding = determineEnding(endingBase, "share");
  const warmEndingState = {
    ...high,
    flags: { ...high.flags, villageUnited: true, "sq-rumor": true },
    completedSideQuests: ["sq-scarf", "sq-price", "sq-forge"],
  };
  const highEnding = determineEnding(warmEndingState, "share");
  record("结局条件", lowEnding.id !== highEnding.id && highEnding.id === "warm-bell", lowEnding.title, highEnding.title);

  function record(category, ok, lowEvidence, highEvidence) {
    if (!ok) issues.push(`${category} 关系分支未成立`);
    rows.push({ category, lowEvidence, highEvidence, status: ok ? "通过" : "需复核" });
  }

  return {
    ok: issues.length === 0,
    branchesChecked: rows.length,
    rows,
    issues,
  };
}

export function migrateSave(input) {
  const base = createNewGame({ createdAt: "2026-06-26T00:00:00.000Z" });
  const source = input && typeof input === "object" ? input : {};
  const migrated = {
    ...base,
    ...source,
    schemaVersion: SAVE_SCHEMA_VERSION,
    player: { ...base.player, ...(source.player || {}) },
    time: { ...base.time, ...(source.time || {}) },
    flags: { ...base.flags, ...(source.flags || {}) },
    inventory: { ...base.inventory, ...(source.inventory || {}) },
    equipment: { ...base.equipment, ...(source.equipment || {}) },
    settings: { ...base.settings, ...(source.settings || {}) },
    npcState: { ...base.npcState, ...(source.npcState || {}) },
  };
  migrated.questLog = Array.isArray(source.questLog) ? source.questLog : base.questLog;
  migrated.completedLog = Array.isArray(source.completedLog) ? source.completedLog : [];
  migrated.completedSideQuests = Array.isArray(source.completedSideQuests) ? source.completedSideQuests : [];
  migrated.rumors = Array.isArray(source.rumors) ? source.rumors : [];
  migrated.autosaveLog = Array.isArray(source.autosaveLog) ? source.autosaveLog : [];
  migrated.upgrades = Array.isArray(source.upgrades) ? source.upgrades : [];
  return touch(migrated);
}

export function serializeSave(state) {
  const clean = migrateSave(state);
  const payload = { ...clean, checksum: undefined };
  const checksum = hashText(JSON.stringify(payload));
  return { ...payload, checksum };
}

export function validateSave(value) {
  const save = migrateSave(value);
  assertInvariants(save);
  if (value?.checksum) {
    const { checksum, ...payload } = value;
    if (hashText(JSON.stringify({ ...payload, checksum: undefined })) !== checksum) {
      throw new Error("存档校验失败");
    }
  }
  return save;
}

export function parseImportedSave({ text, size = 0, type = "", name = "" } = {}) {
  if (size > IMPORT_SAVE_LIMIT_BYTES) throw new Error("存档文件过大");
  const fileType = String(type || "").toLowerCase();
  const fileName = String(name || "").toLowerCase();
  if (fileType && fileType !== "application/json" && !fileName.endsWith(".json")) {
    throw new Error("存档文件类型不支持");
  }
  let parsed;
  try {
    parsed = JSON.parse(String(text || ""));
  } catch {
    throw new Error("存档 JSON 无效");
  }
  return serializeSave(validateSave(parsed));
}

export function inventorySlotsUsed(state) {
  return Object.values(state.inventory).filter((qty) => qty > 0).length;
}

export function completedTrustTotal(state) {
  return Object.values(state.npcState).reduce((total, npc) => total + (npc.trust || 0), 0);
}

export function getAcceptanceSummary() {
  return {
    mainAreas: Object.values(areas).filter((area) => area.kind === "main").length,
    interiors: Object.values(areas).filter((area) => area.kind === "interior").length,
    namedNpcs: npcs.length,
    scheduledNpcs: npcs.filter((npc) => npc.schedule && Object.keys(npc.schedule).length >= 4).length,
    items: items.length,
    enemyTypes: Object.keys(enemyTypes).length,
    mainStages: mainQuestStages.length,
    sideQuests: sideQuests.length,
    upgrades: upgrades.length,
    recipes: recipes.length,
    memoryTypes: memories.length,
    audioThemes: audioThemes.length,
    soundEffects: soundEffects.length,
  };
}

export function runGameplayRegression(options = {}) {
  const combatLoopsPerEnemy = Number.isInteger(options.combatLoopsPerEnemy) ? options.combatLoopsPerEnemy : 10;
  const movement = inspectWorldGeometry();
  const combat = inspectCombatLoops(combatLoopsPerEnemy);
  return {
    ok: movement.issues.length === 0 && combat.issues.length === 0,
    movement,
    combat,
    issues: movement.issues.concat(combat.issues),
  };
}

export function runWorldSystemsRegression(options = {}) {
  const transitionLoops = Number.isInteger(options.transitionLoops) ? options.transitionLoops : 30;
  const longSessionMinutes = Number.isInteger(options.longSessionMinutes) ? options.longSessionMinutes : 60;
  const transitions = inspectAreaTransitions(transitionLoops);
  const weather = inspectWeatherEffects();
  const causality = inspectCausalityChains();
  const longSession = inspectLongSession(longSessionMinutes);
  return {
    ok: transitions.issues.length === 0 && weather.issues.length === 0 && causality.issues.length === 0 && longSession.issues.length === 0,
    transitions,
    weather,
    causality,
    longSession,
    issues: transitions.issues.concat(weather.issues, causality.issues, longSession.issues),
  };
}

export function runContentIntegrityRegression() {
  const product = inspectProductLoopAndAreaPurpose();
  const gameplay = inspectGameplayDesignDepth();
  const npcSystems = inspectNpcStateAndRelationships();
  const narrative = inspectNarrativeIntegrity();
  const systems = inspectItemEconomyAndDataReliability();
  const ruleClarity = inspectRuleClarityAndDeterminism();
  const sections = [product, gameplay, npcSystems, narrative, systems, ruleClarity];
  return {
    ok: sections.every((section) => section.issues.length === 0),
    product,
    gameplay,
    npcSystems,
    narrative,
    systems,
    ruleClarity,
    issues: sections.flatMap((section) => section.issues),
  };
}

function inspectProductLoopAndAreaPurpose() {
  const issues = [];
  const mainAreas = Object.values(areas).filter((area) => area.kind === "main");
  const purposes = new Set(mainAreas.map((area) => area.purpose));
  const stagesByArea = new Set(mainQuestStages.map((stage) => stage.area));
  const firstLoop =
    mainQuestStages[0].area === "inn" &&
    mainQuestStages[0].reward.includes("questLog") &&
    mainQuestStages[1].area === "emberwood" &&
    areas.inn.interactables.some((item) => item.kind === "quest") &&
    areas.emberwood.enemies.length >= 1;
  const identityOk =
    projectIdentity.title === "绒火与月铃" &&
    projectIdentity.logline.includes("探索") &&
    projectIdentity.recommendedBrowser.includes("Firefox") &&
    playerHero.palettes.length >= 3;

  for (const area of mainAreas) {
    if (!area.purpose || area.purpose.length < 12) issues.push(`${area.name} 缺少明确玩法目的`);
    if (!area.landmarks || area.landmarks.length < 2) issues.push(`${area.name} 地标不足`);
  }
  if (purposes.size !== mainAreas.length) issues.push("主要区域玩法目的不够区分");
  if (!firstLoop) issues.push("前 5 分钟核心循环缺少任务、交互、战斗或奖励串联");
  if (!identityOk) issues.push("项目名、浏览器声明或主角自定义未形成统一入口");

  return {
    rows: [
      { item: "核心循环开场", evidence: "旅店找铃牌 -> 森林战斗/采集 -> 断桥奖励", status: firstLoop ? "通过" : "需复核" },
      { item: "区域玩法目的", evidence: `${mainAreas.length} 个主要区域，${purposes.size} 个独立 purpose`, status: purposes.size === mainAreas.length ? "通过" : "需复核" },
      { item: "主线区域覆盖", evidence: `${stagesByArea.size} 个主线目标区域`, status: stagesByArea.size >= 5 ? "通过" : "需复核" },
      { item: "品牌与主角入口", evidence: `${projectIdentity.title}，${playerHero.palettes.length} 套配色`, status: identityOk ? "通过" : "需复核" },
    ],
    issues,
  };
}

function inspectGameplayDesignDepth() {
  const issues = [];
  const enemies = Object.values(enemyTypes);
  const basicEnemies = enemies.filter((enemy) => !enemy.phases);
  const archetypes = new Set(basicEnemies.map((enemy) => enemy.archetype));
  const bosses = enemies.filter((enemy) => Array.isArray(enemy.phases));
  const upgradeRows = upgrades.map((upgrade) => ({
    title: upgrade.title,
    effect: upgrade.effect,
    status: /闪避|移动|击退|打断|视野|采集|恢复|解锁|攻击/.test(upgrade.effect) ? "通过" : "需复核",
  }));
  const retryStart = changeArea(createNewGame({ createdAt: "2026-06-26T00:00:00.000Z" }), "moonspire");
  const retried = failAndRetry({ ...retryStart, player: { ...retryStart.player, hp: 0, stamina: 0 } });
  const retryOk = retried.player.hp === retried.player.maxHp && retried.player.stamina === 100 && retried.location === retried.checkpoint.area;

  if (archetypes.size < 4) issues.push("基础敌人行为原型少于 4 种");
  if (bosses.length < 2 || bosses.some((enemy) => enemy.phases.length < 2 || !enemy.tell)) issues.push("小头目或终局首领缺少双阶段可读前摇");
  if (upgrades.length < 4 || upgrades.length > 6 || upgradeRows.some((row) => row.status !== "通过")) issues.push("永久成长节点数量或玩法改变不足");
  if (!retryOk) issues.push("失败重试未恢复到检查点");

  return {
    rows: [
      { item: "基础敌人原型", evidence: [...archetypes].join("、"), status: archetypes.size >= 4 ? "通过" : "需复核" },
      { item: "首领阶段", evidence: bosses.map((enemy) => `${enemy.name}:${enemy.phases.length}`).join("、"), status: bosses.every((enemy) => enemy.phases.length >= 2) ? "通过" : "需复核" },
      { item: "永久成长", evidence: `${upgrades.length} 个节点`, status: upgrades.length >= 4 && upgrades.length <= 6 ? "通过" : "需复核" },
      { item: "失败恢复", evidence: `返回 ${areas[retried.location]?.name || retried.location}，生命 ${retried.player.hp}/${retried.player.maxHp}`, status: retryOk ? "通过" : "需复核" },
    ],
    upgrades: upgradeRows,
    issues,
  };
}

function inspectNpcStateAndRelationships() {
  const issues = [];
  let state = createNewGame({ createdAt: "2026-06-26T00:00:00.000Z", saveId: "npc-integrity" });
  const stateRows = npcs.map((npc) => {
    const npcState = state.npcState[npc.id];
    return {
      npc: npc.name,
      states: ["trust", "mood", "need"].filter((key) => npcState?.[key] !== undefined).join("、"),
      status: npcState?.trust !== undefined && npcState?.mood && npcState?.need ? "通过" : "需复核",
    };
  });
  if (stateRows.some((row) => row.status !== "通过")) issues.push("NPC 可变状态不完整");

  state = addItem(state, "riverPumpkin", 1).state;
  const beforeQuestTrust = state.npcState.milu.trust;
  state = completeSideQuest(state, "sq-price").state;
  const sideQuestTrustDelta = state.npcState.milu.trust - beforeQuestTrust;

  const beforeRumorTrust = state.npcState.vella.trust;
  state = applyRumor(state, {
    sourceNpcId: "owen",
    targetNpcId: "vella",
    topic: "月铃塔",
    line: "羽铃说薇萝把旧铃声记得很清楚。",
    tone: "温暖",
    distortion: 1,
  });
  const rumorTrustDelta = state.npcState.vella.trust - beforeRumorTrust;

  const scheduleIssues = [];
  for (const weather of weatherStates) {
    for (let segmentIndex = 0; segmentIndex < timeSegments.length; segmentIndex += 1) {
      const scheduleState = createNewGame({ createdAt: "2026-06-26T00:00:00.000Z" });
      scheduleState.weather = weather;
      scheduleState.time.segmentIndex = segmentIndex;
      scheduleState.flags.villageUnited = true;
      for (const npc of npcs) {
        const areaId = getNpcArea(npc.id, scheduleState);
        if (!areas[areaId]) scheduleIssues.push(`${npc.name} 在 ${weather}/${timeSegments[segmentIndex]} 指向 ${areaId}`);
      }
    }
  }
  issues.push(...scheduleIssues);
  if (sideQuestTrustDelta <= 0) issues.push("支线未提升目标 NPC 信任");
  if (rumorTrustDelta <= 0) issues.push("低失真传闻未影响 NPC 信任");

  return {
    rows: [
      { item: "NPC 状态", evidence: `${stateRows.length} 名 NPC 均含 trust/mood/need`, status: stateRows.every((row) => row.status === "通过") ? "通过" : "需复核" },
      { item: "支线关系", evidence: `米露信任 +${sideQuestTrustDelta}`, status: sideQuestTrustDelta > 0 ? "通过" : "需复核" },
      { item: "传闻关系", evidence: `薇萝信任 +${rumorTrustDelta}`, status: rumorTrustDelta > 0 ? "通过" : "需复核" },
      { item: "日程恢复", evidence: `${weatherStates.length * timeSegments.length * npcs.length} 个天气/时段/NPC 组合`, status: scheduleIssues.length === 0 ? "通过" : "需复核" },
    ],
    npcStates: stateRows,
    issues,
  };
}

function inspectNarrativeIntegrity() {
  const issues = [];
  const consequenceKeywords = /桥|路灯|价格|击退|攻击|传闻|结局|信任|敌人|清晰/;
  const consequentialSideQuests = sideQuests.filter((quest) => consequenceKeywords.test(quest.consequence));
  const thematicSideQuests = sideQuests.filter((quest) => quest.theme && quest.theme.length >= 8);
  const textSamples = [
    ...mainQuestStages.flatMap((stage) => [stage.goal, stage.obstacle, stage.next]),
    ...sideQuests.flatMap((quest) => [quest.consequence, quest.theme]),
    determineEnding(createNewGame(), "repair").text,
  ];
  const longestText = textSamples.reduce((longest, text) => (text.length > longest.length ? text : longest), "");
  const golden = runGoldenPathSimulation();

  let alternate = createNewGame({ createdAt: "2026-06-26T00:00:00.000Z", saveId: "quest-order" });
  alternate = addItem(alternate, "moonBadge", 1).state;
  alternate = completeMainStage(alternate, 0).state;
  alternate = addItem(alternate, "emberResin", 2).state;
  alternate = completeMainStage(alternate, 1).state;
  alternate = changeArea(alternate, "riverfarm");
  alternate = addItem(alternate, "waterCog", 1).state;
  alternate = completeMainStage(alternate, 2).state;
  alternate = changeArea(alternate, "starruins");
  alternate = defeatEnemy(alternate, "echo-guardian");
  alternate = completeMainStage(alternate, 3).state;
  const blockedWithoutTrust = canCompleteStage(alternate, 4);
  alternate = addItem(alternate, "reedFiber", 1).state;
  alternate = completeSideQuest(alternate, "sq-bridgekit").state;
  alternate = addItem(alternate, "riverPumpkin", 1).state;
  alternate = completeSideQuest(alternate, "sq-price").state;
  const recoveredWithSideQuests = canCompleteStage(alternate, 4);

  if (sideQuests.length < 5) issues.push("支线少于 5 条");
  if (consequentialSideQuests.length < 3) issues.push("长期后果支线少于 3 条");
  if (thematicSideQuests.length < 2) issues.push("主题呼应支线少于 2 条");
  if (longestText.length > 180) issues.push(`强制文本过长：${longestText.length} 字`);
  if (!golden.state.ending) issues.push("黄金路径未到达结局");
  if (blockedWithoutTrust.ok || !recoveredWithSideQuests.ok) issues.push("主线阶段 5 的恢复条件不稳定");

  return {
    rows: [
      { item: "支线规模", evidence: `${sideQuests.length} 条支线，${consequentialSideQuests.length} 条长期后果`, status: sideQuests.length >= 5 && consequentialSideQuests.length >= 3 ? "通过" : "需复核" },
      { item: "主题呼应", evidence: `${thematicSideQuests.length} 条支线有主题句`, status: thematicSideQuests.length >= 2 ? "通过" : "需复核" },
      { item: "文本长度", evidence: `最长 ${longestText.length} 字`, status: longestText.length <= 180 ? "通过" : "需复核" },
      { item: "任务恢复", evidence: `无信任阻挡：${blockedWithoutTrust.reason || "未阻挡"}；两支线后：${recoveredWithSideQuests.ok ? "可推进" : recoveredWithSideQuests.reason}`, status: !blockedWithoutTrust.ok && recoveredWithSideQuests.ok ? "通过" : "需复核" },
    ],
    issues,
  };
}

function inspectItemEconomyAndDataReliability() {
  const issues = [];
  const usefulItems = items.filter((item) => /恢复|修复|开启|提高|赠礼|升级|降低|额外|解除|记录|解锁|闪避|攻击|制作|帮助|净化/.test(item.use));
  const usefulRatio = usefulItems.length / items.length;
  const equipmentItems = items.filter((item) => ["equipment", "upgrade", "key"].includes(item.kind));
  const shopAffordable = createNewGame({ createdAt: "2026-06-26T00:00:00.000Z" }).player.coins >= 6;
  const autosaveReasons = new Set();
  let state = createNewGame({ createdAt: "2026-06-26T00:00:00.000Z", saveId: "data-integrity" });
  state = changeArea(state, "inn");
  autosaveReasons.add(state.autosaveLog.at(-1)?.reason.split(":")[0]);
  state = addItem(state, "moonBadge", 1).state;
  state = completeMainStage(state, 0).state;
  autosaveReasons.add(state.autosaveLog.at(-1)?.reason.split(":")[0]);
  state = addItem(state, "riverPumpkin", 1).state;
  state = completeSideQuest(state, "sq-price").state;
  autosaveReasons.add(state.autosaveLog.at(-1)?.reason.split(":")[0]);
  state = finishGame({ ...state, ending: null }, "repair");
  autosaveReasons.add(state.autosaveLog.at(-1)?.reason);
  const migrated = migrateSave({ schemaVersion: 1, location: "bellvale", player: { name: "旧档绒火" }, inventory: { moonHerb: 1 } });
  const recipeRows = recipes.map((recipe) => {
    const ingredientsOk = recipe.ingredients.every((ingredient) => itemById[ingredient.id] && ingredient.qty > 0);
    const resultOk = Boolean(itemById[recipe.result.id] && recipe.result.qty > 0);
    const unlockOk = Number.isInteger(recipe.unlockStage) && recipe.unlockStage >= 0 && recipe.unlockStage <= mainQuestStages.length - 1;
    return {
      title: recipe.title,
      unlockStage: recipe.unlockStage,
      ingredients: recipe.ingredients.map((ingredient) => `${itemById[ingredient.id]?.name || ingredient.id}x${ingredient.qty}`).join("、"),
      result: `${itemById[recipe.result.id]?.name || recipe.result.id}x${recipe.result.qty}`,
      status: ingredientsOk && resultOk && unlockOk ? "通过" : "需复核",
    };
  });
  const craftStart = createNewGame({ createdAt: "2026-06-26T00:00:00.000Z", saveId: "craft-integrity" });
  const unlockedAtStart = getUnlockedRecipes(craftStart).length;
  const craftedSoup = craftRecipe(craftStart, "moonleaf-soup");
  if (craftedSoup.ok) autosaveReasons.add(craftedSoup.state.autosaveLog.at(-1)?.reason.split(":")[0]);

  if (usefulRatio < 0.7) issues.push("具备实际用途的道具比例低于 70%");
  if (upgrades.length < 4 || upgrades.length > 6) issues.push("成长节点数量不在 4-6 个区间");
  if (!shopAffordable) issues.push("初始铜星不足以购买基础商店道具");
  if (recipes.length < 1 || recipes.length > 6) issues.push("配方数量不在 1-6 个区间");
  if (recipeRows.some((row) => row.status !== "通过")) issues.push("配方存在未知材料、未知产物或解锁阶段异常");
  if (!craftedSoup.ok || !craftedSoup.state.flags["crafted:moonleaf-soup"]) issues.push("营地配方制作未成功记录");
  if (!["area", "main", "sidequest", "ending"].every((reason) => autosaveReasons.has(reason))) issues.push("自动保存未覆盖跨区、任务、支线和结局");
  if (migrated.schemaVersion !== SAVE_SCHEMA_VERSION || migrated.player.name !== "旧档绒火") issues.push("旧存档迁移未保留关键字段");

  return {
    rows: [
      { item: "道具用途", evidence: `${usefulItems.length}/${items.length} 个具备规则用途`, status: usefulRatio >= 0.7 ? "通过" : "需复核" },
      { item: "经济入口", evidence: `初始铜星 12，基础商店最高单价 6`, status: shopAffordable ? "通过" : "需复核" },
      { item: "成长节点", evidence: `${upgrades.length} 个永久成长，${equipmentItems.length} 个关键/装备/升级物`, status: upgrades.length >= 4 && upgrades.length <= 6 ? "通过" : "需复核" },
      { item: "营地料理", evidence: `${recipes.length} 个配方，初始开放 ${unlockedAtStart} 个，实作 ${craftedSoup.ok ? "通过" : craftedSoup.reason}`, status: recipes.length <= 6 && craftedSoup.ok ? "通过" : "需复核" },
      { item: "自动保存", evidence: [...autosaveReasons].filter(Boolean).join("、"), status: ["area", "main", "sidequest", "ending"].every((reason) => autosaveReasons.has(reason)) ? "通过" : "需复核" },
      { item: "存档迁移", evidence: `schema ${migrated.schemaVersion}，玩家 ${migrated.player.name}`, status: migrated.schemaVersion === SAVE_SCHEMA_VERSION ? "通过" : "需复核" },
    ],
    recipes: recipeRows,
    issues,
  };
}

function inspectRuleClarityAndDeterminism() {
  const issues = [];
  const requiredRuleTopics = ["行动", "记忆", "传闻", "天气", "结局", "Furry"];
  const ruleText = worldRules.join("\n");
  for (const topic of requiredRuleTopics) {
    if (!ruleText.includes(topic)) issues.push(`世界规则缺少主题：${topic}`);
  }
  const firstRun = runWorldSimulation(9, 3).snapshots;
  const secondRun = runWorldSimulation(9, 3).snapshots;
  const deterministic = JSON.stringify(firstRun) === JSON.stringify(secondRun);
  const weatherSeen = new Set(firstRun.map((snapshot) => snapshot.weather));
  if (!deterministic) issues.push("相同条件下世界模拟结果不一致");
  if (!weatherStates.every((weather) => weatherSeen.has(weather))) issues.push("世界模拟未覆盖全部天气边界");

  return {
    rows: [
      { item: "世界规则表", evidence: `${worldRules.length} 条规则，覆盖 ${requiredRuleTopics.join("、")}`, status: requiredRuleTopics.every((topic) => ruleText.includes(topic)) ? "通过" : "需复核" },
      { item: "确定性", evidence: `同种子 3 日快照 ${firstRun.length} 条`, status: deterministic ? "通过" : "需复核" },
      { item: "随机边界", evidence: `天气：${[...weatherSeen].join("、")}`, status: weatherStates.every((weather) => weatherSeen.has(weather)) ? "通过" : "需复核" },
    ],
    issues,
  };
}

function applyStageReward(state, stageIndex) {
  switch (stageIndex) {
    case 0:
      state.flags.hasQuestLog = true;
      break;
    case 1:
      decrementItem(state, "emberResin", 2);
      state.flags.bridgeFixed = true;
      if (!state.upgrades.includes("softPawBoots")) state.upgrades.push("softPawBoots");
      break;
    case 2:
      decrementItem(state, "waterCog", 1);
      state.flags.waterwheelFixed = true;
      state.equipment.rainCharm = true;
      break;
    case 3:
      state.flags.spireUnlocked = true;
      if (!state.upgrades.includes("bellStrike")) state.upgrades.push("bellStrike");
      break;
    case 4:
      state.flags.villageUnited = true;
      if (!state.upgrades.includes("lanternCore")) state.upgrades.push("lanternCore");
      break;
    case 5:
      state.flags.finalBattleWon = true;
      break;
    default:
      break;
  }
}

function propagateRumors(state) {
  const local = createLocalRumor(state);
  state.rumors.push({ ...local, day: state.time.day, segment: getTimeSegment(state) });
  state.rumors = state.rumors.slice(-RUMOR_LOG_LIMIT);
}

function autosave(state, reason) {
  const next = cloneState(state);
  next.autosaveLog.push({ reason, at: next.updatedAt, location: next.location, stage: next.mainStage });
  next.autosaveLog = next.autosaveLog.slice(-20);
  return next;
}

function remember(state, type, text) {
  const memoryType = memories.find((item) => item.type === type) ? type : "secret";
  const target = npcs.find((npc) => getNpcArea(npc.id, state) === state.location) || npcs[0];
  state.npcState[target.id].memories.push({ type: memoryType, text, day: state.time.day });
  state.npcState[target.id].memories = state.npcState[target.id].memories.slice(-8);
}

function decrementItem(state, itemId, qty) {
  state.inventory[itemId] = Math.max(0, (state.inventory[itemId] || 0) - qty);
  if (state.inventory[itemId] <= 0) delete state.inventory[itemId];
}

function pushLog(state, text) {
  state.lastMessage = text;
}

function touch(state) {
  state.updatedAt = new Date().toISOString();
  return state;
}

function cloneState(state) {
  return structuredClone(state);
}

function parseJsonObject(text) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error("无法解析 JSON");
  }
}

function asText(value, field, max) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} 必须是文本`);
  return value.trim().slice(0, max);
}

function asEnum(value, allowed, field) {
  if (!allowed.has(value)) throw new Error(`${field} 不在白名单内`);
  return value;
}

function clampNumber(value, min, max, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${field} 必须是数字`);
  return clamp(number, min, max);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hashText(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function inspectWorldGeometry() {
  const playerRadius = 24;
  const worldMargin = 36;
  const issues = [];
  const areaRows = [];
  let exitsChecked = 0;
  let interactionPointsChecked = 0;
  let pickupsChecked = 0;
  let enemySpawnsChecked = 0;
  let colliderSamples = 0;

  for (const area of Object.values(areas)) {
    const areaIssues = [];
    if (!pointInsideArea(area.spawn, area, worldMargin)) areaIssues.push("出生点越界");
    if (pointCollides(area.spawn, area, playerRadius)) areaIssues.push("出生点被碰撞体阻挡");

    for (const exit of area.exits || []) {
      exitsChecked += 1;
      if (!areaById[exit.to]) areaIssues.push(`出口 ${exit.id} 指向未知区域`);
      if (!pointInsideArea(exit, area, playerRadius)) areaIssues.push(`出口 ${exit.id} 越界`);
      if (!hasReachableInteractionPoint(exit, area, playerRadius)) areaIssues.push(`出口 ${exit.id} 缺少可交互站位`);
      if (exit.spawn && (!pointInsideArea(exit.spawn, areaById[exit.to], worldMargin) || pointCollides(exit.spawn, areaById[exit.to], playerRadius))) {
        areaIssues.push(`出口 ${exit.id} 的目标出生点不可用`);
      }
    }

    for (const object of area.interactables || []) {
      interactionPointsChecked += 1;
      if (!pointInsideArea(object, area, playerRadius)) areaIssues.push(`交互点 ${object.id} 越界`);
      if (!hasReachableInteractionPoint(object, area, playerRadius)) areaIssues.push(`交互点 ${object.id} 缺少可交互站位`);
    }

    for (const pickup of area.pickups || []) {
      pickupsChecked += 1;
      if (!pointInsideArea(pickup, area, playerRadius)) areaIssues.push(`拾取物 ${pickup.id} 越界`);
      if (pointCollides(pickup, area, playerRadius)) areaIssues.push(`拾取物 ${pickup.id} 被碰撞体阻挡`);
    }

    for (const enemy of area.enemies || []) {
      enemySpawnsChecked += 1;
      if (!enemyTypes[enemy.type]) areaIssues.push(`敌人 ${enemy.type} 类型不存在`);
      if (!pointInsideArea(enemy, area, playerRadius)) areaIssues.push(`敌人 ${enemy.type} 出生点越界`);
      if (pointCollides(enemy, area, playerRadius)) areaIssues.push(`敌人 ${enemy.type} 出生点被碰撞体阻挡`);
    }

    for (const rect of area.colliders || []) {
      colliderSamples += 5;
      const samples = [
        { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 },
        { x: rect.x + 8, y: rect.y + 8 },
        { x: rect.x + rect.w - 8, y: rect.y + 8 },
        { x: rect.x + 8, y: rect.y + rect.h - 8 },
        { x: rect.x + rect.w - 8, y: rect.y + rect.h - 8 },
      ];
      if (!samples.every((sample) => pointCollides(sample, area, playerRadius))) areaIssues.push(`碰撞体 ${rect.x},${rect.y} 未稳定阻挡`);
    }

    if (area.kind === "main" && (!area.landmarks || area.landmarks.length < 2)) areaIssues.push("主要区域地标不足");
    if (!area.exits || area.exits.length < 1) areaIssues.push("缺少出口");
    areaRows.push({
      id: area.id,
      name: area.name,
      exits: area.exits?.length || 0,
      colliders: area.colliders?.length || 0,
      enemies: area.enemies?.length || 0,
      ok: areaIssues.length === 0,
      notes: areaIssues.length ? areaIssues.join("；") : "通过",
    });
    issues.push(...areaIssues.map((note) => `${area.id}: ${note}`));
  }

  return {
    areasChecked: areaRows.length,
    exitsChecked,
    interactionPointsChecked,
    pickupsChecked,
    enemySpawnsChecked,
    colliderSamples,
    rows: areaRows,
    issues,
  };
}

function inspectCombatLoops(loopsPerEnemy) {
  const issues = [];
  let state = createNewGame({ createdAt: "2026-06-26T00:00:00.000Z", saveId: "combat-regression" });
  const enemyRows = [];

  for (const enemy of Object.values(enemyTypes)) {
    const enemyIssues = [];
    if (!enemy.name || !enemy.archetype || !enemy.tell) enemyIssues.push("缺少玩家可读战斗描述");
    if (!Number.isFinite(enemy.hp) || enemy.hp <= 0) enemyIssues.push("生命值无效");
    if (!Number.isFinite(enemy.damage) || enemy.damage <= 0) enemyIssues.push("伤害无效");
    if (!Array.isArray(enemy.drops) || enemy.drops.length === 0) enemyIssues.push("缺少掉落");
    if (enemy.archetype.includes("头目") || enemy.archetype.includes("首领")) {
      if (!Array.isArray(enemy.phases) || enemy.phases.length < 2) enemyIssues.push("头目缺少双阶段描述");
    }

    const beforeCount = state.defeated[enemy.id] || 0;
    const beforeHp = state.player.hp;
    for (let i = 0; i < loopsPerEnemy; i += 1) state = defeatEnemy(state, enemy.id);
    const defeatedDelta = (state.defeated[enemy.id] || 0) - beforeCount;
    if (defeatedDelta !== loopsPerEnemy) enemyIssues.push(`击败计数为 ${defeatedDelta}/${loopsPerEnemy}`);
    if (state.player.hp !== beforeHp) enemyIssues.push("规则层击败不应意外扣除玩家生命");
    for (const drop of enemy.drops || []) {
      if (!itemById[drop.id]) enemyIssues.push(`掉落 ${drop.id} 不存在`);
      if ((state.inventory[drop.id] || 0) < 0) enemyIssues.push(`掉落 ${drop.id} 数量异常`);
    }

    enemyRows.push({
      id: enemy.id,
      name: enemy.name,
      archetype: enemy.archetype,
      hp: enemy.hp,
      damage: enemy.damage,
      loops: defeatedDelta,
      attacksToDefeat: Math.ceil(enemy.hp / state.player.attackLevel),
      bossPhases: enemy.phases?.length || 0,
      ok: enemyIssues.length === 0,
      notes: enemyIssues.length ? enemyIssues.join("；") : "通过",
    });
    issues.push(...enemyIssues.map((note) => `${enemy.id}: ${note}`));
  }

  state = changeArea(state, "moonspire");
  const checkpoint = { ...state.checkpoint };
  state.player.hp = 0;
  const retried = failAndRetry(state);
  const retryRestored =
    retried.player.hp === retried.player.maxHp &&
    retried.player.stamina === 100 &&
    retried.location === checkpoint.area &&
    retried.player.x === checkpoint.x &&
    retried.player.y === checkpoint.y;
  if (!retryRestored) issues.push("失败重试未回到检查点");

  return {
    enemiesChecked: enemyRows.length,
    loopsPerEnemy,
    totalDefeats: enemyRows.reduce((total, row) => total + row.loops, 0),
    bossesChecked: enemyRows.filter((row) => row.bossPhases > 0).length,
    retryRestored,
    rows: enemyRows,
    issues,
  };
}

function inspectAreaTransitions(loops) {
  const issues = [];
  let state = createNewGame({ createdAt: "2026-06-26T00:00:00.000Z", saveId: "transition-regression" });
  state.flags = { ...state.flags, bridgeFixed: true, waterwheelFixed: true, spireUnlocked: true, villageUnited: true };
  const route = [
    ["bellvale", "to-forest"],
    ["emberwood", "forest-to-river"],
    ["riverfarm", "river-to-ruins"],
    ["starruins", "ruins-to-spire"],
    ["moonspire", "spire-to-ruins"],
    ["starruins", "ruins-to-river"],
    ["riverfarm", "river-to-bellvale"],
    ["bellvale", "to-inn"],
    ["inn", "inn-out"],
    ["bellvale", "to-workshop"],
    ["workshop", "workshop-out"],
    ["bellvale", "to-towerhall"],
    ["towerhall", "tower-out"],
    ["bellvale", "to-river"],
    ["riverfarm", "river-to-bellvale"],
  ];
  const rows = [];

  for (let i = 0; i < loops; i += 1) {
    const [expectedArea, exitId] = route[i % route.length];
    if (state.location !== expectedArea) issues.push(`第 ${i + 1} 次跨区前位于 ${state.location}，预期 ${expectedArea}`);
    const exit = areas[expectedArea].exits.find((item) => item.id === exitId);
    if (!exit) {
      issues.push(`${expectedArea} 缺少出口 ${exitId}`);
      continue;
    }
    if (exit.requiresFlag && !state.flags[exit.requiresFlag]) issues.push(`${exitId} 所需世界标记 ${exit.requiresFlag} 未满足`);
    state = changeArea(state, exit.to, exit.spawn);
    const latestSave = state.autosaveLog.at(-1);
    if (state.location !== exit.to) issues.push(`${exitId} 未抵达 ${exit.to}`);
    if (state.checkpoint.area !== exit.to) issues.push(`${exitId} 未更新检查点区域`);
    if (exit.spawn && (state.player.x !== exit.spawn.x || state.player.y !== exit.spawn.y)) issues.push(`${exitId} 未使用出口指定出生点`);
    if (!latestSave || latestSave.reason !== `area:${exit.to}`) issues.push(`${exitId} 未产生跨区自动保存`);
    assertInvariants(state);
    rows.push({
      index: i + 1,
      from: areas[expectedArea].name,
      exit: exit.label,
      to: areas[exit.to].name,
      checkpoint: `${Math.round(state.checkpoint.x)},${Math.round(state.checkpoint.y)}`,
      autosave: latestSave?.reason || "缺失",
    });
  }

  return {
    loops,
    uniqueAreasVisited: new Set(rows.flatMap((row) => [row.from, row.to])).size,
    rows,
    issues,
  };
}

function inspectWeatherEffects() {
  const issues = [];
  const simulation = runWorldSimulation(11, 3);
  const weatherSeen = new Set(simulation.snapshots.map((snapshot) => snapshot.weather));
  for (const weather of weatherStates) {
    if (!weatherSeen.has(weather)) issues.push(`模拟未覆盖天气：${weather}`);
  }

  const sunny = createNewGame({ createdAt: "2026-06-26T00:00:00.000Z", saveId: "weather-sunny" });
  sunny.time.segmentIndex = 1;
  sunny.weather = "晴朗";
  const rainy = cloneState(sunny);
  rainy.weather = "细雨";
  const foggy = cloneState(sunny);
  foggy.weather = "雾风";

  const antlaSunny = getNpcArea("antla", sunny);
  const antlaRainy = getNpcArea("antla", rainy);
  if (antlaRainy !== "riverfarm") issues.push("细雨天气未让琥芽留在河岸");
  if (antlaSunny === antlaRainy) issues.push("琥芽晴天与雨天日程缺少差异");

  let stageState = createNewGame({ createdAt: "2026-06-26T00:00:00.000Z", saveId: "weather-stage" });
  stageState = addItem(stageState, "moonBadge", 1).state;
  stageState = completeMainStage(stageState, 0).state;
  stageState = addItem(stageState, "emberResin", 2).state;
  stageState = completeMainStage(stageState, 1).state;
  stageState = addItem(stageState, "waterCog", 1).state;
  stageState = completeMainStage(stageState, 2).state;
  if (!stageState.equipment.rainCharm) issues.push("修复水车后未获得雨结护符");
  if (!stageState.flags.waterwheelFixed) issues.push("修复水车后未设置 waterwheelFixed");

  const rows = [
    { effect: "天气覆盖", evidence: [...weatherSeen].join("、"), status: weatherStates.every((weather) => weatherSeen.has(weather)) ? "通过" : "需复核" },
    { effect: "NPC 日程", evidence: `琥芽晴天：${areaById[antlaSunny]?.name || antlaSunny}；细雨：${areaById[antlaRainy]?.name || antlaRainy}`, status: antlaRainy === "riverfarm" && antlaSunny !== antlaRainy ? "通过" : "需复核" },
    { effect: "资源/装备", evidence: `雨结护符：${stageState.equipment.rainCharm ? "已获得" : "缺失"}`, status: stageState.equipment.rainCharm ? "通过" : "需复核" },
    { effect: "视野/氛围", evidence: `雾风状态：${foggy.weather}`, status: foggy.weather === "雾风" ? "通过" : "需复核" },
  ];

  return {
    weatherStates: weatherStates.length,
    weatherSeen: [...weatherSeen],
    snapshots: simulation.snapshots.length,
    rows,
    issues,
  };
}

function inspectCausalityChains() {
  const issues = [];
  const rows = [];
  let state = createNewGame({ createdAt: "2026-06-26T00:00:00.000Z", saveId: "causality-regression" });

  state = addItem(state, "moonBadge", 1).state;
  state = completeMainStage(state, 0).state;
  state = addItem(state, "emberResin", 2).state;
  state = completeMainStage(state, 1).state;
  recordChain("修复断桥", state.flags.bridgeFixed && state.upgrades.includes("softPawBoots") && areas.emberwood.exits.some((exit) => exit.requiresFlag === "bridgeFixed"), "bridgeFixed + 软爪闪避 + 森林到河岸出口");

  state = addItem(state, "waterCog", 1).state;
  state = completeMainStage(state, 2).state;
  recordChain("修复水车", state.flags.waterwheelFixed && state.equipment.rainCharm && areas.riverfarm.exits.some((exit) => exit.requiresFlag === "waterwheelFixed"), "waterwheelFixed + 雨结护符 + 河岸到遗迹出口");

  state = defeatEnemy(state, "echo-guardian");
  state = completeMainStage(state, 3).state;
  recordChain("点亮回声祭台", state.flags.spireUnlocked && state.upgrades.includes("bellStrike") && areas.starruins.exits.some((exit) => exit.requiresFlag === "spireUnlocked"), "spireUnlocked + 月铃击 + 遗迹到塔顶出口");

  state = addItem(state, "duskFeather", 1).state;
  state = completeSideQuest(state, "sq-scarf").state;
  state = addItem(state, "riverPumpkin", 1).state;
  state = completeSideQuest(state, "sq-price").state;
  state = completeMainStage(state, 4).state;
  state.time.segmentIndex = 3;
  state.weather = "晴朗";
  const gathered = ["vella", "loran", "sable"].every((npcId) => getNpcArea(npcId, state) === "bellvale");
  recordChain("集结居民", state.flags.villageUnited && gathered && state.upgrades.includes("lanternCore"), "villageUnited + 三名关键 NPC 回聚落 + 月灯视野");

  const beforeTrust = state.npcState.milu.trust;
  state = applyRumor(state, {
    sourceNpcId: "owen",
    targetNpcId: "milu",
    topic: "月铃塔",
    line: "羽铃说米露的小摊让月铃塔听起来暖了一点。",
    tone: "温暖",
    distortion: 1,
  });
  recordChain("低失真传闻", state.rumors.length > 0 && state.npcState.milu.trust === beforeTrust + 1, "传闻入账 + 目标 NPC 信任提升");

  function recordChain(name, ok, evidence) {
    if (!ok) issues.push(`${name} 因果链未成立`);
    rows.push({ name, evidence, status: ok ? "通过" : "需复核" });
  }

  return {
    chainsChecked: rows.length,
    rows,
    issues,
  };
}

function inspectLongSession(minutes) {
  const issues = [];
  let state = createNewGame({ createdAt: "2026-06-26T00:00:00.000Z", saveId: "long-session-regression" });
  state.flags = { ...state.flags, bridgeFixed: true, waterwheelFixed: true, spireUnlocked: true, villageUnited: true };
  state.equipment.rainCharm = true;
  state.upgrades = ["softPawBoots", "bellStrike", "lanternCore"];
  const areasToVisit = ["bellvale", "inn", "bellvale", "workshop", "bellvale", "emberwood", "riverfarm", "starruins", "moonspire", "starruins", "riverfarm"];
  const enemies = Object.keys(enemyTypes);
  const steps = minutes * 2;
  let saveRoundTrips = 0;

  for (let i = 0; i < steps; i += 1) {
    state.playSeconds += 30;
    if (i % 4 === 0) state = advanceTime(state, 1);
    state = changeArea(state, areasToVisit[i % areasToVisit.length]);
    if (i % 5 === 0) state = addItem(state, i % 10 === 0 ? "emberResin" : "moonHerb", 1).state;
    if (i % 7 === 0) state = defeatEnemy(state, enemies[i % enemies.length]);
    if (i % 9 === 0) {
      state.player.hp = Math.max(1, state.player.hp - 1);
      const used = useItem(state, "moonHerb");
      state = used.state;
    }
    assertInvariants(state);
    const saved = serializeSave(state);
    const loaded = validateSave(saved);
    if (loaded.location !== state.location) issues.push(`第 ${i + 1} 次存档往返后地点不一致`);
    if (loaded.mainStage !== state.mainStage) issues.push(`第 ${i + 1} 次存档往返后主线阶段不一致`);
    if (loaded.player.hp !== state.player.hp) issues.push(`第 ${i + 1} 次存档往返后生命值不一致`);
    state = loaded;
    saveRoundTrips += 1;
  }

  if (state.playSeconds < minutes * 60) issues.push("长会话游玩时长不足");
  if (state.autosaveLog.length > 20) issues.push("自动保存日志未按上限裁剪");
  if (state.rumors.length > RUMOR_LOG_LIMIT) issues.push("传闻日志未按上限裁剪");
  assertInvariants(state);

  return {
    minutes,
    steps,
    saveRoundTrips,
    finalDay: state.time.day,
    finalArea: state.location,
    autosavesKept: state.autosaveLog.length,
    rumorsKept: state.rumors.length,
    playSeconds: Math.floor(state.playSeconds),
    issues,
  };
}

function pointInsideArea(point, area, margin) {
  if (!area || !point) return false;
  return point.x >= margin && point.y >= margin && point.x <= area.size.w - margin && point.y <= area.size.h - margin;
}

function pointCollides(point, area, radius) {
  if (!area || !point) return true;
  return (area.colliders || []).some((rect) => point.x > rect.x - radius && point.x < rect.x + rect.w + radius && point.y > rect.y - radius && point.y < rect.y + rect.h + radius);
}

function hasReachableInteractionPoint(point, area, radius) {
  if (!area || !pointInsideArea(point, area, 0)) return false;
  const offsets = [
    { x: 0, y: 0 },
    { x: 78, y: 0 },
    { x: -78, y: 0 },
    { x: 0, y: 78 },
    { x: 0, y: -78 },
    { x: 56, y: 56 },
    { x: -56, y: 56 },
    { x: 56, y: -56 },
    { x: -56, y: -56 },
  ];
  return offsets.some((offset) => {
    const sample = { x: point.x + offset.x, y: point.y + offset.y };
    return pointInsideArea(sample, area, 36) && !pointCollides(sample, area, radius) && Math.hypot(sample.x - point.x, sample.y - point.y) < 98;
  });
}
