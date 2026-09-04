import test from "node:test";
import assert from "node:assert/strict";
import { writeSaveToStorage } from "../src/storageSafety.js";

test("writeSaveToStorage writes slot payload and active slot atomically enough for browser saves", () => {
  const writes = new Map();
  const storage = {
    setItem(key, value) {
      writes.set(key, value);
    },
  };

  const result = writeSaveToStorage({
    storage,
    slotKey: (slot) => `slot.${slot}`,
    activeSlotKey: "active",
    slot: 2,
    save: { player: { name: "绒火" }, mainStage: 3 },
  });

  assert.equal(result.ok, true);
  assert.equal(JSON.parse(writes.get("slot.2")).player.name, "绒火");
  assert.equal(writes.get("active"), "2");
});

test("writeSaveToStorage returns Chinese recovery guidance on quota or unavailable storage", () => {
  const quotaStorage = {
    setItem() {
      const error = new Error("quota exceeded");
      error.name = "QuotaExceededError";
      throw error;
    },
  };

  const quotaResult = writeSaveToStorage({
    storage: quotaStorage,
    slotKey: (slot) => `slot.${slot}`,
    activeSlotKey: "active",
    slot: 0,
    save: "{}",
  });
  assert.equal(quotaResult.ok, false);
  assert.equal(quotaResult.code, "QuotaExceededError");
  assert.match(quotaResult.message, /保存失败/);
  assert.match(quotaResult.message, /导出存档/);

  const missingStorage = writeSaveToStorage({
    storage: null,
    slotKey: (slot) => `slot.${slot}`,
    activeSlotKey: "active",
    slot: 0,
    save: "{}",
  });
  assert.equal(missingStorage.ok, false);
  assert.equal(missingStorage.code, "StorageUnavailable");
});
