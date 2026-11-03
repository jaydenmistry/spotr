import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    // Pure logic and route handlers run in node; component tests (.test.tsx)
    // opt into jsdom with a `@vitest-environment jsdom` docblock.
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
