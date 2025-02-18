// /src/test/logger.test.js
// Version: 1.0.1

jest.mock("vscode", () => ({
  window: {
    createOutputChannel: jest.fn(() => ({
      appendLine: jest.fn(),
    })),
  },
  workspace: {
    workspaceFolders: [{ uri: { fsPath: "/mock/workspace" } }],
  },
}));

const logger = require("../logger");

describe("Logger Module", () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test("logs messages with default module name", () => {
    logger.log("Test message");
    expect(consoleLogSpy).toHaveBeenCalledWith("✅ [General] Test message");
  });

  test("logs messages with a specific module name", () => {
    logger.log("Test message", "TestModule");
    expect(consoleLogSpy).toHaveBeenCalledWith("✅ [TestModule] Test message");
  });

  test("logs error messages with default module name", () => {
    logger.error("Test error");
    expect(consoleErrorSpy).toHaveBeenCalledWith("❌ [General] Test error");
  });

  test("logs error messages with a specific module name", () => {
    logger.error("Test error", "ErrorModule");
    expect(consoleErrorSpy).toHaveBeenCalledWith("❌ [ErrorModule] Test error");
  });
});
