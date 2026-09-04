export function writeSaveToStorage({ storage, slotKey, activeSlotKey, slot, save }) {
  if (!storage || typeof storage.setItem !== "function") {
    return failedWrite("StorageUnavailable", "浏览器存储不可用");
  }
  try {
    const payload = typeof save === "string" ? save : JSON.stringify(save);
    storage.setItem(slotKey(slot), payload);
    storage.setItem(activeSlotKey, String(slot));
    return { ok: true, reason: "saved" };
  } catch (error) {
    return failedWrite(error?.name || "StorageWriteFailed", error?.message || "写入失败");
  }
}

function failedWrite(code, detail) {
  return {
    ok: false,
    code,
    detail,
    message: `保存失败：浏览器存储不可写或空间不足。请导出存档后清理空间再重试。`,
  };
}
