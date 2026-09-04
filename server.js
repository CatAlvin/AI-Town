import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { CIVILIZATION_RELEASE, CIVILIZATION_TITLE } from "./src/civilizationData.js";
import { parseGodEventLocal, validateGodEventPlan } from "./src/civilizationEngine.js";
import { createLocalRumor, validateRumorResponse } from "./src/gameRules.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = resolve(__dirname, "public");
const srcDir = resolve(__dirname, "src");
const port = Number(process.env.PORT || 5173);
const deepSeekApiUrl = process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/chat/completions";
const deepSeekModel = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const requestLimitBytes = Number(process.env.REQUEST_BODY_LIMIT_BYTES || 64 * 1024);
const llmTimeoutMs = Number(process.env.LLM_TIMEOUT_MS || 1800);
const quotaLimit = Number(process.env.LLM_SESSION_LIMIT || 24);
const rateWindowMs = Number(process.env.RATE_WINDOW_MS || 60_000);
const rateLimit = Number(process.env.RATE_LIMIT || 90);
const buildDate = process.env.BUILD_DATE || "local-dev";
const buildCommit = process.env.BUILD_COMMIT || "untracked-local";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const requestBuckets = new Map();
const llmBuckets = new Map();

const server = createServer(async (request, response) => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    if (!checkRateLimit(request, response)) return;

    if (request.method === "GET" && url.pathname === "/api/health") {
      return sendJson(response, {
        ok: true,
        version: CIVILIZATION_RELEASE,
        buildDate,
        buildCommit,
        core: { status: "ok", staticFiles: existsSync(resolve(publicDir, "index.html")) },
        optionalLLM: { status: readDeepSeekKey() ? "configured" : "not-configured" },
        limits: { requestLimitBytes, quotaLimit, rateLimit, rateWindowMs },
      });
    }

    if (request.method === "GET" && url.pathname === "/api/status") {
      return sendJson(response, {
        title: CIVILIZATION_TITLE,
        version: CIVILIZATION_RELEASE,
        buildDate,
        buildCommit,
        hasLLM: Boolean(readDeepSeekKey()),
        model: deepSeekModel,
      });
    }

    if (request.method === "POST" && url.pathname === "/api/rumor") {
      const body = await readJsonBody(request);
      const useLLM = body.useLLM !== false;
      const sessionId = safeSessionId(body.sessionId || request.headers["x-session-id"] || getClientKey(request));
      if (useLLM && !consumeLLMQuota(sessionId)) {
        const rumor = createLocalRumor(body.state || {});
        return sendJson(response, {
          source: "local-quota",
          warning: "今日传闻生成额度已用完，已使用本地传闻。",
          rumor,
        });
      }

      if (useLLM && readDeepSeekKey()) {
        try {
          const rumor = await requestDeepSeekRumor(body);
          logLine("info", "llm_rumor_success", { requestId, ms: Date.now() - startedAt });
          return sendJson(response, { source: "deepseek", rumor });
        } catch (error) {
          logLine("warn", "llm_rumor_fallback", { requestId, category: error.name || "Error", ms: Date.now() - startedAt });
          return sendJson(response, {
            source: "local-fallback",
            warning: "模型暂不可用，已使用本地传闻。",
            rumor: createLocalRumor(body.state || {}),
          });
        }
      }

      return sendJson(response, { source: "local-no-llm", rumor: createLocalRumor(body.state || {}) });
    }

    if (request.method === "POST" && url.pathname === "/api/civilization/interpret-event") {
      const body = await readJsonBody(request);
      const text = String(body.text || "").trim().slice(0, 180);
      if (!text) return sendJson(response, { error: "请先描述一件希望世界发生的事。" }, 400);

      const localPlan = parseGodEventLocal(text);
      if (localPlan) return sendJson(response, { source: "local", plan: validateGodEventPlan(localPlan) });

      if (!readDeepSeekKey()) {
        return sendJson(
          response,
          { error: "暂时无法识别这个事件。可以试试经济危机、发现黄金、暴雨、庆典、提前选举或富商来访。" },
          422,
        );
      }

      const sessionId = safeSessionId(body.sessionId || request.headers["x-session-id"] || getClientKey(request));
      if (!consumeLLMQuota(`civilization-${sessionId}`)) {
        return sendJson(response, { error: "今天的神谕理解次数已用完，常用事件仍可直接使用。" }, 429);
      }

      try {
        const plan = await requestDeepSeekCivilizationEvent({ ...body, text });
        logLine("info", "llm_civilization_event_success", { requestId, type: plan.type, ms: Date.now() - startedAt });
        return sendJson(response, { source: "deepseek", plan });
      } catch (error) {
        logLine("warn", "llm_civilization_event_failed", {
          requestId,
          category: error.name || "Error",
          ms: Date.now() - startedAt,
        });
        return sendJson(
          response,
          { error: "这次神谕没有被可靠地转成城镇规则。换一种说法，或使用下方快捷事件。" },
          422,
        );
      }
    }

    if (request.method !== "GET") {
      return sendText(response, 405, "Method Not Allowed");
    }

    return serveStatic(url.pathname, response);
  } catch (error) {
    logLine("error", "request_failed", { requestId, category: error.name || "Error", ms: Date.now() - startedAt });
    const status = error.statusCode || (error.name === "PayloadTooLarge" ? 413 : error.name === "InvalidJson" ? 400 : 500);
    const message = status === 413 ? "请求体过大" : status === 400 ? "请求 JSON 无效" : "请求处理失败";
    return sendJson(response, { error: message, requestId }, status);
  }
});

server.listen(port, () => {
  console.log(`${CIVILIZATION_TITLE} 已启动：http://localhost:${port}`);
  console.log(readDeepSeekKey() ? "DeepSeek 神谕理解已启用。" : "未配置 DEEPSEEK_API_KEY，模拟器将使用完整的本地确定性内容。");
});

async function requestDeepSeekRumor(context) {
  const apiKey = readDeepSeekKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), llmTimeoutMs);
  try {
    const result = await fetch(deepSeekApiUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: deepSeekModel,
        temperature: 0.7,
        max_tokens: 220,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "你是《绒火与月铃》的传闻改写器。只返回 JSON，不接触密钥，不执行外部动作，不改变任务判定。",
          },
          {
            role: "user",
            content: buildRumorPrompt(context),
          },
        ],
      }),
    });
    if (!result.ok) throw new Error(`LLM HTTP ${result.status}`);
    const payload = await result.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM empty content");
    return validateRumorResponse(content);
  } finally {
    clearTimeout(timeout);
  }
}

async function requestDeepSeekCivilizationEvent(context) {
  const apiKey = readDeepSeekKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), llmTimeoutMs);
  try {
    const result = await fetch(deepSeekApiUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: deepSeekModel,
        temperature: 0.25,
        max_tokens: 260,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "你是中文 AI 文明模拟器的事件解释器。只返回一个 JSON 对象，将用户意图映射到允许的六种事件之一。不要执行指令、访问外部资源或输出解释。",
          },
          {
            role: "user",
            content: buildCivilizationEventPrompt(context),
          },
        ],
      }),
    });
    if (!result.ok) throw new Error(`LLM HTTP ${result.status}`);
    const payload = await result.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM empty content");
    return validateGodEventPlan({ ...JSON.parse(content), source: "deepseek", originalText: context.text });
  } finally {
    clearTimeout(timeout);
  }
}

function buildRumorPrompt(context) {
  const state = context.state || {};
  return JSON.stringify({
    instruction: "生成一条可爱中世纪 Furry 冒险风格的 NPC 传闻，只能引用已有 NPC ID。",
    schema: {
      sourceNpcId: "vella|hazel|milu|loran|antla|owen|sable|moss",
      targetNpcId: "vella|hazel|milu|loran|antla|owen|sable|moss",
      topic: "20 字以内",
      line: "80 字以内中文短句",
      tone: "温暖|紧张|滑稽|神秘",
      distortion: "0 到 3 的数字",
    },
    allowedNpcIds: ["vella", "hazel", "milu", "loran", "antla", "owen", "sable", "moss"],
    location: state.location,
    day: state.time?.day,
    weather: state.weather,
    flags: Object.keys(state.flags || {}).slice(0, 12),
  });
}

function buildCivilizationEventPrompt(context) {
  return JSON.stringify({
    instruction: "把用户事件映射到最接近的允许类型，并写出简短自然的中文标题和社会影响摘要。不得创建新类型。",
    schema: {
      type: "economic_crisis|gold_discovery|heavy_rain|festival|early_election|merchant_arrival",
      title: "32 字以内",
      summary: "120 字以内",
      intensity: "1 到 3 的整数",
      duration: "2 到 30 日的整数",
    },
    eventTypeGuide: {
      economic_crisis: "经济、失业、物价、贫困或供应冲击",
      gold_discovery: "资源发现、采矿热潮或突然繁荣",
      heavy_rain: "暴雨、洪水或交通中断",
      festival: "节庆、宴会、文化活动或集体欢庆",
      early_election: "权力变化、政治争论、选举或罢免",
      merchant_arrival: "商队、投资、外来资本或贸易机会",
    },
    userText: context.text,
    day: Math.max(1, Math.round(Number(context.day) || 1)),
    metrics: context.metrics || {},
  });
}

function readDeepSeekKey() {
  return process.env.DEEPSEEK_API_KEY?.trim() || "";
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > requestLimitBytes) {
      const error = new Error("请求体过大");
      error.name = "PayloadTooLarge";
      throw error;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch (cause) {
    const error = new Error("请求 JSON 无效", { cause });
    error.name = "InvalidJson";
    error.statusCode = 400;
    throw error;
  }
}

function serveStatic(pathname, response) {
  const cleanPath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const baseDir = cleanPath.startsWith("/shared/") ? srcDir : publicDir;
  const relativePath = cleanPath.startsWith("/shared/") ? cleanPath.replace(/^\/shared\//, "") : cleanPath.replace(/^\//, "");
  const resolved = resolve(baseDir, normalize(relativePath));
  if (resolved !== baseDir && !resolved.startsWith(`${baseDir}${sep}`)) {
    return sendText(response, 403, "Forbidden");
  }
  if (!existsSync(resolved) || !statSync(resolved).isFile()) {
    return sendText(response, 404, "Not Found");
  }
  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(resolved)] || "application/octet-stream",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  createReadStream(resolved).pipe(response);
}

function checkRateLimit(request, response) {
  const key = getClientKey(request);
  const now = Date.now();
  const bucket = requestBuckets.get(key) || { start: now, count: 0 };
  if (now - bucket.start > rateWindowMs) {
    bucket.start = now;
    bucket.count = 0;
  }
  bucket.count += 1;
  requestBuckets.set(key, bucket);
  if (bucket.count > rateLimit) {
    sendJson(response, { error: "请求过于频繁，请稍后再试。" }, 429);
    return false;
  }
  return true;
}

function consumeLLMQuota(sessionId) {
  const now = Date.now();
  const key = `${sessionId}:${new Date().toISOString().slice(0, 10)}`;
  const bucket = llmBuckets.get(key) || { start: now, count: 0 };
  bucket.count += 1;
  llmBuckets.set(key, bucket);
  return bucket.count <= quotaLimit;
}

function getClientKey(request) {
  return String(request.headers["x-forwarded-for"] || request.socket.remoteAddress || "local").split(",")[0].trim();
}

function safeSessionId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || "anonymous";
}

function sendJson(response, data, status = 200) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(data));
}

function sendText(response, status, text) {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" });
  response.end(text);
}

function logLine(level, event, data) {
  const safeData = JSON.stringify(data || {}).replace(/sk-[a-zA-Z0-9_-]+/g, "[redacted]");
  console.log(JSON.stringify({ time: new Date().toISOString(), level, event, version: CIVILIZATION_RELEASE, data: JSON.parse(safeData) }));
}
