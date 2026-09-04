import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const ignoredNames = new Set(["node_modules", ".git", "server.out.log", "server.err.log", "deepseek API Key.txt"]);
const ignoredExt = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp3", ".wav", ".ogg"]);
const patterns = [
  { name: "DeepSeek/OpenAI style key", regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  {
    name: "env secret assignment",
    regex: /\b[A-Z0-9_]*(?:KEY|TOKEN|SECRET)[A-Z0-9_]*\s*=\s*['"]?(?!\.{3}|example|changeme)[^'"\s]{12,}/g,
  },
];

const findings = [];
scan(root);

if (findings.length > 0) {
  console.error("发现疑似密钥或令牌：");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.name}`);
  }
  process.exit(1);
}

console.log("密钥扫描通过：最终代码、文档和前端资源未发现疑似真实密钥。");

function scan(dir) {
  for (const entry of readdirSync(dir)) {
    if (ignoredNames.has(entry)) continue;
    const filePath = join(dir, entry);
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      scan(filePath);
      continue;
    }
    const ext = entry.slice(entry.lastIndexOf(".")).toLowerCase();
    if (ignoredExt.has(ext)) continue;
    const text = readFileSync(filePath, "utf8");
    for (const pattern of patterns) {
      const matches = text.match(pattern.regex) || [];
      if (matches.length > 0) findings.push({ file: relative(root, filePath), name: pattern.name });
    }
  }
}
