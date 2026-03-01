// jest.config.js
module.exports = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^vscode$": "<rootDir>/tests/__mocks__/vscode.ts",
  },
  testMatch: ["**/*.test.ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
};
