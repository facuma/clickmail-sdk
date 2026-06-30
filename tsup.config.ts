import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    webhook: "src/webhook.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: "node18",
  outDir: "dist",
});
