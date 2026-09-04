import {
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
} from "/shared/gameData.js";
import {
  addItem,
  advanceTime,
  applyRumor,
  buyShopItem,
  canCompleteStage,
  changeArea,
  completeMainStage,
  completeSideQuest,
  craftRecipe,
  createLocalRumor,
  createNewGame,
  defeatEnemy,
  failAndRetry,
  finishGame,
  getCurrentStage,
  getNpcDialogueLine,
  getNpcArea,
  getShopPrices,
  getTimeSegment,
  getUnlockedRecipes,
  inventorySlotsUsed,
  migrateSave,
  parseImportedSave,
  serializeSave,
  upgradeAbility,
  useItem,
  validateSave,
} from "/shared/gameRules.js";
import { createRequestGate, fetchJsonWithTimeout } from "/shared/networkSafety.js";
import { writeSaveToStorage } from "/shared/storageSafety.js";

const $ = (selector) => document.querySelector(selector);

const loadingScreen = $("#loadingScreen");
const loadingStatus = $("#loadingStatus");
const compatFallback = $("#compatFallback");
const app = $("#app");
const titleScreen = $("#titleScreen");
const gameScreen = $("#gameScreen");
const modalLayer = $("#modalLayer");
const modalTitle = $("#modalTitle");
const modalBody = $("#modalBody");
const closeModalBtn = $("#closeModalBtn");
const importFile = $("#importFile");
const previewCanvas = $("#previewCanvas");
const previewCtx = previewCanvas.getContext?.("2d");
const canvas = $("#gameCanvas");
const ctx = canvas.getContext?.("2d");
const promptBox = $("#prompt");
const toast = $("#toast");

const ui = {
  newGameBtn: $("#newGameBtn"),
  aiTownBtn: $("#aiTownBtn"),
  continueBtn: $("#continueBtn"),
  saveMenuBtn: $("#saveMenuBtn"),
  settingsBtn: $("#settingsBtn"),
  creditsBtn: $("#creditsBtn"),
  questBtn: $("#questBtn"),
  inventoryBtn: $("#inventoryBtn"),
  pauseBtn: $("#pauseBtn"),
  areaKind: $("#areaKind"),
  areaName: $("#areaName"),
  hpBar: $("#hpBar"),
  staminaBar: $("#staminaBar"),
  timeLabel: $("#timeLabel"),
  weatherLabel: $("#weatherLabel"),
  autosaveLabel: $("#autosaveLabel"),
  questTitle: $("#questTitle"),
  questText: $("#questText"),
  messageLog: $("#messageLog"),
};

const storageKeys = {
  activeSlot: "moonbell.activeSlot",
  settings: "moonbell.settings",
  slot: (index) => `moonbell.slot.${index}`,
};
const storageAvailable = canUseLocalStorage();

const runtime = {
  screen: "title",
  state: null,
  areaRuntime: null,
  activeSlot: storageAvailable ? Number(localStorage.getItem(storageKeys.activeSlot) || 0) : 0,
  keys: new Set(),
  messages: [],
  interaction: null,
  paused: false,
  attackTimer: 0,
  dodgeTimer: 0,
  invulnerableTimer: 0,
  shake: 0,
  stepTimer: 0,
  lastSaveAt: 0,
  status: { hasLLM: false },
  audio: null,
  townMode: false,
  townSim: null,
};
const networkGate = createRequestGate();

const itemById = Object.fromEntries(items.map((item) => [item.id, item]));
const npcById = Object.fromEntries(npcs.map((npc) => [npc.id, npc]));
const themeById = Object.fromEntries(audioThemes.map((theme) => [theme.id, theme]));
const soundById = Object.fromEntries(soundEffects.map((effect) => [effect.id, effect]));
const townAgentIds = ["vella", "milu", "loran"];
const townPlaces = [
  { id: "plaza", label: "绒火广场", x: 900, y: 650, purpose: "交换清晨见闻" },
  { id: "stall", label: "米露小摊", x: 690, y: 730, purpose: "整理补给和价格" },
  { id: "tower", label: "月铃塔阶", x: 930, y: 340, purpose: "聆听月铃回声" },
  { id: "fire", label: "议事篝火", x: 1040, y: 700, purpose: "确认居民需要" },
  { id: "riverGate", label: "河岸路牌", x: 880, y: 1010, purpose: "查看天气和商路" },
];
const townMemorySeeds = [
  ["vella", "secret", "薇萝记得月铃塔昨夜亮过一圈细光。"],
  ["vella", "promise", "薇萝答应午后在广场等待巡守回报。"],
  ["milu", "gift", "米露记得砂栗喜欢把芦苇纤维换成热面包。"],
  ["milu", "help", "米露记得绒火曾帮她把摊车从雨沟里推出来。"],
  ["loran", "combat", "洛岚记得森林边有三处刺藤会靠近路牌。"],
  ["loran", "promise", "洛岚承诺深夜前再巡一次河岸入口。"],
  ["vella", "help", "薇萝记得米露愿意把滞销药草送给旅店。"],
  ["milu", "secret", "米露听说旧铃链会在雾风里轻轻发热。"],
  ["loran", "gift", "洛岚把一枚磨旧的铜扣留给修桥学徒。"],
  ["vella", "combat", "薇萝记得洛岚曾在月铃塔影子下护住孩子们。"],
];
const townStoryBeats = [
  { placeId: "plaza", type: "help", line: "{a}在{place}停下脚步，问{b}今天最需要谁先被照看。" },
  { placeId: "stall", type: "gift", line: "{a}把一小包补给放到{place}，请{b}记在明日清单上。" },
  { placeId: "tower", type: "secret", line: "{a}听见{place}里有断续铃声，悄悄告诉{b}别让传闻走样。" },
  { placeId: "fire", type: "promise", line: "{a}和{b}在{place}旁约定：天黑前各自完成一件小事。" },
  { placeId: "riverGate", type: "combat", line: "{a}指向{place}外的泥痕，提醒{b}巡路时避开刺藤。 " },
];
let lastFrame = performance.now();

boot();

async function boot() {
  if (!isSupportedEnvironment()) {
    showCompatibilityFallback();
    return;
  }
  loadingStatus.textContent = "载入世界数据...";
  drawPreview(performance.now());
  try {
    runtime.status = await fetch("/api/status").then((response) => response.json());
  } catch {
    runtime.status = { hasLLM: false };
  }
  bindEvents();
  updateContinueButton();
  loadingScreen.hidden = true;
  app.hidden = false;
  if (openPortfolioScene()) {
    requestAnimationFrame(frame);
    return;
  }
  requestAnimationFrame(frame);
}

function isSupportedEnvironment() {
  return Boolean(previewCtx && ctx && storageAvailable && window.fetch && window.structuredClone && window.requestAnimationFrame);
}

function canUseLocalStorage() {
  try {
    const key = "moonbell.storageProbe";
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function showCompatibilityFallback() {
  loadingScreen.hidden = true;
  app.hidden = true;
  compatFallback.hidden = false;
}

function bindEvents() {
  ui.newGameBtn.addEventListener("click", () => startNewGame());
  ui.aiTownBtn.addEventListener("click", () => startAutonomousTown());
  ui.continueBtn.addEventListener("click", () => continueGame());
  ui.saveMenuBtn.addEventListener("click", () => openSaveMenu());
  ui.settingsBtn.addEventListener("click", () => openSettings());
  ui.creditsBtn.addEventListener("click", () => openCredits());
  ui.questBtn.addEventListener("click", () => openQuestLog());
  ui.inventoryBtn.addEventListener("click", () => openInventory());
  ui.pauseBtn.addEventListener("click", () => togglePause(true));
  closeModalBtn.addEventListener("click", closeModal);
  modalLayer.addEventListener("click", (event) => {
    if (event.target === modalLayer) closeModal();
  });
  importFile.addEventListener("change", importSaveFile);

  window.addEventListener("keydown", (event) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Shift"].includes(event.key)) event.preventDefault();
    if (event.key === "Escape" && runtime.screen === "game") {
      togglePause(!runtime.paused);
      return;
    }
    if (event.key.toLowerCase() === "i" && runtime.screen === "game") openInventory();
    if (event.key.toLowerCase() === "l" && runtime.screen === "game") openQuestLog();
    runtime.keys.add(event.key.toLowerCase());
  });
  window.addEventListener("keyup", (event) => runtime.keys.delete(event.key.toLowerCase()));
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
}

function startNewGame() {
  ensureAudio();
  playSound("uiStart");
  runtime.townMode = false;
  runtime.townSim = null;
  runtime.state = createNewGame({ slot: runtime.activeSlot, playerName: "绒火" });
  runtime.state.settings = loadSavedSettings(runtime.state.settings);
  applyAudioSettings();
  runtime.messages = ["薇萝在月铃塔前等你。先去暖角旅店找回见习铃牌。"];
  enterArea(runtime.state.location, runtime.state.player);
  saveActive("new-game");
  showGame();
}

function startAutonomousTown(options = {}) {
  if (!options.skipAudioStart) ensureAudio();
  playSound("uiStart");
  runtime.townMode = true;
  runtime.state = createNewGame({ slot: 0, playerName: "观察者", saveId: "autonomous-town" });
  runtime.state.settings = loadSavedSettings(runtime.state.settings);
  runtime.state.player.x = 930;
  runtime.state.player.y = 690;
  runtime.state.time = { day: 1, segmentIndex: 1 };
  runtime.state.weather = "晴朗";
  applyAudioSettings();
  seedTownMemories(runtime.state);
  runtime.townSim = createTownSim(runtime.state);
  runtime.messages = [
    "AI小镇已自主运行：薇萝、米露、洛岚会移动、相遇、聊天并写入记忆。",
    `初始记忆：${countTownMemories(runtime.state)} 条。你可以放着观看，也可以用 WASD 调整观察位置。`,
  ];
  enterArea("bellvale", { x: 930, y: 690 });
  showGame();
  generateTownEvent();
}

function openPortfolioScene() {
  const params = new URLSearchParams(location.search);
  if (params.get("mode") === "town" || params.get("scene") === "town") {
    startAutonomousTown({ skipAudioStart: true });
    return true;
  }
  const sceneId = params.get("scene");
  if (!sceneId) return false;
  const sceneState = createPortfolioScene(sceneId);
  if (!sceneState) return false;
  ensureAudio();
  runtime.state = sceneState.state;
  runtime.state.settings = loadSavedSettings(runtime.state.settings);
  applyAudioSettings();
  runtime.messages = sceneState.messages;
  runtime.activeSlot = 0;
  applyPortfolioOverrides(new URLSearchParams(location.search));
  enterArea(runtime.state.location, runtime.state.player);
  showGame();
  if (sceneState.openEnding) openEnding();
  openPortfolioPanel(params.get("panel"));
  return true;
}

function applyPortfolioOverrides(params) {
  const weather = params.get("weather");
  if (weather && ["晴朗", "细雨", "雾风"].includes(weather)) runtime.state.weather = weather;
  const segment = Number(params.get("segment"));
  if (Number.isInteger(segment) && segment >= 0 && segment < timeSegments.length) runtime.state.time.segmentIndex = segment;
  const brightness = Number(params.get("brightness"));
  if (Number.isFinite(brightness)) runtime.state.settings.brightness = clamp(brightness, 0.72, 1.12);
}

function openPortfolioPanel(panelId) {
  if (!panelId) return;
  const panelMap = {
    quest: openQuestLog,
    inventory: openInventory,
    save: openSaveMenu,
    settings: openSettings,
    pause: () => togglePause(true),
  };
  panelMap[panelId]?.();
}

function seedTownMemories(state) {
  const allowedTypes = new Set(memories.map((memory) => memory.type));
  for (const [npcId, type, text] of townMemorySeeds) {
    if (!state.npcState[npcId] || !allowedTypes.has(type)) continue;
    state.npcState[npcId].memories.push({ type, text, day: state.time.day });
  }
}

function createTownSim(state) {
  return {
    elapsed: 0,
    eventTimer: 1.2,
    episode: 0,
    clockTimer: 0,
    agents: townAgentIds.map((npcId, index) => {
      const npc = npcById[npcId];
      const place = townPlaces[index % townPlaces.length];
      return {
        id: npcId,
        npc,
        x: place.x + (index - 1) * 34,
        y: place.y + index * 22,
        target: townPlaces[(index + 1) % townPlaces.length],
        activity: `${place.label}：${place.purpose}`,
        bubble: "",
        bubbleTimer: 0,
        color: ["#6a5a92", "#2f7f76", "#425c9b"][index],
      };
    }),
    startedWithMemories: countTownMemories(state),
  };
}

function updateAutonomousTown(dt, now) {
  const sim = runtime.townSim;
  if (!sim || runtime.state.location !== "bellvale") return;
  sim.elapsed += dt;
  sim.eventTimer -= dt;
  sim.clockTimer += dt;

  for (const agent of sim.agents) {
    moveTownAgent(agent, dt, now);
    agent.bubbleTimer = Math.max(0, agent.bubbleTimer - dt);
    if (agent.bubbleTimer === 0) agent.bubble = "";
  }

  if (sim.clockTimer >= 18) {
    sim.clockTimer = 0;
    runtime.state = advanceTime(runtime.state, 1);
    runtime.state.weather = ["晴朗", "细雨", "雾风"][runtime.state.time.segmentIndex % 3];
    runtime.messages.unshift(`小镇时间推进到第 ${runtime.state.time.day} 日 ${getTimeSegment(runtime.state)}，天气变为${runtime.state.weather}。`);
  }

  if (sim.eventTimer <= 0) {
    generateTownEvent();
    sim.eventTimer = 3.8 + (sim.episode % 3) * 1.1;
  }
}

function moveTownAgent(agent, dt, now) {
  const dx = agent.target.x - agent.x;
  const dy = agent.target.y - agent.y;
  const distanceToTarget = Math.hypot(dx, dy);
  if (distanceToTarget < 18) {
    const nextIndex = (townPlaces.findIndex((place) => place.id === agent.target.id) + 1 + townAgentIds.indexOf(agent.id)) % townPlaces.length;
    agent.target = townPlaces[nextIndex];
    agent.activity = `${agent.target.label}：${agent.target.purpose}`;
    return;
  }
  const speed = 42 + townAgentIds.indexOf(agent.id) * 7 + Math.sin(now / 900 + agent.x) * 4;
  agent.x += (dx / distanceToTarget) * speed * dt;
  agent.y += (dy / distanceToTarget) * speed * dt;
}

function generateTownEvent() {
  const sim = runtime.townSim;
  const beat = townStoryBeats[sim.episode % townStoryBeats.length];
  const speaker = sim.agents[sim.episode % sim.agents.length];
  const listener = sim.agents[(sim.episode + 1) % sim.agents.length];
  const place = townPlaces.find((item) => item.id === beat.placeId) || speaker.target;
  speaker.target = place;
  listener.target = place;
  const line = beat.line.replace("{a}", speaker.npc.name).replace("{b}", listener.npc.name).replace("{place}", place.label).trim();
  speaker.bubble = `${place.label}：${memoryLabel(beat.type)}`;
  listener.bubble = "我记住了。";
  speaker.bubbleTimer = 3.2;
  listener.bubbleTimer = 2.8;
  rememberTownEvent(listener.id, beat.type, line);
  runtime.areaRuntime.effects.push({ x: place.x, y: place.y - 24, text: "新记忆", life: 0.45 });
  runtime.messages.unshift(`第 ${sim.episode + 1} 段小剧情：${line}`);
  runtime.messages = runtime.messages.slice(0, 16);
  sim.episode += 1;
  playSound(beat.type === "secret" ? "rumor" : "talk", { gainScale: 0.54 });
  showToast(`${listener.npc.name}新增记忆：${memoryLabel(beat.type)}`);
  updateUI();
}

function rememberTownEvent(npcId, type, text) {
  const relation = runtime.state.npcState[npcId];
  if (!relation) return;
  relation.memories.push({ type, text, day: runtime.state.time.day });
  relation.memories = relation.memories.slice(-10);
  relation.trust = Math.min(20, relation.trust + 1);
}

function countTownMemories(state) {
  return townAgentIds.reduce((sum, npcId) => sum + (state.npcState[npcId]?.memories.length || 0), 0);
}

function memoryLabel(type) {
  return memories.find((memory) => memory.type === type)?.label || "新记忆";
}

function createPortfolioScene(sceneId) {
  if (sceneId === "bellvale" || sceneId === "village") {
    const state = createNewGame({ slot: 0, playerName: "绒火", saveId: "portfolio-bellvale" });
    state.player.x = 930;
    state.player.y = 690;
    state.time = { day: 1, segmentIndex: 1 };
    state.weather = "晴朗";
    return { state, messages: ["月铃聚落醒得很早，薇萝正在塔前等绒火回报。"] };
  }
  if (sceneId === "forest-combat") {
    let state = createNewGame({ slot: 0, playerName: "绒火", saveId: "portfolio-forest" });
    state = addItem(state, "moonBadge", 1).state;
    state = completeMainStage(state, 0).state;
    state = changeArea(state, "emberwood", { x: 900, y: 680 });
    state.player.x = 900;
    state.player.y = 680;
    return { state, messages: ["绒火在森林里试着用月铃击逼退刺藤。"] };
  }
  if (sceneId === "river-weather") {
    let state = createNewGame({ slot: 0, playerName: "绒火", saveId: "portfolio-river" });
    state = addItem(state, "moonBadge", 1).state;
    state = completeMainStage(state, 0).state;
    state = addItem(state, "emberResin", 2).state;
    state = completeMainStage(state, 1).state;
    state = changeArea(state, "riverfarm", { x: 980, y: 530 });
    state.time = { day: 2, segmentIndex: 2 };
    state.weather = "细雨";
    return { state, messages: ["细雨让河岸资源更丰，也让居民的日程临时变化。"] };
  }
  if (sceneId === "ruins-boss") {
    let state = createPortfolioBossReady();
    state = changeArea(state, "starruins", { x: 980, y: 650 });
    state.mainStage = 3;
    state.flags.spireUnlocked = false;
    state.defeated["echo-guardian"] = 0;
    state.weather = "雾风";
    return { state, messages: ["回声守卫挡在祭台前，半血后会进入第二阶段。"] };
  }
  if (sceneId === "moonspire-boss") {
    const state = createPortfolioBossReady();
    state.player.x = 1180;
    state.player.y = 620;
    state.weather = "雾风";
    return { state, messages: ["夜铃残响在终响祭坛前晃动，等待最后一次交锋。"] };
  }
  if (sceneId === "ending") {
    let state = createPortfolioBossReady();
    state = defeatEnemy(state, "night-bell");
    state = completeMainStage(state, 5).state;
    state = finishGame(state, "share");
    state.player.x = 1320;
    state.player.y = 620;
    return { state, messages: ["月铃重新响起，山谷在清晨一起醒来。"], openEnding: true };
  }
  return null;
}

function createPortfolioBossReady() {
  let state = createNewGame({ slot: 0, playerName: "绒火", saveId: "portfolio-boss" });
  state = addItem(state, "moonBadge", 1).state;
  state = completeMainStage(state, 0).state;
  state = addItem(state, "emberResin", 2).state;
  state = completeMainStage(state, 1).state;
  state = addItem(state, "waterCog", 1).state;
  state = completeMainStage(state, 2).state;
  state = defeatEnemy(state, "echo-guardian");
  state = completeMainStage(state, 3).state;
  state = addItem(state, "duskFeather", 1).state;
  state = completeSideQuest(state, "sq-scarf").state;
  state = addItem(state, "riverPumpkin", 1).state;
  state = completeSideQuest(state, "sq-price").state;
  state = completeMainStage(state, 4).state;
  state = changeArea(state, "moonspire", { x: 1180, y: 620 });
  return state;
}

function continueGame() {
  ensureAudio();
  runtime.townMode = false;
  runtime.townSim = null;
  const raw = localStorage.getItem(storageKeys.slot(runtime.activeSlot));
  if (!raw) return openSaveMenu();
  try {
    runtime.state = validateSave(JSON.parse(raw));
    runtime.state.settings = loadSavedSettings(runtime.state.settings);
    applyAudioSettings();
    playSound("uiLoad");
    runtime.messages = [runtime.state.lastMessage || "欢迎回到月铃山谷。"];
    enterArea(runtime.state.location, runtime.state.player);
    showGame();
  } catch (error) {
    showToast(`存档无法读取：${error.message}`);
    openSaveMenu();
  }
}

function showGame() {
  runtime.screen = "game";
  titleScreen.hidden = true;
  gameScreen.hidden = false;
  runtime.paused = false;
  updateUI();
}

function showTitle() {
  runtime.screen = "title";
  runtime.townMode = false;
  runtime.townSim = null;
  titleScreen.hidden = false;
  gameScreen.hidden = true;
  modalLayer.hidden = true;
  startMusic("title");
  updateContinueButton();
}

function enterArea(areaId, spawn = null) {
  const area = areas[areaId];
  runtime.areaRuntime = {
    area,
    enemies: spawnAreaEnemies(area, runtime.state),
    effects: [],
    projectiles: [],
  };
  if (spawn) {
    runtime.state.player.x = spawn.x;
    runtime.state.player.y = spawn.y;
  }
  playSound(area.kind === "interior" ? "door" : "areaShift", { gainScale: 0.65 });
  updateAreaAudio();
  updateUI();
}

function spawnAreaEnemies(area, state) {
  return area.enemies
    .filter((entry) => entry.boss || (state.defeated[entry.type] || 0) < 2)
    .filter((entry) => !(entry.boss && state.defeated[entry.type]))
    .map((entry, index) => {
      const type = enemyTypes[entry.type];
      return {
        id: `${area.id}-${entry.type}-${index}`,
        type: entry.type,
        name: type.name,
        x: entry.x,
        y: entry.y,
        hp: type.hp,
        maxHp: type.hp,
        attackCd: 0,
        flash: 0,
        phase: 0,
      };
    });
}

function frame(now) {
  const dt = Math.min(0.035, (now - lastFrame) / 1000);
  lastFrame = now;
  if (runtime.screen === "game" && runtime.state && !runtime.paused && modalLayer.hidden) {
    updateGame(dt, now);
  }
  draw(now);
  requestAnimationFrame(frame);
}

function updateGame(dt, now) {
  const state = runtime.state;
  const player = state.player;
  state.playSeconds += dt;
  runtime.attackTimer = Math.max(0, runtime.attackTimer - dt);
  runtime.dodgeTimer = Math.max(0, runtime.dodgeTimer - dt);
  runtime.invulnerableTimer = Math.max(0, runtime.invulnerableTimer - dt);
  runtime.shake = Math.max(0, runtime.shake - dt * 8);
  runtime.stepTimer = Math.max(0, runtime.stepTimer - dt);
  if (runtime.townMode) updateAutonomousTown(dt, now);

  const input = getMoveInput();
  const speedBase = runtime.dodgeTimer > 0 ? 245 : state.weather === "雾风" ? 132 : 154;
  const speed = state.settings.difficulty === "轻松" ? speedBase * 1.08 : speedBase;
  if (input.x || input.y) {
    movePlayer(input.x * speed * dt, input.y * speed * dt);
    playFootstep();
  }
  player.stamina = Math.min(100, player.stamina + dt * 18);

  if ((runtime.keys.has(" ") || runtime.keys.has("j")) && runtime.attackTimer <= 0) {
    attack();
  }
  if ((runtime.keys.has("shift") || runtime.keys.has("k")) && runtime.dodgeTimer <= 0 && player.stamina >= 24) {
    dodge(input);
  }
  if (runtime.keys.has("e")) {
    runtime.keys.delete("e");
    interact();
  }

  updateEnemies(dt);
  runtime.interaction = findInteraction();
  updatePrompt();
  if (!runtime.townMode && now - runtime.lastSaveAt > 90_000) saveActive("interval");
}

function getMoveInput() {
  let x = 0;
  let y = 0;
  if (runtime.keys.has("a") || runtime.keys.has("arrowleft")) x -= 1;
  if (runtime.keys.has("d") || runtime.keys.has("arrowright")) x += 1;
  if (runtime.keys.has("w") || runtime.keys.has("arrowup")) y -= 1;
  if (runtime.keys.has("s") || runtime.keys.has("arrowdown")) y += 1;
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function movePlayer(dx, dy) {
  const player = runtime.state.player;
  const area = runtime.areaRuntime.area;
  const nextX = clamp(player.x + dx, 36, area.size.w - 36);
  const nextY = clamp(player.y + dy, 36, area.size.h - 36);
  if (!collides(nextX, player.y)) player.x = nextX;
  if (!collides(player.x, nextY)) player.y = nextY;
}

function collides(x, y) {
  return runtime.areaRuntime.area.colliders.some((rect) => x > rect.x - 24 && x < rect.x + rect.w + 24 && y > rect.y - 24 && y < rect.y + rect.h + 24);
}

function attack() {
  runtime.attackTimer = 0.38;
  runtime.shake = 0.8;
  playSound("attackBell");
  const player = runtime.state.player;
  const attackRadius = runtime.state.upgrades.includes("bellStrike") ? 96 : 72;
  for (const enemy of runtime.areaRuntime.enemies) {
    if (enemy.hp <= 0) continue;
    if (distance(player, enemy) <= attackRadius) {
      enemy.hp -= runtime.state.player.attackLevel;
      enemy.flash = 0.2;
      playSound("hitSpark", { gainScale: 0.82 });
      runtime.areaRuntime.effects.push({ x: enemy.x, y: enemy.y, text: "月铃击", life: 0.45 });
      if (enemy.hp <= 0) {
        runtime.state = defeatEnemy(runtime.state, enemy.type);
        playSound(enemy.type === "night-bell" || enemy.type === "echo-guardian" ? "bossDefeat" : "enemyDefeat");
        runtime.messages.unshift(`击败 ${enemy.name}`);
        if (enemy.type === "night-bell") {
          showToast("夜铃残响倒下了，终响祭坛正在等待你的选择。");
        }
      }
    }
  }
}

function dodge(input) {
  runtime.dodgeTimer = 0.26;
  runtime.invulnerableTimer = 0.55;
  runtime.state.player.stamina -= 24;
  const direction = input.x || input.y ? input : { x: 0, y: 1 };
  movePlayer(direction.x * 64, direction.y * 64);
  playSound("dodge");
}

function updateEnemies(dt) {
  const state = runtime.state;
  const player = state.player;
  const difficultyDamage = state.settings.difficulty === "轻松" ? 0.75 : 1;
  for (const enemy of runtime.areaRuntime.enemies) {
    if (enemy.hp <= 0) continue;
    const type = enemyTypes[enemy.type];
    enemy.flash = Math.max(0, enemy.flash - dt);
    enemy.attackCd = Math.max(0, enemy.attackCd - dt);
    if (enemy.hp <= enemy.maxHp / 2 && type.phases && enemy.phase === 0) {
      enemy.phase = 1;
      playSound("bossPhase", { gainScale: 0.72 });
    }

    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    const weatherSlow = state.weather === "细雨" && type.archetype === "追击" ? 0.75 : 1;
    if (type.speed > 0 && dist < 520) {
      const pace = type.speed * weatherSlow * (enemy.phase ? 1.22 : 1);
      enemy.x += (dx / dist) * pace * dt;
      enemy.y += (dy / dist) * pace * dt;
    }
    if (dist < 48 && enemy.attackCd <= 0) {
      enemy.attackCd = type.phases ? 1.15 : 1.45;
      damagePlayer(Math.ceil(type.damage * difficultyDamage), enemy.name);
    }
  }
  runtime.areaRuntime.effects = runtime.areaRuntime.effects
    .map((effect) => ({ ...effect, life: effect.life - dt, y: effect.y - dt * 18 }))
    .filter((effect) => effect.life > 0);
}

function damagePlayer(amount, source) {
  if (runtime.invulnerableTimer > 0) return;
  runtime.state.player.hp -= amount;
  runtime.invulnerableTimer = 0.8;
  runtime.shake = 1;
  playSound("playerHit");
  runtime.messages.unshift(`${source} 击中了绒火。`);
  if (runtime.state.player.hp <= 0) {
    runtime.state = failAndRetry(runtime.state);
    playSound("retryWake");
    runtime.messages.unshift("绒火从最近的月铃检查点醒来。");
    enterArea(runtime.state.location, runtime.state.player);
    saveActive("retry");
  }
  updateUI();
}

function findInteraction() {
  const state = runtime.state;
  const area = runtime.areaRuntime.area;
  const player = state.player;
  const candidates = [];

  for (const exit of area.exits) {
    candidates.push({ type: "exit", label: exit.label, x: exit.x, y: exit.y, data: exit, priority: 2 });
  }
  for (const item of area.pickups || []) {
    const key = `${area.id}:${item.id}:${item.x}:${item.y}`;
    if (!state.openedPickups[key]) {
      candidates.push({ type: "pickup", label: itemById[item.id].name, x: item.x, y: item.y, data: item, priority: 1 });
    }
  }
  for (const object of area.interactables || []) {
    candidates.push({ type: "object", label: object.label, x: object.x, y: object.y, data: object, priority: 0 });
  }
  for (const npc of npcs) {
    const townAgent = runtime.townMode ? runtime.townSim?.agents.find((agent) => agent.id === npc.id) : null;
    if (runtime.townMode && !townAgent) continue;
    if (townAgent || getNpcArea(npc.id, state) === area.id) {
      const pos = townAgent || npcPosition(npc.id, area);
      candidates.push({ type: "npc", label: npc.name, x: pos.x, y: pos.y, data: npc, priority: 1 });
    }
  }
  return candidates
    .map((candidate) => ({ ...candidate, dist: Math.hypot(candidate.x - player.x, candidate.y - player.y) }))
    .filter((candidate) => candidate.dist < 98)
    .sort((a, b) => a.priority - b.priority || a.dist - b.dist)[0];
}

function interact() {
  const target = runtime.interaction;
  if (!target) return;
  if (target.type === "exit") return interactExit(target.data);
  if (target.type === "pickup") return interactPickup(target.data);
  if (target.type === "npc") return interactNpc(target.data);
  if (target.type === "object") return interactObject(target.data);
}

function interactExit(exit) {
  if (exit.requiresFlag && !runtime.state.flags[exit.requiresFlag]) {
    playSound("uiError");
    return showToast("这条路还没有打开，先推进当前任务。");
  }
  runtime.state = changeArea(runtime.state, exit.to, exit.spawn);
  enterArea(exit.to, exit.spawn);
  saveActive("area-change");
}

function interactPickup(item) {
  const key = `${runtime.areaRuntime.area.id}:${item.id}:${item.x}:${item.y}`;
  const result = addItem(runtime.state, item.id, item.qty || 1);
  runtime.state = result.state;
  if (result.ok) runtime.state.openedPickups[key] = true;
  runtime.messages.unshift(result.ok ? `拾取 ${itemById[item.id].name}` : "背包已满。");
  playSound(result.ok ? "pickup" : "uiError");
  saveActive("pickup");
  updateUI();
}

async function interactNpc(npc) {
  const state = runtime.state;
  const sideQuest = sideQuests.find((quest) => quest.npc === npc.id && !state.completedSideQuests.includes(quest.id));
  const canFinishSide = sideQuest && sideQuest.required.every((itemId) => state.inventory[itemId]);
  if (canFinishSide) {
    const result = completeSideQuest(state, sideQuest.id);
    runtime.state = result.state;
    playSound("questChime");
    runtime.messages.unshift(`${npc.name}：${sideQuest.consequence}`);
    saveActive("sidequest");
    updateUI();
    return;
  }

  const line = getNpcDialogueLine(state, npc.id);
  runtime.messages.unshift(`${npc.name}：${line}`);
  playSound("talk", { gainScale: 0.65 });
  showToast(`${npc.name}：${line}`);
  if (npc.id === "owen") await requestRumor();
  updateUI();
}

function interactObject(object) {
  switch (object.kind) {
    case "quest":
      return interactQuestObject(object);
    case "resource":
      return gatherResource(object);
    case "shop":
      playSound("uiModal");
      return openShop();
    case "rest":
      playSound("uiModal");
      return openCampMenu();
    case "upgrade":
      playSound("uiModal");
      return openUpgradeMenu();
    case "credits":
      playSound("uiModal");
      return openCredits();
    default:
      runtime.messages.unshift(describeLore(object.id));
      playSound("talk", { gainScale: 0.5 });
      showToast(describeLore(object.id));
      updateUI();
  }
}

function interactQuestObject(object) {
  const stage = runtime.state.mainStage;
  let advanced = false;
  if (object.id === "inn-ledger" && stage === 0) {
    runtime.state = addItem(runtime.state, "moonBadge", 1).state;
    runtime.state = completeMainStage(runtime.state, 0).state;
    advanced = true;
    runtime.messages.unshift("你在账本里找回见习铃牌，月铃塔传来第一次轻响。");
  } else if (object.id === "root-bridge" && stage === 1) {
    const result = completeMainStage(runtime.state, 1);
    runtime.state = result.state;
    advanced = result.ok;
    runtime.messages.unshift(result.ok ? "断桥根须被绒火树脂重新点亮。" : result.reason);
  } else if (object.id === "waterwheel" && stage === 2) {
    const result = completeMainStage(runtime.state, 2);
    runtime.state = result.state;
    advanced = result.ok;
    runtime.messages.unshift(result.ok ? "水车重新转动，河岸商路恢复了。" : result.reason);
  } else if (object.id === "echo-altar" && stage === 3) {
    const result = completeMainStage(runtime.state, 3);
    runtime.state = result.state;
    advanced = result.ok;
    runtime.messages.unshift(result.ok ? "三枚星骨符纹同时亮起。" : result.reason);
  } else if (object.id === "council-fire" && stage === 4) {
    const result = completeMainStage(runtime.state, 4);
    runtime.state = result.state;
    advanced = result.ok;
    runtime.messages.unshift(result.ok ? "居民围在篝火旁，把各自的铃声借给了绒火。" : result.reason);
  } else if (object.id === "final-altar" && stage === 5) {
    const gate = canCompleteStage(runtime.state, 5);
    if (!gate.ok) {
      runtime.messages.unshift(gate.reason);
    } else {
      runtime.state = completeMainStage(runtime.state, 5).state;
      runtime.state = finishGame(runtime.state, runtime.state.completedSideQuests.length >= 3 ? "share" : "repair");
      saveActive("ending");
      advanced = true;
      openEnding();
    }
  } else {
    runtime.messages.unshift("这里还没有回应。先查看当前任务。");
  }
  playSound(advanced ? "questChime" : "questFail");
  saveActive("quest");
  updateUI();
}

function gatherResource(object) {
  runtime.state = addItem(runtime.state, object.itemId, object.qty || 1).state;
  playSound("gather");
  if (runtime.state.weather === "细雨" && runtime.state.equipment.rainCharm) {
    runtime.state = addItem(runtime.state, object.itemId, 1).state;
    runtime.messages.unshift("雨结护符让你额外采到一份材料。");
  }
  saveActive("resource");
  updateUI();
}

function openShop() {
  const prices = getShopPrices(runtime.state);
  openModal(
    "米露的小摊",
    `<p>米露把价格牌扶正：月叶草 ${prices.items.moonHerb} 枚铜星，蜜面包 ${prices.items.honeyBread} 枚铜星。关系越好，价格越温柔。</p>
    <div class="choice-row">
      <button data-buy="moonHerb">购买月叶草</button>
      <button data-buy="honeyBread">购买蜜面包</button>
    </div>`,
  );
  modalBody.querySelectorAll("[data-buy]").forEach((button) => {
    button.addEventListener("click", () => {
      const itemId = button.dataset.buy;
      const result = buyShopItem(runtime.state, itemId);
      runtime.state = result.state;
      if (!result.ok) {
        playSound("uiError");
        updateUI();
        return showToast(`${result.reason}。`);
      }
      saveActive("shop");
      updateUI();
      playSound("shopBuy");
      showToast(`买下 ${itemById[itemId].name}`);
    });
  });
}

function openCampMenu() {
  const unlocked = new Set(getUnlockedRecipes(runtime.state).map((recipe) => recipe.id));
  const recipeRows = recipes
    .map((recipe) => {
      const isUnlocked = unlocked.has(recipe.id);
      const ingredients = recipe.ingredients.map((ingredient) => `${itemById[ingredient.id].name} x${ingredient.qty}`).join("、");
      const result = `${itemById[recipe.result.id].name} x${recipe.result.qty}`;
      return `<article class="inventory-row">
        <b>${recipe.title}</b>
        <p>${recipe.note}</p>
        <p class="small">材料：${ingredients}；产物：${result}；开放：主线 ${recipe.unlockStage + 1}/6</p>
        <button data-craft="${recipe.id}" ${isUnlocked ? "" : "disabled"}>${isUnlocked ? "制作" : "尚未开放"}</button>
      </article>`;
    })
    .join("");
  openModal(
    "暖角营地",
    `<p>壁炉可以休息，也能把探索带回来的食材做成便携补给。配方会随主线逐步开放。</p>
    <div class="choice-row"><button id="campRestBtn" class="primary">休息到下一时段</button></div>
    <div class="modal-grid">${recipeRows}</div>`,
  );
  $("#campRestBtn").addEventListener("click", () => {
    runtime.state.player.hp = runtime.state.player.maxHp;
    runtime.state = advanceTime(runtime.state, 1);
    runtime.messages.unshift("在壁炉旁休息了一段时间。");
    playSound("rest");
    saveActive("rest");
    updateUI();
    openCampMenu();
  });
  modalBody.querySelectorAll("[data-craft]").forEach((button) => {
    button.addEventListener("click", () => {
      const result = craftRecipe(runtime.state, button.dataset.craft);
      runtime.state = result.state;
      playSound(result.ok ? "questChime" : "uiError");
      showToast(result.ok ? "料理完成。" : result.reason);
      if (result.ok) runtime.messages.unshift(runtime.state.lastMessage);
      saveActive(result.ok ? "craft" : "craft-failed");
      updateUI();
      openCampMenu();
    });
  });
}

function openUpgradeMenu() {
  openModal(
    "月铁工坊",
    `<p>铁榛检查铃杖。月铁令和绒火树脂可以换来真正改变战斗节奏的升级。</p>
    <div class="modal-grid">
      ${upgrades
        .map(
          (upgrade) => `<article class="inventory-row"><b>${upgrade.title}</b><p>${upgrade.effect}</p><button data-upgrade="${upgrade.id}">确认升级</button></article>`,
        )
        .join("")}
    </div>`,
  );
  modalBody.querySelectorAll("[data-upgrade]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.upgrade;
      const result = upgradeAbility(runtime.state, id);
      runtime.state = result.state;
      if (!result.ok) {
        playSound("uiError");
        updateUI();
        return showToast(`${result.reason}。`);
      }
      saveActive("upgrade");
      updateUI();
      playSound("upgrade");
      showToast("升级完成。");
    });
  });
}

async function requestRumor() {
  const result = await networkGate.run("rumor", () =>
    fetchJsonWithTimeout(
      "/api/rumor",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useLLM: runtime.status.hasLLM, sessionId: runtime.state.saveId, state: runtime.state }),
      },
      { timeoutMs: 1900 },
    ),
  );
  if (!result.ok && result.code === "duplicate") {
    showToast("传闻还在路上，先听完这一句。");
    return;
  }
  if (result.ok) {
    const payload = result.value;
    const rumor = payload.rumor || createLocalRumor(runtime.state);
    runtime.state = applyRumor(runtime.state, rumor);
    playSound("rumor", { gainScale: 0.72 });
    runtime.messages.unshift(`传闻：${rumor.line}`);
    return;
  }
  const rumor = createLocalRumor(runtime.state);
  runtime.state = applyRumor(runtime.state, rumor);
  playSound("rumor", { gainScale: 0.72 });
  runtime.messages.unshift(`传闻：${rumor.line}`);
  showToast(result.message);
}

function describeLore(id) {
  const lines = {
    "bell-plaza": "广场石纹像一只蜷起的尾巴，指向月铃塔。",
    "deer-stone": "鹿形石碑上刻着：修复不是回到过去。",
    "glyph-pillar": "星纹柱记录着三条规则：来源、代价、共鸣。",
    "moon-mural": "壁画显示两种结局：独响可以救急，齐鸣才能长久。",
    "ending-warning": "若居民没有被集结，月铃会响得很轻，但依然会守住山谷。",
  };
  return lines[id] || "这里留下了和月铃有关的痕迹。";
}

function saveActive(reason) {
  if (!runtime.state) return;
  const saved = serializeSave(runtime.state);
  const result = writeSaveToStorage({
    storage: localStorage,
    slotKey: storageKeys.slot,
    activeSlotKey: storageKeys.activeSlot,
    slot: runtime.activeSlot,
    save: saved,
  });
  if (result.ok) {
    runtime.lastSaveAt = performance.now();
    ui.autosaveLabel.textContent = `已保存：${reason}`;
    updateContinueButton();
    return true;
  }
  ui.autosaveLabel.textContent = result.message;
  showToast(result.message);
  return false;
}

function updateContinueButton() {
  ui.continueBtn.disabled = !localStorage.getItem(storageKeys.slot(runtime.activeSlot));
}

function openSaveMenu() {
  playSound("uiModal", { gainScale: 0.6 });
  const rows = [0, 1, 2]
    .map((slot) => {
      const save = readSlot(slot);
      const meta = save
        ? `${save.player.name} · 主线 ${Math.min(save.mainStage + 1, 6)}/6 · ${areas[save.location]?.name || "未知区域"} · ${formatDuration(save.playSeconds)} · ${formatDateTime(save.updatedAt)}`
        : "空槽位";
      return `<article class="save-row">
        <b>槽位 ${slot + 1}</b>
        <p>${escapeHtml(meta)}</p>
        <div class="choice-row">
          <button data-load="${slot}" ${save ? "" : "disabled"}>读取</button>
          <button data-use="${slot}">设为当前</button>
          <button data-export="${slot}" ${save ? "" : "disabled"}>导出</button>
          <button data-delete="${slot}" ${save ? "" : "disabled"}>删除</button>
        </div>
      </article>`;
    })
    .join("");
  openModal(
    "存档管理",
    `<div class="modal-grid">${rows}</div><p class="small">存档保存在本机浏览器 localStorage。关键任务、跨区、拾取、失败重试和结局会自动保存。</p><button id="importSaveBtn">导入存档</button>`,
  );
  modalBody.querySelectorAll("[data-load]").forEach((button) =>
    button.addEventListener("click", () => {
      runtime.activeSlot = Number(button.dataset.load);
      playSound("uiLoad");
      continueGame();
      closeModal();
    }),
  );
  modalBody.querySelectorAll("[data-use]").forEach((button) =>
    button.addEventListener("click", () => {
      runtime.activeSlot = Number(button.dataset.use);
      localStorage.setItem(storageKeys.activeSlot, String(runtime.activeSlot));
      playSound("uiSelect");
      showToast(`当前槽位：${runtime.activeSlot + 1}`);
      closeModal();
      updateContinueButton();
    }),
  );
  modalBody.querySelectorAll("[data-export]").forEach((button) => button.addEventListener("click", () => exportSlot(Number(button.dataset.export))));
  modalBody.querySelectorAll("[data-delete]").forEach((button) =>
    button.addEventListener("click", () => {
      const slot = Number(button.dataset.delete);
      const save = readSlot(slot);
      if (!save) return;
      const confirmed = window.confirm(`删除槽位 ${slot + 1} 的存档？此操作不会影响其他槽位。`);
      if (!confirmed) return;
      localStorage.removeItem(storageKeys.slot(slot));
      openSaveMenu();
      updateContinueButton();
    }),
  );
  $("#importSaveBtn").addEventListener("click", () => importFile.click());
}

function readSlot(slot) {
  try {
    const raw = localStorage.getItem(storageKeys.slot(slot));
    return raw ? validateSave(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function exportSlot(slot) {
  const raw = localStorage.getItem(storageKeys.slot(slot));
  if (!raw) return;
  const blob = new Blob([raw], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `moonbell-slot-${slot + 1}.json`;
  link.click();
  URL.revokeObjectURL(url);
  playSound("uiSave");
}

async function importSaveFile() {
  const file = importFile.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const save = parseImportedSave({ text, size: file.size, type: file.type, name: file.name });
    const write = writeSaveToStorage({
      storage: localStorage,
      slotKey: storageKeys.slot,
      activeSlotKey: storageKeys.activeSlot,
      slot: runtime.activeSlot,
      save,
    });
    if (!write.ok) throw new Error(write.message);
    playSound("uiImport");
    showToast("存档导入成功。");
    openSaveMenu();
  } catch (error) {
    playSound("uiError");
    showToast(`导入失败：${error.message}`);
  } finally {
    importFile.value = "";
  }
}

function openSettings() {
  const settings = loadSavedSettings(runtime.state?.settings || migrateSave({}).settings);
  openModal(
    "设置",
    `<div class="form-row"><label>主音量</label><input id="setVolume" type="range" min="0" max="1" step="0.05" value="${settings.volume}"></div>
    <div class="form-row"><label>音乐</label><input id="setMusicVolume" type="range" min="0" max="1" step="0.05" value="${settings.musicVolume ?? 0.55}"></div>
    <div class="form-row"><label>音效</label><input id="setSfxVolume" type="range" min="0" max="1" step="0.05" value="${settings.sfxVolume ?? 0.85}"></div>
    <div class="form-row"><label>一键静音</label><input id="setMuted" type="checkbox" ${settings.muted ? "checked" : ""}></div>
    <div class="form-row"><label>文字速度</label><input id="setTextSpeed" type="range" min="0.6" max="1.4" step="0.1" value="${settings.textSpeed}"></div>
    <div class="form-row"><label>亮度</label><input id="setBrightness" type="range" min="0.75" max="1.25" step="0.05" value="${settings.brightness}"></div>
    <div class="form-row"><label>屏幕震动</label><input id="setShake" type="checkbox" ${settings.screenShake ? "checked" : ""}></div>
    <div class="form-row"><label>降低动态效果</label><input id="setMotion" type="checkbox" ${settings.reduceMotion ? "checked" : ""}></div>
    <div class="form-row"><label>难度</label><select id="setDifficulty"><option ${settings.difficulty === "标准" ? "selected" : ""}>标准</option><option ${settings.difficulty === "轻松" ? "selected" : ""}>轻松</option></select></div>
    <div class="form-row"><label>文字缩放</label><select id="setFont"><option value="1" ${settings.fontScale === 1 ? "selected" : ""}>标准</option><option value="1.15" ${settings.fontScale > 1 ? "selected" : ""}>较大</option></select></div>
    <button id="fullscreenBtn">尝试全屏</button>`,
  );
  modalBody.querySelectorAll("input,select").forEach((input) => input.addEventListener("input", saveSettingsFromModal));
  $("#fullscreenBtn").addEventListener("click", () => document.documentElement.requestFullscreen?.());
}

function saveSettingsFromModal() {
  const settings = {
    volume: Number($("#setVolume").value),
    musicVolume: Number($("#setMusicVolume").value),
    sfxVolume: Number($("#setSfxVolume").value),
    muted: $("#setMuted").checked,
    textSpeed: Number($("#setTextSpeed").value),
    brightness: Number($("#setBrightness").value),
    screenShake: $("#setShake").checked,
    reduceMotion: $("#setMotion").checked,
    fullscreenHintSeen: true,
    difficulty: $("#setDifficulty").value,
    fontScale: Number($("#setFont").value),
  };
  localStorage.setItem(storageKeys.settings, JSON.stringify(settings));
  if (runtime.state) {
    runtime.state.settings = settings;
    saveActive("settings");
  }
  applyAudioSettings();
  document.documentElement.style.fontSize = `${settings.fontScale * 100}%`;
}

function loadSavedSettings(fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKeys.settings) || "null");
    return saved && typeof saved === "object" ? { ...fallback, ...saved } : fallback;
  } catch {
    return fallback;
  }
}

function openCredits() {
  const commit = runtime.status.buildCommit || "untracked-local";
  const buildDate = runtime.status.buildDate || "local-dev";
  openModal(
    "制作人员与许可",
    `<p><b>${projectIdentity.title}</b> v${VERSION}</p>
    <p>构建日期：${escapeHtml(buildDate)}；提交标识：${escapeHtml(commit)}。</p>
    <p>代码、Canvas 美术、合成音效、角色设定和中文文本均为本项目自制。未引入外部图片、字体、音乐或音效资产。</p>
    <p>可选 DeepSeek 仅用于传闻句式增强；任务判定、战斗、掉落、存档和结局均由本地确定性规则决定。</p>
    <p>主要角色：${npcs.map((npc) => `${npc.name}（${npc.species}）`).join("、")}。</p>`,
  );
}

function openQuestLog() {
  if (!runtime.state) return;
  playSound("uiModal", { gainScale: 0.55 });
  const rows = runtime.state.questLog
    .map((entry) => `<article class="quest-row"><b>${entry.status === "done" ? "已完成" : "进行中"} · ${entry.title}</b><p>${entry.text}</p></article>`)
    .join("");
  const sideRows = sideQuests
    .map((quest) => `<article class="quest-row"><b>${runtime.state.completedSideQuests.includes(quest.id) ? "已完成" : "可选"} · ${quest.title}</b><p>${quest.consequence}</p></article>`)
    .join("");
  openModal("任务日志", `<div class="modal-grid">${rows}${sideRows}</div>`);
}

function openInventory() {
  if (!runtime.state) return;
  playSound("uiModal", { gainScale: 0.55 });
  const rows = Object.entries(runtime.state.inventory)
    .map(([itemId, qty]) => {
      const item = itemById[itemId];
      return `<article class="inventory-row"><b>${item.name} x${qty}</b><p>${item.use}</p><button data-use-item="${itemId}">使用</button></article>`;
    })
    .join("");
  openModal(
    "背包",
    `<p>容量：${inventorySlotsUsed(runtime.state)} / ${runtime.state.player.inventoryCapacity}，铜星：${runtime.state.player.coins}</p><div class="modal-grid">${rows || "<p>背包是空的。</p>"}</div>`,
  );
  modalBody.querySelectorAll("[data-use-item]").forEach((button) =>
    button.addEventListener("click", () => {
      const result = useItem(runtime.state, button.dataset.useItem);
      runtime.state = result.state;
      playSound(result.ok ? "heal" : "uiError");
      showToast(result.ok ? "道具已使用。" : "这个道具现在不能直接使用。");
      saveActive("use-item");
      updateUI();
      openInventory();
    }),
  );
}

function togglePause(paused) {
  runtime.paused = paused;
  if (paused) {
    openModal(
      "暂停",
      `<div class="choice-row">
        <button id="resumeBtn" class="primary">继续</button>
        <button id="pauseSettingsBtn">设置</button>
        <button id="pauseControlsBtn">控制说明</button>
        <button id="pauseSaveBtn">保存</button>
        <button id="returnTitleBtn">返回标题</button>
      </div>`,
    );
    $("#resumeBtn").addEventListener("click", () => {
      runtime.paused = false;
      closeModal();
    });
    $("#pauseSettingsBtn").addEventListener("click", openSettings);
    $("#pauseControlsBtn").addEventListener("click", () => openModal("控制说明", $(".control-grid").outerHTML));
    $("#pauseSaveBtn").addEventListener("click", () => {
      saveActive("manual");
      playSound("uiSave");
      showToast("已手动保存。");
    });
    $("#returnTitleBtn").addEventListener("click", showTitle);
  } else {
    closeModal();
  }
}

function openEnding() {
  const ending = runtime.state.ending;
  startMusic("ending");
  playSound("bellDistant", { gainScale: 0.75 });
  openModal(
    ending.title,
    `<p>${ending.text}</p>
    <p>感谢游玩《绒火与月铃》。你可以返回标题，读取其他存档尝试另一种结局。</p>
    <button id="endingTitleBtn" class="primary">返回标题</button>`,
  );
  $("#endingTitleBtn").addEventListener("click", showTitle);
}

function openModal(title, html) {
  modalTitle.textContent = title;
  modalBody.innerHTML = html;
  modalLayer.hidden = false;
}

function closeModal() {
  if (!modalLayer.hidden) playSound("uiBack", { gainScale: 0.45 });
  modalLayer.hidden = true;
  if (runtime.screen === "game" && modalTitle.textContent === "暂停") runtime.paused = false;
}

function updateUI() {
  if (!runtime.state) return;
  const state = runtime.state;
  const area = areas[state.location];
  const stage = getCurrentStage(state);
  ui.areaKind.textContent = runtime.townMode ? "自主 AI小镇" : area.kind === "main" ? "主要区域" : "室内场景";
  ui.areaName.textContent = runtime.townMode ? `${area.name} · 自主运行` : area.name;
  ui.hpBar.style.width = `${(state.player.hp / state.player.maxHp) * 100}%`;
  ui.staminaBar.style.width = `${state.player.stamina}%`;
  ui.timeLabel.textContent = `第 ${state.time.day} 日 ${getTimeSegment(state)}`;
  ui.weatherLabel.textContent = state.weather;
  ui.autosaveLabel.textContent = runtime.townMode && runtime.townSim ? `自主事件 ${runtime.townSim.episode} / 记忆 ${countTownMemories(state)}` : ui.autosaveLabel.textContent;
  ui.questTitle.textContent = runtime.townMode ? "观察 NPC 自主生活" : stage.title;
  ui.questText.textContent =
    runtime.townMode && runtime.townSim
      ? `3 名角色正在围绕广场、小摊、月铃塔、议事篝火和河岸路牌行动；初始 ${runtime.townSim.startedWithMemories} 条记忆，当前 ${countTownMemories(state)} 条。`
      : stage.goal;
  ui.messageLog.innerHTML = runtime.messages
    .slice(0, 8)
    .map((message) => `<article>${escapeHtml(message)}</article>`)
    .join("");
}

function formatDuration(seconds = 0) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未知时间";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function updatePrompt() {
  if (!runtime.interaction) {
    promptBox.hidden = true;
    return;
  }
  promptBox.hidden = false;
  promptBox.textContent = `E · ${runtime.interaction.label}`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("visible"), 2400);
}

function draw(now) {
  if (runtime.screen === "title") drawPreview(now);
  if (runtime.screen !== "game" || !runtime.state || !runtime.areaRuntime) return;
  drawGame(now);
}

function drawGame(now) {
  const area = runtime.areaRuntime.area;
  const settings = runtime.state.settings;
  const scale = canvas.width / canvas.clientWidth;
  const viewW = canvas.width;
  const viewH = canvas.height;
  const camera = getCamera(viewW, viewH);
  const shakeX = settings.screenShake && !settings.reduceMotion ? (Math.random() - 0.5) * runtime.shake * 8 : 0;
  const shakeY = settings.screenShake && !settings.reduceMotion ? (Math.random() - 0.5) * runtime.shake * 8 : 0;
  ctx.save();
  ctx.clearRect(0, 0, viewW, viewH);
  ctx.translate(Math.round(-camera.x + shakeX), Math.round(-camera.y + shakeY));
  drawArea(area, now);
  drawObjects(area, now);
  drawNpcs(area, now);
  drawEnemies(now);
  drawPlayer(now);
  drawEffects();
  ctx.restore();
  drawVignette(settings.brightness, runtime.state.weather);
  scalePrompt(scale);
}

function getCamera(viewW, viewH) {
  const area = runtime.areaRuntime.area;
  const player = runtime.state.player;
  return {
    x: clamp(player.x - viewW / 2, 0, Math.max(0, area.size.w - viewW)),
    y: clamp(player.y - viewH / 2, 0, Math.max(0, area.size.h - viewH)),
  };
}

function drawArea(area, now) {
  ctx.fillStyle = area.palette.ground;
  ctx.fillRect(0, 0, area.size.w, area.size.h);
  ctx.fillStyle = area.palette.path;
  drawBlob(area.size.w * 0.5, area.size.h * 0.54, area.size.w * 0.36, area.size.h * 0.18, now);
  if (["riverfarm", "bellvale", "emberwood"].includes(area.id)) {
    ctx.fillStyle = area.palette.water;
    ctx.beginPath();
    ctx.moveTo(0, area.size.h * 0.78);
    ctx.bezierCurveTo(area.size.w * 0.25, area.size.h * 0.68, area.size.w * 0.55, area.size.h * 0.86, area.size.w, area.size.h * 0.74);
    ctx.lineTo(area.size.w, area.size.h);
    ctx.lineTo(0, area.size.h);
    ctx.closePath();
    ctx.fill();
  }
  for (const rect of area.colliders) {
    drawBuilding(rect.x, rect.y, rect.w, rect.h, area.palette.accent);
  }
  drawLandmarks(area, now);
}

function drawBlob(x, y, rx, ry, now) {
  ctx.beginPath();
  for (let i = 0; i <= 24; i += 1) {
    const angle = (i / 24) * Math.PI * 2;
    const wobble = 1 + Math.sin(now / 900 + i) * 0.025;
    const px = x + Math.cos(angle) * rx * wobble;
    const py = y + Math.sin(angle) * ry * wobble;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawBuilding(x, y, w, h, accent) {
  ctx.fillStyle = "rgba(52,39,33,0.24)";
  roundRect(ctx, x + 8, y + 14, w, h, 12);
  ctx.fill();
  ctx.fillStyle = "#8f6043";
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(x - 18, y + 22);
  ctx.lineTo(x + w / 2, y - 36);
  ctx.lineTo(x + w + 18, y + 22);
  ctx.closePath();
  ctx.fill();
}

function drawLandmarks(area, now) {
  ctx.save();
  ctx.font = "800 22px Microsoft YaHei UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,248,232,0.86)";
  if (area.id === "bellvale") {
    drawTower(930, 245, now);
    drawSign(690, 730, "小摊");
  } else if (area.id === "emberwood") {
    drawTree(520, 520, 92, "#ff9d55");
    drawSign(1660, 760, runtime.state.flags.bridgeFixed ? "木桥已亮" : "断桥根须");
  } else if (area.id === "riverfarm") {
    drawWaterWheel(780, 510, now);
  } else if (area.id === "starruins") {
    drawRune(940, 640, now);
  } else if (area.id === "moonspire") {
    drawTower(1420, 560, now, true);
  }
  ctx.restore();
}

function drawObjects(area, now) {
  for (const exit of area.exits) drawMarker(exit.x, exit.y, exit.requiresFlag && !runtime.state.flags[exit.requiresFlag] ? "#8c7d75" : "#f1de87", exit.label);
  for (const object of area.interactables) drawMarker(object.x, object.y, area.palette.accent, object.label);
  for (const item of area.pickups || []) {
    const key = `${area.id}:${item.id}:${item.x}:${item.y}`;
    if (!runtime.state.openedPickups[key]) drawPickup(item.x, item.y, itemById[item.id].name, now);
  }
}

function drawNpcs(area, now) {
  if (runtime.townMode && runtime.townSim && area.id === "bellvale") {
    drawTownRoutes();
    for (const agent of runtime.townSim.agents) drawTownAgent(agent, now);
    return;
  }
  for (const npc of npcs) {
    if (getNpcArea(npc.id, runtime.state) !== area.id) continue;
    const pos = npcPosition(npc.id, area);
    drawCharacter(pos.x, pos.y + Math.sin(now / 500 + pos.x) * 3, npc.name, "#6a5a92", "#f1de87", npc.species);
  }
}

function drawTownRoutes() {
  ctx.save();
  ctx.strokeStyle = "rgba(33,31,40,0.16)";
  ctx.setLineDash([8, 10]);
  ctx.lineWidth = 2;
  for (const agent of runtime.townSim.agents) {
    ctx.beginPath();
    ctx.moveTo(agent.x, agent.y);
    ctx.lineTo(agent.target.x, agent.target.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const place of townPlaces) drawMarker(place.x, place.y, "#f1de87", place.label);
  ctx.restore();
}

function drawTownAgent(agent, now) {
  drawCharacter(agent.x, agent.y + Math.sin(now / 480 + agent.x) * 3, agent.npc.name, agent.color, "#f1de87", agent.activity);
  if (agent.bubble) drawSpeechBubble(agent.x, agent.y - 78, agent.bubble);
}

function drawSpeechBubble(x, y, text) {
  ctx.save();
  ctx.font = "800 13px Microsoft YaHei UI, sans-serif";
  ctx.textAlign = "center";
  const width = clamp(ctx.measureText(text).width + 26, 96, 260);
  ctx.fillStyle = "rgba(255,248,232,0.94)";
  ctx.strokeStyle = "rgba(33,31,40,0.2)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, x - width / 2, y - 26, width, 34, 9);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#211f28";
  ctx.fillText(text, x, y - 5);
  ctx.restore();
}

function drawEnemies(now) {
  for (const enemy of runtime.areaRuntime.enemies) {
    if (enemy.hp <= 0) continue;
    const color = enemy.flash > 0 ? "#fff8e8" : enemy.type.includes("night") ? "#3b315e" : enemy.type.includes("echo") ? "#65708f" : "#7b4d45";
    drawCharacter(enemy.x, enemy.y, enemy.name, color, "#ff9d55", enemyTypes[enemy.type].archetype, enemy.hp / enemy.maxHp);
    if (enemy.phase) {
      ctx.strokeStyle = `rgba(241,222,135,${0.35 + Math.sin(now / 160) * 0.2})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, 48, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawPlayer(now) {
  const player = runtime.state.player;
  const palette = playerHero.palettes.find((item) => item.id === player.paletteId) || playerHero.palettes[0];
  drawCharacter(player.x, player.y + Math.sin(now / 220) * 2, player.name, palette.fur, palette.scarf, "守铃者");
  ctx.fillStyle = palette.cloak;
  ctx.beginPath();
  ctx.moveTo(player.x - 16, player.y + 4);
  ctx.lineTo(player.x + 16, player.y + 4);
  ctx.lineTo(player.x, player.y + 34);
  ctx.closePath();
  ctx.fill();
  if (runtime.attackTimer > 0) {
    ctx.strokeStyle = "rgba(241,222,135,0.85)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, runtime.state.upgrades.includes("bellStrike") ? 92 : 68, -0.4, Math.PI * 1.2);
    ctx.stroke();
  }
}

function drawCharacter(x, y, label, body, accent, sublabel, hpRatio = null) {
  ctx.save();
  ctx.fillStyle = "rgba(33,31,40,0.22)";
  ctx.beginPath();
  ctx.ellipse(x, y + 30, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = body;
  roundRect(ctx, x - 16, y - 8, 32, 42, 9);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(x - 11, y + 1, 22, 9);
  ctx.fillStyle = "#f2c6a5";
  ctx.beginPath();
  ctx.arc(x, y - 22, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 34);
  ctx.lineTo(x - 3, y - 52);
  ctx.lineTo(x + 3, y - 32);
  ctx.moveTo(x + 12, y - 34);
  ctx.lineTo(x + 3, y - 52);
  ctx.lineTo(x - 3, y - 32);
  ctx.fill();
  ctx.fillStyle = "#211f28";
  ctx.font = "800 14px Microsoft YaHei UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y + 54);
  ctx.font = "11px Microsoft YaHei UI, sans-serif";
  ctx.fillText(sublabel, x, y + 69);
  if (hpRatio !== null) {
    ctx.fillStyle = "rgba(33,31,40,0.22)";
    roundRect(ctx, x - 25, y - 66, 50, 6, 3);
    ctx.fill();
    ctx.fillStyle = "#c95a3e";
    roundRect(ctx, x - 25, y - 66, 50 * clamp(hpRatio, 0, 1), 6, 3);
    ctx.fill();
  }
  ctx.restore();
}

function drawMarker(x, y, color, label) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,248,232,0.84)";
  ctx.font = "700 13px Microsoft YaHei UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y + 28);
}

function drawPickup(x, y, label, now) {
  ctx.fillStyle = "#f1de87";
  ctx.beginPath();
  ctx.arc(x, y + Math.sin(now / 300) * 4, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#211f28";
  ctx.font = "700 12px Microsoft YaHei UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y + 28);
}

function drawEffects() {
  ctx.font = "800 18px Microsoft YaHei UI, sans-serif";
  ctx.textAlign = "center";
  for (const effect of runtime.areaRuntime.effects) {
    ctx.fillStyle = `rgba(241,222,135,${effect.life / 0.45})`;
    ctx.fillText(effect.text, effect.x, effect.y);
  }
}

function drawTower(x, y, now, final = false) {
  ctx.fillStyle = final ? "#3d4568" : "#7d879a";
  roundRect(ctx, x - 46, y - 120, 92, 210, 10);
  ctx.fill();
  ctx.fillStyle = "#f1de87";
  ctx.beginPath();
  ctx.arc(x, y - 105, 34 + Math.sin(now / 420) * 3, 0, Math.PI * 2);
  ctx.fill();
  drawSign(x, y + 112, final ? "终响祭坛" : "失声月铃塔");
}

function drawTree(x, y, radius, color) {
  ctx.fillStyle = "#6e4c35";
  ctx.fillRect(x - 18, y, 36, 92);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - 15, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawWaterWheel(x, y, now) {
  ctx.strokeStyle = "#7a5132";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(x, y, 58, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i += 1) {
    const angle = now / 1000 + (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * 58, y + Math.sin(angle) * 58);
    ctx.stroke();
  }
  drawSign(x, y + 88, "月露水车");
}

function drawRune(x, y, now) {
  ctx.strokeStyle = `rgba(241,222,135,${0.55 + Math.sin(now / 260) * 0.2})`;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, 62, 0, Math.PI * 2);
  ctx.stroke();
  drawSign(x, y + 86, "回声祭台");
}

function drawSign(x, y, text) {
  ctx.fillStyle = "rgba(255,248,232,0.86)";
  roundRect(ctx, x - 60, y - 16, 120, 30, 8);
  ctx.fill();
  ctx.fillStyle = "#211f28";
  ctx.font = "800 13px Microsoft YaHei UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, x, y + 4);
}

function drawVignette(brightness, weather) {
  ctx.save();
  if (weather === "雾风") {
    ctx.fillStyle = "rgba(225,226,214,0.18)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (weather === "细雨") {
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    for (let i = 0; i < 70; i += 1) {
      const x = (i * 83 + performance.now() / 12) % canvas.width;
      const y = (i * 47 + performance.now() / 7) % canvas.height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 8, y + 14);
      ctx.stroke();
    }
  }
  ctx.fillStyle = `rgba(0,0,0,${clamp(1 - brightness, 0, 0.28)})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawPreview(now) {
  const w = previewCanvas.width;
  const h = previewCanvas.height;
  previewCtx.clearRect(0, 0, w, h);
  previewCtx.fillStyle = "#8ab77f";
  previewCtx.fillRect(0, 0, w, h);
  previewCtx.fillStyle = "#d8c28f";
  previewCtx.beginPath();
  previewCtx.ellipse(w * 0.5, h * 0.58, w * 0.37, h * 0.18, 0, 0, Math.PI * 2);
  previewCtx.fill();
  drawPreviewTower(w * 0.53, h * 0.34, now);
  drawPreviewTree(w * 0.28, h * 0.56, 46);
  drawPreviewHero(w * 0.48, h * 0.63, "绒火", "#c95a3e", "#f2c66d");
  drawPreviewHero(w * 0.6, h * 0.6, "薇萝", "#6a5a92", "#f1de87");
}

function drawPreviewTower(x, y, now) {
  previewCtx.fillStyle = "#7d879a";
  roundRect(previewCtx, x - 28, y - 70, 56, 136, 8);
  previewCtx.fill();
  previewCtx.fillStyle = `rgba(241,222,135,${0.7 + Math.sin(now / 420) * 0.15})`;
  previewCtx.beginPath();
  previewCtx.arc(x, y - 70, 26, 0, Math.PI * 2);
  previewCtx.fill();
}

function drawPreviewTree(x, y, radius) {
  previewCtx.fillStyle = "#6e4c35";
  previewCtx.fillRect(x - 10, y, 20, 58);
  previewCtx.fillStyle = "#ff9d55";
  previewCtx.beginPath();
  previewCtx.arc(x, y - 8, radius, 0, Math.PI * 2);
  previewCtx.fill();
}

function drawPreviewHero(x, y, label, body, accent) {
  previewCtx.fillStyle = "rgba(33,31,40,0.22)";
  previewCtx.beginPath();
  previewCtx.ellipse(x, y + 22, 18, 6, 0, 0, Math.PI * 2);
  previewCtx.fill();
  previewCtx.fillStyle = body;
  roundRect(previewCtx, x - 12, y - 4, 24, 32, 7);
  previewCtx.fill();
  previewCtx.fillStyle = accent;
  previewCtx.fillRect(x - 8, y + 2, 16, 7);
  previewCtx.fillStyle = "#f2c6a5";
  previewCtx.beginPath();
  previewCtx.arc(x, y - 16, 12, 0, Math.PI * 2);
  previewCtx.fill();
  previewCtx.fillStyle = body;
  previewCtx.beginPath();
  previewCtx.moveTo(x - 9, y - 24);
  previewCtx.lineTo(x - 2, y - 38);
  previewCtx.lineTo(x + 2, y - 24);
  previewCtx.moveTo(x + 9, y - 24);
  previewCtx.lineTo(x + 2, y - 38);
  previewCtx.lineTo(x - 2, y - 24);
  previewCtx.fill();
  previewCtx.fillStyle = "#211f28";
  previewCtx.font = "800 13px Microsoft YaHei UI, sans-serif";
  previewCtx.textAlign = "center";
  previewCtx.fillText(label, x, y + 46);
}

function npcPosition(npcId, area) {
  const index = npcs.findIndex((npc) => npc.id === npcId);
  const anchors = area.interactables.concat(area.exits).concat([{ x: area.spawn.x, y: area.spawn.y }]);
  const anchor = anchors[(index + area.id.length) % anchors.length];
  return {
    x: clamp(anchor.x + ((index % 3) - 1) * 72, 80, area.size.w - 80),
    y: clamp(anchor.y + (Math.floor(index / 3) - 1) * 68, 80, area.size.h - 80),
  };
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(800, Math.floor(rect.width * ratio));
  canvas.height = Math.max(500, Math.floor(rect.height * ratio));
}

function scalePrompt() {
  promptBox.style.fontSize = `${runtime.state?.settings.fontScale || 1}rem`;
}

function ensureAudio() {
  if (!runtime.audio) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const context = new AudioCtx();
    const master = context.createGain();
    const music = context.createGain();
    const sfx = context.createGain();
    music.connect(master);
    sfx.connect(master);
    master.connect(context.destination);
    runtime.audio = {
      context,
      master,
      music,
      sfx,
      currentTheme: "",
      musicTimer: null,
      ambienceTimer: null,
      beatIndex: 0,
    };
  }
  runtime.audio.context.resume?.();
  applyAudioSettings();
}

function applyAudioSettings() {
  if (!runtime.audio) return;
  const settings = loadSavedSettings(runtime.state?.settings || migrateSave({}).settings);
  const now = runtime.audio.context.currentTime;
  const masterVolume = settings.muted ? 0 : settings.volume ?? 0.7;
  runtime.audio.master.gain.setTargetAtTime(masterVolume, now, 0.03);
  runtime.audio.music.gain.setTargetAtTime(settings.musicVolume ?? 0.55, now, 0.05);
  runtime.audio.sfx.gain.setTargetAtTime(settings.sfxVolume ?? 0.85, now, 0.02);
}

function updateAreaAudio() {
  if (!runtime.state) return;
  const theme = audioThemes.find((item) => item.areas.includes(runtime.state.location)) || themeById.village;
  startMusic(theme.id);
}

function startMusic(themeId) {
  if (!runtime.audio || !themeById[themeId]) return;
  if (runtime.audio.currentTheme === themeId) return;
  window.clearTimeout(runtime.audio.musicTimer);
  window.clearTimeout(runtime.audio.ambienceTimer);
  runtime.audio.currentTheme = themeId;
  runtime.audio.beatIndex = 0;
  scheduleMusic();
  scheduleAmbience();
}

function scheduleMusic() {
  if (!runtime.audio || !runtime.audio.currentTheme) return;
  const theme = themeById[runtime.audio.currentTheme];
  const beatLength = 60 / theme.bpm;
  const now = runtime.audio.context.currentTime + 0.04;
  const notes = theme.pattern.slice(0, 8);
  notes.forEach((freq, index) => {
    const gain = index % 4 === 0 ? 0.045 : 0.026;
    playTone(freq, beatLength * 0.62, theme.wave, { bus: "music", when: now + index * beatLength, gain });
    if (index % 2 === 0) playTone(freq / 2, beatLength * 0.8, "sine", { bus: "music", when: now + index * beatLength, gain: gain * 0.45 });
  });
  runtime.audio.musicTimer = window.setTimeout(scheduleMusic, Math.max(1000, notes.length * beatLength * 1000));
}

function scheduleAmbience() {
  if (!runtime.audio || !runtime.audio.currentTheme) return;
  const theme = themeById[runtime.audio.currentTheme];
  const layers = new Set(theme.ambientLayers);
  if (runtime.state?.weather === "细雨") layers.add("rainTick");
  if (runtime.state?.weather === "雾风") layers.add("fogWhisper");
  if (getTimeSegment(runtime.state || createNewGame()) === "深夜") layers.add("nightInsect");
  [...layers].slice(0, 3).forEach((id, index) => playSound(id, { gainScale: 0.22, delay: index * 0.18 }));
  runtime.audio.ambienceTimer = window.setTimeout(scheduleAmbience, 3600);
}

function playFootstep() {
  if (runtime.stepTimer > 0) return;
  runtime.stepTimer = runtime.state.settings.reduceMotion ? 0.55 : 0.34;
  const stoneAreas = new Set(["starruins", "moonspire", "inn", "workshop", "towerhall"]);
  playSound(stoneAreas.has(runtime.state.location) ? "footstepStone" : "footstepGrass", { gainScale: 0.38 });
}

function playSound(id, options = {}) {
  if (!runtime.audio || runtime.state?.settings?.muted) return;
  const effect = soundById[id];
  if (!effect) return;
  for (const [freq, duration, type, offset = 0] of effect.tones) {
    playTone(freq, duration, type, {
      bus: "sfx",
      when: runtime.audio.context.currentTime + (options.delay || 0) + offset,
      gain: 0.07 * (options.gainScale ?? 1),
    });
  }
}

function playTone(freq, duration, type, options = {}) {
  if (!runtime.audio) return;
  const context = runtime.audio.context;
  const osc = context.createOscillator();
  const gain = context.createGain();
  const start = options.when || context.currentTime;
  const end = start + duration;
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, options.gain ?? 0.05), start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(gain);
  gain.connect(options.bus === "music" ? runtime.audio.music : runtime.audio.sfx);
  osc.start(start);
  osc.stop(end + 0.02);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
