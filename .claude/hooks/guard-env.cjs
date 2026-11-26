// PreToolUse: refuse Claude's file edits to .env files. .env.local holds the read-only legs_preview
// login on purpose, and .env / .env.production.local hold real secrets. .env.example is a template
// with no secrets, so it stays editable. Exit 2 blocks the tool call and shows the reason to Claude.
// Also wired into the parent Claude Shopify folder's settings, so it only acts on files in this repo.
const path = require("path");
const root = path.resolve(__dirname, "..", "..").toLowerCase() + path.sep;

let input = "";
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  const ti = JSON.parse(input || "{}").tool_input || {};
  const file = path.resolve(ti.file_path || ti.notebook_path || "");
  if (!file.toLowerCase().startsWith(root)) return;
  const name = path.basename(file);
  if (/^\.env(\..+)?$/.test(name) && name !== ".env.example") {
    console.error(
      `Blocked: ${name} is protected. Env files hold secrets and the read-only database login; ` +
        "tell the user what to change and let them edit it themselves."
    );
    process.exit(2);
  }
});
