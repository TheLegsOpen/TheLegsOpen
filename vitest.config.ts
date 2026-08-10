import path from "path";
import { defineConfig } from "vitest/config";

/**
 * Deliberately scoped to pure-logic unit tests only (scoring, race-tracker, live-blog trigger
 * engine). Standalone Node processes can't initialize Payload in this environment (Node 24 +
 * @next/env loadEnv interop bug, see the note at the top of payload-types.ts), so nothing under
 * test here may import "payload", "@/payload.config", or any module that transitively does.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
