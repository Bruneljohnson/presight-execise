import { defineConfig } from "jest";
import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = defineConfig({
  preset: "ts-jest",
  testEnvironment: "jest-environment-jsdom",
  rootDir: "src",
  testMatch: ["**/__tests__/**/*.test.tsx", "**/__tests__/**/*.test.ts"],
  testTimeout: 10_000,
  clearMocks: true,
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx", esModuleInterop: true } }],
  },
});

export default config;
