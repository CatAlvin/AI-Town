import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const runtimeRoots = ["public", "src"];
const runtimeFiles = ["server.js", "package.json", "README.md", "Dockerfile", ".dockerignore"];
const forbiddenRuntimePatterns = [
  { name: "旧项目名称", regex: /AI 小镇|ai-town|ai town/gi },
  { name: "未完成入口", regex: /Coming Soon|敬请期待|未完成入口/gi },
  { name: "占位标记", regex: /\bTODO\b|\bFIXME\b|占位文案|占位内容/gi },
  { name: "开发调试输出", regex: /console\.debug|debugger;/g },
  { name: "开发专用路由", regex: /\/admin|\/debug|\/test-route/gi },
];

const findings = [];
for (const file of collectFiles()) {
  const text = readFileSync(file, "utf8");
  for (const pattern of forbiddenRuntimePatterns) {
    const matches = text.match(pattern.regex) || [];
    if (matches.length > 0) findings.push({ file: relative(root, file), name: pattern.name, count: matches.length });
  }
}

assertFile("docs/ASSET_LICENSES.md");
assertFile("docs/design/WORLD_BIBLE.md");
assertFile("docs/design/ART_BIBLE.md");
assertFile("docs/operations/DEPLOY_LINUX.md");
assertText("Dockerfile", /USER moonbell/);
assertText("Dockerfile", /HEALTHCHECK/);
assertText(".dockerignore", /deepseek API Key\.txt/);
assertText("server.js", /\/api\/health/);
assertText("server.js", /requestLimitBytes/);
assertText("server.js", /rateLimit/);

if (findings.length > 0) {
  console.error("生产审计发现问题：");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.name} x${finding.count}`);
  }
  process.exit(1);
}

console.log("生产审计通过：运行时代码无旧名/占位/调试入口，部署与许可证据存在。");

function collectFiles() {
  const files = [];
  for (const file of runtimeFiles) {
    const path = join(root, file);
    if (existsSync(path)) files.push(path);
  }
  for (const dir of runtimeRoots) {
    walk(join(root, dir), files);
  }
  return files.filter((file) => /\.(js|css|html|json|md|dockerignore|Dockerfile)$/i.test(file) || file.endsWith("Dockerfile"));
}

function walk(dir, files) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, files);
    else files.push(path);
  }
}

function assertFile(path) {
  if (!existsSync(join(root, path))) {
    findings.push({ file: path, name: "必要证据文件缺失", count: 1 });
  }
}

function assertText(path, regex) {
  const filePath = join(root, path);
  if (!existsSync(filePath) || !regex.test(readFileSync(filePath, "utf8"))) {
    findings.push({ file: path, name: `缺少 ${regex}`, count: 1 });
  }
}
