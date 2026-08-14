import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit-node",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "component-jsdom",
          environment: "jsdom",
          include: ["tests/component/**/*.test.tsx"],
          setupFiles: ["./tests/setup/jest-dom.ts"],
        },
      },
      {
        test: {
          name: "integration-node",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
        },
      },
    ],
  },
});
