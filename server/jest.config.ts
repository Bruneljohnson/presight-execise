import { defineConfig } from "jest";
import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = defineConfig({
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testMatch: ["**/__tests__/**/*.test.ts"],
  testTimeout: 30_000,
  clearMocks: true,
  coverageDirectory: "../coverage",
  collectCoverageFrom: ["**/*.ts", "!**/__tests__/**", "!index.ts"],
});

export default config;
