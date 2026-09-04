import {
  WORLD_SIZE,
  getLocation,
  godEventCatalog,
  locations,
  metricDefinitions,
  relationshipTypes,
  timeSegments,
} from "/shared/civilizationData.js";
import {
  advanceCivilization,
  applyGodEvent,
  createCivilization,
  describeCitizen,
  exportCivilization,
  getCitizenConnections,
  getImportantEvents,
  getRelationshipGraph,
  importCivilization,
  parseGodEventLocal,
  validateGodEventPlan,
} from "/shared/civilizationEngine.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const storageKey = "moonbell.civilization.v1";
const themeKey = "moonbell.civilization.theme";
const DAY_DURATION_MS = 6200;
const relationColorFallback = "#8a9a92";

const ui = {
  app: $("#civilizationApp"),
  loading: $("#loadingScreen"),
  loadingStatus: $("#loadingStatus"),
  canvas: $("#townCanvas"),
  mapStage: $("#mapStage"),
  metricStrip: $("#metricStrip"),
  dateLabel: $("#dateLabel"),
  weatherLabel: $("#weatherLabel"),
  worldStatus: $("#worldStatus"),
  pauseBtn: $("#pauseBtn"),
  pauseIcon: $("#pauseIcon"),
  pauseLabel: $("#pauseLabel"),
  stepBtn: $("#stepBtn"),
  relationshipBtn: $("#relationshipBtn"),
  saveBtn: $("#saveBtn"),
  themeBtn: $("#themeBtn"),
  zoomInBtn: $("#zoomInBtn"),
  zoomOutBtn: $("#zoomOutBtn"),
  centerMapBtn: $("#centerMapBtn"),
  mapHint: $("#mapHint"),
  eventSpotlight: $("#eventSpotlight"),
  activeEffects: $("#activeEffects"),
  storySummary: $("#storySummary"),
  storyTimeline: $("#storyTimeline"),
  storyEmpty: $("#storyEmpty"),
  godEventForm: $("#godEventForm"),
  godEventInput: $("#godEventInput"),
  godEventError: $("#godEventError"),
  interpretEventBtn: $("#interpretEventBtn"),
  citizenDrawer: $("#citizenDrawer"),
  citizenContent: $("#citizenContent"),
  closeCitizenBtn: $("#closeCitizenBtn"),
  followCitizenBtn: $("#followCitizenBtn"),
  eventPreviewDialog: $("#eventPreviewDialog"),
  previewEventTitle: $("#previewEventTitle"),
  previewEventContent: $("#previewEventContent"),
  applyEventBtn: $("#applyEventBtn"),
  relationshipDialog: $("#relationshipDialog"),
  closeRelationshipBtn: $("#closeRelationshipBtn"),
  relationshipGraph: $("#relationshipGraph"),
  saveDialog: $("#saveDialog"),
  closeSaveBtn: $("#closeSaveBtn"),
  downloadSaveBtn: $("#downloadSaveBtn"),
  importSaveBtn: $("#importSaveBtn"),
  newWorldBtn: $("#newWorldBtn"),
  saveFileInput: $("#saveFileInput"),
  toast: $("#toast"),
};

const ctx = ui.canvas.getContext("2d", { alpha: false });
const mapImage = new Image();
const runtime = {
  world: null,
  paused: false,
  speed: 1,
  accumulator: 0,
  previousFrame: performance.now(),
  selectedCitizenId: null,
  followedCitizenId: null,
  selectedEventId: null,
  selectedLocationId: null,
  eventFilter: "important",
  metricFilter: null,
  relationFilter: "all",
  pendingGodPlan: null,
  hasLLM: false,
  visuals: new Map(),
  bubbles: new Map(),
  view: { width: 0, height: 0, dpr: 1 },
  camera: { x: WORLD_SIZE.width / 2, y: WORLD_SIZE.height / 2, zoom: 1, targetX: WORLD_SIZE.width / 2, targetY: WORLD_SIZE.height / 2, targetZoom: 1 },
  pointer: { active: false, id: null, startX: 0, startY: 0, lastX: 0, lastY: 0, moved: false },
  hoverCitizenId: null,
  hoverLocationId: null,
  imageReady: false,
  lastSavedAt: 0,
  toastTimer: null,
  spotlightTimer: null,
};

boot();

async function boot() {
  applyInitialTheme();
  bindEvents();
  ui.loadingStatus.textContent = "正在载入高清城镇地图...";
  await loadMapImage();
  ui.loadingStatus.textContent = "正在恢复居民的记忆与关系...";
  runtime.world = loadWorld() || createCivilization({ seed: new URLSearchParams(location.search).get("seed") || "moonbell-civilization" });
  initializeVisuals();
  await loadServerStatus();
  resizeCanvas();
  renderInterface();
  ui.loading.hidden = true;
  ui.app.hidden = false;
  requestAnimationFrame(frame);
}

function bindEvents() {
  ui.pauseBtn.addEventListener("click", togglePause);
  ui.stepBtn.addEventListener("click", () => advanceOneDay(true));
  $$("[data-speed]").forEach((button) => button.addEventListener("click", () => setSpeed(Number(button.dataset.speed))));
  ui.zoomInBtn.addEventListener("click", () => setCameraZoom(runtime.camera.targetZoom * 1.22));
  ui.zoomOutBtn.addEventListener("click", () => setCameraZoom(runtime.camera.targetZoom / 1.22));
  ui.centerMapBtn.addEventListener("click", centerMap);
  ui.closeCitizenBtn.addEventListener("click", closeCitizenDrawer);
  ui.followCitizenBtn.addEventListener("click", toggleFollowSelected);
  ui.relationshipBtn.addEventListener("click", openRelationshipGraph);
  ui.closeRelationshipBtn.addEventListener("click", () => ui.relationshipDialog.close());
  ui.saveBtn.addEventListener("click", () => ui.saveDialog.showModal());
  ui.closeSaveBtn.addEventListener("click", () => ui.saveDialog.close());
  ui.downloadSaveBtn.addEventListener("click", downloadWorld);
  ui.importSaveBtn.addEventListener("click", () => ui.saveFileInput.click());
  ui.saveFileInput.addEventListener("change", importWorldFile);
  ui.newWorldBtn.addEventListener("click", startNewWorld);
  ui.themeBtn.addEventListener("click", toggleTheme);
  ui.godEventForm.addEventListener("submit", handleGodEventSubmit);
  ui.applyEventBtn.addEventListener("click", applyPendingGodEvent);
  $$("[data-god-event]").forEach((button) => {
    button.addEventListener("click", () => {
      ui.godEventInput.value = button.dataset.godEvent;
      handleGodEventSubmit(new Event("submit"));
    });
  });
  $$("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      runtime.eventFilter = button.dataset.filter;
      runtime.metricFilter = null;
      $$("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
      renderTimeline();
    });
  });
  $$("[data-relation]").forEach((button) => {
    button.addEventListener("click", () => {
      runtime.relationFilter = button.dataset.relation;
      $$("[data-relation]").forEach((item) => item.classList.toggle("active", item === button));
      renderRelationshipGraph();
    });
  });

  ui.canvas.addEventListener("pointerdown", onPointerDown);
  ui.canvas.addEventListener("pointermove", onPointerMove);
  ui.canvas.addEventListener("pointerup", onPointerUp);
  ui.canvas.addEventListener("pointercancel", onPointerUp);
  ui.canvas.addEventListener("dblclick", onCanvasDoubleClick);
  ui.canvas.addEventListener("wheel", onCanvasWheel, { passive: false });
  window.addEventListener("keydown", onKeyDown);
  new ResizeObserver(resizeCanvas).observe(ui.mapStage);
}

function frame(now) {
  const dt = Math.min(48, now - runtime.previousFrame);
  runtime.previousFrame = now;
  if (!runtime.paused && !document.hidden) {
    runtime.accumulator += dt * runtime.speed;
    let steps = 0;
    while (runtime.accumulator >= DAY_DURATION_MS && steps < 4) {
      runtime.accumulator -= DAY_DURATION_MS;
      advanceOneDay(false);
      steps += 1;
    }
  }
  updateCamera(dt);
  updateVisuals(dt);
  drawTown(now);
  requestAnimationFrame(frame);
}

function loadMapImage() {
  return new Promise((resolve) => {
    mapImage.addEventListener("load", () => {
      runtime.imageReady = true;
      resolve();
    }, { once: true });
    mapImage.addEventListener("error", () => {
      runtime.imageReady = false;
      resolve();
    }, { once: true });
    mapImage.src = "/assets/civilization/town-map.png";
  });
}

async function loadServerStatus() {
  try {
    const response = await fetch("/api/status", { headers: { Accept: "application/json" } });
    const status = await response.json();
    runtime.hasLLM = Boolean(status.hasLLM);
  } catch {
    runtime.hasLLM = false;
  }
}

function loadWorld() {
  if (new URLSearchParams(location.search).get("new") === "1") return null;
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? importCivilization(raw) : null;
  } catch {
    return null;
  }
}

function saveWorld(showFeedback = false) {
  try {
    localStorage.setItem(storageKey, exportCivilization(runtime.world));
    runtime.lastSavedAt = Date.now();
    if (showFeedback) showToast("当前世界已经安全保存");
    return true;
  } catch {
    if (showFeedback) showToast("浏览器存储空间不足，请先导出世界存档");
    return false;
  }
}

function initializeVisuals() {
  runtime.visuals.clear();
  Object.values(runtime.world.citizens).forEach((citizen, index) => {
    runtime.visuals.set(citizen.id, {
      x: citizen.x,
      y: citizen.y,
      targetX: citizen.x,
      targetY: citizen.y,
      phase: hashText(citizen.id) % 1000,
      facing: index % 2 ? 1 : -1,
    });
  });
  refreshVisualTargets();
}

function refreshVisualTargets() {
  Object.values(runtime.world.citizens).forEach((citizen) => {
    const visual = runtime.visuals.get(citizen.id);
    if (!visual) return;
    const target = getLocation(citizen.targetLocationId || citizen.locationId);
    const hash = hashText(`${citizen.id}-${runtime.world.day}`);
    const angle = ((hash % 360) * Math.PI) / 180;
    const distance = 20 + (hash % 38);
    visual.targetX = target.x + Math.cos(angle) * distance;
    visual.targetY = target.y + Math.sin(angle) * distance * 0.58;
    visual.facing = visual.targetX >= visual.x ? 1 : -1;
  });
}

function advanceOneDay(manual) {
  const beforeCounter = runtime.world.eventCounter;
  advanceCivilization(runtime.world, 1);
  refreshVisualTargets();
  const newEvents = runtime.world.events.filter((event) => Number(event.id.split("-")[1]) > beforeCounter);
  const featured = [...newEvents].sort((a, b) => b.importance - a.importance)[0];
  if (featured) {
    runtime.bubbles.clear();
    featured.participants.slice(0, 3).forEach((id, index) => runtime.bubbles.set(id, { text: bubbleText(featured, id), expires: performance.now() + 2900 + index * 240 }));
    if (featured.importance >= 4) spotlightEvent(featured);
  }
  saveWorld(false);
  renderInterface();
  if (manual) showToast(`时间推进到第 ${runtime.world.day} 日`);
}

function renderInterface() {
  renderMetrics();
  renderDate();
  renderActiveEffects();
  renderTimeline();
  renderPauseState();
  if (runtime.selectedCitizenId) renderCitizenDrawer();
  ui.worldStatus.textContent = `${runtime.world.population} 名常住人口，30 名具名居民自主生活中${runtime.hasLLM ? "，AI 叙事已连接" : ""}`;
}

function renderMetrics() {
  ui.metricStrip.replaceChildren();
  for (const metric of metricDefinitions) {
    const value = runtime.world.metrics[metric.id];
    const delta = runtime.world.latestChanges?.[metric.id] || 0;
    const good = delta === 0 ? "neutral" : (metric.goodWhen === "down" ? delta < 0 : delta > 0) ? "good" : "bad";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "metric-item";
    button.dataset.metric = metric.id;
    button.title = `筛选影响${metric.label}的事件`;
    button.innerHTML = `<span>${escapeHtml(metric.label)}</span><strong>${formatMetric(metric.id, value)}${metric.unit && metric.id === "population" ? `<small>${metric.unit}</small>` : ""}</strong><i class="metric-delta ${good}">${formatDelta(delta)}</i>`;
    button.addEventListener("click", () => {
      runtime.metricFilter = runtime.metricFilter === metric.id ? null : metric.id;
      runtime.eventFilter = "all";
      $$("[data-filter]").forEach((item) => item.classList.toggle("active", item.dataset.filter === "all"));
      renderTimeline();
    });
    ui.metricStrip.append(button);
  }
}

function renderDate() {
  ui.dateLabel.textContent = `第 ${runtime.world.day} 日 ${timeSegments[runtime.world.segment]}`;
  ui.weatherLabel.textContent = runtime.world.activeEffects.some((effect) => effect.type === "heavy_rain") ? "持续降雨" : runtime.world.day % 4 === 0 ? "薄云" : "月光晴夜";
}

function renderActiveEffects() {
  ui.activeEffects.replaceChildren();
  for (const effect of runtime.world.activeEffects.slice(0, 4)) {
    const row = document.createElement("div");
    row.className = "active-effect";
    row.innerHTML = `<b>${escapeHtml(effect.title)}</b><span>强度 ${effect.intensity}</span><span>剩余 ${effect.remaining} 日</span>`;
    ui.activeEffects.append(row);
  }
}

function renderTimeline() {
  let events = runtime.eventFilter === "important" ? getImportantEvents(runtime.world, 40) : runtime.world.events.slice(0, 60);
  if (runtime.eventFilter === "following") events = events.filter((event) => runtime.followedCitizenId && event.participants.includes(runtime.followedCitizenId));
  if (runtime.metricFilter) events = events.filter((event) => Object.hasOwn(event.effects || {}, runtime.metricFilter));
  ui.storyTimeline.replaceChildren();
  ui.storyEmpty.hidden = events.length > 0;
  ui.storySummary.textContent = runtime.metricFilter
    ? `只看改变“${metricDefinitions.find((item) => item.id === runtime.metricFilter)?.label || "指标"}”的事件`
    : runtime.eventFilter === "following" && runtime.followedCitizenId
      ? `只看${runtime.world.citizens[runtime.followedCitizenId].name}的故事`
      : "重要变化会保留前因、人物和影响";

  for (const event of events) {
    const participants = event.participants.map((id) => runtime.world.citizens[id]?.name).filter(Boolean).join("、");
    const button = document.createElement("button");
    button.type = "button";
    button.className = `story-event${runtime.selectedEventId === event.id ? " selected" : ""}`;
    button.dataset.importance = String(event.importance);
    button.innerHTML = `<span class="event-day"><small>DAY</small><strong>${event.day}</strong></span><span class="event-copy"><strong>${escapeHtml(event.title)}</strong><span>${escapeHtml(event.summary)}</span><small>${escapeHtml(participants || getLocation(event.locationId).name)}</small></span>`;
    button.addEventListener("click", () => selectEvent(event.id));
    ui.storyTimeline.append(button);
  }
}

function selectEvent(eventId) {
  const event = runtime.world.events.find((item) => item.id === eventId);
  if (!event) return;
  runtime.selectedEventId = eventId;
  runtime.selectedLocationId = event.locationId;
  const location = getLocation(event.locationId);
  focusCamera(location.x, location.y, 1.35);
  spotlightEvent(event);
  renderTimeline();
}

function spotlightEvent(event) {
  const causeText = event.causes?.length ? `由 ${event.causes.length} 个先前事件推动。` : "这是这条故事链的起点。";
  ui.eventSpotlight.innerHTML = `<strong>第 ${event.day} 日：${escapeHtml(event.title)}</strong><span>${escapeHtml(event.summary)} ${causeText}</span>`;
  ui.eventSpotlight.hidden = false;
  clearTimeout(runtime.spotlightTimer);
  runtime.spotlightTimer = setTimeout(() => {
    ui.eventSpotlight.hidden = true;
  }, 6800);
}

function openCitizenDrawer(citizenId, focus = false) {
  if (!runtime.world.citizens[citizenId]) return;
  runtime.selectedCitizenId = citizenId;
  ui.mapHint.classList.add("dismissed");
  renderCitizenDrawer();
  ui.citizenDrawer.classList.add("open");
  ui.citizenDrawer.setAttribute("aria-hidden", "false");
  if (focus) {
    const visual = runtime.visuals.get(citizenId);
    if (visual) focusCamera(visual.x, visual.y, 1.65);
  }
}

function closeCitizenDrawer() {
  ui.citizenDrawer.classList.remove("open");
  ui.citizenDrawer.setAttribute("aria-hidden", "true");
}

function renderCitizenDrawer() {
  const citizen = describeCitizen(runtime.world, runtime.selectedCitizenId);
  if (!citizen) return;
  const relations = getCitizenConnections(runtime.world, citizen.id);
  const relationRows = relations.all.slice(0, 7).map((edge) => {
    const relationMeta = relationshipTypes[edge.type] || { label: edge.type, color: relationColorFallback };
    const extra = edge.debt > 0 ? `${edge.debt.toFixed(0)} 币` : edge.type === "enemy" ? `怨恨 ${edge.resentment}` : `信任 ${edge.trust}`;
    return `<button class="relationship-link" type="button" data-citizen-link="${edge.id}"><i class="relation-swatch" style="--relation-color:${relationMeta.color}"></i><span>${escapeHtml(edge.citizen.name)} <small>${escapeHtml(relationMeta.label)}</small></span><small>${escapeHtml(extra)}</small></button>`;
  }).join("");
  const memories = [...citizen.memories].reverse().slice(0, 7).map((memory) => `<article class="memory-entry"><time>第${memory.day}日</time><p>${escapeHtml(memory.text)}</p></article>`).join("");
  const personality = citizen.personalityLabels.map((item) => `<div class="personality-item"><span>${escapeHtml(item.label)}</span><b>${item.value}</b></div>`).join("");

  ui.citizenContent.innerHTML = `
    <section class="citizen-hero">
      <canvas id="portraitCanvas" class="portrait-canvas" width="224" height="256" aria-label="${escapeHtml(citizen.name)}的角色头像"></canvas>
      <div class="citizen-identity">
        <p>${escapeHtml(citizen.species)} / ${escapeHtml(citizen.role)}</p>
        <h2>${escapeHtml(citizen.name)}</h2>
        <span>${escapeHtml(citizen.trait)}</span>
      </div>
    </section>
    <section class="citizen-section">
      <div class="citizen-numbers">
        <div class="citizen-number"><span>财富</span><strong>${Math.round(citizen.cash)} 币</strong></div>
        <div class="citizen-number"><span>债务</span><strong>${Math.round(citizen.debt)} 币</strong></div>
        <div class="citizen-number"><span>心情</span><strong>${Math.round(citizen.mood)}</strong></div>
      </div>
    </section>
    <section class="citizen-section">
      <h3>现在为什么这么做</h3>
      <p><strong>${escapeHtml(citizen.activity)}</strong><br>${escapeHtml(citizen.lastActionReason)}</p>
    </section>
    <section class="citizen-section">
      <h3>长期目标</h3>
      <p>${escapeHtml(citizen.goal)}，当前进展 ${Math.round(citizen.goalProgress)}%。</p>
    </section>
    <section class="citizen-section">
      <h3>个性</h3>
      <div class="personality-grid">${personality}</div>
    </section>
    <section class="citizen-section">
      <h3>关键关系</h3>
      <div class="relationship-list">${relationRows || "<p>暂时没有显著关系。</p>"}</div>
    </section>
    <section class="citizen-section">
      <h3>最近记忆</h3>
      <div class="memory-list">${memories || "<p>还没有形成清晰记忆。</p>"}</div>
    </section>`;

  ui.followCitizenBtn.textContent = runtime.followedCitizenId === citizen.id ? "正在关注" : "关注此人";
  ui.followCitizenBtn.classList.toggle("active", runtime.followedCitizenId === citizen.id);
  ui.citizenContent.querySelectorAll("[data-citizen-link]").forEach((button) => button.addEventListener("click", () => openCitizenDrawer(button.dataset.citizenLink, true)));
  drawPortrait($("#portraitCanvas"), citizen);
}

function toggleFollowSelected() {
  if (!runtime.selectedCitizenId) return;
  runtime.followedCitizenId = runtime.followedCitizenId === runtime.selectedCitizenId ? null : runtime.selectedCitizenId;
  renderCitizenDrawer();
  renderTimeline();
  showToast(runtime.followedCitizenId ? `开始关注${runtime.world.citizens[runtime.followedCitizenId].name}` : "已取消关注");
}

function togglePause() {
  runtime.paused = !runtime.paused;
  renderPauseState();
}

function renderPauseState() {
  ui.pauseIcon.textContent = runtime.paused ? "▶" : "Ⅱ";
  ui.pauseLabel.textContent = runtime.paused ? "继续" : "暂停";
  ui.pauseBtn.setAttribute("aria-label", runtime.paused ? "继续模拟" : "暂停模拟");
  ui.worldStatus.closest("p")?.querySelector(".live-indicator")?.style.setProperty("background", runtime.paused ? "var(--warning)" : "var(--positive)");
}

function setSpeed(speed) {
  runtime.speed = [1, 2, 4, 8].includes(speed) ? speed : 1;
  $$("[data-speed]").forEach((button) => button.classList.toggle("active", Number(button.dataset.speed) === runtime.speed));
  showToast(`模拟速度已设为 ${runtime.speed}x`);
}

async function handleGodEventSubmit(event) {
  event.preventDefault();
  const text = ui.godEventInput.value.trim();
  ui.godEventError.hidden = true;
  if (!text) {
    showGodError("先写下一件希望世界发生的事。");
    return;
  }
  ui.interpretEventBtn.disabled = true;
  ui.interpretEventBtn.textContent = "正在理解...";
  try {
    let plan = parseGodEventLocal(text);
    if (!plan) plan = await requestGodEventPlan(text);
    runtime.pendingGodPlan = validateGodEventPlan(plan);
    showGodEventPreview(runtime.pendingGodPlan);
  } catch (error) {
    showGodError(error.message || "暂时无法理解这件事，请换一种说法。");
  } finally {
    ui.interpretEventBtn.disabled = false;
    ui.interpretEventBtn.textContent = "预览影响";
  }
}

async function requestGodEventPlan(text) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4200);
  try {
    const response = await fetch("/api/civilization/interpret-event", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, day: runtime.world.day, metrics: runtime.world.metrics }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.plan) throw new Error(payload.error || "这件事暂时无法转成城镇规则。");
    return payload.plan;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("理解事件超时了。常用事件仍可离线使用。");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function showGodEventPreview(plan) {
  const preview = previewEffects(plan.type, plan.intensity);
  ui.previewEventTitle.textContent = plan.title;
  ui.previewEventContent.innerHTML = `<p>${escapeHtml(plan.summary)}</p><div class="impact-grid">${metricDefinitions.map((metric) => {
    const value = preview[metric.id] || 0;
    const direction = value > 0 ? "positive" : value < 0 ? "negative" : "";
    return `<div class="impact-item"><span>${escapeHtml(metric.label)}</span><strong class="${direction}">${value > 0 ? "↑" : value < 0 ? "↓" : "≈"}</strong></div>`;
  }).join("")}</div><p>强度 ${plan.intensity}，预计持续 ${plan.duration} 日。施加后，居民会根据性格和关系做出不同反应。</p>`;
  ui.eventPreviewDialog.showModal();
}

function applyPendingGodEvent() {
  if (!runtime.pendingGodPlan) return;
  const title = runtime.pendingGodPlan.title;
  applyGodEvent(runtime.world, runtime.pendingGodPlan);
  runtime.pendingGodPlan = null;
  ui.eventPreviewDialog.close();
  ui.godEventInput.value = "";
  const event = runtime.world.events[0];
  spotlightEvent(event);
  const place = getLocation(event.locationId);
  focusCamera(place.x, place.y, 1.32);
  saveWorld(false);
  renderInterface();
  showToast(`${title}已经进入世界，时间会展示它的后果`);
}

function showGodError(message) {
  ui.godEventError.textContent = message;
  ui.godEventError.hidden = false;
}

function previewEffects(type, intensity) {
  const p = intensity || 2;
  const map = {
    economic_crisis: { population: -p, wealth: -p, crime: p, relationships: -p, politics: -p },
    gold_discovery: { population: p, wealth: p, crime: p, relationships: -p, politics: -p },
    heavy_rain: { population: 0, wealth: -p, crime: p, relationships: p, politics: -p },
    festival: { population: p, wealth: p, crime: -p, relationships: p, politics: p },
    early_election: { population: 0, wealth: 0, crime: 0, relationships: -p, politics: -p },
    merchant_arrival: { population: p, wealth: p, crime: p, relationships: -p, politics: -p },
  };
  return map[type] || {};
}

function openRelationshipGraph() {
  runtime.paused = true;
  renderPauseState();
  ui.relationshipDialog.showModal();
  requestAnimationFrame(renderRelationshipGraph);
}

function renderRelationshipGraph() {
  const graph = getRelationshipGraph(runtime.world, runtime.relationFilter);
  const svg = ui.relationshipGraph;
  const width = 1000;
  const height = 620;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.replaceChildren();
  const nodePositions = new Map();
  graph.nodes.forEach((node, index) => {
    const ring = index < 10 ? 1 : index < 20 ? 2 : 3;
    const ringIndex = ring === 1 ? index : ring === 2 ? index - 10 : index - 20;
    const count = 10;
    const angle = (ringIndex / count) * Math.PI * 2 - Math.PI / 2 + ring * 0.17;
    const radius = ring === 1 ? 128 : ring === 2 ? 218 : 290;
    nodePositions.set(node.id, { x: width / 2 + Math.cos(angle) * radius, y: height / 2 + Math.sin(angle) * radius * 0.76 });
  });

  const maxEdges = runtime.relationFilter === "all" ? 62 : 100;
  graph.edges.slice(0, maxEdges).forEach((edge) => {
    const start = nodePositions.get(edge.firstId);
    const end = nodePositions.get(edge.secondId);
    if (!start || !end) return;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", start.x);
    line.setAttribute("y1", start.y);
    line.setAttribute("x2", end.x);
    line.setAttribute("y2", end.y);
    line.setAttribute("stroke", relationshipTypes[edge.type]?.color || relationColorFallback);
    line.setAttribute("stroke-width", edge.debt > 0 ? "2.6" : edge.type === "enemy" ? "2.1" : "1.5");
    line.setAttribute("class", "graph-edge");
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = `${runtime.world.citizens[edge.firstId].name}与${runtime.world.citizens[edge.secondId].name}：${relationshipTypes[edge.type]?.label || edge.type}${edge.debt ? ` ${edge.debt} 币` : ""}`;
    line.append(title);
    svg.append(line);
  });

  graph.nodes.forEach((node) => {
    const position = nodePositions.get(node.id);
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "graph-node");
    group.setAttribute("transform", `translate(${position.x} ${position.y})`);
    group.setAttribute("tabindex", "0");
    group.setAttribute("role", "button");
    group.setAttribute("aria-label", `查看${node.name}`);
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", runtime.followedCitizenId === node.id ? "18" : "14");
    circle.setAttribute("fill", node.color);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("y", "29");
    text.textContent = node.name;
    group.append(circle, text);
    const open = () => {
      ui.relationshipDialog.close();
      openCitizenDrawer(node.id, true);
    };
    group.addEventListener("click", open);
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") open();
    });
    svg.append(group);
  });
}

function downloadWorld() {
  const blob = new Blob([exportCivilization(runtime.world)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `月铃文明-第${runtime.world.day}日.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("世界存档已经导出");
}

async function importWorldFile() {
  const file = ui.saveFileInput.files?.[0];
  ui.saveFileInput.value = "";
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast("存档超过 2 MB，未进行导入");
    return;
  }
  try {
    const imported = importCivilization(await file.text());
    runtime.world = imported;
    runtime.selectedCitizenId = null;
    runtime.followedCitizenId = null;
    initializeVisuals();
    saveWorld(false);
    ui.saveDialog.close();
    renderInterface();
    centerMap();
    showToast(`已回到第 ${runtime.world.day} 日的世界`);
  } catch (error) {
    showToast(`导入失败：${error.message}`);
  }
}

function startNewWorld() {
  const confirmed = window.confirm("开始新世界会替换浏览器中的自动存档。建议先导出当前世界。是否继续？");
  if (!confirmed) return;
  runtime.world = createCivilization({ seed: `world-${Date.now()}` });
  runtime.selectedCitizenId = null;
  runtime.followedCitizenId = null;
  runtime.selectedEventId = null;
  runtime.metricFilter = null;
  initializeVisuals();
  saveWorld(false);
  ui.saveDialog.close();
  renderInterface();
  centerMap();
  showToast("新的月铃文明已经开始运行");
}

function applyInitialTheme() {
  let theme = "dark";
  try {
    theme = localStorage.getItem(themeKey) || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  } catch {
    theme = "dark";
  }
  document.documentElement.dataset.theme = theme;
}

function toggleTheme() {
  const theme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(themeKey, theme); } catch { /* theme remains active for this session */ }
  renderRelationshipGraphIfOpen();
}

function renderRelationshipGraphIfOpen() {
  if (ui.relationshipDialog.open) renderRelationshipGraph();
}

function resizeCanvas() {
  const rect = ui.mapStage.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  runtime.view.width = rect.width;
  runtime.view.height = rect.height;
  runtime.view.dpr = Math.min(3, window.devicePixelRatio || 1);
  ui.canvas.width = Math.max(1, Math.round(rect.width * runtime.view.dpr));
  ui.canvas.height = Math.max(1, Math.round(rect.height * runtime.view.dpr));
}

function updateCamera(dt) {
  const smooth = 1 - Math.pow(0.001, dt / 1000);
  runtime.camera.x += (runtime.camera.targetX - runtime.camera.x) * smooth;
  runtime.camera.y += (runtime.camera.targetY - runtime.camera.y) * smooth;
  runtime.camera.zoom += (runtime.camera.targetZoom - runtime.camera.zoom) * smooth;
  if (runtime.followedCitizenId) {
    const visual = runtime.visuals.get(runtime.followedCitizenId);
    if (visual) {
      runtime.camera.targetX = visual.x;
      runtime.camera.targetY = visual.y;
      runtime.camera.targetZoom = Math.max(runtime.camera.targetZoom, 1.45);
    }
  }
  clampCamera();
}

function updateVisuals(dt) {
  const rate = 1 - Math.pow(0.12, dt / 1000);
  for (const [id, visual] of runtime.visuals) {
    visual.x += (visual.targetX - visual.x) * rate;
    visual.y += (visual.targetY - visual.y) * rate;
    const citizen = runtime.world.citizens[id];
    citizen.x = visual.x;
    citizen.y = visual.y;
  }
}

function drawTown(now) {
  if (!runtime.view.width || !runtime.world) return;
  const { dpr, width, height } = runtime.view;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0e1714";
  ctx.fillRect(0, 0, width, height);
  const transform = getWorldTransform();
  ctx.save();
  ctx.translate(transform.offsetX, transform.offsetY);
  ctx.scale(transform.scale, transform.scale);
  if (runtime.imageReady) ctx.drawImage(mapImage, 0, 0, WORLD_SIZE.width, WORLD_SIZE.height);
  else drawFallbackMap();
  drawWorldEventEffects(now);
  drawLocationAnchors(transform.scale);
  const citizens = Object.values(runtime.world.citizens).sort((a, b) => runtime.visuals.get(a.id).y - runtime.visuals.get(b.id).y);
  for (const citizen of citizens) drawCitizen(citizen, runtime.visuals.get(citizen.id), now, transform.scale);
  ctx.restore();
}

function getWorldTransform() {
  const fitWidth = runtime.view.width / WORLD_SIZE.width;
  const fitHeight = runtime.view.height / WORLD_SIZE.height;
  const base = runtime.view.width <= 760 ? Math.max(fitWidth, fitHeight) : Math.min(fitWidth, fitHeight);
  const scale = base * runtime.camera.zoom;
  return {
    scale,
    offsetX: runtime.view.width / 2 - runtime.camera.x * scale,
    offsetY: runtime.view.height / 2 - runtime.camera.y * scale,
  };
}

function drawFallbackMap() {
  ctx.fillStyle = "#324f42";
  ctx.fillRect(0, 0, WORLD_SIZE.width, WORLD_SIZE.height);
  ctx.fillStyle = "#4d87a1";
  ctx.fillRect(0, 870, WORLD_SIZE.width, 154);
  ctx.fillStyle = "#b7a77f";
  ctx.beginPath();
  ctx.arc(765, 515, 190, 0, Math.PI * 2);
  ctx.fill();
}

function drawLocationAnchors(scale) {
  if (scale < 0.42) return;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const major = new Set(["council", "mine", "bakery", "market", "plaza", "bank", "police", "inn", "farm", "bridge"]);
  for (const location of locations) {
    if (!major.has(location.id) && scale < 0.76) continue;
    const hovered = runtime.hoverLocationId === location.id || runtime.selectedLocationId === location.id;
    const fontSize = Math.max(12, 12 / Math.max(0.72, scale));
    ctx.font = `800 ${fontSize}px Microsoft YaHei UI, sans-serif`;
    const width = ctx.measureText(location.name).width + 18;
    const y = location.y + 70;
    ctx.fillStyle = hovered ? "rgba(205,95,71,0.92)" : "rgba(12,22,19,0.74)";
    roundedRect(ctx, location.x - width / 2, y - 13, width, 26, 7);
    ctx.fill();
    ctx.fillStyle = "#edf2ee";
    ctx.fillText(location.name, location.x, y + 1);
  }
  ctx.restore();
}

function drawWorldEventEffects(now) {
  for (const effect of runtime.world.activeEffects) {
    const location = getLocation({ economic_crisis: "bank", gold_discovery: "mine", heavy_rain: "bridge", festival: "plaza", early_election: "council", merchant_arrival: "market" }[effect.type] || "plaza");
    const pulse = 1 + Math.sin(now / 360 + effect.id.length) * 0.08;
    ctx.save();
    ctx.strokeStyle = effect.type === "gold_discovery" ? "rgba(239,190,89,0.78)" : "rgba(220,99,75,0.72)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(location.x, location.y, 78 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawCitizen(citizen, visual, now, scale) {
  if (!visual || !citizen.present) return;
  const selected = runtime.selectedCitizenId === citizen.id;
  const followed = runtime.followedCitizenId === citizen.id;
  const highlighted = runtime.world.events.find((event) => event.id === runtime.selectedEventId)?.participants.includes(citizen.id);
  const hovered = runtime.hoverCitizenId === citizen.id;
  const bob = Math.sin(now / 310 + visual.phase) * 2.4;
  const moving = Math.hypot(visual.targetX - visual.x, visual.targetY - visual.y) > 9;
  const stride = moving ? Math.sin(now / 92 + visual.phase) * 2.2 : 0;
  ctx.save();
  ctx.translate(visual.x, visual.y + bob);
  if (visual.facing < 0) ctx.scale(-1, 1);
  if (selected || followed || highlighted) {
    ctx.strokeStyle = followed ? "rgba(234,180,88,0.95)" : "rgba(225,104,79,0.95)";
    ctx.lineWidth = selected ? 5 : 3;
    ctx.beginPath();
    ctx.ellipse(0, 20, selected ? 30 : 25, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawCreature(ctx, citizen, { stride, size: 1, portrait: false });
  ctx.restore();

  const bubble = runtime.bubbles.get(citizen.id);
  if (bubble && bubble.expires > now) drawBubble(visual.x, visual.y - 60, bubble.text, scale);
  else if (bubble) runtime.bubbles.delete(citizen.id);
  if (selected || followed || hovered || scale > 0.88) drawCitizenLabel(citizen, visual.x, visual.y + 39, selected || followed);
}

function drawCitizenLabel(citizen, x, y, emphasized) {
  ctx.save();
  ctx.font = `${emphasized ? 900 : 800} 13px Microsoft YaHei UI, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const label = emphasized ? `${citizen.name} · ${citizen.role}` : citizen.name;
  const width = ctx.measureText(label).width + 14;
  ctx.fillStyle = emphasized ? "rgba(18,27,24,0.94)" : "rgba(18,27,24,0.76)";
  roundedRect(ctx, x - width / 2, y - 11, width, 22, 6);
  ctx.fill();
  ctx.fillStyle = "#edf2ee";
  ctx.fillText(label, x, y);
  ctx.restore();
}

function drawBubble(x, y, text, scale) {
  ctx.save();
  ctx.font = `800 ${Math.max(13, 12 / Math.max(0.72, scale))}px Microsoft YaHei UI, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const clipped = text.length > 14 ? `${text.slice(0, 14)}…` : text;
  const width = Math.min(230, ctx.measureText(clipped).width + 20);
  ctx.fillStyle = "rgba(238,243,239,0.96)";
  ctx.strokeStyle = "rgba(20,31,27,0.48)";
  ctx.lineWidth = 1.5;
  roundedRect(ctx, x - width / 2, y - 14, width, 28, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1a2420";
  ctx.fillText(clipped, x, y + 1);
  ctx.restore();
}

function drawCreature(targetCtx, citizen, options = {}) {
  const { stride = 0, size = 1, portrait = false } = options;
  const fur = citizen.colors.fur;
  const accent = citizen.colors.accent;
  const key = citizen.speciesKey;
  targetCtx.save();
  targetCtx.scale(size, size);
  targetCtx.fillStyle = "rgba(8,15,13,0.34)";
  targetCtx.beginPath();
  targetCtx.ellipse(0, 26, portrait ? 30 : 21, portrait ? 10 : 7, 0, 0, Math.PI * 2);
  targetCtx.fill();
  drawTail(targetCtx, key, fur);
  drawSpeciesBackFeatures(targetCtx, key, fur, accent);
  targetCtx.fillStyle = accent;
  roundedRect(targetCtx, -16, -5, 32, 38, 10);
  targetCtx.fill();
  targetCtx.fillStyle = shadeColor(accent, -24);
  targetCtx.fillRect(-14, 16, 28, 7);
  targetCtx.fillStyle = shadeColor(fur, -16);
  roundedRect(targetCtx, -13, 28 + stride, 10, 8, 3);
  targetCtx.fill();
  roundedRect(targetCtx, 3, 28 - stride, 10, 8, 3);
  targetCtx.fill();
  drawHead(targetCtx, key, fur, accent);
  targetCtx.restore();
}

function drawTail(targetCtx, key, fur) {
  targetCtx.save();
  targetCtx.strokeStyle = fur;
  targetCtx.fillStyle = fur;
  targetCtx.lineCap = "round";
  if (["fox", "fennec", "arcticFox", "wolf", "cat", "panther", "leopard"].includes(key)) {
    targetCtx.lineWidth = key.includes("Fox") || key === "fox" || key === "fennec" ? 13 : 8;
    targetCtx.beginPath();
    targetCtx.moveTo(-10, 18);
    targetCtx.quadraticCurveTo(-33, 8, -27, -13);
    targetCtx.stroke();
  } else if (key === "squirrel") {
    targetCtx.lineWidth = 13;
    targetCtx.beginPath();
    targetCtx.arc(-18, 2, 17, 0.4, Math.PI * 1.9);
    targetCtx.stroke();
  } else if (["beaver", "raccoon", "ferret", "lizard"].includes(key)) {
    targetCtx.lineWidth = key === "beaver" ? 12 : 7;
    targetCtx.beginPath();
    targetCtx.moveTo(-11, 20);
    targetCtx.quadraticCurveTo(-31, 22, -35, 6);
    targetCtx.stroke();
  }
  targetCtx.restore();
}

function drawSpeciesBackFeatures(targetCtx, key, fur, accent) {
  targetCtx.save();
  if (["owl", "crow", "swan"].includes(key)) {
    targetCtx.fillStyle = fur;
    targetCtx.beginPath();
    targetCtx.ellipse(-17, 10, 9, 24, -0.28, 0, Math.PI * 2);
    targetCtx.ellipse(17, 10, 9, 24, 0.28, 0, Math.PI * 2);
    targetCtx.fill();
  }
  if (key === "hedgehog") {
    targetCtx.fillStyle = shadeColor(fur, -22);
    for (let index = 0; index < 7; index += 1) {
      const angle = -2.7 + index * 0.32;
      targetCtx.beginPath();
      targetCtx.moveTo(Math.cos(angle) * 12, Math.sin(angle) * 18 + 6);
      targetCtx.lineTo(Math.cos(angle) * 27, Math.sin(angle) * 29 + 6);
      targetCtx.lineTo(Math.cos(angle + 0.18) * 13, Math.sin(angle + 0.18) * 18 + 6);
      targetCtx.fill();
    }
  }
  if (key === "alpaca") {
    targetCtx.fillStyle = shadeColor(fur, 18);
    for (const [x, y, r] of [[-12, -1, 9], [0, -4, 10], [12, -1, 9], [-7, 10, 10], [8, 10, 10]]) {
      targetCtx.beginPath(); targetCtx.arc(x, y, r, 0, Math.PI * 2); targetCtx.fill();
    }
  }
  targetCtx.restore();
}

function drawHead(targetCtx, key, fur, accent) {
  drawEarsAndHorns(targetCtx, key, fur);
  const wide = ["bear", "bison", "rhino", "boar", "capybara", "seal"].includes(key);
  const tall = ["donkey", "alpaca", "swan"].includes(key);
  targetCtx.fillStyle = fur;
  targetCtx.beginPath();
  targetCtx.ellipse(0, -20, wide ? 20 : 17, tall ? 20 : 17, 0, 0, Math.PI * 2);
  targetCtx.fill();
  drawFaceMarkings(targetCtx, key, fur, accent);
  drawEyesAndMuzzle(targetCtx, key, fur);
}

function drawEarsAndHorns(targetCtx, key, fur) {
  targetCtx.fillStyle = fur;
  targetCtx.strokeStyle = shadeColor(fur, -28);
  targetCtx.lineWidth = 4;
  if (["rabbit"].includes(key)) {
    targetCtx.beginPath(); targetCtx.ellipse(-9, -43, 6, 20, -0.16, 0, Math.PI * 2); targetCtx.ellipse(9, -43, 6, 20, 0.16, 0, Math.PI * 2); targetCtx.fill();
  } else if (["donkey", "fennec"].includes(key)) {
    targetCtx.beginPath(); targetCtx.ellipse(-11, -39, 7, 16, -0.32, 0, Math.PI * 2); targetCtx.ellipse(11, -39, 7, 16, 0.32, 0, Math.PI * 2); targetCtx.fill();
  } else if (["fox", "arcticFox", "wolf", "cat", "panther", "leopard"].includes(key)) {
    triangle(targetCtx, -15, -30, -8, -52, -1, -31); triangle(targetCtx, 1, -31, 8, -52, 15, -30); targetCtx.fill();
  } else if (["mouse", "bear", "badger", "raccoon", "capybara"].includes(key)) {
    targetCtx.beginPath(); targetCtx.arc(-15, -31, 7, 0, Math.PI * 2); targetCtx.arc(15, -31, 7, 0, Math.PI * 2); targetCtx.fill();
  } else if (["deer", "antelope"].includes(key)) {
    targetCtx.beginPath(); targetCtx.moveTo(-9, -34); targetCtx.lineTo(-14, -51); targetCtx.moveTo(-13, -44); targetCtx.lineTo(-23, -49); targetCtx.moveTo(9, -34); targetCtx.lineTo(14, -51); targetCtx.moveTo(13, -44); targetCtx.lineTo(23, -49); targetCtx.stroke();
  } else if (["goat", "bison"].includes(key)) {
    targetCtx.beginPath(); targetCtx.arc(-14, -34, 12, 0.25, Math.PI * 1.2); targetCtx.arc(14, -34, 12, -0.2, Math.PI * 0.75); targetCtx.stroke();
  } else if (key === "boar") {
    targetCtx.fillStyle = "#e4d7b5"; triangle(targetCtx, -18, -14, -27, -6, -17, -4); triangle(targetCtx, 18, -14, 27, -6, 17, -4); targetCtx.fill();
  } else if (key === "rhino") {
    targetCtx.fillStyle = "#d7cda9"; triangle(targetCtx, -5, -36, 0, -56, 5, -36); targetCtx.fill();
  } else if (key === "hedgehog") {
    targetCtx.fillStyle = shadeColor(fur, -24); triangle(targetCtx, -18, -35, -16, -51, -7, -37); triangle(targetCtx, 7, -37, 16, -51, 18, -35); targetCtx.fill();
  }
}

function drawFaceMarkings(targetCtx, key, fur, accent) {
  if (["badger", "raccoon"].includes(key)) {
    targetCtx.fillStyle = shadeColor(fur, -38);
    targetCtx.save(); targetCtx.rotate(-0.18); targetCtx.fillRect(-14, -34, 8, 24); targetCtx.restore();
    targetCtx.save(); targetCtx.rotate(0.18); targetCtx.fillRect(6, -34, 8, 24); targetCtx.restore();
  } else if (key === "leopard") {
    targetCtx.fillStyle = shadeColor(fur, -42);
    for (const [x, y] of [[-11, -29], [12, -27], [-14, -17], [11, -12]]) { targetCtx.beginPath(); targetCtx.arc(x, y, 2.4, 0, Math.PI * 2); targetCtx.fill(); }
  } else if (key === "owl") {
    targetCtx.fillStyle = shadeColor(accent, 20);
    targetCtx.beginPath(); targetCtx.arc(-8, -22, 9, 0, Math.PI * 2); targetCtx.arc(8, -22, 9, 0, Math.PI * 2); targetCtx.fill();
  } else if (["crow", "swan"].includes(key)) {
    targetCtx.fillStyle = accent;
    triangle(targetCtx, -6, -18, 14, -14, -5, -9);
    targetCtx.fill();
  } else if (key === "lizard") {
    targetCtx.fillStyle = shadeColor(fur, 20);
    targetCtx.beginPath(); targetCtx.arc(-10, -24, 4, 0, Math.PI * 2); targetCtx.arc(10, -24, 4, 0, Math.PI * 2); targetCtx.fill();
  }
}

function drawEyesAndMuzzle(targetCtx, key, fur) {
  if (!["crow", "swan"].includes(key)) {
    targetCtx.fillStyle = "#17211f";
    const eyeSize = key === "owl" ? 3.1 : 2.2;
    targetCtx.beginPath(); targetCtx.arc(-6.5, -22, eyeSize, 0, Math.PI * 2); targetCtx.arc(6.5, -22, eyeSize, 0, Math.PI * 2); targetCtx.fill();
  }
  if (!["owl", "crow", "swan", "lizard"].includes(key)) {
    targetCtx.fillStyle = shadeColor(fur, 24);
    targetCtx.beginPath(); targetCtx.ellipse(0, -13, ["boar", "capybara", "beaver", "seal", "rhino"].includes(key) ? 11 : 8, 6, 0, 0, Math.PI * 2); targetCtx.fill();
    targetCtx.fillStyle = "#25302c";
    targetCtx.beginPath(); targetCtx.arc(0, -16, 2.5, 0, Math.PI * 2); targetCtx.fill();
  }
  if (key === "beaver") {
    targetCtx.fillStyle = "#ece8d8";
    targetCtx.fillRect(-4, -10, 3, 6); targetCtx.fillRect(1, -10, 3, 6);
  }
}

function drawPortrait(canvas, citizen) {
  if (!canvas) return;
  const portraitCtx = canvas.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(184, Math.round(rect.width * dpr));
  canvas.height = Math.max(216, Math.round(rect.height * dpr));
  portraitCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  const gradient = portraitCtx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, shadeColor(citizen.colors.accent, -42));
  gradient.addColorStop(1, "#17211f");
  portraitCtx.fillStyle = gradient;
  portraitCtx.fillRect(0, 0, width, height);
  portraitCtx.save();
  portraitCtx.translate(width / 2, height * 0.65);
  drawCreature(portraitCtx, citizen, { size: 1.85, portrait: true });
  portraitCtx.restore();
  portraitCtx.fillStyle = "rgba(237,242,238,0.72)";
  portraitCtx.font = "700 10px Microsoft YaHei UI, sans-serif";
  portraitCtx.textAlign = "center";
  portraitCtx.fillText(citizen.role, width / 2, height - 10);
}

function onPointerDown(event) {
  ui.canvas.setPointerCapture(event.pointerId);
  runtime.pointer = { active: true, id: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: false };
  ui.canvas.classList.add("dragging");
}

function onPointerMove(event) {
  const rect = ui.canvas.getBoundingClientRect();
  const localX = event.clientX - rect.left;
  const localY = event.clientY - rect.top;
  if (runtime.pointer.active && event.pointerId === runtime.pointer.id) {
    const dx = event.clientX - runtime.pointer.lastX;
    const dy = event.clientY - runtime.pointer.lastY;
    if (Math.hypot(event.clientX - runtime.pointer.startX, event.clientY - runtime.pointer.startY) > 5) runtime.pointer.moved = true;
    const transform = getWorldTransform();
    runtime.camera.targetX -= dx / transform.scale;
    runtime.camera.targetY -= dy / transform.scale;
    runtime.camera.x = runtime.camera.targetX;
    runtime.camera.y = runtime.camera.targetY;
    runtime.pointer.lastX = event.clientX;
    runtime.pointer.lastY = event.clientY;
    runtime.followedCitizenId = null;
    clampCamera();
    return;
  }
  const hit = hitTest(localX, localY);
  runtime.hoverCitizenId = hit.citizenId;
  runtime.hoverLocationId = hit.locationId;
  ui.canvas.style.cursor = hit.citizenId || hit.locationId ? "pointer" : "grab";
}

function onPointerUp(event) {
  if (!runtime.pointer.active || event.pointerId !== runtime.pointer.id) return;
  const moved = runtime.pointer.moved;
  runtime.pointer.active = false;
  ui.canvas.classList.remove("dragging");
  if (!moved) {
    const rect = ui.canvas.getBoundingClientRect();
    const hit = hitTest(event.clientX - rect.left, event.clientY - rect.top);
    if (hit.citizenId) openCitizenDrawer(hit.citizenId, false);
    else if (hit.locationId) selectLocation(hit.locationId);
  }
}

function onCanvasDoubleClick(event) {
  const rect = ui.canvas.getBoundingClientRect();
  const hit = hitTest(event.clientX - rect.left, event.clientY - rect.top);
  if (!hit.citizenId) return;
  runtime.followedCitizenId = hit.citizenId;
  openCitizenDrawer(hit.citizenId, true);
  showToast(`镜头开始跟随${runtime.world.citizens[hit.citizenId].name}`);
}

function onCanvasWheel(event) {
  event.preventDefault();
  const factor = event.deltaY < 0 ? 1.12 : 0.9;
  setCameraZoom(runtime.camera.targetZoom * factor);
}

function hitTest(screenX, screenY) {
  const point = screenToWorld(screenX, screenY);
  let citizenId = null;
  let closest = 44 / Math.max(0.8, runtime.camera.zoom);
  for (const [id, visual] of runtime.visuals) {
    const distance = Math.hypot(point.x - visual.x, point.y - visual.y);
    if (distance < closest) {
      closest = distance;
      citizenId = id;
    }
  }
  if (citizenId) return { citizenId, locationId: null };
  const location = locations.map((item) => ({ item, distance: Math.hypot(point.x - item.x, point.y - item.y) })).sort((a, b) => a.distance - b.distance)[0];
  return { citizenId: null, locationId: location?.distance < 82 ? location.item.id : null };
}

function screenToWorld(x, y) {
  const transform = getWorldTransform();
  return { x: (x - transform.offsetX) / transform.scale, y: (y - transform.offsetY) / transform.scale };
}

function selectLocation(locationId) {
  const place = getLocation(locationId);
  runtime.selectedLocationId = locationId;
  focusCamera(place.x, place.y, 1.35);
  const present = Object.values(runtime.world.citizens).filter((citizen) => citizen.targetLocationId === locationId).map((citizen) => citizen.name);
  ui.eventSpotlight.innerHTML = `<strong>${escapeHtml(place.name)}</strong><span>${escapeHtml(place.kind)}。${present.length ? `今天可以在这里找到${present.slice(0, 5).join("、")}。` : "现在暂时没有居民停留。"}</span>`;
  ui.eventSpotlight.hidden = false;
}

function focusCamera(x, y, zoom) {
  runtime.camera.targetX = x;
  runtime.camera.targetY = y;
  runtime.camera.targetZoom = clamp(zoom, 0.82, 2.7);
  clampCamera();
}

function setCameraZoom(zoom) {
  runtime.camera.targetZoom = clamp(zoom, 0.82, 2.7);
  clampCamera();
}

function centerMap() {
  runtime.followedCitizenId = null;
  runtime.selectedLocationId = null;
  runtime.camera.targetX = WORLD_SIZE.width / 2;
  runtime.camera.targetY = WORLD_SIZE.height / 2;
  runtime.camera.targetZoom = 1;
}

function clampCamera() {
  const marginX = WORLD_SIZE.width * 0.32 / runtime.camera.targetZoom;
  const marginY = WORLD_SIZE.height * 0.32 / runtime.camera.targetZoom;
  runtime.camera.targetX = clamp(runtime.camera.targetX, marginX, WORLD_SIZE.width - marginX);
  runtime.camera.targetY = clamp(runtime.camera.targetY, marginY, WORLD_SIZE.height - marginY);
}

function onKeyDown(event) {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  if (event.key === " " && !event.repeat) {
    event.preventDefault();
    togglePause();
  } else if (event.key === ".") {
    advanceOneDay(true);
  } else if (["1", "2", "4", "8"].includes(event.key)) {
    setSpeed(Number(event.key));
  } else if (event.key.toLowerCase() === "f" && runtime.selectedCitizenId) {
    toggleFollowSelected();
  } else if (event.key === "Escape") {
    closeCitizenDrawer();
  }
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add("visible");
  clearTimeout(runtime.toastTimer);
  runtime.toastTimer = setTimeout(() => ui.toast.classList.remove("visible"), 2600);
}

function bubbleText(event, citizenId) {
  const citizen = runtime.world.citizens[citizenId];
  if (event.type === "crime") return citizenId === "rye" ? "别看那只面粉袋..." : "我看见了。";
  if (event.type === "debt") return citizenId === "liuying" ? "合约要按时履行。" : "我会还上的。";
  if (event.type === "election") return citizenId === runtime.world.mayorId ? "我会公开每一笔城库。" : "选举结果已经确定。";
  if (event.type === "god") return "世界突然不一样了。";
  return event.title.replace(`${citizen.name}`, "我");
}

function formatMetric(id, value) {
  if (id === "wealth") {
    if (Math.abs(value) >= 10000) return `${(value / 1000).toFixed(1)}k`;
    return Math.round(value).toLocaleString("zh-CN");
  }
  return Math.round(value).toLocaleString("zh-CN");
}

function formatDelta(value) {
  if (!value) return "持平";
  return `${value > 0 ? "+" : ""}${Math.round(value)}`;
}

function triangle(targetCtx, x1, y1, x2, y2, x3, y3) {
  targetCtx.beginPath();
  targetCtx.moveTo(x1, y1);
  targetCtx.lineTo(x2, y2);
  targetCtx.lineTo(x3, y3);
  targetCtx.closePath();
}

function roundedRect(targetCtx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  targetCtx.beginPath();
  targetCtx.moveTo(x + r, y);
  targetCtx.arcTo(x + width, y, x + width, y + height, r);
  targetCtx.arcTo(x + width, y + height, x, y + height, r);
  targetCtx.arcTo(x, y + height, x, y, r);
  targetCtx.arcTo(x, y, x + width, y, r);
  targetCtx.closePath();
}

function shadeColor(hex, amount) {
  const clean = String(hex).replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(clean)) return hex;
  const number = Number.parseInt(clean, 16);
  const red = clamp((number >> 16) + amount, 0, 255);
  const green = clamp(((number >> 8) & 255) + amount, 0, 255);
  const blue = clamp((number & 255) + amount, 0, 255);
  return `rgb(${red}, ${green}, ${blue})`;
}

function hashText(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
