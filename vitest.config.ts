import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/main.tsx",
        "src/components/ui/**",
        "src/types/**",
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
      ],
      thresholds: {
        // TODO: tighten once MessageBubble/ArtifactView/ChatPanel have proper render tests.
        lines: 75,
        statements: 75,
        branches: 75,
        functions: 70,
      },
    },
  },
});
