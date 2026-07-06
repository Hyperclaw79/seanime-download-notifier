import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      reporter: ["text", "json", "html"],
      include: [
        "src/core/**/*.ts",
        "src/providers/**/*.ts",
        "src/seanime/{hooks,torrent-client}.ts",
      ],
      exclude: [
        "src/core/events.ts",
      ],
    },
  },
});
