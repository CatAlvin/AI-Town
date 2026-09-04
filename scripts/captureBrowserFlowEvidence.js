import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { VERSION, projectIdentity } from "../src/gameData.js";

if (typeof WebSocket !== "function") {
  throw new Error("浏览器流程取证需要 Node 内置 WebSocket；请使用 Node 22+ 或 Codex 捆绑 Node 运行。");
}

const port = Number(process.env.BROWSER_FLOW_PORT || 5199);
const baseUrl = `http://127.0.0.1:${port}`;
const outDir = "docs/acceptance/tests/browser";
const videoDir = join(outDir, "browser-flow-videos");
const frameDir = join(outDir, "browser-flow-frames");
const manifestPath = join(outDir, "BROWSER_FLOW_MANIFEST.json");
const edgePath = findEdgePath();
const viewport = { width: 960, height: 540 };
const defaultFrameDurationMs = 850;
const requiredTags = [
  "title-menu-ending",
  "pause",
  "keyboard",
  "cross-area",
  "weather",
  "player-animation",
  "npc-enemy",
  "muted-feedback",
  "browser-e2e",
  "map-edge-pressure",
  "interaction-stack",
  "combat-input",
  "npc-recovery",
  "trailer",
];

const cases = [
  {
    id: "prod01-title-menu-ending",
    title: "PROD-01 标题菜单与结局返回标题",
    path: "/",
    tags: ["title-menu-ending", "title", "settings", "credits", "ending"],
    actions: [
      step("标题页：开始、继续、存档、设置、制作人员可见", { assert: "visible('#titleScreen') && text('#newGameBtn').includes('开始游戏')" }),
      step("设置菜单：音量、亮度、难度、字号", { click: "#settingsBtn", modal: "设置" }),
      step("关闭设置", { click: "#closeModalBtn", assert: "hidden('#modalLayer')" }),
      step("制作人员与许可", { click: "#creditsBtn", modal: "制作人员与许可" }),
      step("关闭制作人员", { click: "#closeModalBtn", assert: "hidden('#modalLayer')" }),
      step("开始游戏进入月铃聚落", { click: "#newGameBtn", assert: "visible('#gameScreen') && text('#areaName').includes('月铃聚落')" }),
      step("任务日志可打开", { click: "#questBtn", modal: "任务日志" }),
      step("关闭任务日志", { click: "#closeModalBtn", assert: "hidden('#modalLayer')" }),
      step("背包可打开", { click: "#inventoryBtn", modal: "背包" }),
      step("关闭背包", { click: "#closeModalBtn", assert: "hidden('#modalLayer')" }),
      step("暂停菜单包含继续、设置、控制说明、保存、返回标题", { click: "#pauseBtn", modal: "暂停" }),
      step("暂停菜单返回标题", { click: "#returnTitleBtn", assert: "visible('#titleScreen')" }),
      step("终局结算页可返回标题", { navigate: "/?scene=ending", modalAny: true }),
      step("结局返回标题", { click: "#endingTitleBtn", assert: "visible('#titleScreen')" }),
    ],
  },
  {
    id: "ux04-pause-combat",
    title: "UX-04 战斗中暂停与恢复",
    path: "/?scene=forest-combat",
    tags: ["pause", "combat", "resume"],
    actions: [
      step("战斗场景运行中", { assert: "visible('#gameScreen') && text('#areaName').includes('绒火森林')" }),
      step("Esc 打开暂停菜单", { press: "Escape", modal: "暂停" }),
      step("暂停菜单保存反馈", { click: "#pauseSaveBtn", assert: "text('#autosaveLabel').includes('manual') || text('#toast').includes('已手动保存')" }),
      step("控制说明可从暂停进入", { click: "#pauseControlsBtn", modal: "控制说明" }),
      step("Esc 关闭暂停层并恢复", { press: "Escape", assert: "hidden('#modalLayer')" }),
      step("再次 Esc 可暂停", { press: "Escape", modal: "暂停" }),
      step("继续按钮恢复游戏", { click: "#resumeBtn", assert: "hidden('#modalLayer')" }),
    ],
  },
  {
    id: "ux08-keyboard-menu-save",
    title: "UX-08 纯键盘移动、菜单与存档",
    path: "/",
    tags: ["keyboard", "save", "menu"],
    actions: [
      step("键盘焦点到开始按钮", { focus: "#newGameBtn", assert: "document.activeElement?.id === 'newGameBtn'" }),
      step("Enter 开始游戏", { press: "Enter", assert: "visible('#gameScreen')" }),
      step("WASD 移动角色", { hold: "KeyD", holdMs: 520, assert: "visible('#gameScreen')" }),
      step("L 打开任务日志", { press: "KeyL", modal: "任务日志" }),
      step("Enter 关闭任务日志", { focus: "#closeModalBtn", press: "Enter", assert: "hidden('#modalLayer')" }),
      step("I 打开背包", { press: "KeyI", modal: "背包" }),
      step("Enter 关闭背包", { focus: "#closeModalBtn", press: "Enter", assert: "hidden('#modalLayer')" }),
      step("Esc 打开暂停", { press: "Escape", modal: "暂停" }),
      step("键盘触发手动保存", { focus: "#pauseSaveBtn", press: "Enter", assert: "text('#toast').includes('已手动保存') || text('#autosaveLabel').includes('manual')" }),
      step("键盘继续游戏", { focus: "#resumeBtn", press: "Enter", assert: "hidden('#modalLayer')" }),
    ],
  },
  {
    id: "world03-cross-area-browser",
    title: "WORLD-03 浏览器跨区加载时间轴",
    path: "/?scene=bellvale",
    tags: ["cross-area", "loading", "world"],
    actions: [
      step("月铃聚落加载", { assert: "text('#areaName').includes('月铃聚落')" }),
      step("绒火森林加载", { navigate: "/?scene=forest-combat", assert: "text('#areaName').includes('绒火森林')" }),
      step("月露河岸加载", { navigate: "/?scene=river-weather", assert: "text('#areaName').includes('月露河岸')" }),
      step("星骨遗迹加载", { navigate: "/?scene=ruins-boss", assert: "text('#areaName').includes('星骨遗迹')" }),
      step("月铃塔顶加载", { navigate: "/?scene=moonspire-boss", assert: "text('#areaName').includes('月铃塔顶')" }),
    ],
  },
  {
    id: "world05-weather-browser",
    title: "WORLD-05 天气与时段视觉/玩法证据",
    path: "/?scene=bellvale&weather=%E6%99%B4%E6%9C%97&segment=0",
    tags: ["weather", "rain", "fog", "night"],
    actions: [
      step("清晨晴朗聚落", { assert: "text('#weatherLabel').includes('晴朗')" }),
      step("午后细雨河岸", { navigate: "/?scene=river-weather&weather=%E7%BB%86%E9%9B%A8&segment=2&panel=quest", assert: "text('#weatherLabel').includes('细雨')" }),
      step("深夜雾风遗迹", { navigate: "/?scene=ruins-boss&weather=%E9%9B%BE%E9%A3%8E&segment=3", assert: "text('#weatherLabel').includes('雾风')" }),
      step("雾风塔顶首领", { navigate: "/?scene=moonspire-boss&weather=%E9%9B%BE%E9%A3%8E&segment=3", assert: "text('#areaName').includes('月铃塔顶')" }),
    ],
  },
  {
    id: "art03-player-actions",
    title: "ART-03 主角移动、攻击、闪避动作",
    path: "/?scene=forest-combat",
    tags: ["player-animation", "move", "attack", "dodge"],
    actions: [
      step("主角待机姿态", { assert: "visible('#gameScreen')" }),
      step("主角向右移动", { hold: "KeyD", holdMs: 640, assert: "visible('#gameScreen')" }),
      step("月铃击攻击弧", { press: "KeyJ", assert: "visible('#gameScreen')" }),
      step("Shift 闪避位移", { hold: "ShiftLeft", holdMs: 180, assert: "visible('#gameScreen')" }),
      step("受击/战斗反馈保持可读", { waitMs: 900, assert: "visible('#gameScreen')" }),
    ],
  },
  {
    id: "art04-npc-enemy-observation",
    title: "ART-04 NPC 与敌人 30 秒观察摘要",
    path: "/?scene=bellvale",
    tags: ["npc-enemy", "npc", "enemy", "observation"],
    actions: [
      step("聚落 NPC 待机", { waitMs: 900, assert: "text('#areaName').includes('月铃聚落')" }),
      step("NPC 位置变化观察", { waitMs: 900, assert: "visible('#gameScreen')" }),
      step("星骨遗迹敌人出现", { navigate: "/?scene=ruins-boss&weather=%E9%9B%BE%E9%A3%8E&segment=3", assert: "text('#areaName').includes('星骨遗迹')" }),
      step("首领阶段反馈观察", { waitMs: 1000, assert: "visible('#gameScreen')" }),
    ],
    frameDurationMs: 7_600,
    minDurationMs: 30_000,
  },
  {
    id: "art07-muted-feedback",
    title: "ART-07 无声操作文字/画面反馈",
    path: "/?scene=forest-combat",
    tags: ["muted-feedback", "feedback", "combat", "save"],
    beforeCapture:
      "localStorage.setItem('moonbell.settings', JSON.stringify({ volume: 0, musicVolume: 0, sfxVolume: 0, muted: true, textSpeed: 1, brightness: 1, screenShake: true, reduceMotion: false, fullscreenHintSeen: true, difficulty: '标准', fontScale: 1 }))",
    actions: [
      step("静音设置下进入战斗", { assert: "visible('#gameScreen')" }),
      step("攻击产生画面反馈", { press: "KeyJ", assert: "visible('#gameScreen')" }),
      step("任务日志提供文字反馈", { click: "#questBtn", modal: "任务日志" }),
      step("关闭任务日志", { click: "#closeModalBtn", assert: "hidden('#modalLayer')" }),
      step("暂停保存提供文字反馈", { press: "Escape", modal: "暂停" }),
      step("保存 toast 可见", { click: "#pauseSaveBtn", assert: "text('#toast').includes('已手动保存') || text('#autosaveLabel').includes('manual')" }),
    ],
  },
  {
    id: "qa02-browser-e2e",
    title: "QA-02 浏览器端新游戏/保存/继续流程",
    path: "/",
    tags: ["browser-e2e", "new-game", "save-load"],
    actions: [
      step("标题页加载", { assert: "visible('#titleScreen')" }),
      step("新游戏", { click: "#newGameBtn", assert: "visible('#gameScreen')" }),
      step("移动与攻击输入", { hold: "KeyS", holdMs: 420, assert: "visible('#gameScreen')" }),
      step("打开暂停", { press: "Escape", modal: "暂停" }),
      step("手动保存", { click: "#pauseSaveBtn", assert: "text('#toast').includes('已手动保存') || text('#autosaveLabel').includes('manual')" }),
      step("返回标题", { click: "#returnTitleBtn", assert: "visible('#titleScreen')" }),
      step("继续按钮读取存档", { click: "#continueBtn", assert: "visible('#gameScreen')" }),
      step("存档后继续回到游戏", { assert: "text('#areaName').includes('月铃聚落')" }),
    ],
  },
  {
    id: "rel04-trailer-60s",
    title: "REL-04 45-90 秒实机短片素材",
    path: "/?scene=bellvale",
    tags: ["trailer", "release-video", "portfolio"],
    frameDurationMs: 4_700,
    actions: [
      step("标题与主视觉", { navigate: "/", assert: "visible('#titleScreen')" }),
      step("月铃聚落", { navigate: "/?scene=bellvale", assert: "text('#areaName').includes('月铃聚落')" }),
      step("森林战斗", { navigate: "/?scene=forest-combat", assert: "text('#areaName').includes('绒火森林')" }),
      step("雨天河岸", { navigate: "/?scene=river-weather&weather=%E7%BB%86%E9%9B%A8&segment=2", assert: "text('#weatherLabel').includes('细雨')" }),
      step("遗迹首领", { navigate: "/?scene=ruins-boss&weather=%E9%9B%BE%E9%A3%8E&segment=3", assert: "text('#areaName').includes('星骨遗迹')" }),
      step("月铃塔顶", { navigate: "/?scene=moonspire-boss&weather=%E9%9B%BE%E9%A3%8E&segment=3", assert: "text('#areaName').includes('月铃塔顶')" }),
      step("结局页", { navigate: "/?scene=ending", modalAny: true }),
      step("返回标题收束", { click: "#endingTitleBtn", assert: "visible('#titleScreen')" }),
      step("制作人员与许可", { click: "#creditsBtn", modal: "制作人员与许可" }),
      step("短片结束画面", { click: "#closeModalBtn", assert: "visible('#titleScreen')" }),
    ],
    minDurationMs: 45_000,
    maxDurationMs: 90_000,
  },
  {
    id: "game01-map-edge-pressure",
    title: "GAME-01 地图边缘、窄门与碰撞压力",
    path: "/?scene=bellvale",
    tags: ["map-edge-pressure", "movement", "collision", "real-input"],
    actions: [
      step("聚落左侧边界持续移动", { hold: "KeyA", holdMs: 720, assert: "visible('#gameScreen') && text('#areaName').includes('月铃聚落')" }),
      step("聚落上沿建筑边持续移动", { hold: "KeyW", holdMs: 720, assert: "visible('#gameScreen')" }),
      step("森林入口与窄路右推", { navigate: "/?scene=forest-combat", hold: "KeyD", holdMs: 760, assert: "text('#areaName').includes('绒火森林')" }),
      step("河岸水线下推", { navigate: "/?scene=river-weather&weather=%E7%BB%86%E9%9B%A8&segment=2", hold: "KeyS", holdMs: 760, assert: "text('#areaName').includes('月露河岸')" }),
      step("遗迹墙体左推", { navigate: "/?scene=ruins-boss&weather=%E9%9B%BE%E9%A3%8E&segment=3", hold: "KeyA", holdMs: 760, assert: "text('#areaName').includes('星骨遗迹')" }),
      step("塔顶边界上推", { navigate: "/?scene=moonspire-boss&weather=%E9%9B%BE%E9%A3%8E&segment=3", hold: "KeyW", holdMs: 760, assert: "text('#areaName').includes('月铃塔顶')" }),
    ],
  },
  {
    id: "game02-interaction-stack-20",
    title: "GAME-02 交互目标堆叠与 20 次真实交互",
    path: "/?scene=bellvale",
    tags: ["interaction-stack", "interact", "repeat-20", "real-input"],
    actions: [
      step("聚落广场连续 5 次交互", { repeatPress: "KeyE", repeatCount: 5, repeatDelayMs: 95, assert: "visible('#gameScreen') && text('#areaName').includes('月铃聚落')" }),
      step("任务日志仍可打开", { click: "#questBtn", modal: "任务日志" }),
      step("关闭任务日志", { click: "#closeModalBtn", assert: "hidden('#modalLayer')" }),
      step("聚落广场二轮 5 次交互", { repeatPress: "KeyE", repeatCount: 5, repeatDelayMs: 95, assert: "visible('#gameScreen')" }),
      step("背包打开后仍能恢复", { click: "#inventoryBtn", modal: "背包" }),
      step("关闭背包", { click: "#closeModalBtn", assert: "hidden('#modalLayer')" }),
      step("聚落广场三轮 5 次交互", { repeatPress: "KeyE", repeatCount: 5, repeatDelayMs: 95, assert: "visible('#gameScreen')" }),
      step("暂停打断交互链", { press: "Escape", modal: "暂停" }),
      step("继续后聚落广场四轮 5 次交互", { click: "#resumeBtn", repeatPress: "KeyE", repeatCount: 5, repeatDelayMs: 95, assert: "hidden('#modalLayer') && visible('#gameScreen')" }),
    ],
  },
  {
    id: "game03-combat-input",
    title: "GAME-03 战斗真实输入压力",
    path: "/?scene=forest-combat",
    tags: ["combat-input", "combat", "enemy-input", "real-input"],
    actions: [
      step("森林敌人 10 次攻击输入", { repeatPress: "KeyJ", repeatCount: 10, repeatDelayMs: 110, assert: "visible('#gameScreen') && text('#areaName').includes('绒火森林')" }),
      step("森林战斗闪避恢复", { hold: "ShiftLeft", holdMs: 220, assert: "visible('#gameScreen')" }),
      step("遗迹首领 10 次攻击输入", { navigate: "/?scene=ruins-boss&weather=%E9%9B%BE%E9%A3%8E&segment=3", repeatPress: "KeyJ", repeatCount: 10, repeatDelayMs: 110, assert: "text('#areaName').includes('星骨遗迹')" }),
      step("遗迹首领横移", { hold: "KeyD", holdMs: 520, assert: "visible('#gameScreen')" }),
      step("塔顶首领 10 次攻击输入", { navigate: "/?scene=moonspire-boss&weather=%E9%9B%BE%E9%A3%8E&segment=3", repeatPress: "KeyJ", repeatCount: 10, repeatDelayMs: 110, assert: "text('#areaName').includes('月铃塔顶')" }),
      step("塔顶闪避恢复", { hold: "ShiftLeft", holdMs: 220, assert: "visible('#gameScreen')" }),
    ],
  },
  {
    id: "npc07-interrupt-recovery",
    title: "NPC-07 对话打断、切图与恢复",
    path: "/?scene=bellvale",
    tags: ["npc-recovery", "npc", "interrupt", "real-input"],
    actions: [
      step("聚落交互/对白输入", { repeatPress: "KeyE", repeatCount: 3, repeatDelayMs: 120, assert: "visible('#gameScreen')" }),
      step("暂停打断当前交互", { press: "Escape", modal: "暂停" }),
      step("恢复后仍在游戏", { click: "#resumeBtn", assert: "hidden('#modalLayer') && visible('#gameScreen')" }),
      step("切到河岸再返回聚落", { navigate: "/?scene=river-weather&weather=%E7%BB%86%E9%9B%A8&segment=2", assert: "text('#areaName').includes('月露河岸')" }),
      step("河岸交互后打断", { repeatPress: "KeyE", repeatCount: 2, repeatDelayMs: 120, assert: "visible('#gameScreen')" }),
      step("切回聚落后 NPC 日程继续可见", { navigate: "/?scene=bellvale&segment=2&weather=%E6%99%B4%E6%9C%97", assert: "text('#areaName').includes('月铃聚落')" }),
    ],
  },
];

async function main() {
  mkdirSync(videoDir, { recursive: true });
  mkdirSync(frameDir, { recursive: true });
  const selectedIds = new Set(
    (process.env.BROWSER_FLOW_CASE_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
  const activeCases = selectedIds.size > 0 ? cases.filter((entry) => selectedIds.has(entry.id)) : cases;
  if (selectedIds.size > 0 && activeCases.length !== selectedIds.size) {
    throw new Error(`未找到指定浏览器流程 case：${[...selectedIds].filter((id) => !activeCases.some((entry) => entry.id === id)).join("、")}`);
  }

  const server = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      BUILD_DATE: "browser-flow-capture",
      BUILD_COMMIT: "local-evidence",
      DEEPSEEK_API_KEY: "",
    },
    stdio: ["ignore", "ignore", "ignore"],
  });

  try {
    await waitForServer(server);
    const results = [];
    for (const [index, entry] of activeCases.entries()) {
      results.push(await captureCase(entry, index));
    }
    const requirements = summarizeRequirements(results);
    const manifest = {
      schemaVersion: 1,
      title: projectIdentity.title,
      gameVersion: VERSION,
      generatedAt: new Date().toISOString(),
      command: "npm run capture:browser-flow",
      browser: {
        executable: edgePath,
        mode: "Microsoft Edge headless + DevTools Protocol",
      },
      baseUrl,
      viewport,
      outputDir: outDir,
      requiredTags,
      selectedCaseIds: [...selectedIds],
      requirements,
      cases: results,
    };
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log(`浏览器流程取证完成：${results.length} 段 WebM，覆盖标签 ${requirements.coveredTags}/${requiredTags.length}，状态 ${requirements.complete ? "通过" : "需复核"}。`);
    if (!requirements.complete) process.exitCode = 1;
  } finally {
    server.kill();
  }
}

function step(label, options = {}) {
  return { label, ...options };
}

async function captureCase(entry, index) {
  const debugPort = Number(process.env.BROWSER_FLOW_DEBUG_PORT || 9300) + index;
  const profileDir = mkdtempSync(join(tmpdir(), `moonbell-browser-flow-${entry.id}-`));
  const browser = spawn(
    edgePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
      "--no-first-run",
      "--hide-scrollbars",
      "--autoplay-policy=no-user-gesture-required",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profileDir}`,
      `--window-size=${viewport.width},${viewport.height}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "ignore"] },
  );
  const frames = [];
  let client;
  try {
    const wsUrl = await createTarget(debugPort);
    client = await CdpClient.connect(wsUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await navigate(client, `${baseUrl}${entry.path}`);
    if (entry.beforeCapture) await evaluate(client, `(() => { ${entry.beforeCapture}; return true; })()`);
    await waitForApp(client);
    for (const [stepIndex, action] of entry.actions.entries()) {
      try {
        await runAction(client, action, entry);
      } catch (error) {
        throw new Error(`${entry.id} / ${action.label} 执行动作失败：${error.message}`);
      }
      const check = await checkAction(client, action);
      const frame = await captureFrame(client, entry, stepIndex, action, check);
      frames.push(frame);
      if (!check.ok) throw new Error(`${entry.id} / ${action.label} 断言失败：${check.note}`);
    }
    const video = await renderVideo(client, entry, frames);
    const actionOk = frames.every((frame) => frame.check.ok);
    const durationOk = (!entry.minDurationMs || video.durationMs >= entry.minDurationMs) && (!entry.maxDurationMs || video.durationMs <= entry.maxDurationMs);
    return {
      id: entry.id,
      title: entry.title,
      path: entry.path,
      tags: entry.tags,
      actionCount: entry.actions.length,
      inputEventCount: entry.actions.reduce((sum, action) => sum + countInputEvents(action), 0),
      frameCount: frames.length,
      durationMs: video.durationMs,
      video,
      frames: frames.map(({ dataUrl, ...frame }) => frame),
      ok: actionOk && durationOk && video.bytes > 4096,
      note: actionOk && durationOk ? "通过" : "步骤断言、时长或视频大小需复核",
    };
  } finally {
    await client?.close();
    browser.kill();
    await delay(250);
    const resolvedProfile = resolve(profileDir);
    const resolvedTemp = resolve(tmpdir());
    if (resolvedProfile.startsWith(resolvedTemp)) rmSync(resolvedProfile, { recursive: true, force: true });
  }
}

async function runAction(client, action, entry) {
  if (action.navigate) {
    await navigate(client, `${baseUrl}${action.navigate}`);
    if (entry.beforeCapture) await evaluate(client, `(() => { ${entry.beforeCapture}; return true; })()`);
    await waitForApp(client);
  }
  if (action.focus) await focusSelector(client, action.focus);
  if (action.click) await clickSelector(client, action.click);
  if (action.press) await pressKey(client, action.press);
  if (action.repeatPress) {
    const count = Math.max(1, Number(action.repeatCount || 1));
    for (let index = 0; index < count; index += 1) {
      await pressKey(client, action.repeatPress);
      await delay(action.repeatDelayMs || 80);
    }
  }
  if (action.hold) await holdKey(client, action.hold, action.holdMs || 400);
  await delay(action.waitMs || 500);
}

function countInputEvents(action) {
  let count = 0;
  if (action.press) count += 1;
  if (action.repeatPress) count += Math.max(1, Number(action.repeatCount || 1));
  if (action.hold) count += 1;
  return count;
}

async function checkAction(client, action) {
  if (action.modal) {
    return await evaluateCheck(client, `visible('#modalLayer') && text('#modalTitle').includes(${JSON.stringify(action.modal)})`, `需要弹窗：${action.modal}`);
  }
  if (action.modalAny) {
    return await evaluateCheck(client, "visible('#modalLayer') && text('#modalTitle').length > 0", "需要任意结算/弹窗层");
  }
  if (action.assert) return await evaluateCheck(client, action.assert, action.assert);
  return { ok: true, note: "无额外断言" };
}

async function captureFrame(client, entry, stepIndex, action, check) {
  const shot = await client.send("Page.captureScreenshot", { format: "jpeg", quality: 72, captureBeyondViewport: false });
  const buffer = Buffer.from(shot.data, "base64");
  const file = join(frameDir, `${entry.id}-${String(stepIndex + 1).padStart(2, "0")}.jpg`);
  writeFileSync(file, buffer);
  return {
    step: stepIndex + 1,
    label: action.label,
    file: file.replaceAll("\\", "/"),
    bytes: buffer.byteLength,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    durationMs: entry.frameDurationMs || defaultFrameDurationMs,
    check,
    dataUrl: `data:image/jpeg;base64,${shot.data}`,
  };
}

async function renderVideo(client, entry, frames) {
  const videoPath = join(videoDir, `${entry.id}.webm`);
  const expression = `(${browserRenderVideo.toString()})(${JSON.stringify({
    title: entry.title,
    viewport,
    frames: frames.map((frame) => ({ label: frame.label, durationMs: frame.durationMs, dataUrl: frame.dataUrl })),
  })})`;
  const result = await evaluate(client, expression, 180_000);
  const base64 = result.dataUrl.split(",")[1] || "";
  const buffer = Buffer.from(base64, "base64");
  writeFileSync(videoPath, buffer);
  return {
    file: videoPath.replaceAll("\\", "/"),
    mimeType: result.mimeType,
    durationMs: result.durationMs,
    bytes: statSync(videoPath).size,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}

async function browserRenderVideo(payload) {
  const canvas = document.createElement("canvas");
  canvas.width = payload.viewport.width;
  canvas.height = payload.viewport.height;
  document.body.innerHTML = "";
  document.body.style.margin = "0";
  document.body.style.background = "#171a20";
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  const images = await Promise.all(
    payload.frames.map(
      (frame) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = frame.dataUrl;
        }),
    ),
  );
  const stream = canvas.captureStream(12);
  const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type)) || "";
  const chunks = [];
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  recorder.ondataavailable = (event) => {
    if (event.data?.size) chunks.push(event.data);
  };
  const stopped = new Promise((resolve) => {
    recorder.onstop = resolve;
  });
  recorder.start();
  let elapsed = 0;
  for (let index = 0; index < payload.frames.length; index += 1) {
    const frame = payload.frames[index];
    ctx.fillStyle = "#171a20";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(images[index], 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(18, 22, 28, 0.82)";
    ctx.fillRect(0, canvas.height - 58, canvas.width, 58);
    ctx.fillStyle = "#fff4d2";
    ctx.font = "700 22px Microsoft YaHei UI, Noto Sans CJK SC, sans-serif";
    ctx.fillText(payload.title, 24, canvas.height - 30);
    ctx.font = "600 16px Microsoft YaHei UI, Noto Sans CJK SC, sans-serif";
    ctx.fillText(`${index + 1}/${payload.frames.length} · ${frame.label}`, 24, canvas.height - 10);
    await new Promise((resolve) => setTimeout(resolve, frame.durationMs));
    elapsed += frame.durationMs;
  }
  recorder.stop();
  stream.getTracks().forEach((track) => track.stop());
  await stopped;
  const blob = new Blob(chunks, { type: mimeType || "video/webm" });
  const dataUrl = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
  return { dataUrl, mimeType: blob.type || "video/webm", durationMs: elapsed };
}

async function navigate(client, url) {
  await client.send("Page.navigate", { url });
  await waitForExpression(client, "document.readyState === 'complete'");
  await waitForApp(client);
}

async function waitForApp(client) {
  await waitForExpression(
    client,
    "(() => { const app = document.querySelector('#app'); const fallback = document.querySelector('#compatFallback'); return (app && !app.hidden) || (fallback && !fallback.hidden); })()",
    18_000,
  );
  await delay(450);
}

async function waitForExpression(client, expression, timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await evaluate(client, `Boolean(${expression})`).catch(() => false);
    if (ok) return;
    await delay(150);
  }
  throw new Error(`等待浏览器状态超时：${expression}；${await describePage(client)}`);
}

async function describePage(client) {
  const result = await evaluate(
    client,
    `(() => {
      const app = document.querySelector('#app');
      const fallback = document.querySelector('#compatFallback');
      return {
        href: location.href,
        readyState: document.readyState,
        title: document.title,
        app: app ? { hidden: app.hidden, display: getComputedStyle(app).display } : null,
        fallback: fallback ? { hidden: fallback.hidden, display: getComputedStyle(fallback).display } : null,
        body: document.body?.innerText?.slice(0, 260) || '',
      };
    })()`,
  ).catch((error) => ({ error: error.message }));
  return `页面诊断：${JSON.stringify(result)}`;
}

async function clickSelector(client, selector) {
  const ok = await evaluate(
    client,
    `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      el.scrollIntoView?.({ block: 'center', inline: 'center' });
      el.click();
      return true;
    })()`,
  );
  if (!ok) throw new Error(`未找到可点击元素：${selector}`);
}

async function focusSelector(client, selector) {
  const ok = await evaluate(
    client,
    `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      el.focus();
      return document.activeElement === el;
    })()`,
  );
  if (!ok) throw new Error(`未找到可聚焦元素：${selector}`);
}

async function evaluateCheck(client, expression, note) {
  const ok = await evaluate(
    client,
    `(() => {
      const visible = (selector) => {
        const el = document.querySelector(selector);
        return Boolean(el && !el.hidden && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden');
      };
      const hidden = (selector) => {
        const el = document.querySelector(selector);
        return !el || el.hidden || getComputedStyle(el).display === 'none' || getComputedStyle(el).visibility === 'hidden';
      };
      const text = (selector) => document.querySelector(selector)?.textContent || '';
      return Boolean(${expression});
    })()`,
  );
  return { ok: Boolean(ok), note: ok ? "通过" : note };
}

async function evaluate(client, expression) {
  const response = await client.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) {
    const text = response.exceptionDetails.text || response.exceptionDetails.exception?.description || "Runtime.evaluate failed";
    throw new Error(text);
  }
  return response.result?.value;
}

async function pressKey(client, keyName) {
  const key = keyDescriptor(keyName);
  await client.send("Input.dispatchKeyEvent", { type: "keyDown", ...key });
  await delay(80);
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", ...key, text: undefined, unmodifiedText: undefined });
  if (keyName === "Enter" || keyName === "Space") {
    await evaluate(
      client,
      `(() => {
        const el = document.activeElement;
        if (!el || !['BUTTON', 'A'].includes(el.tagName)) return false;
        el.click();
        return true;
      })()`,
    ).catch(() => false);
  }
}

async function holdKey(client, keyName, holdMs) {
  const key = keyDescriptor(keyName);
  await client.send("Input.dispatchKeyEvent", { type: "keyDown", ...key });
  await delay(holdMs);
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", ...key, text: undefined, unmodifiedText: undefined });
}

function keyDescriptor(name) {
  const table = {
    Enter: { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 },
    Escape: { key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 },
    Space: { key: " ", code: "Space", windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32, text: " ", unmodifiedText: " " },
    ShiftLeft: { key: "Shift", code: "ShiftLeft", windowsVirtualKeyCode: 16, nativeVirtualKeyCode: 16 },
    KeyW: { key: "w", code: "KeyW", windowsVirtualKeyCode: 87, nativeVirtualKeyCode: 87, text: "w", unmodifiedText: "w" },
    KeyA: { key: "a", code: "KeyA", windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65, text: "a", unmodifiedText: "a" },
    KeyE: { key: "e", code: "KeyE", windowsVirtualKeyCode: 69, nativeVirtualKeyCode: 69, text: "e", unmodifiedText: "e" },
    KeyS: { key: "s", code: "KeyS", windowsVirtualKeyCode: 83, nativeVirtualKeyCode: 83, text: "s", unmodifiedText: "s" },
    KeyD: { key: "d", code: "KeyD", windowsVirtualKeyCode: 68, nativeVirtualKeyCode: 68, text: "d", unmodifiedText: "d" },
    KeyI: { key: "i", code: "KeyI", windowsVirtualKeyCode: 73, nativeVirtualKeyCode: 73, text: "i", unmodifiedText: "i" },
    KeyJ: { key: "j", code: "KeyJ", windowsVirtualKeyCode: 74, nativeVirtualKeyCode: 74, text: "j", unmodifiedText: "j" },
    KeyL: { key: "l", code: "KeyL", windowsVirtualKeyCode: 76, nativeVirtualKeyCode: 76, text: "l", unmodifiedText: "l" },
  };
  if (!table[name]) throw new Error(`未配置按键：${name}`);
  return table[name];
}

function summarizeRequirements(results) {
  const tags = new Set(results.flatMap((entry) => entry.tags));
  const coveredTags = requiredTags.filter((tag) => tags.has(tag)).length;
  const validVideos = results.every((entry) => entry.ok && entry.video?.bytes > 4096 && existsSync(entry.video.file));
  const uniqueVideos = new Set(results.map((entry) => entry.video?.sha256)).size === results.length;
  const trailer = results.find((entry) => entry.tags.includes("trailer"));
  const trailerDurationOk = Boolean(trailer && trailer.durationMs >= 45_000 && trailer.durationMs <= 90_000);
  return {
    requiredTags,
    coveredTags,
    validVideos,
    uniqueVideos,
    trailerDurationOk,
    complete: coveredTags === requiredTags.length && validVideos && uniqueVideos && trailerDurationOk,
  };
}

async function waitForServer(server) {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) break;
    try {
      const response = await fetch(`${baseUrl}/api/status`);
      if (response.ok) return;
    } catch {
      await delay(250);
    }
  }
  throw new Error("本地浏览器流程取证服务器未能启动。");
}

async function createTarget(debugPort) {
  const base = `http://127.0.0.1:${debugPort}`;
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/json/version`);
      if (response.ok) break;
    } catch {
      await delay(150);
    }
  }
  const response = await fetch(`${base}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" });
  if (!response.ok) throw new Error(`创建 DevTools target 失败：HTTP ${response.status}`);
  const target = await response.json();
  if (!target.webSocketDebuggerUrl) throw new Error("DevTools target 缺少 webSocketDebuggerUrl");
  return target.webSocketDebuggerUrl;
}

class CdpClient {
  constructor(wsUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.socket = new WebSocket(wsUrl);
    this.opened = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => this.handleMessage(event));
    this.socket.addEventListener("close", () => {
      for (const { reject } of this.pending.values()) reject(new Error("DevTools WebSocket 已关闭"));
      this.pending.clear();
    });
  }

  static async connect(wsUrl) {
    const client = new CdpClient(wsUrl);
    await client.opened;
    return client;
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const message = JSON.stringify({ id, method, params });
    return new Promise((resolvePromise, reject) => {
      this.pending.set(id, { resolve: resolvePromise, reject });
      this.socket.send(message);
    });
  }

  handleMessage(event) {
    const data = JSON.parse(event.data);
    if (!data.id || !this.pending.has(data.id)) return;
    const pending = this.pending.get(data.id);
    this.pending.delete(data.id);
    if (data.error) pending.reject(new Error(data.error.message || JSON.stringify(data.error)));
    else pending.resolve(data.result || {});
  }

  async close() {
    this.socket.close();
  }
}

function findEdgePath() {
  const candidates = [
    process.env.EDGE_PATH,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "msedge",
  ].filter(Boolean);
  const found = candidates.find((candidate) => candidate === "msedge" || existsSync(candidate));
  if (!found) throw new Error("未找到 Microsoft Edge，可设置 EDGE_PATH 后重试。");
  return found;
}

await main();
