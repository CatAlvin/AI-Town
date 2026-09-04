import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceCivilization,
  applyGodEvent,
  createCivilization,
  exportCivilization,
  getCitizenConnections,
  getRelationshipGraph,
  importCivilization,
  parseGodEventLocal,
  simulateCivilization,
  validateGodEventPlan,
} from "../src/civilizationEngine.js";

test("civilization starts with 30 unique furry citizens and at least 90 memories", () => {
  const world = createCivilization({ seed: "cast-check" });
  const citizens = Object.values(world.citizens);
  const totalMemories = citizens.reduce((sum, citizen) => sum + citizen.memories.length, 0);

  assert.equal(citizens.length, 30);
  assert.equal(new Set(citizens.map((citizen) => citizen.name)).size, 30);
  assert.equal(new Set(citizens.map((citizen) => citizen.species)).size, 30);
  assert.ok(citizens.every((citizen) => citizen.role && citizen.trait && citizen.goal));
  assert.ok(citizens.every((citizen) => Number.isFinite(citizen.cash)));
  assert.ok(totalMemories >= 90);
});

test("35-day deterministic story reaches debt, crime, investigation, and election", () => {
  const first = simulateCivilization("story-seed", 35);
  const second = simulateCivilization("story-seed", 35);
  const titles = first.events.map((event) => event.title);

  assert.equal(first.day, 35);
  assert.equal(first.mayorId, "vella");
  assert.ok(titles.some((title) => title.includes("开了一家面包店")));
  assert.ok(titles.some((title) => title.includes("借了 500")));
  assert.ok(titles.some((title) => title.includes("偷取面粉")));
  assert.ok(titles.some((title) => title.includes("代替驱逐")));
  assert.ok(titles.some((title) => title.includes("当选月铃镇市长")));
  assert.deepEqual(first.metrics, second.metrics);
  assert.deepEqual(first.events, second.events);
});

test("economic crisis and gold discovery change all five social metrics", () => {
  for (const input of ["突然发生严重经济危机", "城外发现巨大的黄金矿脉"]) {
    const world = createCivilization({ seed: input });
    const before = { ...world.metrics };
    const plan = parseGodEventLocal(input);
    assert.ok(plan);
    applyGodEvent(world, plan);
    advanceCivilization(world, 6);
    for (const key of ["population", "wealth", "crime", "relationships", "politics"]) {
      assert.notEqual(world.metrics[key], before[key], `${input} 没有改变 ${key}`);
    }
  }
});

test("relationship graph exposes friends, enemies, and debt without dangling citizens", () => {
  const world = simulateCivilization("graph-seed", 24);
  const graph = getRelationshipGraph(world);
  const ids = new Set(graph.nodes.map((node) => node.id));
  const rye = getCitizenConnections(world, "rye");

  assert.ok(graph.edges.length >= 30);
  assert.ok(graph.edges.every((edge) => ids.has(edge.firstId) && ids.has(edge.secondId)));
  assert.ok(rye.friends.length > 0);
  assert.ok(rye.enemies.length > 0);
  assert.ok(rye.debts.some((edge) => edge.debt >= 500));
});

test("god event schema is bounded and civilization saves round-trip", () => {
  const world = simulateCivilization("save-seed", 18);
  const plan = validateGodEventPlan({
    type: "festival",
    title: "月铃节",
    summary: "居民在广场分享食物。",
    intensity: 99,
    duration: 999,
  });
  assert.equal(plan.intensity, 3);
  assert.equal(plan.duration, 30);
  assert.throws(() => validateGodEventPlan({ type: "meteor_destroy_all" }), /允许范围/);

  const restored = importCivilization(exportCivilization(world));
  assert.equal(restored.day, world.day);
  assert.equal(Object.keys(restored.citizens).length, 30);
  assert.deepEqual(restored.metrics, world.metrics);
});

test("twenty 100-day simulations keep bounded, finite state", () => {
  for (let seed = 1; seed <= 20; seed += 1) {
    const world = simulateCivilization(`long-${seed}`, 100);
    assert.equal(Object.keys(world.citizens).length, 30);
    assert.ok(Object.values(world.metrics).every(Number.isFinite));
    assert.ok(world.metrics.population >= 24 && world.metrics.population <= 45);
    assert.ok(world.metrics.crime >= 0 && world.metrics.crime <= 100);
    assert.ok(world.metrics.relationships >= 0 && world.metrics.relationships <= 100);
    assert.ok(world.metrics.politics >= 0 && world.metrics.politics <= 100);
    assert.ok(Object.values(world.citizens).every((citizen) => citizen.memories.length <= 20));
  }
});
