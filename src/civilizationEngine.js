import {
  CIVILIZATION_VERSION,
  citizenTemplates,
  getCitizenTemplate,
  getLocation,
  godEventCatalog,
  locations,
  relationshipTypes,
} from "./civilizationData.js";

const DAY_MEMORY_LIMIT = 20;
const EVENT_LIMIT = 180;
const METRIC_HISTORY_LIMIT = 120;
const personalityKeys = ["同理心", "野心", "诚实", "冒险", "纪律", "社交"];

export function createCivilization(options = {}) {
  const seed = normalizeSeed(options.seed ?? 20260903);
  const world = {
    schemaVersion: CIVILIZATION_VERSION,
    seed,
    rngState: seed,
    day: 1,
    segment: 0,
    population: 30,
    mayorId: null,
    treasury: 3200,
    grainPrice: 7,
    crimePressure: 16,
    politicalStability: 62,
    electionDueDay: 35,
    citizens: {},
    relationships: {},
    businesses: createBusinesses(),
    activeEffects: [],
    events: [],
    metricHistory: [],
    eventCounter: 0,
    memoryCounter: 0,
    effectCounter: 0,
    storyFlags: {},
    latestChanges: {},
  };

  citizenTemplates.forEach((template, index) => {
    const home = getLocation(template.home);
    world.citizens[template.id] = {
      ...structuredClone(template),
      cash: template.wealth + Math.floor(nextRandom(world) * 91) - 45,
      debt: 0,
      health: 72 + Math.floor(nextRandom(world) * 25),
      mood: 56 + Math.floor(nextRandom(world) * 30),
      energy: 62 + Math.floor(nextRandom(world) * 28),
      reputation: { business: 48, morality: 58, ability: 52, politics: 40 },
      memories: [],
      goalProgress: 4 + Math.floor(nextRandom(world) * 18),
      locationId: template.home,
      targetLocationId: template.work,
      activity: "准备迎接新的一天",
      x: home.x + ((index % 5) - 2) * 12,
      y: home.y + (Math.floor(index / 5) - 2) * 9,
      lastActionReason: "熟悉的日程让这里成为最自然的去处。",
      present: true,
    };
  });

  seedRelationships(world);
  seedMemories(world);
  recordEvent(world, {
    type: "business",
    title: "焦麦开了一家面包店",
    summary: "焦麦拿出积蓄接手广场西侧的旧烤炉，米露答应替他寻找稳定的面粉来源。",
    importance: 3,
    participants: ["rye", "milu"],
    locationId: "bakery",
    effects: { wealth: 90, relationships: 2 },
    tags: ["开店", "经济", "焦麦"],
  });
  world.storyFlags.bakeryOpened = true;
  recalculateMetrics(world);
  world.metricHistory.push(metricSnapshot(world));
  return world;
}

export function advanceCivilization(world, days = 1) {
  const count = Math.max(0, Math.min(365, Math.floor(days)));
  for (let index = 0; index < count; index += 1) runDay(world);
  return world;
}

export function simulateCivilization(seed, days = 35) {
  const world = createCivilization({ seed });
  advanceCivilization(world, Math.max(0, days - 1));
  return world;
}

function runDay(world) {
  const previous = metricSnapshot(world);
  world.day += 1;
  world.segment = (world.segment + 1) % 4;
  updateActiveEffects(world);
  updateEconomy(world);
  updateCitizenPlans(world);
  runScriptedStory(world);
  runSocialLife(world);
  runTownPulse(world);
  if (world.day >= world.electionDueDay) runElection(world);
  recalculateMetrics(world);
  world.latestChanges = diffMetrics(previous, world.metrics);
  world.metricHistory.push(metricSnapshot(world));
  world.metricHistory = world.metricHistory.slice(-METRIC_HISTORY_LIMIT);
}

function createBusinesses() {
  return {
    bakery: { id: "bakery", name: "焦麦面包房", ownerId: "rye", locationId: "bakery", cash: 260, inventory: 22, health: 64, open: true },
    market: { id: "market", name: "铃环市集", ownerId: "milu", locationId: "market", cash: 720, inventory: 84, health: 76, open: true },
    bank: { id: "bank", name: "月穗银行", ownerId: "liuying", locationId: "bank", cash: 2600, inventory: 0, health: 88, open: true },
    workshop: { id: "workshop", name: "绒火工坊", ownerId: "hazel", locationId: "workshop", cash: 920, inventory: 46, health: 72, open: true },
    farm: { id: "farm", name: "青荚农圃", ownerId: "qingjia", locationId: "farm", cash: 680, inventory: 110, health: 80, open: true },
    inn: { id: "inn", name: "暖角旅店", ownerId: "moss", locationId: "inn", cash: 880, inventory: 55, health: 82, open: true },
    mine: { id: "mine", name: "星辉矿场", ownerId: "dengsha", locationId: "mine", cash: 180, inventory: 0, health: 28, open: false },
  };
}

function seedRelationships(world) {
  const ids = citizenTemplates.map((citizen) => citizen.id);
  ids.forEach((id, index) => {
    const nextId = ids[(index + 1) % ids.length];
    const rivalId = ids[(index + 9) % ids.length];
    const citizen = world.citizens[id];
    upsertRelationship(world, id, nextId, { trust: 68, affection: 58, resentment: 2, type: "friend" });
    upsertRelationship(world, id, rivalId, { trust: 24, affection: 18, resentment: 58, type: "enemy" });
    const coworker = ids.find((candidateId) => candidateId !== id && world.citizens[candidateId].work === citizen.work);
    if (coworker) upsertRelationship(world, id, coworker, { trust: 54, affection: 38, resentment: 6, type: "work" });
  });

  upsertRelationship(world, "rye", "liuying", { trust: 46, affection: 24, resentment: 8, debt: 0, type: "influence" });
  upsertRelationship(world, "vella", "milu", { trust: 74, affection: 62, resentment: 0, type: "friend" });
  upsertRelationship(world, "heitan", "liuying", { trust: 18, affection: 16, resentment: 48, debt: 280, debtorId: "heitan", type: "debt" });
  world.citizens.heitan.debt += 280;
}

function seedMemories(world) {
  const ids = citizenTemplates.map((citizen) => citizen.id);
  ids.forEach((id, index) => {
    const citizen = world.citizens[id];
    const friend = world.citizens[ids[(index + 1) % ids.length]];
    const rival = world.citizens[ids[(index + 9) % ids.length]];
    addMemory(world, id, {
      type: "identity",
      text: `${citizen.name}记得自己第一次决定要${citizen.goal}。`,
      importance: 3,
      reliability: 100,
    });
    addMemory(world, id, {
      type: "relationship",
      text: `${friend.name}曾在一个忙乱的清晨主动帮助${citizen.name}。`,
      subjectId: friend.id,
      importance: 2,
      reliability: 94,
    });
    addMemory(world, id, {
      type: "tension",
      text: `${citizen.name}仍对${rival.name}上次公开质疑自己感到不快。`,
      subjectId: rival.id,
      importance: 2,
      reliability: 82,
    });
  });
}

function updateActiveEffects(world) {
  for (const effect of world.activeEffects) effect.remaining -= 1;
  world.activeEffects = world.activeEffects.filter((effect) => effect.remaining > 0);
}

function updateEconomy(world) {
  const crisis = effectStrength(world, "economic_crisis");
  const gold = effectStrength(world, "gold_discovery");
  const rain = effectStrength(world, "heavy_rain");
  const festival = effectStrength(world, "festival");
  const merchant = effectStrength(world, "merchant_arrival");
  const incomeFactor = clamp(1 - crisis * 0.14 - rain * 0.04 + festival * 0.06 + merchant * 0.05, 0.42, 1.65);

  world.grainPrice = clamp(Math.round((7 + crisis * 2 + rain * 1.5 - gold * 0.25) * 10) / 10, 4, 18);
  for (const citizen of Object.values(world.citizens)) {
    if (!citizen.present) continue;
    const mineBonus = citizen.work === "mine" ? 1 + gold * 0.28 : 1;
    const dailyIncome = citizen.salary * 0.22 * incomeFactor * mineBonus;
    const dailyExpense = 7.5 + world.grainPrice * 0.42 + (citizen.cash > 1000 ? 4 : 0);
    citizen.cash = roundMoney(citizen.cash + dailyIncome - dailyExpense);
    citizen.energy = clamp(citizen.energy - 6 + nextRandom(world) * 12, 18, 100);
    citizen.mood = clamp(citizen.mood + (dailyIncome >= dailyExpense ? 1.2 : -2.4) - crisis * 0.7 + festival * 1.2, 8, 100);
    if (citizen.cash < 0) {
      citizen.debt = roundMoney(citizen.debt + Math.abs(citizen.cash) * 0.08);
      citizen.cash = roundMoney(citizen.cash * 0.65);
    }
  }

  const bakery = world.businesses.bakery;
  bakery.cash = roundMoney(bakery.cash + 18 * incomeFactor + festival * 15 - world.grainPrice * 2.2);
  bakery.inventory = clamp(bakery.inventory + 5 - Math.round(3 + festival * 2), 0, 80);
  bakery.health = clamp(bakery.health + (bakery.cash > 0 ? 0.5 : -2) - crisis * 0.8, 0, 100);
  world.businesses.mine.open = gold > 0 || world.storyFlags.goldRushStarted;
}

function updateCitizenPlans(world) {
  const ids = Object.keys(world.citizens);
  ids.forEach((id, index) => {
    const citizen = world.citizens[id];
    if (!citizen.present) return;
    const roll = nextRandom(world);
    let destination = citizen.work;
    let activity = `在${getLocation(citizen.work).name}工作`;
    let reason = `这项工作最接近“${citizen.goal}”的长期目标。`;

    if (citizen.energy < 34 || roll < 0.11) {
      destination = citizen.home;
      activity = "回家休息并整理思绪";
      reason = "精力不足，继续工作会增加犯错风险。";
      citizen.energy = clamp(citizen.energy + 18, 0, 100);
    } else if (roll > 0.76) {
      const friendId = getCitizenConnections(world, id).friends[0]?.id;
      const friend = friendId ? world.citizens[friendId] : null;
      destination = friend?.locationId || (index % 2 ? "plaza" : "inn");
      activity = friend ? `去找${friend.name}聊聊近况` : "到广场听取新消息";
      reason = friend ? `对${friend.name}的信任让这次拜访比加班更重要。` : "社交需求正在影响今天的选择。";
      citizen.mood = clamp(citizen.mood + 3, 0, 100);
    } else if (citizen.cash < 150 && roll > 0.58) {
      destination = "market";
      activity = "在市集寻找临时工作";
      reason = "手头现金偏低，短期收入压过了原定日程。";
    }

    citizen.locationId = citizen.targetLocationId || citizen.locationId;
    citizen.targetLocationId = destination;
    citizen.activity = activity;
    citizen.lastActionReason = reason;
    citizen.goalProgress = clamp(citizen.goalProgress + (destination === citizen.work ? 0.8 : 0.2), 0, 100);
  });
}

function runScriptedStory(world) {
  if (world.day === 8 && !world.storyFlags.grainShortage) {
    world.storyFlags.grainShortage = true;
    world.grainPrice += 2;
    world.businesses.bakery.cash -= 80;
    recordEvent(world, {
      type: "economy",
      title: "面粉价格突然上涨",
      summary: "青荚农圃减产，焦麦的面包房第一次出现现金缺口。柳影注意到了他的账本。",
      importance: 3,
      participants: ["rye", "qingjia", "liuying"],
      locationId: "bakery",
      causes: findEventIds(world, ["business"]),
      effects: { wealth: -120, crime: 1, politics: -1 },
      tags: ["粮价", "面包店", "债务前因"],
    });
  }

  if (world.day === 12 && !world.storyFlags.ryeDebt) {
    world.storyFlags.ryeDebt = true;
    createDebt(world, "rye", "liuying", 500);
    world.businesses.bakery.cash += 500;
    recordEvent(world, {
      type: "debt",
      title: "焦麦向柳影借了 500 币",
      summary: "焦麦保住了面包房，但合约要求他在二十日内偿还本金和利息。",
      importance: 4,
      participants: ["rye", "liuying"],
      locationId: "bank",
      causes: findEventIds(world, ["economy", "business"]),
      effects: { wealth: 0, relationships: -2, politics: -1 },
      tags: ["债务", "银行", "焦麦"],
    });
  }

  if (world.day === 24 && !world.storyFlags.ryeTheft) {
    world.storyFlags.ryeTheft = true;
    world.citizens.rye.cash += 65;
    world.citizens.rye.reputation.morality -= 18;
    world.crimePressure += 11;
    alterRelationship(world, "rye", "milu", { trust: -20, resentment: 26 });
    alterRelationship(world, "rye", "luzhao", { trust: -12, resentment: 18 });
    recordEvent(world, {
      type: "crime",
      title: "焦麦偷取面粉时被露爪看见",
      summary: "债期临近，焦麦从米露的仓柜拿走两袋面粉。露爪在送信途中看清了他的围裙。",
      importance: 5,
      participants: ["rye", "milu", "luzhao"],
      locationId: "market",
      causes: findEventIds(world, ["debt", "economy"]),
      effects: { wealth: -70, crime: 12, relationships: -9, politics: -3 },
      tags: ["偷窃", "目击", "调查前因"],
    });
  }

  if (world.day === 27 && !world.storyFlags.ryeInvestigation) {
    world.storyFlags.ryeInvestigation = true;
    world.citizens.rye.cash -= 110;
    world.citizens.yanzhen.reputation.ability += 9;
    world.citizens.vella.reputation.politics += 14;
    world.crimePressure -= 7;
    alterRelationship(world, "vella", "rye", { trust: 8, resentment: -5 });
    recordEvent(world, {
      type: "justice",
      title: "薇萝提出以偿还和劳动代替驱逐",
      summary: "岩阵确认了证据。薇萝说服米露接受赔偿方案，焦麦暂时保住面包房，也必须公开账本。",
      importance: 5,
      participants: ["vella", "rye", "milu", "luzhao", "yanzhen"],
      locationId: "council",
      causes: findEventIds(world, ["crime"]),
      effects: { wealth: -40, crime: -7, relationships: 5, politics: 8 },
      tags: ["调查", "调解", "薇萝"],
    });
  }

  if (world.day === 30 && !world.storyFlags.campaign) {
    world.storyFlags.campaign = true;
    recordEvent(world, {
      type: "politics",
      title: "三名居民宣布竞选市长",
      summary: "薇萝主张公开救济，柳影主张扩大投资，岩阵主张增加巡守。城镇第一次出现清晰的政策分歧。",
      importance: 4,
      participants: ["vella", "liuying", "yanzhen"],
      locationId: "plaza",
      causes: findEventIds(world, ["justice", "debt"]),
      effects: { relationships: -1, politics: 4 },
      tags: ["竞选", "政策", "市长"],
    });
  }
}

function runSocialLife(world) {
  const present = Object.values(world.citizens).filter((citizen) => citizen.present);
  if (present.length < 2) return;
  const first = present[Math.floor(nextRandom(world) * present.length)];
  let second = present[Math.floor(nextRandom(world) * present.length)];
  if (second.id === first.id) second = present[(present.indexOf(first) + 1) % present.length];
  const relation = getRelationship(world, first.id, second.id);
  const roll = nextRandom(world);

  if (relation.resentment > 52 && roll < 0.55) {
    alterRelationship(world, first.id, second.id, { trust: -3, resentment: 4 });
    first.mood = clamp(first.mood - 4, 0, 100);
    second.mood = clamp(second.mood - 3, 0, 100);
    recordEvent(world, {
      type: "social",
      title: `${first.name}和${second.name}在${getLocation(first.targetLocationId).name}争执`,
      summary: `${first.name}认为${second.name}没有兑现旧承诺，围观者开始重新评估两人的关系。`,
      importance: 2,
      participants: [first.id, second.id],
      locationId: first.targetLocationId,
      effects: { relationships: -3 },
      tags: ["争执", first.name, second.name],
    });
    return;
  }

  if (first.cash < 180 && second.personality[0] > 72 && roll < 0.7) {
    const amount = Math.min(35, Math.max(12, Math.floor(second.cash * 0.025)));
    second.cash -= amount;
    first.cash += amount;
    alterRelationship(world, first.id, second.id, { trust: 5, affection: 4, resentment: -2 });
    recordEvent(world, {
      type: "social",
      title: `${second.name}帮${first.name}渡过了今天`,
      summary: `${second.name}主动拿出 ${amount} 币。${first.name}把这次帮助记成了一笔人情。`,
      importance: 2,
      participants: [second.id, first.id],
      locationId: first.targetLocationId,
      effects: { relationships: 4 },
      tags: ["帮助", second.name, first.name],
    });
    return;
  }

  if (world.day % 2 === 0) {
    alterRelationship(world, first.id, second.id, { trust: 2, affection: 2, resentment: -1 });
    recordEvent(world, {
      type: "social",
      title: `${first.name}和${second.name}交换了近况`,
      summary: `${first.name}提起“${first.goal}”，${second.name}给出了一个符合自己性格的建议。`,
      importance: 1,
      participants: [first.id, second.id],
      locationId: roll > 0.5 ? "plaza" : "inn",
      effects: { relationships: 1 },
      tags: ["交谈", first.name, second.name],
    });
  }
}

function runTownPulse(world) {
  const crisis = effectStrength(world, "economic_crisis");
  const gold = effectStrength(world, "gold_discovery");
  const rain = effectStrength(world, "heavy_rain");
  const festival = effectStrength(world, "festival");

  world.treasury = roundMoney(world.treasury - crisis * 18 - rain * 12 - festival * 24 + gold * 22);
  world.crimePressure = clamp(world.crimePressure + crisis * 0.9 + gold * 0.55 - festival * 0.35 + (nextRandom(world) - 0.55) * 1.8, 2, 96);
  world.politicalStability = clamp(world.politicalStability - crisis * 0.7 - gold * 0.2 - rain * 0.25 + festival * 0.8, 8, 96);

  if (crisis > 0 && world.day % 4 === 0) world.population = Math.max(24, world.population - 1);
  if (gold > 0 && world.day % 3 === 0) world.population = Math.min(45, world.population + 1);
  if (festival > 0 && world.day % 4 === 0) world.population = Math.min(45, world.population + 1);
}

function runElection(world) {
  if (world.mayorId && world.day < world.electionDueDay) return;
  const candidates = ["vella", "liuying", "yanzhen"];
  const scores = candidates.map((id) => {
    const citizen = world.citizens[id];
    const relationTrust = averageTrustFor(world, id);
    const crisisFit = id === "vella" && world.storyFlags.ryeInvestigation ? 24 : 0;
    return {
      id,
      score: citizen.reputation.politics * 1.8 + citizen.reputation.morality + relationTrust + citizen.personality[1] * 0.35 + crisisFit,
    };
  });
  scores.sort((a, b) => b.score - a.score);
  const winner = scores[0]?.id || "vella";
  world.mayorId = winner;
  world.electionDueDay = world.day + 30;
  world.politicalStability = clamp(world.politicalStability + 12, 0, 100);
  world.citizens[winner].reputation.politics = clamp(world.citizens[winner].reputation.politics + 18, 0, 100);
  recordEvent(world, {
    type: "election",
    title: `${world.citizens[winner].name}当选月铃镇市长`,
    summary:
      winner === "vella"
        ? "薇萝在面包房事件中的调解赢得了中间居民的信任。她承诺公开救济和城库账目。"
        : `${world.citizens[winner].name}凭借关系网络与政策主张赢得了多数选票。`,
    importance: 5,
    participants: candidates,
    locationId: "council",
    causes: findEventIds(world, ["politics", "justice", "crime"]),
    effects: { relationships: 3, politics: 12 },
    tags: ["选举", "市长", world.citizens[winner].name],
  });
}

export function parseGodEventLocal(input) {
  const text = String(input || "").trim().slice(0, 180);
  if (!text) return null;
  const intensity = /严重|巨大|猛烈|全城|前所未有/.test(text) ? 3 : /轻微|小型|短暂/.test(text) ? 1 : 2;
  let type = null;
  if (/经济|萧条|失业|金融|危机/.test(text)) type = "economic_crisis";
  else if (/黄金|金矿|矿脉|淘金/.test(text)) type = "gold_discovery";
  else if (/暴雨|洪水|大雨|连日雨/.test(text)) type = "heavy_rain";
  else if (/庆典|节日|宴会|狂欢/.test(text)) type = "festival";
  else if (/选举|市长|投票/.test(text)) type = "early_election";
  else if (/富商|商队|资本|大商人/.test(text)) type = "merchant_arrival";
  if (!type) return null;
  const catalog = godEventCatalog[type];
  return {
    type,
    title: catalog.label,
    summary: catalog.description,
    intensity,
    duration: Math.max(2, Math.round(catalog.duration * (0.6 + intensity * 0.2))),
    originalText: text,
    source: "local",
  };
}

export function validateGodEventPlan(value) {
  const plan = typeof value === "string" ? safeJson(value) : value;
  if (!plan || typeof plan !== "object") throw new Error("事件计划不是有效对象");
  if (!godEventCatalog[plan.type]) throw new Error("事件类型不在允许范围内");
  const intensity = clamp(Math.round(Number(plan.intensity) || 2), 1, 3);
  const duration = clamp(Math.round(Number(plan.duration) || godEventCatalog[plan.type].duration), 2, 30);
  return {
    type: plan.type,
    title: String(plan.title || godEventCatalog[plan.type].label).slice(0, 32),
    summary: String(plan.summary || godEventCatalog[plan.type].description).slice(0, 120),
    intensity,
    duration,
    originalText: String(plan.originalText || "").slice(0, 180),
    source: ["deepseek", "kimi"].includes(plan.source) ? plan.source : "local",
  };
}

export function applyGodEvent(world, input) {
  const plan = validateGodEventPlan(typeof input === "string" ? parseGodEventLocal(input) : input);
  const effect = {
    id: `effect-${++world.effectCounter}`,
    type: plan.type,
    intensity: plan.intensity,
    remaining: plan.duration,
    duration: plan.duration,
    startedDay: world.day,
    title: plan.title,
  };
  world.activeEffects.push(effect);
  applyGodImmediateEffects(world, plan);
  const participants = godEventParticipants(plan.type);
  recordEvent(world, {
    type: "god",
    title: `世界事件：${plan.title}`,
    summary: `${plan.summary} 影响强度 ${plan.intensity}，预计持续 ${plan.duration} 日。`,
    importance: 5,
    participants,
    locationId: godEventLocation(plan.type),
    effects: godEventMetricEffects(plan.type, plan.intensity),
    tags: ["上帝事件", plan.title],
  });
  recalculateMetrics(world);
  return effect;
}

function applyGodImmediateEffects(world, plan) {
  const power = plan.intensity;
  if (plan.type === "economic_crisis") {
    for (const citizen of Object.values(world.citizens)) citizen.cash = roundMoney(citizen.cash * (1 - power * 0.035));
    world.population = Math.max(24, world.population - Math.max(1, power - 1));
    world.crimePressure += power * 5;
    world.politicalStability -= power * 6;
    world.treasury -= power * 180;
    strainRandomRelations(world, power * 3);
  } else if (plan.type === "gold_discovery") {
    world.storyFlags.goldRushStarted = true;
    world.businesses.mine.open = true;
    world.businesses.mine.cash += power * 320;
    for (const id of ["dengsha", "suijiao", "liujiao", "liuying"]) world.citizens[id].cash += power * 85;
    world.population = Math.min(45, world.population + power);
    world.crimePressure += power * 3;
    world.politicalStability -= power * 2;
    strainRandomRelations(world, power * 2);
  } else if (plan.type === "heavy_rain") {
    world.grainPrice += power * 1.5;
    world.treasury -= power * 120;
    world.businesses.farm.inventory = Math.max(0, world.businesses.farm.inventory - power * 14);
  } else if (plan.type === "festival") {
    world.treasury -= power * 140;
    for (const citizen of Object.values(world.citizens)) citizen.mood = clamp(citizen.mood + power * 6, 0, 100);
    improveRandomRelations(world, power * 4);
  } else if (plan.type === "early_election") {
    world.electionDueDay = Math.min(world.electionDueDay, world.day + 3);
    world.politicalStability -= power * 3;
  } else if (plan.type === "merchant_arrival") {
    world.businesses.market.cash += power * 260;
    world.businesses.bank.cash += power * 180;
    world.population = Math.min(45, world.population + power);
    world.politicalStability -= power;
  }
}

function godEventParticipants(type) {
  const map = {
    economic_crisis: ["liuying", "rye", "milu", "vella"],
    gold_discovery: ["dengsha", "suijiao", "liujiao", "liuying"],
    heavy_rain: ["qingjia", "sable", "heyan", "vella"],
    festival: ["suokui", "lingdou", "moss", "mianzhi"],
    early_election: ["vella", "liuying", "yanzhen"],
    merchant_arrival: ["milu", "wuyan", "liuying", "muya"],
  };
  return map[type] || ["vella"];
}

function godEventLocation(type) {
  return {
    economic_crisis: "bank",
    gold_discovery: "mine",
    heavy_rain: "bridge",
    festival: "plaza",
    early_election: "council",
    merchant_arrival: "market",
  }[type] || "plaza";
}

function godEventMetricEffects(type, power) {
  const effects = {
    economic_crisis: { wealth: -power * 8, crime: power * 6, relationships: -power * 3, politics: -power * 6, population: -power },
    gold_discovery: { wealth: power * 12, crime: power * 4, relationships: -power, politics: -power * 2, population: power },
    heavy_rain: { wealth: -power * 4, crime: power, relationships: power, politics: -power * 2 },
    festival: { wealth: power * 3, crime: -power, relationships: power * 6, politics: power * 2 },
    early_election: { relationships: -power, politics: -power * 3 },
    merchant_arrival: { wealth: power * 7, crime: power, relationships: -power, politics: -power },
  };
  return effects[type] || {};
}

function improveRandomRelations(world, amount) {
  const relations = Object.values(world.relationships);
  for (let index = 0; index < Math.min(6, relations.length); index += 1) {
    const relation = relations[Math.floor(nextRandom(world) * relations.length)];
    relation.trust = clamp(relation.trust + amount, 0, 100);
    relation.affection = clamp(relation.affection + amount * 0.6, 0, 100);
    relation.resentment = clamp(relation.resentment - amount * 0.4, 0, 100);
    refreshRelationshipType(relation);
  }
}

function strainRandomRelations(world, amount) {
  const relations = Object.values(world.relationships);
  for (let index = 0; index < Math.min(8, relations.length); index += 1) {
    const relation = relations[Math.floor(nextRandom(world) * relations.length)];
    relation.trust = clamp(relation.trust - amount, 0, 100);
    relation.resentment = clamp(relation.resentment + amount * 0.8, 0, 100);
    refreshRelationshipType(relation);
  }
}

function createDebt(world, debtorId, creditorId, amount) {
  const debtor = world.citizens[debtorId];
  const creditor = world.citizens[creditorId];
  if (!debtor || !creditor) return;
  debtor.debt = roundMoney(debtor.debt + amount);
  debtor.cash = roundMoney(debtor.cash + amount);
  creditor.cash = roundMoney(creditor.cash - amount);
  upsertRelationship(world, debtorId, creditorId, {
    trust: 38,
    affection: 22,
    resentment: 12,
    debt: amount,
    debtorId,
    type: "debt",
  });
}

function recordEvent(world, event) {
  const entry = {
    id: `event-${++world.eventCounter}`,
    day: world.day,
    type: event.type || "social",
    title: String(event.title || "城里发生了一件事"),
    summary: String(event.summary || ""),
    importance: clamp(Math.round(event.importance || 1), 1, 5),
    participants: [...new Set((event.participants || []).filter((id) => world.citizens[id]))],
    locationId: getLocation(event.locationId).id,
    causes: (event.causes || []).slice(-4),
    effects: { ...(event.effects || {}) },
    tags: [...new Set(event.tags || [])].slice(0, 6),
  };
  world.events.unshift(entry);
  world.events = world.events.slice(0, EVENT_LIMIT);
  for (const citizenId of entry.participants) {
    addMemory(world, citizenId, {
      type: entry.type,
      text: entry.summary || entry.title,
      importance: entry.importance,
      reliability: 96,
      eventId: entry.id,
    });
  }
  return entry;
}

function addMemory(world, citizenId, memory) {
  const citizen = world.citizens[citizenId];
  if (!citizen) return;
  citizen.memories.push({
    id: `memory-${++world.memoryCounter}`,
    day: memory.day || world.day,
    type: memory.type || "event",
    text: String(memory.text || "").slice(0, 160),
    importance: clamp(Math.round(memory.importance || 1), 1, 5),
    reliability: clamp(Math.round(memory.reliability ?? 90), 0, 100),
    subjectId: memory.subjectId || null,
    eventId: memory.eventId || null,
  });
  citizen.memories = citizen.memories.slice(-DAY_MEMORY_LIMIT);
}

function upsertRelationship(world, firstId, secondId, values = {}) {
  if (!world.citizens[firstId] || !world.citizens[secondId] || firstId === secondId) return null;
  const key = relationshipKey(firstId, secondId);
  const existing = world.relationships[key] || {
    id: key,
    firstId: [firstId, secondId].sort()[0],
    secondId: [firstId, secondId].sort()[1],
    trust: 42,
    affection: 30,
    resentment: 8,
    debt: 0,
    debtorId: null,
    type: "work",
  };
  Object.assign(existing, values);
  existing.trust = clamp(existing.trust, 0, 100);
  existing.affection = clamp(existing.affection, 0, 100);
  existing.resentment = clamp(existing.resentment, 0, 100);
  refreshRelationshipType(existing);
  world.relationships[key] = existing;
  return existing;
}

function alterRelationship(world, firstId, secondId, delta = {}) {
  const relation = upsertRelationship(world, firstId, secondId);
  if (!relation) return null;
  relation.trust = clamp(relation.trust + (delta.trust || 0), 0, 100);
  relation.affection = clamp(relation.affection + (delta.affection || 0), 0, 100);
  relation.resentment = clamp(relation.resentment + (delta.resentment || 0), 0, 100);
  relation.debt = Math.max(0, roundMoney(relation.debt + (delta.debt || 0)));
  refreshRelationshipType(relation);
  return relation;
}

function refreshRelationshipType(relation) {
  if (relation.debt > 0) relation.type = "debt";
  else if (relation.resentment >= 52) relation.type = "enemy";
  else if (relation.affection >= 76 && relation.trust >= 62) relation.type = "love";
  else if (relation.trust >= 60) relation.type = "friend";
  else if (relation.type !== "influence") relation.type = "work";
}

export function getRelationship(world, firstId, secondId) {
  return world.relationships[relationshipKey(firstId, secondId)] || upsertRelationship(world, firstId, secondId);
}

export function getCitizenConnections(world, citizenId) {
  const edges = Object.values(world.relationships)
    .filter((relation) => relation.firstId === citizenId || relation.secondId === citizenId)
    .map((relation) => {
      const otherId = relation.firstId === citizenId ? relation.secondId : relation.firstId;
      return { ...relation, id: otherId, citizen: world.citizens[otherId] };
    });
  return {
    friends: edges.filter((edge) => edge.type === "friend" || edge.type === "love").sort((a, b) => b.trust - a.trust),
    enemies: edges.filter((edge) => edge.type === "enemy").sort((a, b) => b.resentment - a.resentment),
    debts: edges.filter((edge) => edge.debt > 0).sort((a, b) => b.debt - a.debt),
    all: edges.sort((a, b) => relationshipWeight(b) - relationshipWeight(a)),
  };
}

export function getRelationshipGraph(world, filter = "all") {
  const edges = Object.values(world.relationships)
    .filter((relation) => filter === "all" || relation.type === filter)
    .filter((relation) => relationshipWeight(relation) >= 34 || relation.debt > 0)
    .sort((a, b) => relationshipWeight(b) - relationshipWeight(a));
  return {
    nodes: Object.values(world.citizens).map((citizen) => ({
      id: citizen.id,
      name: citizen.name,
      role: citizen.role,
      species: citizen.species,
      color: citizen.colors.fur,
    })),
    edges,
  };
}

export function describeCitizen(world, citizenId) {
  const citizen = world.citizens[citizenId];
  if (!citizen) return null;
  const connections = getCitizenConnections(world, citizenId);
  return {
    ...citizen,
    personalityLabels: personalityKeys.map((label, index) => ({ label, value: citizen.personality[index] })),
    friends: connections.friends.slice(0, 4),
    enemies: connections.enemies.slice(0, 4),
    debts: connections.debts.slice(0, 4),
    recentEvents: world.events.filter((event) => event.participants.includes(citizenId)).slice(0, 6),
  };
}

export function getImportantEvents(world, limit = 24) {
  return world.events.filter((event) => event.importance >= 2).slice(0, limit);
}

export function exportCivilization(world) {
  return JSON.stringify(world, null, 2);
}

export function importCivilization(raw) {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : structuredClone(raw);
  if (!parsed || parsed.schemaVersion !== CIVILIZATION_VERSION) throw new Error("存档版本不受支持");
  if (!parsed.citizens || Object.keys(parsed.citizens).length < 30) throw new Error("存档中的居民数据不完整");
  if (!Array.isArray(parsed.events) || !parsed.relationships) throw new Error("存档缺少文明历史");
  return parsed;
}

function recalculateMetrics(world) {
  const present = Object.values(world.citizens).filter((citizen) => citizen.present);
  const wealth = present.reduce((sum, citizen) => sum + citizen.cash, 0) + Object.values(world.businesses).reduce((sum, business) => sum + business.cash, 0);
  const relations = Object.values(world.relationships);
  const socialTrust = relations.length
    ? relations.reduce((sum, relation) => sum + relation.trust - relation.resentment * 0.55, 0) / relations.length
    : 50;
  world.metrics = {
    population: Math.round(world.population),
    wealth: Math.round(wealth),
    crime: Math.round(clamp(world.crimePressure, 0, 100)),
    relationships: Math.round(clamp(socialTrust, 0, 100)),
    politics: Math.round(clamp(world.politicalStability, 0, 100)),
  };
}

function metricSnapshot(world) {
  return { day: world.day, ...(world.metrics || { population: world.population, wealth: 0, crime: 0, relationships: 0, politics: 0 }) };
}

function diffMetrics(previous, current) {
  const diff = {};
  for (const key of ["population", "wealth", "crime", "relationships", "politics"]) diff[key] = (current?.[key] || 0) - (previous?.[key] || 0);
  return diff;
}

function averageTrustFor(world, citizenId) {
  const all = getCitizenConnections(world, citizenId).all;
  return all.length ? all.reduce((sum, relation) => sum + relation.trust, 0) / all.length : 42;
}

function findEventIds(world, types) {
  return world.events.filter((event) => types.includes(event.type)).slice(0, 3).map((event) => event.id);
}

function effectStrength(world, type) {
  return world.activeEffects.filter((effect) => effect.type === type).reduce((sum, effect) => sum + effect.intensity, 0);
}

function relationshipKey(firstId, secondId) {
  return [firstId, secondId].sort().join("::");
}

function relationshipWeight(relation) {
  return Math.max(relation.trust, relation.affection, relation.resentment, Math.min(100, relation.debt / 5));
}

function normalizeSeed(value) {
  const text = String(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

function nextRandom(world) {
  let state = world.rngState >>> 0;
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  world.rngState = state >>> 0 || 1;
  return world.rngState / 4294967296;
}

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export { godEventCatalog, locations, relationshipTypes };
