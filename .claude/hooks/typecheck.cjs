// PostToolUse: after Claude edits a .ts/.tsx file, type-check the whole project (incremental,
// about 10s). On errors, exit 2 so the first lines of tsc's output go back to Claude to fix.
// Also wired into the parent Claude Shopify folder's settings, so it only acts on files in this repo.
const path = require("path");
const { spawnSync } = require("child_process");
const root = path.resolve(__dirname, "..", "..");

let input = "";
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  const ti = JSON.parse(input || "{}").tool_input || {};
  const file = path.resolve(ti.file_path || "");
  if (!/\.tsx?$/.test(file)) return;
  if (!file.toLowerCase().startsWith(root.toLowerCase() + path.sep)) return;

  const tsc = require.resolve("typescript/bin/tsc", { paths: [root] });
  const r = spawnSync(process.execPath, [tsc, "--noEmit", "--pretty", "false", "-p", root], {
    cwd: root,
    encoding: "utf8",
  });
  if (r.status === 0) return;

  const lines = (r.stdout + r.stderr).trim().split(/\r?\n/);
  const shown = lines.slice(0, 30).join("\n");
  const more = lines.length > 30 ? `\n…and ${lines.length - 30} more lines` : "";
  console.error(`tsc --noEmit found type errors (not necessarily in ${path.basename(file)}):\n${shown}${more}`);
  process.exit(2);
});
