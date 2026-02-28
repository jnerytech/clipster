// jest.config.js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^vscode$": "<rootDir>/src/test/__mocks__/vscode.ts",
  },
  testMatch: ["**/*.test.ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/test/**", "!src/**/*.d.ts"],
};
